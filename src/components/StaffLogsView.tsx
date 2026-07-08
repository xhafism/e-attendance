"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { AttendanceTable } from "./AttendanceTable";
import { Calendar, Search, Download, ChevronRight, User as UserIcon } from "lucide-react";

interface StaffLogsViewProps {
  users: User[];
  selectedUserId?: string;
  logs?: any[];
  period: "daily" | "monthly" | "yearly";
  date: string;
}

export function StaffLogsView({ users, selectedUserId, logs = [], period: initialPeriod, date: initialDate }: StaffLogsViewProps) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(initialPeriod);
  const [dateValue, setDateValue] = useState(initialDate);

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleApplyFilter = () => {
    if (!selectedUserId) return;
    const params = new URLSearchParams();
    params.set("user", selectedUserId);
    params.set("period", period);
    params.set("date", dateValue);
    window.location.href = `/admin/logs?${params.toString()}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "daily":
        return "Day";
      case "monthly":
        return "Month";
      case "yearly":
        return "Year";
    }
  };

  const getExportUrl = () => {
    // Determine start and end based on period and dateValue
    let start = dateValue;
    let end = dateValue;

    if (period === "monthly") {
      const year = dateValue.split("-")[0];
      const month = dateValue.split("-")[1];
      start = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
    } else if (period === "yearly") {
      start = `${dateValue}-01-01`;
      end = `${dateValue}-12-31`;
    }

    return `/api/export/attendance?user=${selectedUserId}&start=${start}&end=${end}`;
  };

  return (
    <div className="logs-view-layout">
      {/* Left Sidebar: Staff List */}
      <div className="logs-sidebar card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: "500px" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <UserIcon size={18} className="text-muted" />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Staff Members</h3>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={16} className="text-muted" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.25rem", width: "100%" }}
            />
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>No staff found</div>
          ) : (
            <div className="staff-list">
              {filteredUsers.map((u) => {
                const isActive = u.id === selectedUserId;
                return (
                  <a
                    key={u.id}
                    href={`/admin/logs?user=${u.id}&period=${period}&date=${dateValue}`}
                    className={`staff-list-item ${isActive ? "active" : ""}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div className="report-user-avatar" style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isActive ? 600 : 500, color: isActive ? "var(--primary-color)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.9rem" }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email}
                      </div>
                    </div>
                    {isActive && <ChevronRight size={16} color="var(--primary-color)" />}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Main Content: Logs View */}
      <div className="logs-main">
        {!selectedUser ? (
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", minHeight: "500px" }}>
            <UserIcon size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <p>Select a staff member from the list to view their logs.</p>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.25rem", fontWeight: 700 }}>{selectedUser.name}'s Logs</h2>
                  <div className="text-muted" style={{ fontSize: "0.875rem" }}>{selectedUser.email}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div className="report-period-toggle">
                    {(["daily", "monthly", "yearly"] as const).map((p) => (
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
                    {period === "yearly" ? (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: "100px", padding: "0.35rem 0.75rem" }}
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

                  <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={handleApplyFilter}>
                    Apply
                  </button>
                  <a href={getExportUrl()} className="btn btn-primary" style={{ padding: "0.4rem 1rem" }}>
                    <Download size={16} style={{ marginRight: "0.5rem" }} />
                    Export
                  </a>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                Showing {logs.length} log(s) for the selected period
              </div>
              <AttendanceTable logs={logs} showUserColumn={false} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
