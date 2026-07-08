import { requireAnyRole } from "@/lib/auth";
import { getStaffDetailReport } from "@/lib/store";
import { StaffDetailReport } from "@/components/StaffDetailReport";
import { ReportPeriod } from "@/lib/types";

export default async function StaffReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  await requireAnyRole(["admin", "hr"]);
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const period = (resolvedSearchParams.period as ReportPeriod) || "monthly";
  const now = new Date();

  let date = resolvedSearchParams.date || "";
  if (!date) {
    if (period === "daily") {
      date = now.toISOString().split("T")[0];
    } else if (period === "monthly") {
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    } else {
      date = String(now.getFullYear());
    }
  }

  const report = await getStaffDetailReport({
    userId: resolvedParams.userId,
    period,
    date,
  });

  return (
    <StaffDetailReport
      user={report.user}
      days={report.days}
      requiredHours={report.requiredHours}
      period={period}
      date={date}
    />
  );
}
