-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Attendance logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  attendance_type TEXT NOT NULL DEFAULT 'office',
  latitude REAL,
  longitude REAL,
  address TEXT,
  note TEXT,
  photo_url TEXT,
  is_outside_geofence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings table (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('geofence_enabled', 'true'),
  ('geofence_locations', '[{"name":"IIUM Holdings HQ","lat":3.2516,"lng":101.7340,"radius":500}]'),
  ('selfie_enabled', 'false'),
  ('auto_clockout_reminder_enabled', 'true'),
  ('auto_clockout_reminder_time', '20:00');
