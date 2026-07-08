import { getDb } from "./db";
import { User, UserRole, Setting, GeofenceLocation, AttendanceLog, ReportPeriod, StaffReportRow, StaffDayDetail, StaffDailyRow } from "./types";

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

export async function getAllLogs(options?: { startDate?: string, endDate?: string, userId?: string }) {
  const db = await getDb();
  
  let query = `
    SELECT l.*, u.name as user_name, u.email as user_email
    FROM attendance_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (options?.userId && options.userId !== "all") {
    query += " AND l.user_id = ?";
    params.push(options.userId);
  }
  
  if (options?.startDate) {
    query += " AND date(l.created_at) >= date(?)";
    params.push(options.startDate);
  }
  
  if (options?.endDate) {
    query += " AND date(l.created_at) <= date(?)";
    params.push(options.endDate);
  }
  
  query += " ORDER BY l.created_at DESC LIMIT 5000";
  
  const rawLogs = await db.all(query, params);
  
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

export async function getMonthlyAnalytics(referenceDate?: string): Promise<{
  daily: Array<{ date: string; present: number }>;
  byType: { office: number; wfh: number; clientSite: number; fieldWork: number };
}> {
  const db = await getDb();
  const targetDate = referenceDate || new Date().toISOString().split('T')[0];
  
  // Daily attendance for the last 7 days from targetDate
  const dailyRows = await db.all<any>(`
    SELECT 
      date(created_at) as day,
      COUNT(DISTINCT user_id) as present
    FROM attendance_logs
    WHERE event_type = 'clock_in' 
      AND date(created_at) >= date(?, '-6 days')
      AND date(created_at) <= date(?)
    GROUP BY date(created_at)
    ORDER BY day ASC
  `, [targetDate, targetDate]);

  const daily = dailyRows.map(row => {
    // Convert YYYY-MM-DD to short day name like 'Mon'
    const dateObj = new Date(row.day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    return {
      date: dayName,
      present: row.present
    };
  });
  
  // Fill in missing days if fewer than 7 returned
  if (daily.length < 7) {
    const filledDaily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const existing = daily.find(x => x.date === dayName);
      filledDaily.push(existing || { date: dayName, present: 0 });
    }
    // Only use the filled one if it has correct length (7)
    daily.splice(0, daily.length, ...filledDaily);
  }

  // Type breakdown for the target month
  const typeRows = await db.all<any>(`
    SELECT 
      attendance_type as type,
      COUNT(DISTINCT user_id || date(created_at)) as count
    FROM attendance_logs
    WHERE event_type = 'clock_in'
      AND date(created_at) >= date(?, 'start of month')
      AND date(created_at) <= date(?, 'start of month', '+1 month', '-1 day')
    GROUP BY attendance_type
  `, [targetDate, targetDate]);

  const byType = {
    office: 0,
    wfh: 0,
    clientSite: 0,
    fieldWork: 0
  };

  for (const row of typeRows) {
    if (row.type === 'office') byType.office = row.count;
    if (row.type === 'wfh') byType.wfh = row.count;
    if (row.type === 'client_site') byType.clientSite = row.count;
    if (row.type === 'field_work') byType.fieldWork = row.count;
  }

  return { daily, byType };
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

export async function getUserYearlyLogs(userId: string): Promise<AttendanceLog[]> {
  const db = await getDb();
  
  const query = `
    SELECT * FROM attendance_logs 
    WHERE user_id = ? 
      AND created_at >= date('now', '-365 days')
    ORDER BY created_at ASC
  `;
  
  const rows = await db.all<any>(query, [userId]);
  return rows.map(mapAttendanceLogRow);
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

// --- OT Calculation & Report Functions ---

function getDateRange(period: ReportPeriod, date: string): { start: string; end: string } {
  if (period === 'daily') {
    return { start: date, end: date };
  } else if (period === 'monthly') {
    // date is YYYY-MM
    const [year, month] = date.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  } else {
    // yearly — date is YYYY
    const year = parseInt(date);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

function calculateDayDetails(
  logs: any[],
  requiredHours: number
): { workingHours: number; breakDuration: number; otHours: number; clockIn: string | null; clockOut: string | null; attendanceType: string } {
  let clockIn: string | null = null;
  let clockOut: string | null = null;
  let attendanceType = 'office';
  
  let totalWorkMs = 0;
  let totalBreakMs = 0;
  
  let currentClockIn: Date | null = null;
  let currentBreakStart: Date | null = null;
  
  for (const log of logs) {
    const time = new Date(log.created_at.includes('T') ? log.created_at : log.created_at.replace(' ', 'T') + 'Z');
    
    switch (log.event_type) {
      case 'clock_in':
        currentClockIn = time;
        if (!clockIn) {
          clockIn = log.created_at;
          attendanceType = log.attendance_type || 'office';
        }
        break;
      case 'break_start':
        currentBreakStart = time;
        break;
      case 'break_end':
        if (currentBreakStart) {
          totalBreakMs += time.getTime() - currentBreakStart.getTime();
          currentBreakStart = null;
        }
        break;
      case 'clock_out':
        clockOut = log.created_at;
        if (currentClockIn) {
          totalWorkMs += time.getTime() - currentClockIn.getTime();
          currentClockIn = null;
        }
        // If on break when clocking out, count remaining break
        if (currentBreakStart) {
          totalBreakMs += time.getTime() - currentBreakStart.getTime();
          currentBreakStart = null;
        }
        break;
    }
  }
  
  // If still clocked in (no clock_out), don't count open sessions
  // Working hours = total work time - break time
  const workingHours = Math.max(0, (totalWorkMs - totalBreakMs) / (1000 * 60 * 60));
  const breakDuration = totalBreakMs / (1000 * 60 * 60);
  const otHours = Math.max(0, workingHours - requiredHours);
  
  return { workingHours, breakDuration, otHours, clockIn, clockOut, attendanceType };
}

export async function getRequiredHours(): Promise<number> {
  const settings = await getSettings();
  return settings.required_hours ? parseFloat(settings.required_hours) : 9;
}

export async function getStaffReportSummary(options: {
  period: ReportPeriod;
  date: string;
}): Promise<StaffReportRow[]> {
  const db = await getDb();
  const { start, end } = getDateRange(options.period, options.date);
  const requiredHours = await getRequiredHours();
  
  // Get all active users
  const users = await db.all<any>("SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name ASC");
  
  // Get all logs in the date range
  const logs = await db.all<any>(
    `SELECT * FROM attendance_logs 
     WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
     ORDER BY created_at ASC`,
    [start, end]
  );
  
  // Group logs by user and date
  const userDateLogs: Record<string, Record<string, any[]>> = {};
  for (const log of logs) {
    const dateStr = log.created_at.substring(0, 10);
    if (!userDateLogs[log.user_id]) userDateLogs[log.user_id] = {};
    if (!userDateLogs[log.user_id][dateStr]) userDateLogs[log.user_id][dateStr] = [];
    userDateLogs[log.user_id][dateStr].push(log);
  }
  
  const results: StaffReportRow[] = [];
  
  for (const user of users) {
    const dateLogs = userDateLogs[user.id] || {};
    const dates = Object.keys(dateLogs);
    
    let totalWorkingHours = 0;
    let totalBreakHours = 0;
    let totalOtHours = 0;
    let daysPresent = 0;
    
    for (const dateStr of dates) {
      const dayLogs = dateLogs[dateStr];
      // Only count days where user actually clocked in
      const hasClockIn = dayLogs.some((l: any) => l.event_type === 'clock_in');
      if (!hasClockIn) continue;
      
      daysPresent++;
      const details = calculateDayDetails(dayLogs, requiredHours);
      totalWorkingHours += details.workingHours;
      totalBreakHours += details.breakDuration;
      totalOtHours += details.otHours;
    }
    
    results.push({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      daysPresent,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalBreakHours: Math.round(totalBreakHours * 100) / 100,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      averageHoursPerDay: daysPresent > 0 ? Math.round((totalWorkingHours / daysPresent) * 100) / 100 : 0,
    });
  }
  
  return results;
}

export async function getStaffDetailReport(options: {
  userId: string;
  period: ReportPeriod;
  date: string;
}): Promise<{ user: Pick<User, 'id' | 'name' | 'email'>; days: StaffDayDetail[]; requiredHours: number }> {
  const db = await getDb();
  const { start, end } = getDateRange(options.period, options.date);
  const requiredHours = await getRequiredHours();
  
  // Get user info
  const user = await db.one<any>("SELECT id, name, email FROM users WHERE id = ?", [options.userId]);
  if (!user) throw new Error("User not found");
  
  // Get logs for this user in the date range
  const logs = await db.all<any>(
    `SELECT * FROM attendance_logs 
     WHERE user_id = ? AND date(created_at) >= date(?) AND date(created_at) <= date(?)
     ORDER BY created_at ASC`,
    [options.userId, start, end]
  );
  
  // Group logs by date
  const dateLogs: Record<string, any[]> = {};
  for (const log of logs) {
    const dateStr = log.created_at.substring(0, 10);
    if (!dateLogs[dateStr]) dateLogs[dateStr] = [];
    dateLogs[dateStr].push(log);
  }
  
  // Generate all dates in range
  const days: StaffDayDetail[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayLogs = dateLogs[dateStr] || [];
    
    if (dayLogs.length > 0) {
      const details = calculateDayDetails(dayLogs, requiredHours);
      days.push({
        date: dateStr,
        clockIn: details.clockIn,
        clockOut: details.clockOut,
        breakDuration: Math.round(details.breakDuration * 100) / 100,
        workingHours: Math.round(details.workingHours * 100) / 100,
        otHours: Math.round(details.otHours * 100) / 100,
        attendanceType: details.attendanceType,
      });
    } else {
      // Only include days with no data for daily period, skip for monthly/yearly to reduce noise
      if (options.period === 'daily') {
        days.push({
          date: dateStr,
          clockIn: null,
          clockOut: null,
          breakDuration: 0,
          workingHours: 0,
          otHours: 0,
          attendanceType: '-',
        });
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return {
    user: { id: user.id, name: user.name, email: user.email },
    days,
    requiredHours,
  };
}

export async function getAllStaffDailyReport(options: {
  period: ReportPeriod;
  date: string;
}): Promise<{ rows: StaffDailyRow[]; requiredHours: number; summary: { totalStaff: number; totalWorkHours: number; totalOtHours: number; staffWithOt: number } }> {
  const db = await getDb();
  const { start, end } = getDateRange(options.period, options.date);
  const requiredHours = await getRequiredHours();

  // Get all active users
  const users = await db.all<any>("SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name ASC");
  const userMap: Record<string, string> = {};
  for (const u of users) userMap[u.id] = u.name;

  // Get all logs in the date range
  const logs = await db.all<any>(
    `SELECT * FROM attendance_logs
     WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
     ORDER BY created_at ASC`,
    [start, end]
  );

  // Group logs by user_id + date
  const grouped: Record<string, Record<string, any[]>> = {};
  for (const log of logs) {
    const dateStr = log.created_at.substring(0, 10);
    if (!grouped[log.user_id]) grouped[log.user_id] = {};
    if (!grouped[log.user_id][dateStr]) grouped[log.user_id][dateStr] = [];
    grouped[log.user_id][dateStr].push(log);
  }

  const rows: StaffDailyRow[] = [];
  let totalWorkHours = 0;
  let totalOtHours = 0;
  const staffOtSet = new Set<string>();

  for (const user of users) {
    const dateLogs = grouped[user.id] || {};
    for (const dateStr of Object.keys(dateLogs).sort()) {
      const dayLogs = dateLogs[dateStr];
      const hasClockIn = dayLogs.some((l: any) => l.event_type === 'clock_in');
      if (!hasClockIn) continue;

      const details = calculateDayDetails(dayLogs, requiredHours);
      totalWorkHours += details.workingHours;
      totalOtHours += details.otHours;
      if (details.otHours > 0) staffOtSet.add(user.id);

      rows.push({
        userId: user.id,
        userName: user.name,
        date: dateStr,
        attendanceType: details.attendanceType,
        clockIn: details.clockIn,
        clockOut: details.clockOut,
        workingHours: Math.round(details.workingHours * 100) / 100,
        breakDuration: Math.round(details.breakDuration * 100) / 100,
        otHours: Math.round(details.otHours * 100) / 100,
      });
    }
  }

  return {
    rows,
    requiredHours,
    summary: {
      totalStaff: users.length,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      staffWithOt: staffOtSet.size,
    },
  };
}
