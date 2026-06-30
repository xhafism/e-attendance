"use client";

import dynamic from "next/dynamic";
import { Props } from "react-apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ChartWrapper(props: Props) {
  const defaultOptions: ApexCharts.ApexOptions = {
    chart: {
      fontFamily: 'var(--font-family)',
      toolbar: { show: false },
      background: 'transparent'
    },
    theme: {
      mode: 'light'
    },
    colors: ['#09090b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
    grid: {
      borderColor: 'var(--border-color)',
      strokeDashArray: 4
    },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: { borderRadius: 2 }
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...props.options,
    chart: { ...defaultOptions.chart, ...props.options?.chart },
    plotOptions: { ...defaultOptions.plotOptions, ...props.options?.plotOptions }
  };

  return <Chart {...props} options={mergedOptions} />;
}
