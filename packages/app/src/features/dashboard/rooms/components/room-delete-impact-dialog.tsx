import { Button, Select } from '@navet/app/components/primitives';
import {
  getThemeSurfaceTokens,
  navetIconSizeTokens,
  navetRadiusTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { AlertTriangle, RadioTower, Unplug } from 'lucide-react';
import { useId } from 'react';
import { RoomOperationDialogFrame } from './room-operation-dialog-frame';

export interface RoomDeleteProviderSource {
  id: string;
  name: string;
  summary: string;
}

export interface RoomDeleteDestination {
  id: string;
  name: string;
}

export interface RoomDeleteImpactDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  roomLabel: string;
  roomName: string;
  affectedDevicesLabel: string;
  affectedDeviceCount: number;
  affectedDeviceSummary: string;
  affectedDeviceAccessibleSummary?: string;
  destinationLabel?: string;
  destinationRoomId?: string | null;
  destinationFallbackLabel?: string;
  destinations?: readonly RoomDeleteDestination[];
  onDestinationChange?: (roomId: string | null) => void;
  providerSourcesLabel: string;
  noProviderSourcesLabel: string;
  providerSources: readonly RoomDeleteProviderSource[];
  warningMessage?: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function RoomDeleteImpactDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  roomLabel,
  roomName,
  affectedDevicesLabel,
  affectedDeviceCount,
  affectedDeviceSummary,
  affectedDeviceAccessibleSummary = `${affectedDeviceCount} ${affectedDeviceSummary}`,
  destinationLabel,
  destinationRoomId = null,
  destinationFallbackLabel,
  destinations = [],
  onDestinationChange,
  providerSourcesLabel,
  noProviderSourcesLabel,
  providerSources,
  warningMessage,
  cancelLabel,
  confirmLabel,
  onConfirm,
  isConfirming = false,
}: RoomDeleteImpactDialogProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const devicesTitleId = useId();
  const destinationId = useId();
  const providersTitleId = useId();
  const showsDestination =
    Boolean(destinationLabel) && Boolean(destinationFallbackLabel) && Boolean(onDestinationChange);

  return (
    <RoomOperationDialogFrame
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="md"
      onSubmit={onConfirm}
      footer={
        <>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant="soft"
            className="min-h-11 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
            loading={isConfirming}
            disabled={isConfirming}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section
          className={cn(
            'border p-4',
            navetRadiusTokens.panelInset,
            surface.border,
            surface.panelMuted
          )}
        >
          <p className={cn(navetTypographyTokens.helper, surface.textMuted)}>{roomLabel}</p>
          <p className={cn('mt-1', navetTypographyTokens.featureHeading, surface.textPrimary)}>
            {roomName}
          </p>
        </section>

        <section aria-labelledby={devicesTitleId}>
          <h3 id={devicesTitleId} className={cn(navetTypographyTokens.label, surface.textPrimary)}>
            {affectedDevicesLabel}
          </h3>
          <div className="mt-2 flex items-baseline gap-3" aria-hidden="true">
            <span className={cn('text-3xl font-semibold tabular-nums', surface.textPrimary)}>
              {affectedDeviceCount}
            </span>
            <p className={cn(navetTypographyTokens.body, surface.textSecondary)}>
              {affectedDeviceSummary}
            </p>
          </div>
          <p className="sr-only">{affectedDeviceAccessibleSummary}</p>
        </section>

        {showsDestination ? (
          <section>
            <label
              id={`${destinationId}-label`}
              htmlFor={destinationId}
              className={cn('block', navetTypographyTokens.label, surface.textPrimary)}
            >
              {destinationLabel}
            </label>
            <Select
              id={destinationId}
              name="room-delete-destination"
              containerClassName="mt-2"
              value={destinationRoomId ?? ''}
              onChange={(event) => onDestinationChange?.(event.currentTarget.value || null)}
              aria-labelledby={`${destinationId}-label`}
              disabled={isConfirming}
            >
              <option value="">{destinationFallbackLabel}</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                </option>
              ))}
            </Select>
          </section>
        ) : null}

        <section aria-labelledby={providersTitleId}>
          <h3
            id={providersTitleId}
            className={cn(navetTypographyTokens.label, surface.textPrimary)}
          >
            {providerSourcesLabel}
          </h3>
          {providerSources.length > 0 ? (
            <ul
              className={cn(
                'mt-3 divide-y border',
                navetRadiusTokens.panelInset,
                surface.border,
                surface.divider
              )}
            >
              {providerSources.map((source) => (
                <li key={source.id} className="flex min-h-14 items-start gap-3 px-4 py-3">
                  <RadioTower
                    aria-hidden="true"
                    className={cn('mt-0.5 shrink-0', navetIconSizeTokens.sm, surface.textMuted)}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn('block', navetTypographyTokens.control, surface.textPrimary)}
                    >
                      {source.name}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block',
                        navetTypographyTokens.helper,
                        surface.textSecondary
                      )}
                    >
                      {source.summary}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div
              className={cn(
                'mt-3 flex min-h-14 items-center gap-3 border px-4 py-3',
                navetRadiusTokens.panelInset,
                surface.border,
                surface.panelMuted,
                surface.textSecondary
              )}
            >
              <Unplug aria-hidden="true" className={navetIconSizeTokens.sm} />
              <p className={navetTypographyTokens.body}>{noProviderSourcesLabel}</p>
            </div>
          )}
        </section>

        {warningMessage ? (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-3 border px-4 py-3',
              navetRadiusTokens.field,
              navetSemanticColorTokens.error
            )}
          >
            <AlertTriangle aria-hidden="true" className={cn('mt-0.5', navetIconSizeTokens.sm)} />
            <p className={navetTypographyTokens.body}>{warningMessage}</p>
          </div>
        ) : null}
      </div>
    </RoomOperationDialogFrame>
  );
}
