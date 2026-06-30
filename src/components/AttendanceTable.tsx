import { AttendanceLog } from "@/lib/types";

export function AttendanceTable({ logs, showUserColumn = false }: { logs: any[], showUserColumn?: boolean }) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-MY', { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Kuala_Lumpur'
    });
  };

  const getEventName = (type: string) => {
    switch(type) {
      case 'clock_in': return 'Clock In';
      case 'clock_out': return 'Clock Out';
      case 'break_start': return 'Break Started';
      case 'break_end': return 'Break Ended';
      default: return type;
    }
  };

  if (logs.length === 0) {
    return <div className="card"><p className="text-muted text-center" style={{ padding: '2rem' }}>No attendance logs found.</p></div>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {showUserColumn && <th>User</th>}
            <th>Event</th>
            <th>Type</th>
            <th>Time</th>
            <th>Location Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              {showUserColumn && (
                <td>
                  <div style={{ fontWeight: 600 }}>{log.user_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email}</div>
                </td>
              )}
              <td><strong>{getEventName(log.eventType || log.event_type)}</strong></td>
              <td>
                <span className="badge badge-default">
                  {log.attendanceType || log.attendance_type}
                </span>
              </td>
              <td>{formatTime(log.createdAt || log.created_at)}</td>
              <td>
                {(log.isOutsideGeofence || log.is_outside_geofence) ? (
                  <span className="badge badge-warning">Outside Geofence</span>
                ) : (
                  <span className="badge badge-success">Verified</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
