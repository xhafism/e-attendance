import { requireAnyRole } from "@/lib/auth";
import { getAllLogs, getUsers } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(["admin", "hr"]);
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start") || undefined;
    const endDate = searchParams.get("end") || undefined;
    const userId = searchParams.get("user") || undefined;
    
    const logs = await getAllLogs({ startDate, endDate, userId });
    
    // Format data for Excel
    const data = logs.map(log => ({
      'Name': log.user_name,
      'Email': log.user_email,
      'Event': log.event_type,
      'Location Type': log.attendance_type,
      'Time (UTC)': new Date(log.created_at).toISOString(),
      'Geofence Warning': log.is_outside_geofence ? 'Yes' : 'No',
      'Latitude': log.latitude || 'N/A',
      'Longitude': log.longitude || 'N/A',
      'Note': log.note || 'N/A'
    }));
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Logs");
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Return as downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance_logs_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Forbidden") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.error("Export error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
