"use client";

import ChartWrapper from "./chart-wrapper";

export function DailyAttendanceChart({ data }: { data: any[] }) {
  const options = {
    chart: { type: 'bar' as const },
    xaxis: { categories: data.map(d => d.date) },
  };
  const series = [{ name: 'Present', data: data.map(d => d.present) }];

  return (
    <div className="card">
      <h3 className="card-title">Daily Attendance</h3>
      <ChartWrapper type="bar" options={options} series={series} height={300} />
    </div>
  );
}

export function AttendanceTypeChart({ data }: { data: any }) {
  const options = {
    labels: ['Office', 'WFH', 'Client Site', 'Field Work'],
    chart: { type: 'donut' as const },
  };
  const series = [data.office || 0, data.wfh || 0, data.clientSite || 0, data.fieldWork || 0];

  return (
    <div className="card">
      <h3 className="card-title">By Location Type</h3>
      <ChartWrapper type="donut" options={options} series={series} height={300} />
    </div>
  );
}
