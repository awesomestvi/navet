import { CardDialogSection, CardEmptyState } from '@navet/app/components/patterns';
import {
  BaseCard,
  BaseCardDialog,
  Button,
  DialogFooter,
  EntityCardHeader,
  EntityCardHeaderIcon,
  EntityCardTitleBlock,
  Input,
  Textarea,
} from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@navet/app/components/shared/card-size-selector';
import {
  CustomCardTintPicker,
  getNamedIconComponent,
  IconPicker,
} from '@navet/app/components/shared/device-editor';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getInheritedDialogSectionStyle } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { TinyCardWatermark } from '@navet/app/components/shared/tiny-card-watermark';
import {
  parseButtonServiceCall,
  sanitizeButtonEntityId,
} from '@navet/app/features/dashboard/utils/button-widget-security';
import { useI18n, useTheme } from '@navet/app/hooks';
import { invokeIntegrationNativeAction } from '@navet/app/services/integration-native-action.service';
import { Loader2, Palette, Settings2, Sliders } from 'lucide-react';
import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
  size: CardSize;
  data?: ButtonWidgetData;
  onUpdate?: (data: ButtonWidgetData) => void;
  isEditMode?: boolean;
  openSettingsRequestKey?: number;
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

  const tabs = [
    {
      key: 'controls',
      label: t('common.controls'),
      icon: Sliders,
      content: (
        <div className="mt-5 space-y-6">
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
        </div>
      ),
    },
    {
      key: 'card',
      label: t('common.customize'),
      icon: Palette,
      content: (
        <div className="mt-5 space-y-6">
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
        </div>
      ),
    },
  ];

  return (
    <BaseCardDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={label.trim() || t('widgets.button.title')}
      description={t('widgets.button.configure')}
      tabs={tabs}
      theme={theme}
      activeTab={activeTab}
      onActiveTabChange={(value) => setActiveTab(value as 'controls' | 'card')}
      maxWidth="sm"
      footerContent={
        <DialogFooter>
          <Button onClick={handleSave} variant="soft" size="small" className="rounded-xl px-4">
            {t('widgets.button.configure')}
          </Button>
        </DialogFooter>
      }
    />
  );
}

