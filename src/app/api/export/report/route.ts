import { requireAnyRole } from "@/lib/auth";
import { getStaffReportSummary, getStaffDetailReport } from "@/lib/store";
import { ReportPeriod } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

function formatHoursDecimal(hours: number): string {
  return hours.toFixed(2);
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const dateStr = isoString.includes("T") ? isoString : isoString.replace(" ", "T") + "Z";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    });
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(["admin", "hr"]);

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get("period") as ReportPeriod) || "monthly";
    const userId = searchParams.get("userId") || undefined;

    const now = new Date();
    let date = searchParams.get("date") || "";
    if (!date) {
      if (period === "daily") date = now.toISOString().split("T")[0];
      else if (period === "monthly") date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      else date = String(now.getFullYear());
    }

    const workbook = XLSX.utils.book_new();

    if (userId) {
      // Export single staff detail
      const report = await getStaffDetailReport({ userId, period, date });

      const data = report.days.map((day) => ({
        Date: day.date,
        Type: day.attendanceType,
        "Clock In": formatTime(day.clockIn),
        "Clock Out": formatTime(day.clockOut),
        "Break (hrs)": formatHoursDecimal(day.breakDuration),
        "Working Hours": formatHoursDecimal(day.workingHours),
        "OT Hours": formatHoursDecimal(day.otHours),
      }));

      // Add totals row
      const totalWork = report.days.reduce((s, d) => s + d.workingHours, 0);
      const totalBreak = report.days.reduce((s, d) => s + d.breakDuration, 0);
      const totalOt = report.days.reduce((s, d) => s + d.otHours, 0);

      data.push({
        Date: "TOTAL",
        Type: "",
        "Clock In": "",
        "Clock Out": "",
        "Break (hrs)": formatHoursDecimal(totalBreak),
        "Working Hours": formatHoursDecimal(totalWork),
        "OT Hours": formatHoursDecimal(totalOt),
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, `${report.user.name}`);
    } else {
      // Export all staff summary
      const summary = await getStaffReportSummary({ period, date });

      const data = summary.map((staff) => ({
        Name: staff.userName,
        Email: staff.userEmail,
        "Days Present": staff.daysPresent,
        "Total Work Hours": formatHoursDecimal(staff.totalWorkingHours),
        "Total Break Hours": formatHoursDecimal(staff.totalBreakHours),
        "Total OT Hours": formatHoursDecimal(staff.totalOtHours),
        "Avg Hours/Day": formatHoursDecimal(staff.averageHoursPerDay),
      }));

      // Add totals row
      const totalWork = summary.reduce((s, r) => s + r.totalWorkingHours, 0);
      const totalBreak = summary.reduce((s, r) => s + r.totalBreakHours, 0);
      const totalOt = summary.reduce((s, r) => s + r.totalOtHours, 0);

      data.push({
        Name: "TOTAL",
        Email: "",
        "Days Present": 0,
        "Total Work Hours": formatHoursDecimal(totalWork),
        "Total Break Hours": formatHoursDecimal(totalBreak),
        "Total OT Hours": formatHoursDecimal(totalOt),
        "Avg Hours/Day": "",
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Report");
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = userId
      ? `staff_report_${period}_${date}.xlsx`
      : `all_staff_report_${period}_${date}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.error("Report export error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
