import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export interface DatabaseClient {
  one<T>(query: string, params?: unknown[]): Promise<T | null>;
  all<T>(query: string, params?: unknown[]): Promise<T[]>;
  run(query: string, params?: unknown[]): Promise<void>;
  exec(query: string): Promise<void>;
}

let dbInstance: DatabaseClient | null = null;
let dbInitPromise: Promise<DatabaseClient> | null = null;

async function initializeDb(): Promise<DatabaseClient> {
  const isCloudflare = !!process.env.CF_PAGES || !!process.env.NEXT_PHASE?.includes("production-build");
  const forceLocal = process.env.EATTENDANCE_FORCE_LOCAL_DB === "1";
  
  if (!isCloudflare || forceLocal) {
    // Local SQLite setup
    const dbPath = path.resolve(process.cwd(), "data", "attendance.sqlite");
    
    // Ensure data dir exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const sqlite = new DatabaseSync(dbPath);

    const client: DatabaseClient = {
      async one<T>(query: string, params: unknown[] = []) {
        const stmt = sqlite.prepare(query);
        const result = stmt.get(...(params as any[]));
        return (result as T) || null;
      },
      async all<T>(query: string, params: unknown[] = []) {
        const stmt = sqlite.prepare(query);
        const result = stmt.all(...(params as any[]));
        return result as T[];
      },
      async run(query: string, params: unknown[] = []) {
        const stmt = sqlite.prepare(query);
        stmt.run(...(params as any[]));
      },
      async exec(query: string) {
        sqlite.exec(query);
      }
    };

    // Run migrations if needed
    const migrationPath = path.resolve(process.cwd(), "migrations", "0001_initial.sql");
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, "utf8");
      await client.exec(sql);
    }

    return client;
  } else {
    // Cloudflare D1 setup
    const ctx = await getCloudflareContext();
    const env = ctx.env as any;
    const d1 = env.DB;

    if (!d1) {
      throw new Error("D1 database binding 'DB' not found in Cloudflare context");
    }

    return {
      async one<T>(query: string, params: unknown[] = []) {
        const result = await d1.prepare(query).bind(...params).first();
        return (result as T) || null;
      },
      async all<T>(query: string, params: unknown[] = []) {
        const { results } = await d1.prepare(query).bind(...params).all();
        return results as T[];
      },
      async run(query: string, params: unknown[] = []) {
        await d1.prepare(query).bind(...params).run();
      },
      async exec(query: string) {
        // D1 doesn't have a direct equivalent to exec for multiple statements,
        // we assume D1 is already migrated in prod via wrangler d1 execute
        console.warn("exec() called on D1, this is a no-op as migrations should be run via wrangler.");
      }
    };
  }
}

export async function getDb(): Promise<DatabaseClient> {
  if (dbInstance) return dbInstance;
  
  const globalAny = globalThis as any;
  if (!globalAny.__eattendanceReady__) {
    globalAny.__eattendanceReady__ = initializeDb();
  }
  
  dbInstance = await globalAny.__eattendanceReady__;
  return dbInstance!;
}
