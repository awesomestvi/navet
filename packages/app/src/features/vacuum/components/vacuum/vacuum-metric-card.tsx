import { cn } from '@navet/app/components/ui/utils';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
  style?: CSSProperties;
}

export function MetricCard({ icon: Icon, label, value, className, style }: MetricCardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-white/10 bg-white/6 p-3', className)}
      style={style}
    >
      <div className="flex items-center gap-2 text-white/72">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
