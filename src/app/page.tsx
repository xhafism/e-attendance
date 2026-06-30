import { requireUser } from "@/lib/auth";
import { getUserAttendanceToday, getSettings, getGeofenceSettings, getUserStats } from "@/lib/store";
import ClockWidget from "@/components/ClockWidget";
import { ClockoutReminder } from "@/components/ClockoutReminder";
import { MapView } from "@/components/MapView";

export default async function DashboardPage() {
  const user = await requireUser();
  const todayLogs = await getUserAttendanceToday(user.id);
  const settings = await getSettings();
  const geofenceConfig = await getGeofenceSettings();
  const myStats = await getUserStats(user.id);

  // Determine clock state for the reminder
  let clockState: "idle" | "working" | "on_break" = "idle";
  if (todayLogs.length > 0) {
    const lastEvent = todayLogs[todayLogs.length - 1];
    if (lastEvent.eventType === "clock_in" || lastEvent.eventType === "break_end") clockState = "working";
    if (lastEvent.eventType === "break_start") clockState = "on_break";
  }

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

  // Convert today's logs with coordinates to markers
  const userMarkers = todayLogs
    .filter(log => log.latitude !== null && log.longitude !== null)
    .map(log => ({
      id: log.id,
      lat: log.latitude as number,
      lng: log.longitude as number,
      name: `My Location (${getEventName(log.eventType)})`,
      status: log.isOutsideGeofence ? "Outside Geofence" : "Valid",
      time: log.createdAt,
      type: log.attendanceType
    }));

  return (
    <div className="dashboard-container">
      <ClockoutReminder 
        clockState={clockState} 
        enabled={settings.reminder_enabled !== 'false'} 
        time={settings.reminder_time || "18:00"} 
      />
      <div className="dashboard-grid">
        <div className="main-column">
          <ClockWidget initialLogs={todayLogs} />
          
          {geofenceConfig.enabled && (
            <div className="card mt-4">
              <h3 className="card-title">My Location</h3>
              <div style={{ marginTop: "1rem" }}>
                <MapView markers={userMarkers} geofences={geofenceConfig.locations} />
              </div>
            </div>
          )}

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
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span className="text-muted">Days Worked</span>
                <strong>{myStats.totalDays}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span className="text-muted">WFH Sessions</span>
                <strong>{myStats.wfhDays}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-muted">Out of Bounds</span>
                <strong style={{ color: "var(--danger-color)" }}>{myStats.outOfBounds}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
