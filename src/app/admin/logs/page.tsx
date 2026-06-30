import { requireAnyRole } from "@/lib/auth";
import { getAllLogs } from "@/lib/store";
import { AttendanceTable } from "@/components/AttendanceTable";
import { Download } from "lucide-react";

export default async function AdminLogsPage() {
  await requireAnyRole(["admin", "hr"]);
  const logs = await getAllLogs();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Attendance Logs</h1>
        
        <a href="/api/export/attendance" className="btn btn-primary" download>
          <Download size={16} style={{ marginRight: '0.5rem' }} />
          Export to Excel
        </a>
      </div>
      
      <div className="card">
        <AttendanceTable logs={logs} showUserColumn={true} />
      </div>
    </div>
  );
}
