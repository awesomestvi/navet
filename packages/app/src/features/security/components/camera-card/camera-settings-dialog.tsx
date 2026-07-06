import { CardDialogChoicePill } from '@navet/app/components/patterns';
import {
  BaseCardDialogWithState,
  Input,
  Select,
  Slider,
  Switch,
} from '@navet/app/components/primitives';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import { useI18n, useMediaQuery, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type {
  PlatformCameraTransport,
  PlatformEntitySnapshot,
} from '@navet/app/platform/provider-feature-models';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import type {
  CameraFitMode,
  CameraStreamPreference,
  CameraViewMode,
  CameraWebRtcStreamSource,
} from '@navet/app/stores/settings-store';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import * as Popover from '@radix-ui/react-popover';
import { Info, Settings2 } from 'lucide-react';
import { memo, type ReactNode, useCallback, useEffect, useState } from 'react';

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
  cameraWebRtcStreamSource: CameraWebRtcStreamSource;
  cameraDirectStreamUrl: string;
  cameraDirectStreamUrlError: boolean;
  cameraFitMode: CameraFitMode;
  supportedStreamPreferences: readonly PlatformCameraTransport[];
  supportsStreaming: boolean;
  hasSnapshot: boolean;
  lowPowerMode: boolean;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
  onCameraStreamPreferenceChange: (preference: CameraStreamPreference) => void;
  onCameraWebRtcStreamSourceChange: (source: CameraWebRtcStreamSource) => void;
  onCameraDirectStreamUrlChange: (url: string) => void;
  onCameraFitModeChange: (mode: CameraFitMode) => void;
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
const CAMERA_WEB_RTC_STREAM_SOURCE_OPTIONS: CameraWebRtcStreamSource[] = ['provider', 'direct'];
const CAMERA_FIT_MODE_OPTIONS: CameraFitMode[] = ['contain', 'cover'];

function CameraInfoPopoverIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/58 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          aria-label={`${label} information`}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 max-w-72 rounded-2xl border border-white/12 bg-zinc-950/95 px-3 py-2 text-xs leading-relaxed text-white/82 shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-2">{children}</div>
          <Popover.Arrow className="fill-zinc-950" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CameraInfoLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{label}</span>
      <CameraInfoPopoverIcon label={label}>{children}</CameraInfoPopoverIcon>
    </span>
  );
}

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
    <DialogSectionRow
      label={
        <CameraInfoLabel label={t('camera.settings.viewMode')}>
          <p>{t('camera.settings.viewMode.description')}</p>
          {lowPowerMode ? (
            <p className="text-amber-200/88">{t('camera.settings.viewMode.lowPowerNote')}</p>
          ) : null}
        </CameraInfoLabel>
      }
    >
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
    </DialogSectionRow>
  );
}

