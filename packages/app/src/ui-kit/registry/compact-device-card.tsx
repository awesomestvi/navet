import { BaseCard, BodyText, Button } from '@navet/app/ui-kit/primitives';

export interface CompactDeviceCardProps {
  title: string;
  room?: string;
  stateLabel: string;
  unavailableLabel?: string;
  active?: boolean;
  action?: { label: string; onSelect: () => void; disabled?: boolean };
}

export function CompactDeviceCard({
  title,
  room,
  stateLabel,
  unavailableLabel,
  active = false,
  action,
}: CompactDeviceCardProps) {
  return (
    <BaseCard size="small" title={title} subtitle={room} isActive={active}>
      <div className="flex h-full min-h-0 flex-col justify-between gap-2">
        <BodyText tone={unavailableLabel ? 'muted' : 'default'}>
          {unavailableLabel ?? stateLabel}
        </BodyText>
        {action ? (
          <Button
            size="small"
            variant="secondary"
            disabled={Boolean(unavailableLabel) || action.disabled}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </BaseCard>
  );
}
