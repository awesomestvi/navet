import type { HassEntity } from 'home-assistant-js-websocket';
import { memo, useCallback, useEffect, useState } from 'react';
import { CardDialogBody, CardDialogChoicePill, CardDialogHeader } from '@/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
  Select,
  Slider,
  Switch,
} from '@/app/components/primitives';
import { CustomScrollbar, DialogSectionRow } from '@/app/components/shared/device-editor';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { CameraViewMode } from '@/app/stores/settings-store';
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';

export interface SiblingEntity {
  id: string;
  entity: HassEntity;
}

interface CameraSettingsDialogProps {
  entityId: string;
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  siblingEntities: SiblingEntity[];
  cameraViewMode: CameraViewMode;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
}

function getDisplayName(entityId: string, entity: HassEntity): string {
  const friendly = entity.attributes?.friendly_name as string | undefined;
  if (friendly) return friendly;
  const withoutDomain = entityId.replace(/^[^.]+\./, '');
  return withoutDomain.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function SwitchRow({ entityId, label, isOn }: { entityId: string; label: string; isOn: boolean }) {
  const handleToggle = useCallback(async () => {
    await homeAssistantService.callService(
      'switch',
      isOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: entityId }
    );
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
      await homeAssistantService.callService(
        'select',
        'select_option',
        { option },
        { entity_id: entityId }
      );
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
      await homeAssistantService.callService(
        'number',
        'set_value',
        { value: newValue },
        { entity_id: entityId }
      );
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

const CAMERA_VIEW_OPTIONS: CameraViewMode[] = ['live', 'auto', 'snapshot'];

function CameraViewModeRow({
  value,
  onChange,
}: {
  value: CameraViewMode;
  onChange: (mode: CameraViewMode) => void;
}) {
  const { t } = useI18n();

  return (
    <DialogSectionRow label={t('camera.settings.viewMode')}>
      <div className="inline-flex flex-wrap items-center gap-1">
        {CAMERA_VIEW_OPTIONS.map((mode) => (
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
  onCameraViewModeChange,
}: CameraSettingsDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
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

          <div className="space-y-6">
            <CameraViewModeRow value={cameraViewMode} onChange={onCameraViewModeChange} />

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
              <p className="text-center text-sm text-white/76">{t('camera.settings.noControls')}</p>
            )}
          </div>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
});
