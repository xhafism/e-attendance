export type UserRole = 'admin' | 'hr' | 'user';
export type ClockState = 'idle' | 'working' | 'on_break';
export type EventType = 'clock_in' | 'break_start' | 'break_end' | 'clock_out';
export type AttendanceType = 'office' | 'wfh' | 'client_site' | 'field_work';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  eventType: EventType;
  attendanceType: AttendanceType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  note: string | null;
  photoUrl: string | null;
  isOutsideGeofence: boolean;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface FormActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  updatedAt?: number;
}

export interface GeofenceLocation {
  name: string;
  lat: number;
  lng: number;
  radius: number;
  type?: 'circle' | 'polygon';
  polygon?: Array<{lat: number, lng: number}>;
}

export interface DailyAttendanceSummary {
  clockedIn: number;
  onBreak: number;
  wfh: number;
  geofenceWarnings: number;
}

export interface AttendanceStats {
  daily: { date: string; present: number; absent: number; late: number }[];
  byType: { office: number; wfh: number; clientSite: number; fieldWork: number };
  clockinTimes: { hour: string; count: number }[];
  weeklyTrend: { week: string; percentage: number }[];
}
