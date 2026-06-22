import { BaseCard } from '@navet/app/components/primitives';
import { CardMetric } from '@navet/app/components/primitives/card-metric';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import {
  type CardSize,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { useEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { readNavetSensorState } from '@navet/app/core/navet-device-state';
import { useI18n, useProviderEntityModel, useTheme } from '@navet/app/hooks';
import { inferSensorDisplayIcon } from '@navet/app/hooks/device-mappers';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { type KeyboardEvent, memo, useMemo, useState } from 'react';
import {
  type SensorStatisticsPoint,
  useSensorStatisticsHistory,
} from '../hooks/use-sensor-statistics-history';
import { buildInfoDisplayModel, INFO_TONE_CLASSES } from './info-display-model';
import { SensorHistorySparkline } from './sensor-history-sparkline';
import { SensorSettingsDialog } from './sensor-settings-dialog';
import type { SensorIconType } from './sensors';
import { useSensorCardAppearance } from './use-sensor-card-appearance';

export interface InfoCardProps {
  id: string;
  name: string;
  room: string;
  value: string;
  unit: string;
  icon?: SensorIconType;
  subtitle?: string;
  deviceClass?: string;
  status?: 'measurement' | 'active' | 'clear' | 'unavailable';
  lastUpdated?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onOpenSettings?: () => void;
  disableBuiltInSettingsDialog?: boolean;
  sparklineData?: SensorStatisticsPoint[];
}

export const InfoCard = memo(function InfoCard({
  id,
  name,
  room: _room,
  value,
  unit,
  icon: _icon = 'gauge',
  subtitle,
  deviceClass,
  status = 'measurement',
  lastUpdated: _lastUpdated,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
  onOpenSettings,
  disableBuiltInSettingsDialog = false,
  sparklineData,
}: InfoCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const locale = useSettingsStore(settingsSelectors.language);
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const providerEntity = useProviderEntityModel(id);
  const providerState = readNavetSensorState(providerEntity);
  const liveDeviceClass = providerState?.deviceClass ?? deviceClass;
  const liveValue = typeof providerState?.value === 'string' ? providerState.value : value;
  const liveUnit = typeof providerState?.unit === 'string' ? providerState.unit : unit;
  const liveStatus = providerState?.status ?? status;
  const resolvedIcon = inferSensorDisplayIcon(id, liveDeviceClass, liveUnit || unit);
  const { HeaderIconComponent, headerIconText, selectedIcon, setSelectedIcon } =
    useSensorCardAppearance({
      id,
      defaultIcon: resolvedIcon,
    });
  const displayModel = buildInfoDisplayModel(
    {
      id,
      name,
      room: _room,
      value: liveValue,
      unit: liveUnit,
      icon: resolvedIcon,
      entityType: subtitle ?? providerState?.entityType,
      deviceClass: liveDeviceClass,
      status: liveStatus,
      size,
    },
    { locale, use24HourTime }
  );
  const cardShell = getCardShellSurfaceTokens(theme);
  const toneClasses = INFO_TONE_CLASSES[displayModel.tone];
  const defaultSparklineHistory = useSensorStatisticsHistory(sparklineData ? undefined : id);
  const isVeryCompact = isTinyCardSize(size) || isExtraSmallCardSize(size);
  const isSmall = size === 'small';
  const subtitleText = displayModel.eyebrow || t('sensors.single');
  const valueColor =
    theme === 'light' ? toneClasses.value.replace('300', '700') : toneClasses.value;
  const unitText = displayModel.unit ? ` ${displayModel.unit}` : '';
  const isExtraSmall = isExtraSmallCardSize(size);
  const chromeSize = isVeryCompact ? (isExtraSmall ? 'tiny' : size) : isSmall ? 'small' : 'medium';
  const resolvedSparklineData =
    sparklineData ??
    (defaultSparklineHistory.hasHistory ? defaultSparklineHistory.points : undefined);
  const shouldShowSparkline =
    !isVeryCompact &&
    !isSmall &&
    displayModel.status !== 'unavailable' &&
    (resolvedSparklineData?.length ?? 0) >= 2;
  const sparklineLayerClassName =
    size === 'large' ? 'absolute inset-x-0 top-24 bottom-0' : 'absolute inset-x-0 top-20 bottom-0';
  const sparklineTickFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24HourTime,
      }),
    [locale, use24HourTime]
  );
  const sparklineTickIndexes = size === 'large' ? [0, 1 / 3, 2 / 3, 1] : [0, 1 / 2, 1];
  const sparklineTicks = (resolvedSparklineData ?? [])
    .filter((_point, index, data) => {
      if (data.length === 0) {
        return false;
      }

      const lastIndex = data.length - 1;
      return sparklineTickIndexes.some((ratio) => index === Math.floor(lastIndex * ratio));
    })
    .map((point) => ({
      key: `${point.timestampMs}-${point.endTimestampMs}`,
      label: Number.isFinite(point.timestampMs)
        ? sparklineTickFormatter.format(new Date(point.timestampMs))
        : '',
    }));
  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }

    if (!disableBuiltInSettingsDialog) {
      setIsSettingsOpen(true);
    }
  };
  useEditModeSettingsRequest(
    id,
    openSettings,
    isEditMode && !disableBuiltInSettingsDialog && onOpenSettings === undefined
  );
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSettings();
    }
  };
  const headerIconNode = (
    <EntityCardHeaderIcon
      IconComponent={HeaderIconComponent}
      iconText={headerIconText}
      isActive={displayModel.status !== 'unavailable'}
      size={chromeSize}
      tone={displayModel.tone === 'neutral' ? 'neutral' : 'primary'}
      baseColor={displayModel.baseColor}
      ariaLabel={t('entityCardInteraction.openSettings', { name })}
      onClick={(event) => {
        event.stopPropagation();
        openSettings();
      }}
    />
  );

  return (
    <>
      {shouldShowSparkline ? (
        <BaseCard
          size={size}
          role="button"
          tabIndex={0}
          aria-label={t('entityCardInteraction.openSettings', { name })}
          onClick={openSettings}
          onKeyDown={handleCardKeyDown}
          interactive
          fullBleed
          className="hover:z-30 focus-within:z-30"
          frameClassName={cardShell.rootFrameClassName}
          disableDefaultSheen={theme !== 'light'}
          contentClassName="h-full"
        >
          <div className={sparklineLayerClassName}>
            <SensorHistorySparkline
              data={resolvedSparklineData ?? []}
              accentColor={displayModel.baseColor}
              height={size === 'large' ? 176 : 152}
              className="opacity-95"
            />
          </div>
          <div
            className={`pointer-events-none absolute inset-0 ${
              theme === 'light'
                ? 'bg-linear-to-b from-white/14 via-white/2 to-white/0'
                : 'bg-linear-to-b from-slate-950/22 via-slate-950/8 to-transparent'
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 border-t border-dashed ${
              theme === 'light' ? 'border-slate-400/70' : 'border-white/65'
            } ${size === 'large' ? 'top-[45%]' : 'top-[43%]'}`}
          />

          <div className="pointer-events-none relative z-10 flex h-full flex-col p-3">
            <div className="flex items-start justify-between gap-4">
              <EntityCardHeader
                title={displayModel.title}
                subtitle={subtitleText}
                size={size}
                layout="eyebrow-first"
                className="mb-0"
                marginBottomClassName="mb-0"
                leading={headerIconNode}
              />
              <CardMetric
                value={
                  <>
                    {displayModel.value}
                    {displayModel.unit ? (
                      <span className="align-baseline text-xl">{unitText}</span>
                    ) : null}
                  </>
                }
                size={size === 'large' ? 'xl' : 'lg'}
                isActive
                accentClassName={valueColor}
                theme={theme}
                className="shrink-0 text-right"
                valueStyle={{
                  fontSize: size === 'large' ? '1.7rem' : '1.45rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              />
            </div>

            {sparklineTicks.length >= 2 ? (
              <div className="mt-auto">
                <div
                  className={`mt-3 flex items-center justify-between gap-2 text-xs ${
                    theme === 'light' ? 'text-slate-500' : 'text-white/72'
                  }`}
                >
                  {sparklineTicks.map((point, index) => (
                    <div
                      key={`${point.key}-${index}`}
                      className="min-w-0 flex-1 truncate whitespace-nowrap text-center first:text-left last:text-right"
                    >
                      {point.label}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </BaseCard>
      ) : (
        <BaseCard
          size={size}
          role="button"
          tabIndex={0}
          aria-label={t('entityCardInteraction.openSettings', { name })}
          onClick={openSettings}
          onKeyDown={handleCardKeyDown}
          interactive
          title={displayModel.title}
          subtitle={subtitleText}
          headerCompact={isExtraSmall}
          headerLayout="eyebrow-first"
          headerTone="neutral"
          headerLeading={headerIconNode}
          frameClassName={cardShell.rootFrameClassName}
          disableDefaultSheen={theme !== 'light'}
          contentClassName="flex items-end"
        >
          <div
            className={`relative z-10 min-w-0 truncate font-light leading-none tracking-normal ${valueColor} ${
              isVeryCompact ? 'text-2xl' : isSmall ? 'text-3xl' : 'text-4xl'
            }`}
            title={`${displayModel.value}${unitText}`}
          >
            {displayModel.value}
            {displayModel.unit ? (
              <span className={`${isVeryCompact ? 'text-base' : 'text-xl'} align-baseline`}>
                {unitText}
              </span>
            ) : null}
          </div>
        </BaseCard>
      )}

      {!disableBuiltInSettingsDialog && isSettingsOpen ? (
        <SensorSettingsDialog
          entityId={id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          name={name}
          entityType={subtitleText}
          selectedIcon={selectedIcon}
          onIconChange={setSelectedIcon}
        />
      ) : null}
    </>
  );
});

export const SensorCard = InfoCard;
