import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties, ReactNode } from 'react';

interface TvControlButtonProps {
  theme: ThemeType;
  size?: CardSize | 'large';
  label: string;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  iconClassName?: string;
  onPress: () => void;
  children: ReactNode;
}

export function TvControlButton({
  theme,
  size = 'small',
  label,
  disabled = false,
  style,
  className = '',
  iconClassName = '',
  onPress,
  children,
}: TvControlButtonProps) {
  return (
    <RoundControlButton
      theme={theme}
      size={size}
      variant="neutral"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      className={`border backdrop-blur-xl transition-colors disabled:opacity-40 ${className}`}
      iconClassName={iconClassName}
      style={style}
    >
      {children}
    </RoundControlButton>
  );
}
