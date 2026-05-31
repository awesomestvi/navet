import {
  CardDialogBody,
  CardDialogChoicePill,
  CardDialogHeader,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
  Input,
  Select,
  Slider,
  Switch,
} from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomScrollbar, DialogSectionRow } from '@navet/app/components/shared/device-editor';
import { getAccentCardShellTokens } from '@navet/app/components/shared/theme/accent-card-shell-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import type {
  CameraFeedMode,
  CameraGo2RtcConfig,
  CameraGo2RtcDefaults,
  CameraGo2RtcStreamNamingMode,
  CameraViewMode,
  ResolvedCameraGo2RtcConfig,
} from '@navet/app/stores/settings-store';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { RadioTower, Sliders } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import type { CameraStreamType } from './camera-view-mode';

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
  cameraFeedMode: CameraFeedMode;
  go2RtcConfig: CameraGo2RtcConfig;
  go2RtcDefaults: CameraGo2RtcDefaults;
  resolvedGo2RtcConfig: ResolvedCameraGo2RtcConfig;
  frontendStreamTypes: readonly CameraStreamType[];
  hasGo2RtcFeed: boolean;
  hasMjpegStream: boolean;
  hasSnapshot: boolean;
  lowPowerMode: boolean;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
  onCameraFeedModeChange: (mode: CameraFeedMode) => void;
  onGo2RtcDefaultsChange: (defaults: CameraGo2RtcDefaults) => void;
  onGo2RtcConfigChange: (config: CameraGo2RtcConfig) => void;
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
    <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
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
const CAMERA_FEED_OPTIONS: CameraFeedMode[] = ['auto', 'go2rtc', 'web_rtc', 'hls', 'mjpeg'];
const CAMERA_GO2RTC_STREAM_NAMING_OPTIONS: CameraGo2RtcStreamNamingMode[] = [
  'entity_id',
  'short_entity_id',
];

