import { useTheme } from '@navet/app/hooks';
import { CardActionRow } from '@navet/app/ui-kit/patterns';
import { Button, CardMetric, CardMetricActionLayout } from '@navet/app/ui-kit/primitives';

export interface MetricActionRowProps {
  size: 'small' | 'medium' | 'large';
  value: string;
  label: string;
  active: boolean;
  // Caller resolves accent through its canonical feature/theme contract.
  accentClassName: string;
  action?: { label: string; onSelect: () => void; disabled?: boolean };
}
export function MetricActionRow({
  size,
  value,
  label,
  active,
  accentClassName,
  action,
}: MetricActionRowProps) {
  const { theme } = useTheme();
  return (
    <CardMetricActionLayout
      size={size}
      metric={
        <CardMetric
          value={value}
          label={label}
          isActive={active}
          accentClassName={accentClassName}
          theme={theme}
          size={size === 'large' ? 'lg' : 'sm'}
        />
      }
      actions={
        <CardActionRow
          theme={theme}
          size={size}
          rightContent={
            action ? (
              <Button size="compact" disabled={action.disabled} onClick={action.onSelect}>
                {action.label}
              </Button>
            ) : undefined
          }
        />
      }
    />
  );
}
