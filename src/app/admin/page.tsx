import { requireAnyRole } from "@/lib/auth";
import { getAttendanceStats } from "@/lib/store";
import { StatsCard } from "@/components/stats-card";
import { DailyAttendanceChart, AttendanceTypeChart } from "@/components/charts/admin-charts";
import { Users, Coffee, Home, AlertTriangle } from "lucide-react";

export default async function AdminDashboardPage() {
  await requireAnyRole(["admin", "hr"]);
  const todayStats = await getAttendanceStats();
  
  // Mock monthly data since full aggregation SQL isn't built yet
  const mockMonthly = {
    daily: [
      { date: 'Mon', present: 45 },
      { date: 'Tue', present: 48 },
      { date: 'Wed', present: 46 },
      { date: 'Thu', present: 49 },
      { date: 'Fri', present: 43 },
    ],
    byType: { office: 30, wfh: 10, clientSite: 3, fieldWork: 2 }
  };

  return (
    <div>
      <h1 className="page-title mb-6" style={{ marginBottom: '1.5rem' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatsCard label="Clocked In Today" value={todayStats.clockedIn} icon={Users} color="var(--success-color)" />
        <StatsCard label="On Break" value={todayStats.onBreak} icon={Coffee} color="var(--warning-color)" />
        <StatsCard label="WFH Today" value={todayStats.wfh} icon={Home} color="var(--info-color)" />
        <StatsCard label="Geofence Warnings" value={todayStats.geofenceWarnings} icon={AlertTriangle} color="var(--danger-color)" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <DailyAttendanceChart data={mockMonthly.daily} />
        <AttendanceTypeChart data={mockMonthly.byType} />
      </div>
    </div>
  );
}
