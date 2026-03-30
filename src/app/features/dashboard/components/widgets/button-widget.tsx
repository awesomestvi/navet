import { Search, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  CustomCardTintPicker,
  DEVICE_EDITOR_ICON_OPTIONS,
  DialogHeader,
  getNamedIconComponent,
} from '@/app/components/shared/device-editor';
import { customCardDialogShellProps, DialogShell } from '@/app/components/shared/dialog-shell';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

export interface ButtonWidgetData {
  label?: string;
  service?: string;
  entityId?: string;
  icon?: string;
  serviceData?: Record<string, unknown>;
  tintColor?: string;
}

interface ButtonWidgetProps {
  data?: ButtonWidgetData;
  onUpdate?: (data: ButtonWidgetData) => void;
  isEditMode?: boolean;
}

function ButtonSettingsDialog({
  isOpen,
  onOpenChange,
  data,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: ButtonWidgetData;
  onSave: (data: ButtonWidgetData) => void;
}) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const accentHex = getThemeColorValue(primaryColor);
  const [label, setLabel] = useState(data.label ?? '');
  const [service, setService] = useState(data.service ?? '');
  const [entityId, setEntityId] = useState(data.entityId ?? '');
  const [selectedIcon, setSelectedIcon] = useState(data.icon ?? 'Zap');
  const [iconQuery, setIconQuery] = useState('');
  const [tintColor, setTintColor] = useState(data.tintColor ?? '');
  const [serviceData, setServiceData] = useState(
    data.serviceData ? JSON.stringify(data.serviceData, null, 2) : ''
  );
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor || undefined);
  const tintSurface = getCustomCardTintSurface(theme, tintColor || undefined);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      maxWidth: 'sm',
      fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl ${surface.panelClassName}`,
    }
  );

  const handleSave = () => {
    let parsedServiceData: Record<string, unknown> | undefined;

    if (serviceData.trim()) {
      try {
        const parsed = JSON.parse(serviceData);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          toast.error(t('widgets.button.invalidServiceData'));
          return;
        }
        parsedServiceData = parsed as Record<string, unknown>;
      } catch {
        toast.error(t('widgets.button.invalidServiceData'));
        return;
      }
    }

    onSave({
      label: label.trim() || undefined,
      service: service.trim() || undefined,
      entityId: entityId.trim() || undefined,
      icon: selectedIcon,
      serviceData: parsedServiceData,
      tintColor: tintColor.trim() || undefined,
    });
    onOpenChange(false);
  };

  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${surface.borderClassName} bg-transparent ${surface.textPrimary} placeholder:opacity-40`;
  const filteredIcons = iconQuery.trim()
    ? DEVICE_EDITOR_ICON_OPTIONS.filter((icon) =>
        `${icon.name} ${t(icon.labelKey)}`.toLowerCase().includes(iconQuery.trim().toLowerCase())
      )
    : DEVICE_EDITOR_ICON_OPTIONS;

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <DialogHeader title={t('widgets.button.configure')} isOn={theme !== 'light'} />

      <div className="space-y-3">
        <CustomCardTintPicker
          value={tintColor || undefined}
          onChange={setTintColor}
          defaultColor="#f97316"
          className={surface.textMuted}
        />

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('widgets.button.labelPlaceholder')}
          className={inputClass}
        />
        <input
          type="text"
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder={t('widgets.button.servicePlaceholder')}
          className={inputClass}
        />
        <input
          type="text"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder={t('widgets.button.entityPlaceholder')}
          className={inputClass}
        />
        <textarea
          value={serviceData}
          onChange={(e) => setServiceData(e.target.value)}
          placeholder={t('widgets.button.serviceDataPlaceholder')}
          className={`${inputClass} min-h-24 resize-none py-2.5 font-mono text-xs`}
        />

        <div className="space-y-3">
          <div className={`text-xs font-medium ${surface.textSecondary}`}>
            {t('widgets.button.iconLabel')}
          </div>
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${surface.textMuted}`}
            />
            <input
              type="text"
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              placeholder={t('widgets.button.iconSearchPlaceholder')}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto pr-1">
            {filteredIcons.map((icon) => {
              const IconComponent = icon.component;
              const isSelected = selectedIcon === icon.name;
              return (
                <button
                  type="button"
                  key={icon.name}
                  onClick={() => setSelectedIcon(icon.name)}
                  className={`flex aspect-square items-center justify-center rounded-2xl border transition-all ${
                    isSelected ? '' : `${surface.borderClassName} ${surface.textMuted}`
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: `${accentHex}88`,
                          backgroundColor: `${accentHex}22`,
                          color: accentHex,
                        }
                      : undefined
                  }
                  title={t(icon.labelKey)}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: getThemeColorValue('blue') }}
      >
        {t('widgets.button.configure')}
      </button>
    </DialogShell>
  );
}

export function ButtonWidget({ data = {}, onUpdate, isEditMode = false }: ButtonWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, data.tintColor);
  const [isSettingsOpen, setIsSettingsOpen] = useState(!data.service);
  const [isPressed, setIsPressed] = useState(false);
  const accentHex = getThemeColorValue(primaryColor);
  const IconComponent = getNamedIconComponent(data.icon ?? 'Zap');

  const handleTap = async () => {
    if (isEditMode || !data.service) return;
    const parts = data.service.split('.');
    if (parts.length < 2) return;
    const [domain, ...rest] = parts;
    const service = rest.join('.');
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 400);
    try {
      await homeAssistantService.callService(
        domain,
        service,
        data.serviceData ?? {},
        data.entityId ? { entity_id: data.entityId } : undefined
      );
    } catch {
      toast.error(t('widgets.button.callFailed', { service: data.service }));
    }
  };

  const isConfigured = Boolean(data.service);

  return (
    <div
      className={`${surface.panelClassName} relative flex h-full flex-col items-center justify-center`}
      style={surface.panelStyle}
    >
      {surface.glowStyle ? <div className="absolute inset-0" style={surface.glowStyle} /> : null}
      {surface.overlayClassName ? (
        <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
      ) : null}

      <div className="relative z-[2] flex h-full w-full flex-col items-center justify-center">
        {(isEditMode || !isConfigured) && onUpdate && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`absolute right-3 top-3 rounded-lg p-1.5 transition-opacity hover:opacity-70 ${surface.textMuted}`}
            aria-label={t('widgets.button.configure')}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleTap}
          disabled={isEditMode || !isConfigured}
          aria-label={
            data.label || (isConfigured ? data.service : t('widgets.button.unconfigured'))
          }
          className="flex flex-col items-center gap-3 transition-transform disabled:cursor-default"
          style={{ transform: isPressed ? 'scale(0.93)' : 'scale(1)' }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{
              backgroundColor: isConfigured ? `${accentHex}22` : surface.subtleFill,
              color: isConfigured ? accentHex : undefined,
            }}
          >
            <IconComponent className={`h-7 w-7 ${!isConfigured ? surface.textMuted : ''}`} />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span
              className={`text-sm font-medium ${isConfigured ? surface.textPrimary : surface.textMuted}`}
            >
              {data.label || (isConfigured ? data.service : t('widgets.button.unconfigured'))}
            </span>
            {isConfigured && data.entityId ? (
              <span className={`max-w-48 truncate text-[11px] ${surface.textMuted}`}>
                {data.entityId}
              </span>
            ) : null}
          </div>
        </button>

        {onUpdate && (
          <ButtonSettingsDialog
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            data={data}
            onSave={onUpdate}
          />
        )}
      </div>
    </div>
  );
}
