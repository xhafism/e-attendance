import { getDb } from "./db";
import { User, UserRole, Setting, GeofenceLocation, AttendanceLog } from "./types";

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

export async function getAllLogs() {
  const db = await getDb();
  
  const rawLogs = await db.all(`
    SELECT l.*, u.name as user_name, u.email as user_email
    FROM attendance_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 1000
  `);
  
  return rawLogs as any[];
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

// --- Attendance ---

export async function logAttendance(log: Omit<AttendanceLog, "id" | "createdAt">): Promise<void> {
  const db = await getDb();
  const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  await db.run(
    `INSERT INTO attendance_logs 
     (id, user_id, event_type, attendance_type, latitude, longitude, address, note, photo_url, is_outside_geofence) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      log.userId,
      log.eventType,
      log.attendanceType,
      log.latitude ?? null,
      log.longitude ?? null,
      log.address ?? null,
      log.note ?? null,
      log.photoUrl ?? null,
      log.isOutsideGeofence ? 1 : 0
    ]
  );
}

export async function getUserAttendanceToday(userId: string): Promise<AttendanceLog[]> {
  const db = await getDb();
  
  // Fetch recent logs
  const rows = await db.all<any>(
    "SELECT * FROM attendance_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    [userId]
  );
  
  const logs = rows.map(mapAttendanceLogRow);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  // Return ascending order for today's logs
  return logs.filter(log => new Date(log.createdAt).getTime() >= todayStart.getTime()).reverse();
}

export async function getAttendanceHistory(userId: string, limit: number = 50): Promise<AttendanceLog[]> {
  const db = await getDb();
  const rows = await db.all<any>(
    "SELECT * FROM attendance_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  );
  
  return rows.map(mapAttendanceLogRow);
}

export async function getAllAttendance(date?: string): Promise<(AttendanceLog & { user: Pick<User, "name" | "email"> })[]> {
  const db = await getDb();
  
  let query = `
    SELECT a.*, u.name as user_name, u.email as user_email 
    FROM attendance_logs a
    JOIN users u ON a.user_id = u.id
  `;
  const params: any[] = [];
  
  if (date) {
    // date should be YYYY-MM-DD
    query += " WHERE date(a.created_at) = date(?)";
    params.push(date);
  }
  
  query += " ORDER BY a.created_at DESC";
  
  const rows = await db.all<any>(query, params);
  return rows.map((row) => ({
    ...mapAttendanceLogRow(row),
    user: {
      name: row.user_name,
      email: row.user_email
    }
  }));
}

export async function getAttendanceStats(date?: string): Promise<any> {
  const db = await getDb();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // Basic stats for the given date
  const statsRow = await db.one<any>(
    `SELECT 
      COUNT(DISTINCT CASE WHEN event_type = 'clock_in' THEN user_id END) as clockedIn,
      COUNT(DISTINCT CASE WHEN event_type = 'break_start' THEN user_id END) - 
      COUNT(DISTINCT CASE WHEN event_type = 'break_end' THEN user_id END) as onBreak,
      COUNT(DISTINCT CASE WHEN event_type = 'clock_in' AND attendance_type = 'wfh' THEN user_id END) as wfh,
      SUM(CASE WHEN is_outside_geofence = 1 THEN 1 ELSE 0 END) as geofenceWarnings
     FROM attendance_logs
     WHERE date(created_at) = date(?)`,
    [targetDate]
  );
  
  return {
    clockedIn: statsRow?.clockedIn || 0,
    onBreak: statsRow?.onBreak || 0,
    wfh: statsRow?.wfh || 0,
    geofenceWarnings: statsRow?.geofenceWarnings || 0,
  };
}

export async function getUserStats(userId: string): Promise<any> {
  const db = await getDb();
  
  // Stats for the current user
  const statsRow = await db.one<any>(
    `SELECT 
      COUNT(DISTINCT date(created_at)) as totalDays,
      SUM(CASE WHEN event_type = 'clock_in' AND attendance_type = 'wfh' THEN 1 ELSE 0 END) as wfhDays,
      SUM(CASE WHEN is_outside_geofence = 1 THEN 1 ELSE 0 END) as outOfBounds
     FROM attendance_logs
     WHERE user_id = ?`,
    [userId]
  );
  
  return {
    totalDays: statsRow?.totalDays || 0,
    wfhDays: statsRow?.wfhDays || 0,
    outOfBounds: statsRow?.outOfBounds || 0,
  };
}

function mapAttendanceLogRow(row: any): AttendanceLog {
  const createdAt = row.created_at.includes('T') 
    ? row.created_at 
    : row.created_at.replace(' ', 'T') + 'Z';
    
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    attendanceType: row.attendance_type,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    note: row.note,
    photoUrl: row.photo_url,
    isOutsideGeofence: row.is_outside_geofence === 1,
    createdAt: createdAt,
  };
}
