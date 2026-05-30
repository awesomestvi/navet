import { Palette, Settings2, Sliders } from 'lucide-react';
import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CardDialogBody,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
  CardEmptyState,
} from '@/app/components/patterns';
import {
  BaseCard,
  Button,
  customCardDialogShellProps,
  DialogFooter,
  DialogShell,
  Input,
  Textarea,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import {
  CustomCardTintPicker,
  CustomScrollbar,
  getNamedIconComponent,
  IconPicker,
} from '@/app/components/shared/device-editor';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import {
  parseButtonServiceCall,
  sanitizeButtonEntityId,
} from '@/app/features/dashboard/utils/button-widget-security';
import { useI18n, useTheme } from '@/app/hooks';
import { callIntegrationService } from '@/app/services/integration-service-call.service';
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
  const [activeTab, setActiveTab] = useState<'controls' | 'card'>('controls');
  const [tintColor, setTintColor] = useState(data.tintColor ?? '');
  const [serviceData, setServiceData] = useState(
    data.serviceData ? JSON.stringify(data.serviceData, null, 2) : ''
  );
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor || undefined);
  const tintSurface = getCustomCardTintSurface(theme, tintColor || undefined);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    { maxWidth: 'sm', padding: false }
  );
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor || undefined);
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen || wasOpen) {
      return;
    }

    setLabel(data.label ?? '');
    setService(data.service ?? '');
    setEntityId(data.entityId ?? '');
    setSelectedIcon(data.icon ?? 'Zap');
    setActiveTab('controls');
    setTintColor(data.tintColor ?? '');
    setServiceData(data.serviceData ? JSON.stringify(data.serviceData, null, 2) : '');
  }, [
    data.entityId,
    data.icon,
    data.label,
    data.service,
    data.serviceData,
    data.tintColor,
    isOpen,
  ]);

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
      } catch (error) {
        console.error('[ButtonWidget] Failed to parse service data JSON:', error);
        toast.error(t('widgets.button.invalidServiceData'));
        return;
      }
    }

    const serviceCall = parseButtonServiceCall(service);
    if (service.trim() && !serviceCall) {
      toast.error(t('widgets.button.invalidServiceData'));
      return;
    }

    onSave({
      label: label.trim() || undefined,
      service: serviceCall ? `${serviceCall.domain}.${serviceCall.service}` : undefined,
      entityId: sanitizeButtonEntityId(entityId),
      icon: selectedIcon,
      serviceData: parsedServiceData,
      tintColor: tintColor.trim() || undefined,
    });
    onOpenChange(false);
  };

  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${surface.borderClassName} bg-transparent ${surface.textPrimary} placeholder:opacity-40`;
  const textFieldClass = `${surface.borderClassName} bg-transparent ${surface.textPrimary} placeholder:opacity-40 rounded-xl`;
  const fieldStyle = {
    ...sectionStyle,
    background: surface.subtleFill,
  };

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
      <CustomScrollbar isOn={theme !== 'light'} className="max-sm:min-h-0 max-sm:flex-1">
        <CardDialogBody>
          <CardDialogHeader
            title={label.trim() || t('widgets.button.title')}
            description={t('widgets.button.configure')}
            showRoomSelector={false}
          />

          <Tabs
            value={activeTab}
            defaultValue="controls"
            onValueChange={(value) => setActiveTab(value as 'controls' | 'card')}
          >
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                {t('common.controls')}
              </CardDialogTabTrigger>
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                {t('common.customize')}
              </CardDialogTabTrigger>
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-6">
              <CardDialogSection label={t('widgets.button.title')}>
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t('widgets.button.labelPlaceholder')}
                    inputClassName={textFieldClass}
                    style={fieldStyle}
                  />
                  <Input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder={t('widgets.button.servicePlaceholder')}
                    inputClassName={textFieldClass}
                    style={fieldStyle}
                  />
                  <Input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder={t('widgets.button.entityPlaceholder')}
                    inputClassName={textFieldClass}
                    style={fieldStyle}
                  />
                  <Textarea
                    value={serviceData}
                    onChange={(e) => setServiceData(e.target.value)}
                    placeholder={t('widgets.button.serviceDataPlaceholder')}
                    containerClassName="w-full"
                    textareaClassName={`${inputClass} min-h-24 resize-none py-2.5 font-mono text-xs`}
                    style={fieldStyle}
                  />
                </div>
              </CardDialogSection>
            </TabPanel>

            <TabPanel value="card" className="mt-5 space-y-6">
              <CustomCardTintPicker
                value={tintColor || undefined}
                onChange={setTintColor}
                defaultColor="#f97316"
                className={surface.textMuted}
              />
              <IconPicker
                selectedIcon={selectedIcon}
                onIconChange={setSelectedIcon}
                isLightOn={theme !== 'light'}
                label={t('widgets.button.iconLabel')}
                accentColor={accentHex}
              />
            </TabPanel>
          </Tabs>

          <DialogFooter>
            <Button onClick={handleSave} variant="soft" size="small" className="rounded-xl px-4">
              {t('widgets.button.configure')}
            </Button>
          </DialogFooter>
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
}

export function ButtonWidget({ data = {}, onUpdate, isEditMode = false }: ButtonWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, data.tintColor);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const accentHex = getThemeColorValue(primaryColor);
  const IconComponent = getNamedIconComponent(data.icon ?? 'Zap');

  const handleTap = async () => {
    if (isEditMode || !data.service) return;
    const serviceCall = parseButtonServiceCall(data.service);
    if (!serviceCall) return;
    const entityId = sanitizeButtonEntityId(data.entityId);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 400);
    try {
      await callIntegrationService({
        entityId,
        domain: serviceCall.domain,
        service: serviceCall.service,
        serviceData: data.serviceData ?? {},
      });
    } catch (error) {
      console.error('[ButtonWidget] Service call failed:', error);
      toast.error(t('widgets.button.callFailed', { service: data.service }));
    }
  };

  const stopCardInteraction = (
    event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
  };

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void handleTap();
  };

  const handleSettingsClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsSettingsOpen(true);
  };

  const isConfigured = Boolean(data.service);

  return (
    <BaseCard
      size="medium"
      fullBleed
      style={surface.panelStyle}
      frameClassName="overflow-hidden"
      disableDefaultSheen
      overlay={
        <>
          {surface.glowStyle ? (
            <div className="pointer-events-none absolute inset-0" style={surface.glowStyle} />
          ) : null}
          {surface.overlayClassName ? (
            <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      <div className="relative z-[2] flex h-full w-full flex-col items-center justify-center p-4">
        {isConfigured && onUpdate && (
          <div className="absolute right-3 bottom-3">
            <CardSettingsActionButton
              theme={theme}
              size="small"
              variant="soft"
              onClick={handleSettingsClick}
              onPointerDown={stopCardInteraction}
              aria-label={t('widgets.button.configure')}
              accentColor={data.tintColor ?? accentHex}
            />
          </div>
        )}

        {isConfigured ? (
          <button
            type="button"
            onClick={handleActionClick}
            onPointerDown={stopCardInteraction}
            disabled={isEditMode}
            aria-label={data.label || data.service}
            className="flex flex-col items-center gap-3 transition-transform disabled:cursor-default"
            style={{ transform: isPressed ? 'scale(0.93)' : 'scale(1)' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                backgroundColor: `${accentHex}22`,
                color: accentHex,
              }}
            >
              <IconComponent className="h-7 w-7" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-sm font-medium ${surface.textPrimary}`}>
                {data.label || data.service}
              </span>
              {data.entityId ? (
                <span className={`max-w-48 truncate text-xs ${surface.textMuted}`}>
                  {data.entityId}
                </span>
              ) : null}
            </div>
          </button>
        ) : (
          <CardEmptyState
            title={t('widgets.button.title')}
            description={t('widgets.button.unconfigured')}
            icon={IconComponent}
            actionLabel={onUpdate ? t('widgets.button.configure') : undefined}
            onAction={onUpdate ? () => setIsSettingsOpen(true) : undefined}
            actionIcon={onUpdate ? Settings2 : undefined}
            size="medium"
            accentColor={data.tintColor ?? accentHex}
          />
        )}

        {onUpdate && (
          <ButtonSettingsDialog
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            data={data}
            onSave={onUpdate}
          />
        )}
      </div>
    </BaseCard>
  );
}
