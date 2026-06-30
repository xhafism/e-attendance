import { requireAnyRole } from "@/lib/auth";
import { getAttendanceStats, getMonthlyAnalytics } from "@/lib/store";
import { StatsCard } from "@/components/stats-card";
import { DailyAttendanceChart, AttendanceTypeChart } from "@/components/charts/admin-charts";
import { Users, Coffee, Home, AlertTriangle } from "lucide-react";

export default async function AdminDashboardPage() {
  await requireAnyRole(["admin", "hr"]);
  const todayStats = await getAttendanceStats();
  
  // Real data fetched directly from database
  const monthlyData = await getMonthlyAnalytics();

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
        <DailyAttendanceChart data={monthlyData.daily} />
        <AttendanceTypeChart data={monthlyData.byType} />
      </div>
    </div>
  );
}
