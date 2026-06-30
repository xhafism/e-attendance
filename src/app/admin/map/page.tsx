import { requireAnyRole } from "@/lib/auth";
import { getGeofenceSettings, getAllAttendance } from "@/lib/store";
import { MapView } from "@/components/MapView";

export default async function AdminMapPage() {
  await requireAnyRole(["admin", "hr"]);
  const { locations } = await getGeofenceSettings();
  const allLogs = await getAllAttendance();
  
  // Get latest log per user today to determine their current status and location
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const userLatestLogs = new Map();
  for (const log of allLogs) {
    if (new Date(log.createdAt).getTime() < todayStart.getTime()) continue;
    if (!userLatestLogs.has(log.userId)) {
      userLatestLogs.set(log.userId, log);
    }
  }

  const markers = [];
  let workingCount = 0;
  let breakCount = 0;

  for (const log of userLatestLogs.values()) {
    if (log.eventType === 'clock_out') continue; // Not active
    
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
        status: log.eventType === 'break_start' ? 'On Break' : 'Working',
        time: log.createdAt,
        type: log.attendanceType
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