function CameraViewModeRow({
  value,
  frontendStreamTypes,
  hasGo2RtcFeed,
  hasMjpegStream,
  hasSnapshot,
  lowPowerMode,
  onChange,
}: {
  value: CameraViewMode;
  frontendStreamTypes: readonly CameraStreamType[];
  hasGo2RtcFeed: boolean;
  hasMjpegStream: boolean;
  hasSnapshot: boolean;
  lowPowerMode: boolean;
  onChange: (mode: CameraViewMode) => void;
}) {
  const { t } = useI18n();
  const hasLiveFeed = hasGo2RtcFeed || frontendStreamTypes.length > 0 || hasMjpegStream;
  const supportedOptions = CAMERA_VIEW_OPTIONS.filter((mode) => {
    if (mode === 'live') {
      return hasLiveFeed;
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

function isCameraFeedAvailable(
  mode: CameraFeedMode,
  frontendStreamTypes: readonly CameraStreamType[],
  hasGo2RtcFeed: boolean,
  hasMjpegStream: boolean
) {
  if (mode === 'auto') {
    return hasGo2RtcFeed || frontendStreamTypes.length > 0 || hasMjpegStream;
  }

  if (mode === 'go2rtc') {
    return hasGo2RtcFeed;
  }

  if (mode === 'mjpeg') {
    return hasMjpegStream;
  }

  return frontendStreamTypes.includes(mode);
}

function CameraFeedModeRow({
  value,
  frontendStreamTypes,
  hasGo2RtcFeed,
  hasMjpegStream,
  onChange,
}: {
  value: CameraFeedMode;
  frontendStreamTypes: readonly CameraStreamType[];
  hasGo2RtcFeed: boolean;
  hasMjpegStream: boolean;
  onChange: (mode: CameraFeedMode) => void;
}) {
  const { t } = useI18n();
  const supportedOptions = CAMERA_FEED_OPTIONS.filter((mode) =>
    isCameraFeedAvailable(mode, frontendStreamTypes, hasGo2RtcFeed, hasMjpegStream)
  );

  if (supportedOptions.length === 0) {
    return null;
  }

  return (
    <DialogSectionRow label={t('camera.settings.feedMode')}>
      <div className="inline-flex flex-wrap items-center gap-1">
        {supportedOptions.map((mode) => (
          <CardDialogChoicePill
            key={mode}
            active={mode === value}
            onClick={() => onChange(mode)}
            size="compact"
            aria-pressed={mode === value}
          >
            {t(`camera.settings.feedMode.${mode}` as TranslationKey)}
          </CardDialogChoicePill>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-white/58">
        {t('camera.settings.feedMode.description')}
      </p>
    </DialogSectionRow>
  );
}

function Go2RtcDefaultsRow({
  entityId,
  value,
  onChange,
}: {
  entityId: string;
  value: CameraGo2RtcDefaults;
  onChange: (defaults: CameraGo2RtcDefaults) => void;
}) {
  const { t } = useI18n();
  const serverUrlInputId = `${entityId}-go2rtc-default-server-url`;

  return (
    <DialogSectionRow label={t('camera.settings.go2rtc.defaults')}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor={serverUrlInputId}
            className="block px-1 text-xs font-medium text-white/76"
          >
            {t('camera.settings.go2rtc.defaultServerUrl')}
          </label>
          <Input
            id={serverUrlInputId}
            value={value.serverUrl}
            onChange={(event) => onChange({ ...value, serverUrl: event.target.value })}
            placeholder="http://homeassistant.local:11984"
            size="small"
            variant="soft"
            spellCheck={false}
          />
        </div>
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-white/76">
            {t('camera.settings.go2rtc.streamNamingMode')}
          </p>
          <div className="inline-flex flex-wrap items-center gap-1">
            {CAMERA_GO2RTC_STREAM_NAMING_OPTIONS.map((mode) => (
              <CardDialogChoicePill
                key={mode}
                active={mode === value.streamNamingMode}
                onClick={() => onChange({ ...value, streamNamingMode: mode })}
                size="compact"
                aria-pressed={mode === value.streamNamingMode}
              >
                {t(`camera.settings.go2rtc.streamNamingMode.${mode}` as TranslationKey)}
              </CardDialogChoicePill>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 px-1 text-xs leading-relaxed text-white/58">
        <p>{t('camera.settings.go2rtc.defaults.description')}</p>
        <p>{t('camera.settings.go2rtc.description.addon')}</p>
        <p>{t('camera.settings.go2rtc.description.standalone')}</p>
      </div>
    </DialogSectionRow>
  );
}

function Go2RtcStatusRow({ resolvedConfig }: { resolvedConfig: ResolvedCameraGo2RtcConfig }) {
  const { t } = useI18n();

  return (
    <DialogSectionRow label={t('camera.settings.go2rtc.activeSource')}>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-sm font-medium text-white">
          {t(`camera.settings.go2rtc.source.${resolvedConfig.source}` as TranslationKey)}
        </p>
        <p className="text-xs leading-relaxed text-white/58">
          {t(`camera.settings.go2rtc.sourceDescription.${resolvedConfig.source}` as TranslationKey)}
        </p>
        {resolvedConfig.hasFeed ? (
          <div className="space-y-1 text-xs text-white/72">
            {!resolvedConfig.usesEmbeddedPanel ? (
              <p>
                {t('camera.settings.go2rtc.serverUrl')}: {resolvedConfig.serverUrl}
              </p>
            ) : null}
            <p>
              {t('camera.settings.go2rtc.streamName')}: {resolvedConfig.streamName}
              {resolvedConfig.streamNameWasInferred
                ? ` (${t('camera.settings.go2rtc.streamName.inferred')})`
                : ''}
            </p>
          </div>
        ) : null}
      </div>
    </DialogSectionRow>
  );
}

function Go2RtcOverrideRow({
  entityId,
  value,
  resolvedConfig,
  onChange,
}: {
  entityId: string;
  value: CameraGo2RtcConfig;
  resolvedConfig: ResolvedCameraGo2RtcConfig;
  onChange: (config: CameraGo2RtcConfig) => void;
}) {
  const { t } = useI18n();
  const serverUrlInputId = `${entityId}-go2rtc-server-url`;
  const streamNameInputId = `${entityId}-go2rtc-stream-name`;

  return (
    <DialogSectionRow label={t('camera.settings.go2rtc.override')}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor={serverUrlInputId}
            className="block px-1 text-xs font-medium text-white/76"
          >
            {t('camera.settings.go2rtc.serverUrl')}
          </label>
          <Input
            id={serverUrlInputId}
            value={value.serverUrl}
            onChange={(event) => onChange({ ...value, serverUrl: event.target.value })}
            placeholder={resolvedConfig.serverUrl || 'http://homeassistant.local:11984'}
            size="small"
            variant="soft"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={streamNameInputId}
            className="block px-1 text-xs font-medium text-white/76"
          >
            {t('camera.settings.go2rtc.streamName')}
          </label>
          <Input
            id={streamNameInputId}
            value={value.streamName}
            onChange={(event) => onChange({ ...value, streamName: event.target.value })}
            placeholder={resolvedConfig.streamName || entityId}
            size="small"
            variant="soft"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="mt-3 space-y-1.5 px-1 text-xs leading-relaxed text-white/58">
        <p>{t('camera.settings.go2rtc.override.description')}</p>
        {isHomeAssistantPanelMode() ? (
          <p>{t('camera.settings.go2rtc.description.customPanel')}</p>
        ) : null}
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
  cameraFeedMode,
  go2RtcConfig,
  go2RtcDefaults,
  resolvedGo2RtcConfig,
  frontendStreamTypes,
  hasGo2RtcFeed,
  hasMjpegStream,
  hasSnapshot,
  lowPowerMode,
  onCameraViewModeChange,
  onCameraFeedModeChange,
  onGo2RtcDefaultsChange,
  onGo2RtcConfigChange,
}: CameraSettingsDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('controls');
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
      fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${shell.containerClassName}`,
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
    >
      <CustomScrollbar isOn={theme !== 'light'}>
        <CardDialogBody>
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'go2rtc'}
                icon={RadioTower}
                onClick={() => setActiveTab('go2rtc')}
              >
                go2rtc
              </CardDialogTabTrigger>
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-6">
              <CameraViewModeRow
                value={cameraViewMode}
                frontendStreamTypes={frontendStreamTypes}
                hasGo2RtcFeed={hasGo2RtcFeed}
                hasMjpegStream={hasMjpegStream}
                hasSnapshot={hasSnapshot}
                lowPowerMode={lowPowerMode}
                onChange={onCameraViewModeChange}
              />
              <CameraFeedModeRow
                value={cameraFeedMode}
                frontendStreamTypes={frontendStreamTypes}
                hasGo2RtcFeed={hasGo2RtcFeed}
                hasMjpegStream={hasMjpegStream}
                onChange={onCameraFeedModeChange}
              />

              {hasControls ? (
                <>
                  {switches.length > 0 && (
                    <DialogSectionRow label={t('camera.settings.switches')}>
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
              ) : (
                <p className="text-center text-sm text-white/76">
                  {t('camera.settings.noControls')}
                </p>
              )}
            </TabPanel>

            <TabPanel value="go2rtc" className="mt-5 space-y-6">
              <Go2RtcStatusRow resolvedConfig={resolvedGo2RtcConfig} />
              <Go2RtcDefaultsRow
                entityId={entityId}
                value={go2RtcDefaults}
                onChange={onGo2RtcDefaultsChange}
              />
              <Go2RtcOverrideRow
                entityId={entityId}
                value={go2RtcConfig}
                resolvedConfig={resolvedGo2RtcConfig}
                onChange={onGo2RtcConfigChange}
              />
            </TabPanel>
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
});
