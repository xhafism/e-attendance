import { cookies } from "next/headers";
import { getDb } from "./db";
import { User, UserRole, Session } from "./types";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "eattendance_session";
const SHARED_COOKIE = process.env.SHARED_COOKIE_NAME || "eattendance_shared_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SHARED_TTL_S = 86400; // 24 hours

function getAdminEmails(): string[] {
  if (process.env.ADMIN_EMAILS) {
    return process.env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase());
  }
  return [];
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable is required in production");
    }
    return "dev-secret-do-not-use-in-production";
  }
  return secret;
}

export function signToken(payload: string): string {
  const hmac = createHmac("sha256", getAuthSecret());
  hmac.update(payload);
  const signature = hmac.digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  
  const expectedSignature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  
  if (expectedSignature.length !== signature.length) return null;
  
  const isValid = timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  if (!isValid) return null;
  
  return payload;
}

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  
  await db.run(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionId, userId, expiresAt]
  );
  
  const payload = Buffer.from(JSON.stringify({ sessionId, userId, expiresAt })).toString("base64url");
  const token = signToken(payload);
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt)
  });
  
  // Create shared cookie
  const user = await db.one<User>("SELECT * FROM users WHERE id = ?", [userId]);
  if (user) {
    const sharedPayload = Buffer.from(JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + SHARED_TTL_S
    })).toString("base64");
    
    cookieStore.set(SHARED_COOKIE, sharedPayload, {
      domain: process.env.COOKIE_DOMAIN || undefined,
      sameSite: "lax",
      maxAge: SHARED_TTL_S
    });
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  
  if (token) {
    const payloadStr = verifyToken(token);
    if (payloadStr) {
      try {
        const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());
        const db = await getDb();
        await db.run("DELETE FROM sessions WHERE id = ?", [payload.sessionId]);
      } catch (e) {
        // Ignore JSON parse errors or DB errors on logout
      }
    }
  }
  
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SHARED_COOKIE);
}

export async function authenticateUserByEmail(email: string, name: string): Promise<User> {
  const db = await getDb();
  let user = await db.one<any>("SELECT * FROM users WHERE email = ?", [email]);
  
  if (!user) {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const role: UserRole = getAdminEmails().includes(email.toLowerCase()) ? "admin" : "user";
    
    await db.run(
      "INSERT INTO users (id, email, name, role, is_active) VALUES (?, ?, ?, ?, 1)",
      [userId, email, name, role]
    );
    
    user = await db.one<any>("SELECT * FROM users WHERE id = ?", [userId]);
  }
  
  if (user && user.is_active === 0) {
    throw new Error("Your account is deactivated. Please contact an administrator.");
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    isActive: user.is_active === 1,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const db = await getDb();
  
  // 1. Check shared cookie first
  const sharedSession = cookieStore.get(SHARED_COOKIE)?.value;
  if (sharedSession) {
    try {
      const decoded = JSON.parse(Buffer.from(sharedSession, "base64").toString());
      if (decoded.email && decoded.exp * 1000 > Date.now()) {
        const user = await db.one<any>("SELECT * FROM users WHERE email = ? AND is_active = 1", [decoded.email]);
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            isActive: true,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          };
        }
      }
    } catch (e) {
      // Invalid shared cookie, fall through to app session
    }
  }
  
  // 2. Check app-specific session
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  
  const payloadStr = verifyToken(token);
  if (!payloadStr) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());
    if (new Date(payload.expiresAt) < new Date()) return null;
    
    const user = await db.one<any>(
      `SELECT u.* FROM users u 
       JOIN sessions s ON u.id = s.user_id 
       WHERE s.id = ? AND u.is_active = 1`, 
      [payload.sessionId]
    );
    
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: true,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (e) {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAnyRole(roles: UserRole[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/"); // Or an unauthorized page
  }
  return user;
}
