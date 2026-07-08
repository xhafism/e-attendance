"use client";

import { useState } from "react";
import { StaffDayDetail, ReportPeriod } from "@/lib/types";
import { ArrowLeft, Clock, Timer, TrendingUp, Calendar, Download } from "lucide-react";
import Link from "next/link";

interface StaffDetailReportProps {
  user: { id: string; name: string; email: string };
  days: StaffDayDetail[];
  requiredHours: number;
  period: ReportPeriod;
  date: string;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return "—";
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const dateStr = isoString.includes("T") ? isoString : isoString.replace(" ", "T") + "Z";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    });
  } catch {
    return "—";
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-MY", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getAttendanceLabel(type: string): string {
  switch (type) {
    case "office": return "Office";
    case "wfh": return "WFH";
    case "client_site": return "Client Site";
    case "field_work": return "Field Work";
    default: return type;
  }
}

export function StaffDetailReport({ user, days, requiredHours, period, date }: StaffDetailReportProps) {
  const [currentPeriod, setCurrentPeriod] = useState<ReportPeriod>(period);
  const [dateValue, setDateValue] = useState(date);

  const totalWork = days.reduce((sum, d) => sum + d.workingHours, 0);
  const totalOt = days.reduce((sum, d) => sum + d.otHours, 0);
  const totalBreak = days.reduce((sum, d) => sum + d.breakDuration, 0);
  const daysPresent = days.filter(d => d.clockIn !== null).length;

  const handleApplyFilter = () => {
    const params = new URLSearchParams();
    params.set("period", currentPeriod);
    params.set("date", dateValue);
    window.location.href = `/admin/reports/${user.id}?${params.toString()}`;
  };

  const getPeriodLabel = () => {
    switch (currentPeriod) {
      case "daily": return "Day";
      case "monthly": return "Month";
      case "yearly": return "Year";
    }
  };

  const getExportUrl = () => {
    return `/api/export/report?period=${currentPeriod}&date=${dateValue}&userId=${user.id}`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <Link href={`/admin/reports?period=${period}&date=${date}`} className="btn btn-secondary" style={{ padding: "0.5rem 0.75rem" }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{user.name}</h1>
          <span className="text-muted" style={{ fontSize: "0.875rem" }}>{user.email}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="report-summary-grid">
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
            <Calendar size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{daysPresent}</span>
            <span className="report-summary-label">Days Present</span>
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <Clock size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{formatHours(totalWork)}</span>
            <span className="report-summary-label">Total Work Hours</span>
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
            <Timer size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{formatHours(totalOt)}</span>
            <span className="report-summary-label">Total OT</span>
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
            <TrendingUp size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{daysPresent > 0 ? formatHours(totalWork / daysPresent) : "—"}</span>
            <span className="report-summary-label">Avg per Day</span>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={16} className="text-muted" />
            <span className="text-muted" style={{ fontWeight: 500, fontSize: "0.9rem" }}>Period:</span>
          </div>

          <div className="report-period-toggle">
            {(["daily", "monthly", "yearly"] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                className={`report-period-btn ${currentPeriod === p ? "active" : ""}`}
                onClick={() => {
                  setCurrentPeriod(p);
                  const now = new Date();
                  if (p === "daily") setDateValue(now.toISOString().split("T")[0]);
                  else if (p === "monthly") setDateValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                  else setDateValue(String(now.getFullYear()));
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem" }}>Select {getPeriodLabel()}:</label>
            {currentPeriod === "yearly" ? (
              <input
                type="number"
                className="form-control"
                style={{ width: "120px", padding: "0.35rem 0.75rem" }}
                value={dateValue}
                min="2020"
                max="2030"
                onChange={(e) => setDateValue(e.target.value)}
              />
            ) : (
              <input
                type={currentPeriod === "daily" ? "date" : "month"}
                className="form-control"
                style={{ width: "auto", padding: "0.35rem 0.75rem" }}
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
            <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={handleApplyFilter}>
              Apply
            </button>
            <a href={getExportUrl()} className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>
              <Download size={16} style={{ marginRight: "0.5rem" }} />
              Export
            </a>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="card">
        <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          {days.length} day{days.length !== 1 ? "s" : ""} • Required: {requiredHours}h/day
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Type</th>
                <th style={{ textAlign: "center" }}>Clock In</th>
                <th style={{ textAlign: "center" }}>Clock Out</th>
                <th style={{ textAlign: "center" }}>Break</th>
                <th style={{ textAlign: "center" }}>Work Hours</th>
                <th style={{ textAlign: "center" }}>OT</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                    No attendance records for this period.
                  </td>
                </tr>
              ) : (
                days.map((day) => {
                  const isAbsent = day.clockIn === null;
                  const hasOt = day.otHours > 0;
                  return (
                    <tr key={day.date} style={{ opacity: isAbsent ? 0.45 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{formatDate(day.date)}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isAbsent ? (
                          <span className="badge badge-default">Absent</span>
                        ) : (
                          <span className={`badge ${day.attendanceType === 'wfh' ? 'badge-info' : day.attendanceType === 'client_site' ? 'badge-warning' : 'badge-success'}`}>
                            {getAttendanceLabel(day.attendanceType)}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: "0.9rem" }}>
                        {formatTime(day.clockIn)}
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: "0.9rem" }}>
                        {formatTime(day.clockOut)}
                      </td>
                      <td style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        {isAbsent ? "—" : formatHours(day.breakDuration)}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {isAbsent ? "—" : formatHours(day.workingHours)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`report-ot-badge ${hasOt ? "has-ot" : ""}`}>
                          {isAbsent ? "—" : formatHours(day.otHours)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {days.length > 0 && (
              <tfoot>
                <tr className="report-totals-row">
                  <td colSpan={4} style={{ fontWeight: 700, textAlign: "right", paddingRight: "1.5rem" }}>
                    TOTALS
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "var(--text-muted)" }}>
                    {formatHours(totalBreak)}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "var(--primary-color)" }}>
                    {formatHours(totalWork)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`report-ot-badge ${totalOt > 0 ? "has-ot" : ""}`} style={{ fontWeight: 700 }}>
                      {formatHours(totalOt)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
