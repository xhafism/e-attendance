import { requireAnyRole } from "@/lib/auth";
import { getAllStaffDailyReport } from "@/lib/store";
import { StaffReportTable } from "@/components/StaffReportTable";
import { ReportPeriod } from "@/lib/types";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; date?: string }> }) {
  await requireAnyRole(["admin", "hr"]);
  const resolvedParams = await searchParams;

  const period = (resolvedParams.period as ReportPeriod) || "monthly";
  const now = new Date();

  let date = resolvedParams.date || "";
  if (!date) {
    if (period === "daily") {
      date = now.toISOString().split("T")[0];
    } else if (period === "monthly") {
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    } else {
      date = String(now.getFullYear());
    }
  }

  const report = await getAllStaffDailyReport({ period, date });

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: "1.5rem" }}>Staff Reports & OT</h1>
      <StaffReportTable
        rows={report.rows}
        requiredHours={report.requiredHours}
        summary={report.summary}
        initialPeriod={period}
        initialDate={date}
      />
    </div>
  );
}
