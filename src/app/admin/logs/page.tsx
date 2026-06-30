import { requireAnyRole } from "@/lib/auth";
import { getAllLogs, getUsers } from "@/lib/store";
import { AttendanceTable } from "@/components/AttendanceTable";
import { Download, Filter } from "lucide-react";

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ start?: string, end?: string, user?: string }> }) {
  await requireAnyRole(["admin", "hr"]);
  const resolvedParams = await searchParams;
  
  const start = resolvedParams.start || "";
  const end = resolvedParams.end || "";
  const user = resolvedParams.user || "all";
  
  const logs = await getAllLogs({ 
    startDate: start || undefined, 
    endDate: end || undefined, 
    userId: user === "all" ? undefined : user 
  });
  
  const allUsers = await getUsers();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title mb-0" style={{ margin: 0 }}>Attendance Logs</h1>
      </div>
      
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} className="text-muted" />
            <span className="text-muted" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Filters:</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem' }}>User</label>
            <select name="user" defaultValue={user} className="form-control" style={{ width: 'auto', padding: '0.35rem 0.75rem' }}>
              <option value="all">All Users</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem' }}>Start Date</label>
            <input type="date" name="start" defaultValue={start} className="form-control" style={{ width: 'auto', padding: '0.35rem 0.75rem' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem' }}>End Date</label>
            <input type="date" name="end" defaultValue={end} className="form-control" style={{ width: 'auto', padding: '0.35rem 0.75rem' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              Apply Filters
            </button>
            
            <button type="submit" formAction="/api/export/attendance" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              Export to Excel
            </button>
          </div>
        </form>
      </div>
      
      <div className="card">
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Showing {logs.length} log(s)
        </div>
        <AttendanceTable logs={logs} showUserColumn={true} />
      </div>
    </div>
  );
}
