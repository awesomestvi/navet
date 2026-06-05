import {
  CardDialogBody,
  CardDialogChoicePill,
  CardDialogHeader,
} from '@navet/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
  Select,
  Slider,
  Switch,
} from '@navet/app/components/primitives';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import { getAccentCardShellTokens } from '@navet/app/components/shared/theme/accent-card-shell-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useMediaQuery, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type {
  PlatformCameraTransport,
  PlatformEntitySnapshot,
} from '@navet/app/platform/provider-feature-models';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import type { CameraStreamPreference, CameraViewMode } from '@navet/app/stores/settings-store';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { memo, useCallback, useEffect, useState } from 'react';

export interface SiblingEntity {
  id: string;
  entity: PlatformEntitySnapshot;
}

interface CameraSettingsDialogProps {
  entityId: string;
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  siblingEntities: SiblingEntity[];
  cameraViewMode: CameraViewMode;
  cameraStreamPreference: CameraStreamPreference;
  supportedStreamPreferences: readonly PlatformCameraTransport[];
  supportsStreaming: boolean;
  hasSnapshot: boolean;
  lowPowerMode: boolean;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
  onCameraStreamPreferenceChange: (preference: CameraStreamPreference) => void;
}

function getDisplayName(entityId: string, entity: PlatformEntitySnapshot): string {
  const friendly =
    typeof entity.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name
      : undefined;
  if (friendly) return friendly;
  const withoutDomain = entityId.replace(/^[^.]+\./, '');
  return withoutDomain.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function SwitchRow({ entityId, label, isOn }: { entityId: string; label: string; isOn: boolean }) {
  const handleToggle = useCallback(async () => {
    await integrationCameraFeatureService.toggleCameraAccessory(entityId, isOn ? 'off' : 'on');
  }, [entityId, isOn]);

  return (
    <div className="flex h-full w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
      <div className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-white/58">{entityId}</span>
      </div>
      <Switch
        checked={isOn}
        onCheckedChange={() => void handleToggle()}
        aria-label={label}
        className="shrink-0"
      />
    </div>
  );
}

const SWITCH_ROW_HEIGHT = 76;
const SWITCH_ROW_GAP = 8;
const SWITCH_ROW_STRIDE = SWITCH_ROW_HEIGHT + SWITCH_ROW_GAP;
const SWITCH_LIST_OVERSCAN = 3;
const SWITCH_LIST_MAX_VISIBLE_ROWS = 6;
const SWITCH_VIRTUALIZATION_THRESHOLD = 8;

function VirtualizedSwitchList({ switches }: { switches: SiblingEntity[] }) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight =
    Math.min(switches.length, SWITCH_LIST_MAX_VISIBLE_ROWS) * SWITCH_ROW_STRIDE - SWITCH_ROW_GAP;
  const totalHeight = switches.length * SWITCH_ROW_STRIDE - SWITCH_ROW_GAP;
  const startIndex = Math.max(0, Math.floor(scrollTop / SWITCH_ROW_STRIDE) - SWITCH_LIST_OVERSCAN);
  const endIndex = Math.min(
    switches.length,
    Math.ceil((scrollTop + viewportHeight) / SWITCH_ROW_STRIDE) + SWITCH_LIST_OVERSCAN
  );
  const visibleSwitches = switches.slice(startIndex, endIndex);

  return (
    <div
      data-testid="camera-switch-list"
      className="overflow-y-auto"
      style={{ height: `${viewportHeight}px` }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: `${totalHeight}px` }}>
        {visibleSwitches.map(({ id, entity }, offset) => {
          const index = startIndex + offset;
          return (
            <div
              key={id}
              className="absolute left-0 right-0"
              style={{
                top: `${index * SWITCH_ROW_STRIDE}px`,
                height: `${SWITCH_ROW_HEIGHT}px`,
              }}
            >
              <SwitchRow
                entityId={id}
                label={getDisplayName(id, entity)}
                isOn={entity.state === 'on'}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectRow({
  entityId,
  label,
  current,
  options,
}: {
  entityId: string;
  label: string;
  current: string;
  options: string[];
}) {
  const handleSelect = useCallback(
    async (option: string) => {
      await integrationCameraFeatureService.selectCameraAccessoryOption(entityId, option);
    },
    [entityId]
  );

  return (
    <div className="space-y-2">
      <label htmlFor={entityId} className="px-1 text-xs font-medium text-white/76">
        {label}
      </label>
      <Select
        id={entityId}
        value={current}
        onChange={(event) => void handleSelect(event.target.value)}
        size="small"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}

function NumberRow({
  entityId,
  label,
  value,
  min,
  max,
  step,
}: {
  entityId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const handleChange = useCallback(
    async (newValue: number) => {
      await integrationCameraFeatureService.setCameraAccessoryValue(entityId, newValue);
    },
    [entityId]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-white/76">{label}</p>
        <span className="text-xs font-semibold text-white">{value}</span>
      </div>
      <Slider
        value={draftValue}
        min={min}
        max={max}
        step={step}
        ariaLabel={label}
        onValueChange={setDraftValue}
        onValueCommit={(nextValue) => void handleChange(nextValue)}
        rootClassName="relative flex h-7 w-full touch-none select-none items-center"
        trackClassName="relative h-2 grow overflow-hidden rounded-full bg-white/12"
        rangeClassName="absolute h-full rounded-full bg-blue-500"
        thumbClassName="block h-5 w-5 rounded-full border border-white/20 bg-white shadow-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-white/40"
        touchThumbClassName="block h-6 w-6 rounded-full border border-white/20 bg-white shadow-lg outline-none"
      />
    </div>
  );
}

const CAMERA_VIEW_OPTIONS: CameraViewMode[] = ['auto', 'live', 'snapshot'];
const CAMERA_STREAM_PREFERENCE_OPTIONS: CameraStreamPreference[] = [
  'auto',
  'web_rtc',
  'hls',
  'mjpeg',
];

function CameraViewModeRow({
  value,
  supportsStreaming,
  hasSnapshot,
  lowPowerMode,
  onChange,
}: {
  value: CameraViewMode;
  supportsStreaming: boolean;
  hasSnapshot: boolean;
  lowPowerMode: boolean;
  onChange: (mode: CameraViewMode) => void;
}) {
  const { t } = useI18n();
  const supportedOptions = CAMERA_VIEW_OPTIONS.filter((mode) => {
    if (mode === 'live') {
      return supportsStreaming;
    }

    return hasSnapshot;
  });

  if (supportedOptions.length === 0) {
    return null;
  }

  return (
    <DialogSectionRow label={t('camera.settings.viewMode')}>
      <div className="inline-flex flex-wrap items-center gap-1">
        {supportedOptions.map((mode) => (
          <CardDialogChoicePill
            key={mode}
            active={mode === value}
            onClick={() => onChange(mode)}
            size="compact"
            aria-pressed={mode === value}
          >
            {t(`camera.settings.viewMode.${mode}` as TranslationKey)}
          </CardDialogChoicePill>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-white/58">
        {t('camera.settings.viewMode.description')}
      </p>
      {lowPowerMode ? (
        <p className="mt-2 px-1 text-xs leading-relaxed text-amber-200/78">
          {t('camera.settings.viewMode.lowPowerNote')}
        </p>
      ) : null}
    </DialogSectionRow>
  );
}

function CameraStreamPreferenceRow({
  value,
  supportedPreferences,
  supportsStreaming,
  onChange,
}: {
  value: CameraStreamPreference;
  supportedPreferences: readonly PlatformCameraTransport[];
  supportsStreaming: boolean;
  onChange: (preference: CameraStreamPreference) => void;
}) {
  const { t } = useI18n();

  if (!supportsStreaming) {
    return null;
  }

  const availablePreferences: CameraStreamPreference[] = [
    'auto',
    ...CAMERA_STREAM_PREFERENCE_OPTIONS.filter(
      (preference): preference is PlatformCameraTransport =>
        preference !== 'auto' && supportedPreferences.includes(preference)
    ),
  ];

  return (
    <DialogSectionRow label={t('camera.settings.streamPreference')}>
      <div className="inline-flex flex-wrap items-center gap-1">
        {availablePreferences.map((preference) => (
          <CardDialogChoicePill
            key={preference}
            active={preference === value}
            onClick={() => onChange(preference)}
            size="compact"
            aria-pressed={preference === value}
          >
            {t(`camera.settings.streamPreference.${preference}` as TranslationKey)}
          </CardDialogChoicePill>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-white/58">
        {t('camera.settings.streamPreference.description')}
      </p>
    </DialogSectionRow>
  );
}

export const CameraSettingsDialog = memo(function CameraSettingsDialog({
  entityId,
  name,
  isOpen,
  onOpenChange,
  siblingEntities,
  cameraViewMode,
  cameraStreamPreference,
  supportedStreamPreferences,
  supportsStreaming,
  hasSnapshot,
  lowPowerMode,
  onCameraViewModeChange,
  onCameraStreamPreferenceChange,
}: CameraSettingsDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const shell = getAccentCardShellTokens(theme, 'blue');
  const dialogShell = customCardDialogShellProps(
    surface,
    {},
    {
      padding: false,
      animate: true,
      fallbackDecoration: {
        glowClassName: shell.glowClassName,
        overlayClassName: shell.overlayClassName,
      },
      fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 flex h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 max-sm:!h-[calc(100dvh-1rem)] ${shell.containerClassName}`,
    }
  );

  const switches = siblingEntities.filter((s) => s.id.startsWith('switch.'));
  const selects = siblingEntities.filter((s) => s.id.startsWith('select.'));
  const numbers = siblingEntities.filter((s) => s.id.startsWith('number.'));
  const hasControls = switches.length > 0 || selects.length > 0 || numbers.length > 0;

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
      bodyClassName="relative z-[2] flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <CardDialogBody className="flex min-h-full flex-col">
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />
          <div className="mt-5 space-y-6">
            <CameraViewModeRow
              value={cameraViewMode}
              supportsStreaming={supportsStreaming}
              hasSnapshot={hasSnapshot}
              lowPowerMode={lowPowerMode}
              onChange={onCameraViewModeChange}
            />

            <CameraStreamPreferenceRow
              value={cameraStreamPreference}
              supportedPreferences={supportedStreamPreferences}
              supportsStreaming={supportsStreaming}
              onChange={onCameraStreamPreferenceChange}
            />

            {hasControls ? (
              <>
                {switches.length > 0 && (
                  <DialogSectionRow label={t('camera.settings.switches')}>
                    {!isMobileViewport && switches.length > SWITCH_VIRTUALIZATION_THRESHOLD ? (
                      <VirtualizedSwitchList switches={switches} />
                    ) : (
                      <div className="space-y-2">
                        {switches.map(({ id, entity }) => (
                          <SwitchRow
                            key={id}
                            entityId={id}
                            label={getDisplayName(id, entity)}
                            isOn={entity.state === 'on'}
                          />
                        ))}
                      </div>
                    )}
                  </DialogSectionRow>
                )}

                {selects.length > 0 && (
                  <DialogSectionRow label={t('camera.settings.modes')}>
                    <div className="space-y-4">
                      {selects.map(({ id, entity }) => {
                        const attrs = entity.attributes as Record<string, unknown>;
                        const options = Array.isArray(attrs?.options)
                          ? (attrs.options as string[])
                          : [];
                        return (
                          <SelectRow
                            key={id}
                            entityId={id}
                            label={getDisplayName(id, entity)}
                            current={entity.state}
                            options={options}
                          />
                        );
                      })}
                    </div>
                  </DialogSectionRow>
                )}

                {numbers.length > 0 && (
                  <DialogSectionRow label={t('camera.settings.adjustments')}>
                    <div className="space-y-4">
                      {numbers.map(({ id, entity }) => {
                        const attrs = entity.attributes as Record<string, unknown>;
                        return (
                          <NumberRow
                            key={id}
                            entityId={id}
                            label={getDisplayName(id, entity)}
                            value={Number(entity.state)}
                            min={Number(attrs?.min ?? 0)}
                            max={Number(attrs?.max ?? 100)}
                            step={Number(attrs?.step ?? 1)}
                          />
                        );
                      })}
                    </div>
                  </DialogSectionRow>
                )}
              </>
            ) : null}
          </div>

          <div className="mt-6">
            <DialogDoneFooter label={t('common.done')} />
          </div>
        </CardDialogBody>
      </div>
    </DialogShell>
  );
});
