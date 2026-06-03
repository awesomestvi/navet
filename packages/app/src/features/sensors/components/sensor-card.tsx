import { BaseCard } from '@navet/app/components/primitives';
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
import { type KeyboardEvent, memo, useState } from 'react';
import type { SensorStatisticsPoint } from '../hooks/use-sensor-statistics-history';
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
  isEditMode: _isEditMode,
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
  const isVeryCompact = isTinyCardSize(size) || isExtraSmallCardSize(size);
  const isSmall = size === 'small';
  const subtitleText = displayModel.eyebrow || t('sensors.single');
  const valueColor =
    theme === 'light' ? toneClasses.value.replace('300', '700') : toneClasses.value;
  const unitText = displayModel.unit ? ` ${displayModel.unit}` : '';
  const isExtraSmall = isExtraSmallCardSize(size);
  const chromeSize = isVeryCompact ? (isExtraSmall ? 'tiny' : size) : isSmall ? 'small' : 'medium';
  const shouldShowSparkline =
    !isVeryCompact &&
    !isSmall &&
    displayModel.status !== 'unavailable' &&
    (sparklineData?.length ?? 0) >= 2;
  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }

    if (!disableBuiltInSettingsDialog) {
      setIsSettingsOpen(true);
    }
  };
  useEditModeSettingsRequest(id, openSettings);
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
        underlay={
          shouldShowSparkline ? (
            <SensorHistorySparkline
              data={sparklineData ?? []}
              accentColor={displayModel.baseColor}
              height={size === 'large' ? 152 : 126}
            />
          ) : null
        }
        overlay={
          shouldShowSparkline ? (
            <div
              className={`pointer-events-none absolute inset-0 ${
                theme === 'light'
                  ? 'bg-linear-to-b from-white/12 via-white/2 to-white/0'
                  : 'bg-linear-to-b from-slate-950/22 via-slate-950/8 to-transparent'
              }`}
            />
          ) : null
        }
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