function CameraStreamPreferenceRow({
  entityId,
  value,
  webRtcStreamSource,
  directStreamUrl,
  directStreamUrlError,
  supportedPreferences,
  supportsStreaming,
  onChange,
  onWebRtcStreamSourceChange,
  onDirectStreamUrlChange,
}: {
  entityId: string;
  value: CameraStreamPreference;
  webRtcStreamSource: CameraWebRtcStreamSource;
  directStreamUrl: string;
  directStreamUrlError: boolean;
  supportedPreferences: readonly PlatformCameraTransport[];
  supportsStreaming: boolean;
  onChange: (preference: CameraStreamPreference) => void;
  onWebRtcStreamSourceChange: (source: CameraWebRtcStreamSource) => void;
  onDirectStreamUrlChange: (url: string) => void;
}) {
  const { t } = useI18n();
  const [draftUrl, setDraftUrl] = useState(directStreamUrl);
  const inputId = `${entityId}-direct-stream-url`;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    setDraftUrl(directStreamUrl);
  }, [directStreamUrl]);

  if (!supportsStreaming) {
    return null;
  }

  const availablePreferences: CameraStreamPreference[] = CAMERA_STREAM_PREFERENCE_OPTIONS.filter(
    (preference) =>
      preference === 'auto' ||
      preference === 'web_rtc' ||
      supportedPreferences.includes(preference as PlatformCameraTransport)
  );

  return (
    <DialogSectionRow
      label={
        <CameraInfoLabel label={t('camera.settings.streamPreference')}>
          <p>{t('camera.settings.streamPreference.description')}</p>
        </CameraInfoLabel>
      }
    >
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
      {value === 'web_rtc' ? (
        <div className="mt-4 space-y-2">
          <div className="inline-flex flex-wrap items-center gap-1">
            {CAMERA_WEB_RTC_STREAM_SOURCE_OPTIONS.map((source) => (
              <CardDialogChoicePill
                key={source}
                active={source === webRtcStreamSource}
                onClick={() => onWebRtcStreamSourceChange(source)}
                size="compact"
                aria-pressed={source === webRtcStreamSource}
              >
                {t(`camera.settings.webRtcStreamSource.${source}` as TranslationKey)}
              </CardDialogChoicePill>
            ))}
          </div>
          {webRtcStreamSource === 'direct' ? (
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-1.5 px-1">
                <label htmlFor={inputId} className="text-xs font-medium text-white/76">
                  {t('camera.settings.directStreamUrl')}
                </label>
                <CameraInfoPopoverIcon label={t('camera.settings.directStreamUrl')}>
                  <p>{t('camera.settings.directStreamUrl.description')}</p>
                </CameraInfoPopoverIcon>
              </div>
              <Input
                id={inputId}
                type="url"
                aria-label={t('camera.settings.directStreamUrl')}
                aria-describedby={directStreamUrlError ? errorId : undefined}
                invalid={directStreamUrlError}
                value={draftUrl}
                placeholder="http://homeassistant.local:1984/stream.html?src=camera_name"
                onChange={(event) => setDraftUrl(event.target.value)}
                onBlur={() => onDirectStreamUrlChange(draftUrl)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onDirectStreamUrlChange(draftUrl);
                    event.currentTarget.blur();
                  }
                }}
              />
              {directStreamUrlError ? (
                <p id={errorId} className="px-1 text-xs font-medium text-red-300">
                  {t('camera.settings.directStreamUrl.error')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </DialogSectionRow>
  );
}

function CameraFitModeRow({
  value,
  onChange,
}: {
  value: CameraFitMode;
  onChange: (mode: CameraFitMode) => void;
}) {
  const { t } = useI18n();

  return (
    <DialogSectionRow
      label={
        <CameraInfoLabel label={t('camera.settings.fitMode')}>
          <p>{t('camera.settings.fitMode.description')}</p>
        </CameraInfoLabel>
      }
    >
      <div className="inline-flex flex-wrap items-center gap-1">
        {CAMERA_FIT_MODE_OPTIONS.map((mode) => (
          <CardDialogChoicePill
            key={mode}
            active={mode === value}
            onClick={() => onChange(mode)}
            size="compact"
            aria-pressed={mode === value}
          >
            {t(`camera.settings.fitMode.${mode}` as TranslationKey)}
          </CardDialogChoicePill>
        ))}
      </div>
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
  cameraWebRtcStreamSource,
  cameraDirectStreamUrl,
  cameraDirectStreamUrlError,
  cameraFitMode,
  supportedStreamPreferences,
  supportsStreaming,
  hasSnapshot,
  lowPowerMode,
  onCameraViewModeChange,
  onCameraStreamPreferenceChange,
  onCameraWebRtcStreamSourceChange,
  onCameraDirectStreamUrlChange,
  onCameraFitModeChange,
}: CameraSettingsDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const entityType = getEntityTypeLabel(entityId);

  const switches = siblingEntities.filter((s) => s.id.startsWith('switch.'));
  const selects = siblingEntities.filter((s) => s.id.startsWith('select.'));
  const numbers = siblingEntities.filter((s) => s.id.startsWith('number.'));
  const hasControls = switches.length > 0 || selects.length > 0 || numbers.length > 0;
  const isDirectStreamSelected =
    cameraStreamPreference === 'web_rtc' && cameraWebRtcStreamSource === 'direct';

  const controlsTabContent = (
    <div className="space-y-6">
      <CameraViewModeRow
        value={cameraViewMode}
        supportsStreaming={supportsStreaming}
        hasSnapshot={hasSnapshot}
        lowPowerMode={lowPowerMode}
        onChange={onCameraViewModeChange}
      />

      <CameraStreamPreferenceRow
        entityId={entityId}
        value={cameraStreamPreference}
        webRtcStreamSource={cameraWebRtcStreamSource}
        directStreamUrl={cameraDirectStreamUrl}
        directStreamUrlError={cameraDirectStreamUrlError}
        supportedPreferences={supportedStreamPreferences}
        supportsStreaming={supportsStreaming}
        onChange={onCameraStreamPreferenceChange}
        onWebRtcStreamSourceChange={onCameraWebRtcStreamSourceChange}
        onDirectStreamUrlChange={onCameraDirectStreamUrlChange}
      />

      {!isDirectStreamSelected ? (
        <CameraFitModeRow value={cameraFitMode} onChange={onCameraFitModeChange} />
      ) : null}
    </div>
  );

  const moreControlsTabContent = hasControls ? (
    <div className="space-y-6">
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
              const options = Array.isArray(attrs?.options) ? (attrs.options as string[]) : [];
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
    </div>
  ) : undefined;

  const extraTabs = moreControlsTabContent
    ? [
        {
          key: 'more-controls',
          label: t('common.moreActions'),
          icon: Settings2,
          content: moreControlsTabContent,
        },
      ]
    : [];

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={name}
      entityId={entityId}
      description={entityType}
      controlsTabContent={controlsTabContent}
      extraTabs={extraTabs}
      theme={theme}
      disableOpenAutoFocus
      maxWidth="md"
      height="capped"
      scrollClassName="max-h-[85vh] overscroll-contain max-sm:min-h-0 max-sm:flex-1"
      bodyClassName="flex min-h-full flex-col"
    />
  );
});
