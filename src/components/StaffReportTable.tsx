"use client";

import { useState } from "react";
import { StaffDailyRow, ReportPeriod } from "@/lib/types";
import { Clock, Timer, TrendingUp, Calendar, Users, Download, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

interface StaffReportTableProps {
  rows: StaffDailyRow[];
  requiredHours: number;
  summary: {
    totalStaff: number;
    totalWorkHours: number;
    totalOtHours: number;
    staffWithOt: number;
  };
  initialPeriod: ReportPeriod;
  initialDate: string;
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
    });
  } catch {
    return dateStr;
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "office": return "Office";
    case "wfh": return "WFH";
    case "client_site": return "Client Site";
    case "field_work": return "Field Work";
    default: return type;
  }
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "wfh": return "badge-info";
    case "client_site": return "badge-warning";
    case "field_work": return "badge-danger";
    default: return "badge-success";
  }
}

export function StaffReportTable({ rows, requiredHours, summary, initialPeriod, initialDate }: StaffReportTableProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const [dateValue, setDateValue] = useState(initialDate);
  const [staffFilter, setStaffFilter] = useState("");

  // Get unique staff for filter
  const uniqueStaff = Array.from(new Set(rows.map(r => r.userName))).sort();

  // Filter rows
  const filteredRows = staffFilter
    ? rows.filter(r => r.userName.toLowerCase().includes(staffFilter.toLowerCase()))
    : rows;

  // Compute filtered totals
  const filteredWorkHours = filteredRows.reduce((s, r) => s + r.workingHours, 0);
  const filteredOtHours = filteredRows.reduce((s, r) => s + r.otHours, 0);

  const handleApplyFilter = () => {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("date", dateValue);
    window.location.href = `/admin/reports?${params.toString()}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "daily": return "Day";
      case "monthly": return "Month";
      case "yearly": return "Year";
    }
  };

  const getExportUrl = () => {
    return `/api/export/report?period=${period}&date=${dateValue}`;
  };

  // Group rows by staff for the grouped view
  const groupedByStaff: Record<string, StaffDailyRow[]> = {};
  for (const row of filteredRows) {
    if (!groupedByStaff[row.userId]) groupedByStaff[row.userId] = [];
    groupedByStaff[row.userId].push(row);
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="report-summary-grid">
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
            <Users size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{summary.totalStaff}</span>
            <span className="report-summary-label">Total Staff</span>
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <Clock size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{formatHours(summary.totalWorkHours)}</span>
            <span className="report-summary-label">Total Work Hours</span>
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
            <Timer size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{formatHours(summary.totalOtHours)}</span>
            <span className="report-summary-label">Total OT Hours</span>
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
            <TrendingUp size={22} />
          </div>
          <div className="report-summary-info">
            <span className="report-summary-value">{summary.staffWithOt}</span>
            <span className="report-summary-label">Staff with OT</span>
          </div>
        </div>
      </div>

      {/* Filters */}
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
                className={`report-period-btn ${period === p ? "active" : ""}`}
                onClick={() => {
                  setPeriod(p);
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
            {period === "yearly" ? (
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
                type={period === "daily" ? "date" : "month"}
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
              Export Excel
            </a>
          </div>
        </div>
      </div>

      {/* Search Staff */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Search size={16} className="text-muted" />
          <input
            type="text"
            className="form-control"
            placeholder="Search staff by name..."
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            style={{ padding: "0.4rem 0.75rem", flex: 1, maxWidth: "350px" }}
          />
          {staffFilter && (
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              Showing {filteredRows.length} of {rows.length} records
            </span>
          )}
        </div>
      </div>

      {/* Attendance Table — grouped by staff */}
      <div className="card">
        <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""} • Required: {requiredHours}h/day
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Clock Type</th>
                <th style={{ textAlign: "center" }}>Time In</th>
                <th style={{ textAlign: "center" }}>Time Out</th>
                <th style={{ textAlign: "center" }}>Work Hours</th>
                <th style={{ textAlign: "center" }}>OT</th>
                <th style={{ width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByStaff).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                    No attendance records for this period.
                  </td>
                </tr>
              ) : (
                Object.entries(groupedByStaff).map(([userId, staffRows]) => {
                  const staffOt = staffRows.reduce((s, r) => s + r.otHours, 0);
                  const staffWork = staffRows.reduce((s, r) => s + r.workingHours, 0);
                  return staffRows.map((row, idx) => (
                    <tr key={`${row.userId}-${row.date}`} className={idx === 0 ? "report-staff-first-row" : ""}>
                      {/* Show staff name only on first row of group */}
                      {idx === 0 ? (
                        <td rowSpan={staffRows.length} className="report-staff-cell">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div className="report-user-avatar">
                              {row.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{row.userName}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                {staffRows.length} day{staffRows.length !== 1 ? "s" : ""} • Work: {formatHours(staffWork)} • OT: {formatHours(staffOt)}
                              </div>
                            </div>
                          </div>
                        </td>
                      ) : null}
                      <td style={{ fontSize: "0.875rem" }}>{formatDate(row.date)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${getTypeBadgeClass(row.attendanceType)}`}>
                          {getTypeLabel(row.attendanceType)}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: "0.875rem", fontWeight: 500 }}>
                        {formatTime(row.clockIn)}
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: "0.875rem", fontWeight: 500 }}>
                        {formatTime(row.clockOut)}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600, fontSize: "0.875rem" }}>
                        {formatHours(row.workingHours)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`report-ot-badge ${row.otHours > 0 ? "has-ot" : ""}`}>
                          {formatHours(row.otHours)}
                        </span>
                      </td>
                      {idx === 0 ? (
                        <td rowSpan={staffRows.length} style={{ verticalAlign: "middle" }}>
                          <Link
                            href={`/admin/reports/${row.userId}?period=${period}&date=${dateValue}`}
                            className="report-detail-link"
                            title="View full report"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ));
                })
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="report-totals-row">
                  <td colSpan={5} style={{ fontWeight: 700, textAlign: "right", paddingRight: "1.5rem" }}>
                    TOTALS
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "var(--primary-color)" }}>
                    {formatHours(filteredWorkHours)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`report-ot-badge ${filteredOtHours > 0 ? "has-ot" : ""}`} style={{ fontWeight: 700 }}>
                      {formatHours(filteredOtHours)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
