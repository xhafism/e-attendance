import { requireAnyRole } from "@/lib/auth";
import { getGeofenceSettings, getAllAttendance, getUsers } from "@/lib/store";
import { MapView } from "@/components/MapView";

export default async function AdminMapPage({ searchParams }: { searchParams: Promise<{ date?: string, user?: string }> }) {
  const resolvedParams = await searchParams;
  await requireAnyRole(["admin", "hr"]);
  const { locations } = await getGeofenceSettings();
  const allLogs = await getAllAttendance();
  const allUsers = await getUsers();
  
  // Parse date param or default to today
  const targetDate = resolvedParams.date ? new Date(resolvedParams.date) : new Date();
  // Ensure local timezone handling
  targetDate.setHours(0, 0, 0, 0); 
  
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const dateStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const isToday = dateStr === new Date().toLocaleDateString('en-CA');
  const selectedUserId = resolvedParams.user || "all";

  const markers = [];
  let workingCount = 0;
  let breakCount = 0;
  let recordedCount = 0;

  if (selectedUserId === "all") {
    // Original logic: Latest location per user
    const userLatestLogs = new Map();
    for (const log of allLogs) {
      const logTime = new Date(log.createdAt).getTime();
      if (logTime >= targetDate.getTime() && logTime < nextDate.getTime()) {
        if (!userLatestLogs.has(log.userId)) {
          userLatestLogs.set(log.userId, log);
        }
      }
    }

    for (const log of userLatestLogs.values()) {
      recordedCount++;
      
      if (isToday && log.eventType === 'clock_out') continue;
      
      if (log.eventType === 'clock_in' || log.eventType === 'break_end') workingCount++;
      else if (log.eventType === 'break_start') breakCount++;

      if (log.latitude && log.longitude) {
        markers.push({
          id: log.userId,
          lat: log.latitude,
          lng: log.longitude,
          name: log.user.name,
          status: log.eventType === 'clock_out' ? 'Clocked Out' : (log.eventType === 'break_start' ? 'On Break' : 'Working'),
          time: log.createdAt,
          type: log.attendanceType
        });
      }
    }
  } else {
    // Individual activity logic: All locations for selected user on that date
    const userLogs = allLogs.filter(log => {
      const logTime = new Date(log.createdAt).getTime();
      return log.userId === selectedUserId && logTime >= targetDate.getTime() && logTime < nextDate.getTime();
    });

    for (const log of userLogs) {
      if (log.latitude && log.longitude) {
        const eventLabels: Record<string, string> = {
          clock_in: 'Clock In',
          clock_out: 'Clock Out',
          break_start: 'Break Started',
          break_end: 'Break Ended'
        };
        markers.push({
          id: log.id,
          lat: log.latitude,
          lng: log.longitude,
          name: `${log.user.name} - ${eventLabels[log.eventType] || log.eventType}`,
          status: log.isOutsideGeofence ? "Outside Geofence" : "Valid",
          time: log.createdAt,
          type: log.attendanceType
        });
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title mb-0" style={{ margin: 0 }}>Live Map</h1>
        
        <form style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <label className="text-muted" style={{ fontWeight: 500, margin: 0 }}>Filter:</label>
          
          <select 
            name="user"
            defaultValue={selectedUserId}
            className="form-control"
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          >
            <option value="all">All Users</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          
          <input 
            type="date" 
            name="date" 
            defaultValue={dateStr}
            className="form-control"
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>Apply</button>
        </form>
      </div>
      
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {selectedUserId === "all" ? (
          isToday ? (
            <p><strong>{workingCount}</strong> employees working | <strong>{breakCount}</strong> on break</p>
          ) : (
            <p><strong>{recordedCount}</strong> employees recorded attendance on this date.</p>
          )
        ) : (
          <p>Showing <strong>{markers.length}</strong> activity locations for the selected user.</p>
        )}
      </div>
      
      <MapView markers={markers} geofences={locations} />
    </div>
  );
}
