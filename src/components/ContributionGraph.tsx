"use client";

import { useMemo, useState } from "react";
import { AttendanceLog } from "@/lib/types";

interface ContributionGraphProps {
  logs: AttendanceLog[];
  requiredHours?: number;
}

type DayStatus = "full" | "short" | "overtime" | "late" | "outside" | "missed";

const STATUS_COLORS: Record<DayStatus, string> = {
  full: "var(--success-color, #10b981)",
  short: "var(--info-color, #3b82f6)",
  overtime: "var(--primary-color, #6366f1)",
  late: "var(--warning-color, #f59e0b)",
  outside: "var(--danger-color, #ef4444)",
  missed: "rgba(0,0,0,0.05)",
};

const STATUS_LABELS: Record<DayStatus, string> = {
  full: "Full Hours",
  short: "Short Hours",
  overtime: "Overtime",
  late: "Late In",
  outside: "Outside Geofence",
  missed: "No Activity",
};

export function ContributionGraph({ logs, requiredHours = 9 }: ContributionGraphProps) {
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string, visible: boolean }>({ x: 0, y: 0, text: "", visible: false });

  const history = useMemo(() => {
    const map: Record<string, { status: DayStatus, label: string }> = {};
    
    // Group logs by YYYY-MM-DD in KL timezone
    const grouped: Record<string, AttendanceLog[]> = {};
    for (const log of logs) {
      const date = new Date(log.createdAt);
      const dateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }); // en-CA gives YYYY-MM-DD
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(log);
    }

    for (const [dateStr, dayLogs] of Object.entries(grouped)) {
      // Sort logs chronologically
      dayLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      const hasOutside = dayLogs.some(l => l.isOutsideGeofence);
      
      const clockIns = dayLogs.filter(l => l.eventType === "clock_in");
      const clockOuts = dayLogs.filter(l => l.eventType === "clock_out");
      
      let status: DayStatus = "full";
      let label = "Valid";
      
      if (hasOutside) {
        status = "outside";
        label = "Outside Geofence";
      } else if (clockIns.length > 0) {
        const firstIn = new Date(clockIns[0].createdAt);
        // Check if late (after 09:15 AM KL time)
        const hour = parseInt(firstIn.toLocaleTimeString("en-US", { hour: '2-digit', hour12: false, timeZone: 'Asia/Kuala_Lumpur' }));
        const minute = parseInt(firstIn.toLocaleTimeString("en-US", { minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }));
        
        const isLate = (hour > 9) || (hour === 9 && minute > 15);
        
        let hoursWorked = 0;
        if (clockOuts.length > 0) {
          const lastOut = new Date(clockOuts[clockOuts.length - 1].createdAt);
          hoursWorked = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
        }

        if (isLate) {
          status = "late";
          label = `Late (${firstIn.toLocaleTimeString([], {timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur'})})`;
        } else if (hoursWorked > 0 && hoursWorked >= requiredHours + 2) {
          status = "overtime";
          label = `Overtime (${hoursWorked.toFixed(1)}h)`;
        } else if (hoursWorked > 0 && hoursWorked < requiredHours) {
          status = "short";
          label = `Short Hours (${hoursWorked.toFixed(1)}h)`;
        } else if (hoursWorked === 0) {
          // No clock out yet
          status = "short";
          label = "Clocked In (No Clock Out)";
        } else {
          status = "full";
          label = `Full Hours (${hoursWorked.toFixed(1)}h)`;
        }
      } else {
        // No clock_in, maybe only WFH logs without clock in?
        status = "missed";
        label = "Invalid Data";
      }

      map[dateStr] = { status, label };
    }
    
    return map;
  }, [logs, requiredHours]);

  // Build grid of 52 weeks x 7 days
  const grid = useMemo(() => {
    const today = new Date();
    // Use KL timezone for "today"
    const klDateStr = today.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const endDate = new Date(klDateStr + "T00:00:00Z");
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 364);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek); // Start on Sunday

    const weeks: Array<Array<{ date: string; data: { status: DayStatus, label: string } | null }>> = [];
    const cursor = new Date(startDate);
    
    const monthPositions: { label: string; x: number }[] = [];
    let lastMonth = -1;

    let weekIdx = 0;
    while (cursor <= endDate) {
      const week: Array<{ date: string; data: { status: DayStatus, label: string } | null }> = [];
      
      let firstDayInWeek = null;
      
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().split("T")[0];
        if (d === 0) firstDayInWeek = cursor.getMonth();
        
        // Is it in the last 365 days range?
        const isInRange = cursor >= new Date(endDate.getTime() - 364 * 24 * 60 * 60 * 1000) && cursor <= endDate;
        
        week.push({ 
          date: dateStr, 
          data: isInRange ? (history[dateStr] || { status: "missed", label: "No Activity" }) : null 
        });
        
        cursor.setDate(cursor.getDate() + 1);
      }
      
      if (firstDayInWeek !== null && firstDayInWeek !== lastMonth && weekIdx > 0) {
        monthPositions.push({ 
          label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][firstDayInWeek], 
          x: weekIdx * 14 
        });
        lastMonth = firstDayInWeek;
      }
      
      weeks.push(week);
      weekIdx++;
    }

    return { weeks, monthPositions };
  }, [history]);

  const cellSize = 12;
  const cellGap = 2;
  const stride = cellSize + cellGap;

  return (
    <div className="contribution-graph-container" style={{ position: 'relative', marginTop: '1rem' }}>
      <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <svg
          width={grid.weeks.length * stride + 20}
          height={20 + 7 * stride}
          style={{ display: "block" }}
        >
          {grid.monthPositions.map(({ label, x }) => (
            <text
              key={`${label}-${x}`}
              x={x}
              y={12}
              fontSize={10}
              fill="var(--text-muted, #6b7280)"
            >
              {label}
            </text>
          ))}

          {grid.weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day.data) return null;
              const x = wi * stride;
              const y = 20 + di * stride;

              return (
                <rect
                  key={day.date}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  ry={2}
                  fill={STATUS_COLORS[day.data.status]}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + window.scrollX + (cellSize/2),
                      y: rect.top + window.scrollY - 10,
                      text: `${day.date}: ${day.data?.label}`,
                      visible: true
                    });
                  }}
                  onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS.missed }}></span> No Activity
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS.full }}></span> Full Hours
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS.short }}></span> Short Hours
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS.overtime }}></span> Overtime
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS.late }}></span> Late
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: STATUS_COLORS.outside }}></span> Outside Geofence
        </span>
      </div>

      {/* Tooltip Portal */}
      {tooltip.visible && (
        <div style={{
          position: 'fixed',
          top: tooltip.y, 
          left: tooltip.x,
          transform: `translate(-50%, -100%)`, 
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 100
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
