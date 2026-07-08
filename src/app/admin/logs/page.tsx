import { requireAnyRole } from "@/lib/auth";
import { getAllLogs, getUsers } from "@/lib/store";
import { StaffLogsView } from "@/components/StaffLogsView";

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ user?: string, period?: string, date?: string }> }) {
  await requireAnyRole(["admin", "hr"]);
  const resolvedParams = await searchParams;
  
  const userId = resolvedParams.user;
  const period = (resolvedParams.period as "daily" | "monthly" | "yearly") || "monthly";
  
  const now = new Date();
  let date = resolvedParams.date || "";
  if (!date) {
    if (period === "daily") date = now.toISOString().split("T")[0];
    else if (period === "monthly") date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    else date = String(now.getFullYear());
  }
  
  const allUsers = await getUsers();
  
  let logs: any[] = [];
  if (userId) {
    let start = date;
    let end = date;

    if (period === "monthly") {
      const year = date.split("-")[0];
      const month = date.split("-")[1];
      start = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
    } else if (period === "yearly") {
      start = `${date}-01-01`;
      end = `${date}-12-31`;
    }
    
    logs = await getAllLogs({ 
      startDate: start, 
      endDate: end, 
      userId 
    });
  }

  return (
    <div>
      <h1 className="page-title mb-0" style={{ marginBottom: '1.5rem', margin: 0 }}>Attendance Logs</h1>
      <StaffLogsView 
        users={allUsers}
        selectedUserId={userId}
        logs={logs}
        period={period}
        date={date}
      />
    </div>
  );
}