export function ButtonWidget({
  size,
  data = {},
  onUpdate,
  isEditMode = false,
  openSettingsRequestKey = 0,
}: ButtonWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, data.tintColor);
  const cardShell = getCardShellSurfaceTokens(theme);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const accentHex = getThemeColorValue(primaryColor);
  const actionAccent = data.tintColor ?? accentHex;
  const IconComponent = getNamedIconComponent(data.icon ?? 'Zap');
  const label = data.label || data.service || t('widgets.button.title');
  const cardTypeLabel = t('widgets.button.title');
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const isSmall = size === 'small';
  const shouldUseCustomCardSurface = theme === 'light' || theme === 'glass';
  const tinyTextTokens = getCardReadableTextTokens({
    theme,
    tone: 'primary',
    accentColor: actionAccent,
  });

  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) {
      setIsSettingsOpen(true);
    }
  }, [onUpdate, openSettingsRequestKey]);

  const handleTap = async () => {
    if (isEditMode || !data.service) return;
    const serviceCall = parseButtonServiceCall(data.service);
    if (!serviceCall) return;
    const entityId = sanitizeButtonEntityId(data.entityId);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 400);
    try {
      await invokeIntegrationNativeAction({
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

  const isConfigured = Boolean(data.service);
  const overlay = (
    <>
      {shouldUseCustomCardSurface && surface.glowStyle ? (
        <div className="pointer-events-none absolute inset-0" style={surface.glowStyle} />
      ) : null}
      {shouldUseCustomCardSurface && surface.overlayClassName ? (
        <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
      ) : null}
      {cardShell.sheenOverlayClassName ? <div className={cardShell.sheenOverlayClassName} /> : null}
    </>
  );

  let cardContent: React.ReactNode;

  if (!isConfigured) {
    cardContent = (
      <CardEmptyState
        title={t('widgets.button.title')}
        description={t('widgets.button.unconfigured')}
        icon={IconComponent}
        actionLabel={onUpdate ? t('widgets.button.configure') : undefined}
        onAction={onUpdate ? () => setIsSettingsOpen(true) : undefined}
        actionIcon={onUpdate ? Settings2 : undefined}
        size={size}
        accentColor={actionAccent}
      />
    );
  } else if (isTiny) {
    cardContent = (
      <>
        <TinyCardWatermark
          IconComponent={isPressed ? Loader2 : IconComponent}
          color={tinyTextTokens.titleColor}
          className={isPressed ? 'opacity-22' : 'opacity-18'}
          spin={isPressed}
        />

        <div className="relative flex h-full w-full flex-col justify-between text-left">
          <div className="min-w-0 w-full">
            <EntityCardTitleBlock
              title={label}
              subtitle={cardTypeLabel}
              layout="eyebrow-first"
              titleClassName={`mt-0.5 line-clamp-2 text-xs font-semibold leading-tight ${surface.textPrimary}`}
              subtitleClassName={`truncate text-xs tracking-normal ${surface.textMuted}`}
              titleStyle={{ color: tinyTextTokens.titleColor }}
              subtitleStyle={{ color: tinyTextTokens.subtitleColor }}
            />
          </div>
          <span />
        </div>

        <button
          type="button"
          className="absolute inset-0 z-[3]"
          onClick={handleActionClick}
          onPointerDown={stopCardInteraction}
          disabled={isEditMode}
          aria-label={label}
        />
      </>
    );
  } else if (isExtraSmall) {
    cardContent = (
      <>
        <EntityCardHeader
          title={label}
          subtitle={cardTypeLabel}
          size="extra-small"
          compact
          layout="eyebrow-first"
          tone="primary"
          titleClassName={surface.textPrimary}
          subtitleClassName={surface.textMuted}
          className="w-full"
          marginBottomClassName="mb-0"
          leading={
            <EntityCardHeaderIcon
              IconComponent={IconComponent}
              isActive
              size="tiny"
              tone="primary"
              baseColor={actionAccent}
            />
          }
        />
        <button
          type="button"
          className="absolute inset-0 z-[3]"
          onClick={handleActionClick}
          onPointerDown={stopCardInteraction}
          disabled={isEditMode}
          aria-label={label}
        />
      </>
    );
  } else if (isSmall) {
    cardContent = (
      <>
        <EntityCardHeader
          title={label}
          subtitle={cardTypeLabel}
          layout="eyebrow-first"
          size="small"
          tone="primary"
          titleClassName={surface.textPrimary}
          subtitleClassName={surface.textSecondary}
          leading={
            <EntityCardHeaderIcon
              IconComponent={IconComponent}
              isActive
              size="small"
              tone="primary"
              baseColor={actionAccent}
            />
          }
        />

        <div className="flex-1" />
        <button
          type="button"
          className="absolute inset-0 z-[3]"
          onClick={handleActionClick}
          onPointerDown={stopCardInteraction}
          disabled={isEditMode}
          aria-label={label}
        />
      </>
    );
  } else {
    cardContent = (
      <button
        type="button"
        onClick={handleActionClick}
        onPointerDown={stopCardInteraction}
        disabled={isEditMode}
        aria-label={label}
        className="flex flex-col items-center gap-3 transition-transform disabled:cursor-default"
        style={{ transform: isPressed ? 'scale(0.93)' : 'scale(1)' }}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
          style={{
            backgroundColor: `${actionAccent}22`,
            color: actionAccent,
          }}
        >
          <IconComponent className="h-7 w-7" />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-sm font-medium ${surface.textPrimary}`}>{label}</span>
          {data.entityId ? (
            <span className={`max-w-48 truncate text-xs ${surface.textMuted}`}>
              {data.entityId}
            </span>
          ) : null}
        </div>
      </button>
    );
  }

  return (
    <BaseCard
      size={size}
      fullBleed
      style={shouldUseCustomCardSurface ? surface.panelStyle : undefined}
      frameClassName="overflow-hidden"
      disableDefaultSheen
      overlay={overlay}
      contentClassName="h-full"
    >
      <div
        className={`relative z-[2] flex h-full w-full ${
          isConfigured && isTiny
            ? 'p-3'
            : isConfigured && isExtraSmall
              ? 'items-start p-3'
              : isConfigured && isSmall
                ? 'p-4'
                : 'flex-col items-center justify-center p-4'
        }`}
      >
        {cardContent}

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
