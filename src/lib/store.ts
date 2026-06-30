import { getDb } from "./db";
import { User, UserRole, Setting, GeofenceLocation } from "./types";

export async function getUsers(): Promise<User[]> {
  const db = await getDb();
  const rows = await db.all<any>("SELECT * FROM users ORDER BY name ASC");
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  const db = await getDb();
  await db.run(
    "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?",
    [role, id]
  );
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.run(
    "UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
    [isActive ? 1 : 0, id]
  );
}

export async function getSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.all<Setting>("SELECT key, value FROM settings");
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function updateSettings(settings: Record<string, string>): Promise<void> {
  const db = await getDb();
  for (const [key, value] of Object.entries(settings)) {
    await db.run(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [key, value]
    );
  }
}

// Helpers for specific settings
export async function getGeofenceSettings(): Promise<{ enabled: boolean; locations: GeofenceLocation[] }> {
  const settings = await getSettings();
  
  let locations: GeofenceLocation[] = [];
  try {
    if (settings.geofence_locations) {
      locations = JSON.parse(settings.geofence_locations);
    }
  } catch (e) {
    console.error("Failed to parse geofence locations", e);
  }

  return {
    enabled: settings.geofence_enabled === 'true',
    locations,
  };
}
