import { InteractivePill } from '@navet/app/components/primitives';
import type { CSSProperties } from 'react';

interface SelectablePillProps {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
  style?: CSSProperties;
}

export function SelectablePill({
  label,
  description,
  active,
  onClick,
  style,
}: SelectablePillProps) {
  return (
    <InteractivePill
      onClick={onClick}
      active={active}
      intent="navigation"
      variant="default"
      className="min-h-12 w-full items-start justify-start rounded-xl px-3 py-2.5 text-left"
      style={style}
    >
      <div className="text-sm font-semibold">{label}</div>
      {description ? <div className="mt-1 text-sm text-white/72">{description}</div> : null}
    </InteractivePill>
  );
}
