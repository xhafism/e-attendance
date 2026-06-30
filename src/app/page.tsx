import { requireUser } from "@/lib/auth";
import { getUserAttendanceToday } from "@/lib/store";
import ClockWidget from "@/components/ClockWidget";

export default async function DashboardPage() {
  const user = await requireUser();
  const todayLogs = await getUserAttendanceToday(user.id);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        <div className="main-column">
          <ClockWidget initialLogs={todayLogs} />
          
          <div className="card mt-4">
            <h3 className="card-title">Today's Activity</h3>
            {todayLogs.length === 0 ? (
              <p className="text-muted">No activity recorded today.</p>
            ) : (
              <div className="activity-timeline">
                {todayLogs.map(log => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-time">{formatTime(log.createdAt)}</div>
                    <div className="timeline-content">
                      <strong>{getEventName(log.eventType)}</strong>
                      <span className="badge badge-default ml-2">{log.attendanceType}</span>
                      {log.isOutsideGeofence && (
                        <span className="badge badge-warning ml-2">Outside Geofence</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="side-column">
          <div className="card">
            <h3 className="card-title">My Stats</h3>
            <p className="text-muted mt-2">Personal analytics coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
