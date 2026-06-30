import { requireAnyRole } from "@/lib/auth";
import { getGeofenceSettings, getAllLogs } from "@/lib/store";
import { MapView } from "@/components/MapView";

export default async function AdminMapPage() {
  await requireAnyRole(["admin", "hr"]);
  const { locations } = await getGeofenceSettings();
  const allLogs = await getAllLogs();
  
  // Get latest log per user today to determine their current status and location
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  
  const userLatestLogs = new Map();
  for (const log of allLogs) {
    if (new Date(log.created_at) < todayStart) continue;
    if (!userLatestLogs.has(log.user_id)) {
      userLatestLogs.set(log.user_id, log);
    }
  }

  const markers = [];
  let workingCount = 0;
  let breakCount = 0;

  for (const log of userLatestLogs.values()) {
    if (log.event_type === 'clock_out') continue; // Not active
    
    if (log.event_type === 'clock_in' || log.event_type === 'break_end') {
      workingCount++;
    } else if (log.event_type === 'break_start') {
      breakCount++;
    }

    if (log.latitude && log.longitude) {
      markers.push({
        id: log.user_id,
        lat: log.latitude,
        lng: log.longitude,
        name: log.user_name,
        status: log.event_type === 'break_start' ? 'On Break' : 'Working',
        time: log.created_at,
        type: log.attendance_type
      });
    }
  }

  return (
    <div>
      <h1 className="page-title mb-6" style={{ marginBottom: '1.5rem' }}>Live Map</h1>
      
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p><strong>{workingCount}</strong> employees working | <strong>{breakCount}</strong> on break</p>
      </div>
      
      <MapView markers={markers} geofences={locations} />
    </div>
  );
}
