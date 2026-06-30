import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtext?: string;
}

export function StatsCard({ label, value, icon: Icon, color, subtext }: StatsCardProps) {
  return (
    <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
        <div style={{ color }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtext}</div>}
    </div>
  );
}
