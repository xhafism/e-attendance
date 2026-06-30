import { NextResponse } from "next/server";
import { authenticateUserByEmail, createSession } from "@/lib/auth";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  // Bypass Microsoft auth for local dev
  const email = "hafiffi@iiumholdings.com.my"; // Admin user
  const name = "Dev Admin (Hafiffi)";

  try {
    const user = await authenticateUserByEmail(email, name);
    await createSession(user.id);
    return NextResponse.redirect(new URL("/", request.url));
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
