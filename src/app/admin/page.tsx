import { requireAnyRole } from "@/lib/auth";
import { getAttendanceStats, getMonthlyAnalytics, getWfhStaffList } from "@/lib/store";
import { StatsCard } from "@/components/stats-card";
import { DailyAttendanceChart, AttendanceTypeChart } from "@/components/charts/admin-charts";
import { Users, Coffee, Home, AlertTriangle, ChevronLeft, ChevronRight, Calendar, UserIcon } from "lucide-react";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAnyRole(["admin", "hr"]);
  
  const resolvedParams = await searchParams;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const selectedDateStr = resolvedParams.date || todayDateStr;
  
  // Date navigation logic
  const selectedDate = new Date(selectedDateStr);
  
  const prevDateObj = new Date(selectedDate);
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const prevDate = prevDateObj.toISOString().split('T')[0];
  
  const nextDateObj = new Date(selectedDate);
  nextDateObj.setDate(nextDateObj.getDate() + 1);
  const nextDate = nextDateObj.toISOString().split('T')[0];
  
  const isToday = selectedDateStr === todayDateStr;
  const displayDate = selectedDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  const todayStats = await getAttendanceStats(selectedDateStr);
  const monthlyData = await getMonthlyAnalytics(selectedDateStr);
  const wfhStaff = await getWfhStaffList(selectedDateStr);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title mb-0" style={{ margin: 0 }}>Admin Dashboard</h1>
        
        <div className="date-navigator card" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', gap: '1rem', marginBottom: 0 }}>
          <a href={`/admin?date=${prevDate}`} className="date-nav-btn">
            <ChevronLeft size={20} />
          </a>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, minWidth: '120px', justifyContent: 'center' }}>
            <Calendar size={16} className="text-muted" />
            {displayDate}
          </div>
          
          {isToday ? (
            <span className="date-nav-btn disabled" style={{ opacity: 0.3, cursor: 'not-allowed' }}>
              <ChevronRight size={20} />
            </span>
          ) : (
            <a href={`/admin?date=${nextDate}`} className="date-nav-btn">
              <ChevronRight size={20} />
            </a>
          )}
          
          {!isToday && (
            <a href="/admin" className="badge badge-primary" style={{ textDecoration: 'none', marginLeft: '0.5rem' }}>
              Today
            </a>
          )}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatsCard label="Clocked In" value={todayStats.clockedIn} icon={Users} color="var(--success-color)" />
        <StatsCard label="On Break" value={todayStats.onBreak} icon={Coffee} color="var(--warning-color)" />
        <StatsCard label="WFH" value={todayStats.wfh} icon={Home} color="var(--info-color)" />
        <StatsCard label="Geofence Warnings" value={todayStats.geofenceWarnings} icon={AlertTriangle} color="var(--danger-color)" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <DailyAttendanceChart data={monthlyData.daily} />
          <AttendanceTypeChart data={monthlyData.byType} />
        </div>
        
        <div className="card" style={{ padding: '1.5rem', height: '100%' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={18} className="text-muted" /> WFH Staff Today
          </h2>
          
          {wfhStaff.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No staff working from home.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {wfhStaff.map(staff => {
                const time = new Date(staff.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
                return (
                  <div key={staff.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="report-user-avatar" style={{ width: '36px', height: '36px' }}>
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{staff.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clocked in: {time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
