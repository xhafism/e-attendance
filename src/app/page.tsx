import { getDb } from "@/lib/db";

export default async function Page() {
  const db = await getDb();
  
  // Test query
  const usersCount = await db.one<{ count: number }>("SELECT COUNT(*) as count FROM users");
  
  return (
    <div>
      <h1>e-attendance</h1>
      <p>Database Initialized. Users count: {usersCount?.count ?? 0}</p>
    </div>
  );
}
