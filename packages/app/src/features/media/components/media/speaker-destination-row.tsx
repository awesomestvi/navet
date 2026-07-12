import { InteractivePill } from '@navet/app/components/primitives';
import { Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

interface SpeakerDestinationRowProps {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  isGlass: boolean;
  onClick: () => void;
  primaryTextClassName: string;
  secondaryTextClassName: string;
  subtitle?: string;
  subtitleStyle?: CSSProperties;
  title: string;
  titleStyle?: CSSProperties;
}

export function SpeakerDestinationRow({
  active = false,
  disabled = false,
  icon,
  isGlass,
  onClick,
  primaryTextClassName,
  secondaryTextClassName,
  subtitle,
  subtitleStyle,
  title,
  titleStyle,
}: SpeakerDestinationRowProps) {
  return (
    <InteractivePill
      onClick={onClick}
      disabled={disabled}
      active={active}
      intent="navigation"
      variant="default"
      className={`min-h-12 w-full items-center justify-start gap-3 rounded-[1.35rem] px-3.5 py-2.5 text-left ${
        disabled ? 'cursor-default disabled:opacity-100' : ''
      }`}
      style={titleStyle}
    >
      <div
        className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full ${
          active
            ? isGlass
              ? 'bg-white/16'
              : 'bg-white/12'
            : isGlass
              ? 'bg-white/10'
              : 'bg-white/[0.06]'
        }`}
        style={titleStyle}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-medium leading-4 ${primaryTextClassName}`}
          style={titleStyle}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            className={`truncate text-xs leading-4 ${secondaryTextClassName}`}
            style={subtitleStyle}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {active ? (
        <div
          className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full ${
            isGlass ? 'bg-white/14' : 'bg-white/10'
          }`}
          style={titleStyle}
        >
          <Check className="h-4 w-4" />
        </div>
      ) : null}
    </InteractivePill>
  );
}
