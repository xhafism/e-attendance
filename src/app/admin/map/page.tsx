import { requireAnyRole } from "@/lib/auth";
import { getGeofenceSettings, getAllAttendance } from "@/lib/store";
import { MapView } from "@/components/MapView";

export default async function AdminMapPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const resolvedParams = await searchParams;
  await requireAnyRole(["admin", "hr"]);
  const { locations } = await getGeofenceSettings();
  const allLogs = await getAllAttendance();
  
  // Parse date param or default to today
  const targetDate = resolvedParams.date ? new Date(resolvedParams.date) : new Date();
  // Ensure local timezone handling
  targetDate.setHours(0, 0, 0, 0); 
  
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const dateStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const isToday = dateStr === new Date().toLocaleDateString('en-CA');

  const userLatestLogs = new Map();
  for (const log of allLogs) {
    const logTime = new Date(log.createdAt).getTime();
    if (logTime >= targetDate.getTime() && logTime < nextDate.getTime()) {
      if (!userLatestLogs.has(log.userId)) {
        userLatestLogs.set(log.userId, log);
      }
    }
  }

  const markers = [];
  let workingCount = 0;
  let breakCount = 0;
  let recordedCount = 0;

  for (const log of userLatestLogs.values()) {
    recordedCount++;
    
    // For today, we skip clocked out users from the "active" counters.
    // For past days, we just show their last known location of that day.
    if (isToday && log.eventType === 'clock_out') {
      continue;
    }
    
    if (log.eventType === 'clock_in' || log.eventType === 'break_end') {
      workingCount++;
    } else if (log.eventType === 'break_start') {
      breakCount++;
    }

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title mb-0" style={{ margin: 0 }}>Live Map</h1>
        
        <form style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
          <label className="text-muted" style={{ fontWeight: 500, margin: 0 }}>Select Date:</label>
          <input 
            type="date" 
            name="date" 
            defaultValue={dateStr}
            className="form-control"
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>View</button>
        </form>
      </div>
      
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {isToday ? (
          <p><strong>{workingCount}</strong> employees working | <strong>{breakCount}</strong> on break</p>
        ) : (
          <p><strong>{recordedCount}</strong> employees recorded attendance on this date.</p>
        )}
      </div>
      
      <MapView markers={markers} geofences={locations} />
    </div>
  );
}
