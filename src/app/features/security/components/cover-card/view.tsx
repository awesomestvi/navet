import type { HTMLAttributes, MouseEvent as ReactMouseEvent } from 'react';
import { CardDialogBody, CardDialogHeader, CardDialogSection } from '@/app/components/patterns';
import { BaseCard } from '@/app/components/primitives';
import { CardMetric } from '@/app/components/primitives/card-metric';
import { CardMetricActionLayout } from '@/app/components/primitives/card-metric-action-layout';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@/app/components/primitives/dialog-shell';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { CustomScrollbar } from '@/app/components/shared/device-editor';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getAccentDialogSurface,
  type PresetPrimaryColor,
  resolvePrimaryColorToken,
} from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type ThemeType, useI18n, useTheme } from '@/app/hooks';
import { getSecurityCardSurfaceTokens } from '../security-card-surface-tokens';
import { CoverActionRow } from './cover-action-row';
import { CoverPositionGestureSurface } from './cover-position-gesture-surface';
import { CoverPresetChips } from './cover-preset-chips';
import { CoverWindowVisualization } from './cover-window-visualization';
import type { CoverIconButtonProps, DeviceClass, DeviceClassConfig } from './types';

type CoverColorSet = {
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
  glow: string;
};

const COVER_OPEN_TONE_THRESHOLD = 50;
const COVER_POSITION_GESTURE_SELECTOR = '[data-cover-position-gesture="true"]';

type CoverDeviceTypeAccentClasses = {
  selectedButton: string;
  unselectedLightButton: string;
  unselectedDarkButton: string;
  unselectedLightIcon: string;
  unselectedDarkIcon: string;
  unselectedLightIconColor: string;
  unselectedDarkIconColor: string;
  unselectedLightText: string;
  unselectedDarkText: string;
};

const COVER_DEVICE_TYPE_ACCENT_CLASSES: Record<PresetPrimaryColor, CoverDeviceTypeAccentClasses> = {
  orange: {
    selectedButton: 'border-orange-300/70 bg-orange-400/18 shadow-lg shadow-orange-500/20',
    unselectedLightButton:
      'border-orange-200/80 bg-orange-50/80 hover:border-orange-300 hover:bg-orange-100/80',
    unselectedDarkButton:
      'border-orange-200/14 bg-orange-300/[0.045] hover:border-orange-200/26 hover:bg-orange-300/[0.075]',
    unselectedLightIcon: 'bg-orange-100 text-orange-700',
    unselectedDarkIcon:
      'bg-orange-300/10 text-orange-100/78 group-hover:bg-orange-300/14 group-hover:text-orange-50',
    unselectedLightIconColor: 'text-orange-700',
    unselectedDarkIconColor: 'text-orange-100/78',
    unselectedLightText: 'text-orange-950',
    unselectedDarkText: 'text-orange-50/88',
  },
  blue: {
    selectedButton: 'border-blue-300/70 bg-blue-400/18 shadow-lg shadow-blue-500/20',
    unselectedLightButton:
      'border-blue-200/80 bg-blue-50/80 hover:border-blue-300 hover:bg-blue-100/80',
    unselectedDarkButton:
      'border-blue-200/14 bg-blue-300/[0.045] hover:border-blue-200/26 hover:bg-blue-300/[0.075]',
    unselectedLightIcon: 'bg-blue-100 text-blue-700',
    unselectedDarkIcon:
      'bg-blue-300/10 text-blue-100/78 group-hover:bg-blue-300/14 group-hover:text-blue-50',
    unselectedLightIconColor: 'text-blue-700',
    unselectedDarkIconColor: 'text-blue-100/78',
    unselectedLightText: 'text-blue-950',
    unselectedDarkText: 'text-blue-50/88',
  },
  green: {
    selectedButton: 'border-green-300/70 bg-green-400/18 shadow-lg shadow-green-500/20',
    unselectedLightButton:
      'border-green-200/80 bg-green-50/80 hover:border-green-300 hover:bg-green-100/80',
    unselectedDarkButton:
      'border-green-200/14 bg-green-300/[0.045] hover:border-green-200/26 hover:bg-green-300/[0.075]',
    unselectedLightIcon: 'bg-green-100 text-green-700',
    unselectedDarkIcon:
      'bg-green-300/10 text-green-100/78 group-hover:bg-green-300/14 group-hover:text-green-50',
    unselectedLightIconColor: 'text-green-700',
    unselectedDarkIconColor: 'text-green-100/78',
    unselectedLightText: 'text-green-950',
    unselectedDarkText: 'text-green-50/88',
  },
  purple: {
    selectedButton: 'border-purple-300/70 bg-purple-400/18 shadow-lg shadow-purple-500/20',
    unselectedLightButton:
      'border-purple-200/80 bg-purple-50/80 hover:border-purple-300 hover:bg-purple-100/80',
    unselectedDarkButton:
      'border-purple-200/14 bg-purple-300/[0.045] hover:border-purple-200/26 hover:bg-purple-300/[0.075]',
    unselectedLightIcon: 'bg-purple-100 text-purple-700',
    unselectedDarkIcon:
      'bg-purple-300/10 text-purple-100/78 group-hover:bg-purple-300/14 group-hover:text-purple-50',
    unselectedLightIconColor: 'text-purple-700',
    unselectedDarkIconColor: 'text-purple-100/78',
    unselectedLightText: 'text-purple-950',
    unselectedDarkText: 'text-purple-50/88',
  },
  pink: {
    selectedButton: 'border-pink-300/70 bg-pink-400/18 shadow-lg shadow-pink-500/20',
    unselectedLightButton:
      'border-pink-200/80 bg-pink-50/80 hover:border-pink-300 hover:bg-pink-100/80',
    unselectedDarkButton:
      'border-pink-200/14 bg-pink-300/[0.045] hover:border-pink-200/26 hover:bg-pink-300/[0.075]',
    unselectedLightIcon: 'bg-pink-100 text-pink-700',
    unselectedDarkIcon:
      'bg-pink-300/10 text-pink-100/78 group-hover:bg-pink-300/14 group-hover:text-pink-50',
    unselectedLightIconColor: 'text-pink-700',
    unselectedDarkIconColor: 'text-pink-100/78',
    unselectedLightText: 'text-pink-950',
    unselectedDarkText: 'text-pink-50/88',
  },
  red: {
    selectedButton: 'border-red-300/70 bg-red-400/18 shadow-lg shadow-red-500/20',
    unselectedLightButton:
      'border-red-200/80 bg-red-50/80 hover:border-red-300 hover:bg-red-100/80',
    unselectedDarkButton:
      'border-red-200/14 bg-red-300/[0.045] hover:border-red-200/26 hover:bg-red-300/[0.075]',
    unselectedLightIcon: 'bg-red-100 text-red-700',
    unselectedDarkIcon:
      'bg-red-300/10 text-red-100/78 group-hover:bg-red-300/14 group-hover:text-red-50',
    unselectedLightIconColor: 'text-red-700',
    unselectedDarkIconColor: 'text-red-100/78',
    unselectedLightText: 'text-red-950',
    unselectedDarkText: 'text-red-50/88',
  },
  yellow: {
    selectedButton: 'border-yellow-300/70 bg-yellow-400/18 shadow-lg shadow-yellow-500/20',
    unselectedLightButton:
      'border-yellow-200/80 bg-yellow-50/80 hover:border-yellow-300 hover:bg-yellow-100/80',
    unselectedDarkButton:
      'border-yellow-200/14 bg-yellow-300/[0.045] hover:border-yellow-200/26 hover:bg-yellow-300/[0.075]',
    unselectedLightIcon: 'bg-yellow-100 text-yellow-700',
    unselectedDarkIcon:
      'bg-yellow-300/10 text-yellow-100/78 group-hover:bg-yellow-300/14 group-hover:text-yellow-50',
    unselectedLightIconColor: 'text-yellow-700',
    unselectedDarkIconColor: 'text-yellow-100/78',
    unselectedLightText: 'text-yellow-950',
    unselectedDarkText: 'text-yellow-50/88',
  },
  teal: {
    selectedButton: 'border-teal-300/70 bg-teal-400/18 shadow-lg shadow-teal-500/20',
    unselectedLightButton:
      'border-teal-200/80 bg-teal-50/80 hover:border-teal-300 hover:bg-teal-100/80',
    unselectedDarkButton:
      'border-teal-200/14 bg-teal-300/[0.045] hover:border-teal-200/26 hover:bg-teal-300/[0.075]',
    unselectedLightIcon: 'bg-teal-100 text-teal-700',
    unselectedDarkIcon:
      'bg-teal-300/10 text-teal-100/78 group-hover:bg-teal-300/14 group-hover:text-teal-50',
    unselectedLightIconColor: 'text-teal-700',
    unselectedDarkIconColor: 'text-teal-100/78',
    unselectedLightText: 'text-teal-950',
    unselectedDarkText: 'text-teal-50/88',
  },
};

function isCoverOpenTone(position: number) {
  return position > COVER_OPEN_TONE_THRESHOLD;
}

interface CoverCardViewProps {
  entityId: string;
  name: string;
  room: string;
  position: number;
  deviceClass: DeviceClass;
  deviceClassConfig: Record<DeviceClass, DeviceClassConfig>;
  size: CardSize;
  isEditMode: boolean;
  cardId: string;
  cardProps: HTMLAttributes<HTMLDivElement>;
  openColors: CoverColorSet;
  closedColors: CoverColorSet;
  theme: ThemeType;
  stateDisplay: { text: string; color: string };
  iconButtonProps: CoverIconButtonProps;
  settingsButtonProps: CoverIconButtonProps;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  onSizeChange: (id: string, size: CardSize) => void;
  onPreviewPosition: (newPosition: number) => void;
  onCommitPosition: (newPosition: number) => void;
  handleOpen: () => void;
  handleClose: () => void;
  handleStop: () => void;
  canOpen: boolean;
  canClose: boolean;
  canStop: boolean;
  canSetPosition: boolean;
  setDeviceClass: (deviceClass: DeviceClass) => void;
}

export function CoverCardView({
  entityId,
  name,
  room: _room,
  position,
  deviceClass,
  deviceClassConfig,
  size,
  isEditMode: _isEditMode,
  cardId: _cardId,
  cardProps,
  openColors,
  closedColors,
  theme,
  stateDisplay,
  iconButtonProps,
  settingsButtonProps,
  isSettingsOpen,
  setIsSettingsOpen,
  onSizeChange: _onSizeChange,
  onPreviewPosition,
  onCommitPosition,
  handleOpen,
  handleClose,
  handleStop,
  canOpen,
  canClose,
  canStop,
  canSetPosition,
  setDeviceClass,
}: CoverCardViewProps) {
  const { t } = useI18n();
  const { primaryColor } = useTheme();
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const clampedPosition = Math.max(0, Math.min(100, position));

  const surface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const activeDialogColor = resolvePrimaryColorToken(primaryColor);
  const activeDialogColors = getAccentDialogSurface(activeDialogColor);
  const deviceTypeAccent = COVER_DEVICE_TYPE_ACCENT_CLASSES[activeDialogColor];
  const dialogShell = customCardDialogShellProps(surface, {}, { maxWidth: 'md', padding: false });
  const dialogContentClassName = `${dialogShell.contentClassName} h-auto max-h-[85vh] animate-in fade-in zoom-in duration-200 bg-linear-to-br ${activeDialogColors.from} ${activeDialogColors.to} ${activeDialogColors.border}`;

  const DeviceIcon = deviceClassConfig[deviceClass].icon;
  const coverCardProps: HTMLAttributes<HTMLDivElement> = {
    ...cardProps,
    onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        event.currentTarget.dataset.coverPositionSuppressClick === 'true' ||
        (target instanceof Element && target.closest(COVER_POSITION_GESTURE_SELECTOR))
      ) {
        event.preventDefault();
        event.stopPropagation();
        delete event.currentTarget.dataset.coverPositionSuppressClick;
        return;
      }

      cardProps.onClick?.(event);
    },
  };

  return (
    <BaseCard
      size={size}
      {...coverCardProps}
      data-cover-card-root="true"
      frameClassName={`bg-linear-to-br ${closedColors.gradient} ${cardShell.rootFrameClassName} ${isCoverOpenTone(clampedPosition) ? openColors.border : closedColors.border} ${securitySurface.containerShadowClassName}`}
      disableDefaultSheen
      overlay={
        <>
          <div
            className={`absolute inset-x-0 bottom-0 bg-linear-to-br ${openColors.gradient}`}
            style={{ height: `${clampedPosition}%` }}
          />
          <div className={`absolute inset-0 bg-linear-to-br ${openColors.glow} to-transparent`} />
          {securitySurface.overlayClassName ? (
            <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      <div className="relative flex h-full flex-col">
        {isSmall || isMedium ? (
          <CoverPositionGestureSurface
            position={clampedPosition}
            ariaLabel={t('cover.ariaLabel', { name })}
            disabled={!canSetPosition}
            className={`absolute inset-0 z-10 rounded-[inherit] ${
              canSetPosition ? '' : 'pointer-events-none'
            }`}
            onPreviewPosition={onPreviewPosition}
            onCommitPosition={onCommitPosition}
          >
            <span className="sr-only">{t('cover.ariaLabel', { name })}</span>
          </CoverPositionGestureSurface>
        ) : null}

        {isSmall ? (
          <CompactCoverLayout
            name={name}
            size={size}
            DeviceIcon={DeviceIcon}
            iconButtonProps={iconButtonProps}
            settingsButtonProps={settingsButtonProps}
            deviceLabel={t(deviceClassConfig[deviceClass].labelKey)}
            positionAriaLabel={t('cover.ariaLabel', { name })}
            openColors={openColors}
            position={clampedPosition}
            stateDisplay={stateDisplay}
            theme={theme}
            onOpen={handleOpen}
            onStop={handleStop}
            onClose={handleClose}
            onPreviewPosition={onPreviewPosition}
            onCommitPosition={onCommitPosition}
            canOpen={canOpen}
            canStop={canStop}
            canClose={canClose}
            canSetPosition={canSetPosition}
          />
        ) : isMedium ? (
          <MediumCoverLayout
            name={name}
            size={size}
            DeviceIcon={DeviceIcon}
            iconButtonProps={iconButtonProps}
            settingsButtonProps={settingsButtonProps}
            deviceLabel={t(deviceClassConfig[deviceClass].labelKey)}
            positionAriaLabel={t('cover.ariaLabel', { name })}
            openColors={openColors}
            position={clampedPosition}
            stateDisplay={stateDisplay}
            theme={theme}
            onOpen={handleOpen}
            onStop={handleStop}
            onClose={handleClose}
            onPreviewPosition={onPreviewPosition}
            onCommitPosition={onCommitPosition}
            canOpen={canOpen}
            canStop={canStop}
            canClose={canClose}
            canSetPosition={canSetPosition}
          />
        ) : (
          <LargeCoverLayout
            name={name}
            size={size}
            DeviceIcon={DeviceIcon}
            iconButtonProps={iconButtonProps}
            settingsButtonProps={settingsButtonProps}
            deviceLabel={t(deviceClassConfig[deviceClass].labelKey)}
            positionAriaLabel={t('cover.ariaLabel', { name })}
            openColors={openColors}
            position={clampedPosition}
            stateDisplay={stateDisplay}
            theme={theme}
            onOpen={handleOpen}
            onStop={handleStop}
            onClose={handleClose}
            onPreviewPosition={onPreviewPosition}
            onCommitPosition={onCommitPosition}
            canOpen={canOpen}
            canStop={canStop}
            canClose={canClose}
            canSetPosition={canSetPosition}
          />
        )}
      </div>

      {isSettingsOpen ? (
        <DialogShell
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          disableOpenAutoFocus
          overlayClassName={surface.dialogBackdrop}
          contentClassName={dialogContentClassName}
          contentStyle={dialogShell.contentStyle}
          contentGlowClassName={dialogShell.contentGlowClassName}
          contentGlowStyle={dialogShell.contentGlowStyle}
          contentOverlayClassName={dialogShell.contentOverlayClassName}
        >
          <CustomScrollbar isOn={theme !== 'light'} className="max-sm:min-h-0 max-sm:flex-1">
            <CardDialogBody>
              <CardDialogHeader
                title={name}
                description={t('cover.settings.deviceType')}
                entityId={entityId}
              />

              <CardDialogSection
                label={t('cover.settings.deviceType')}
                helperText={t('cover.settings.description', { name })}
                helperTextClassName={surface.textSecondary}
                className="mb-0"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(deviceClassConfig) as DeviceClass[]).map((type) => {
                    const config = deviceClassConfig[type];
                    const Icon = config.icon;
                    const isSelected = deviceClass === type;

                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setDeviceClass(type)}
                        className={`group flex min-h-14 items-center gap-2.5 rounded-[18px] border px-3 py-2.5 text-left transition-all duration-200 ${
                          isSelected
                            ? deviceTypeAccent.selectedButton
                            : theme === 'light'
                              ? deviceTypeAccent.unselectedLightButton
                              : deviceTypeAccent.unselectedDarkButton
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] transition-colors ${
                            isSelected
                              ? 'bg-white/16 text-white'
                              : theme === 'light'
                                ? deviceTypeAccent.unselectedLightIcon
                                : deviceTypeAccent.unselectedDarkIcon
                          }`}
                        >
                          <Icon
                            className={`h-[18px] w-[18px] ${
                              isSelected
                                ? 'text-white'
                                : theme === 'light'
                                  ? deviceTypeAccent.unselectedLightIconColor
                                  : deviceTypeAccent.unselectedDarkIconColor
                            }`}
                          />
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                            isSelected
                              ? 'text-white'
                              : theme === 'light'
                                ? deviceTypeAccent.unselectedLightText
                                : deviceTypeAccent.unselectedDarkText
                          }`}
                        >
                          {t(config.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardDialogSection>

              <DialogDoneFooter label={t('common.done')} />
            </CardDialogBody>
          </CustomScrollbar>
        </DialogShell>
      ) : null}
    </BaseCard>
  );
}

interface SharedCoverLayoutProps {
  name: string;
  size: CardSize;
  DeviceIcon: DeviceClassConfig['icon'];
  iconButtonProps: CoverIconButtonProps;
  settingsButtonProps: CoverIconButtonProps;
  deviceLabel: string;
  positionAriaLabel: string;
  position: number;
  stateDisplay: { text: string; color: string };
  openColors: CoverColorSet;
  theme: ThemeType;
  onOpen: () => void;
  onStop: () => void;
  onClose: () => void;
  onPreviewPosition: (newPosition: number) => void;
  onCommitPosition: (newPosition: number) => void;
  canOpen: boolean;
  canStop: boolean;
  canClose: boolean;
  canSetPosition: boolean;
}

function CoverCardHeader({
  name,
  size,
  DeviceIcon,
  iconButtonProps,
  deviceLabel,
  position,
}: Pick<
  SharedCoverLayoutProps,
  'name' | 'size' | 'DeviceIcon' | 'iconButtonProps' | 'deviceLabel' | 'position'
>) {
  const tone = isCoverOpenTone(position) ? 'primary' : 'neutral';

  return (
    <EntityCardHeader
      title={name}
      subtitle={deviceLabel}
      layout="eyebrow-first"
      size={size}
      tone={tone}
      className="pointer-events-none [&_button]:pointer-events-auto"
      leading={
        <EntityCardHeaderIcon
          IconComponent={DeviceIcon}
          isActive={isCoverOpenTone(position)}
          size={size}
          tone={tone}
          ariaLabel={iconButtonProps['aria-label']}
          onClick={iconButtonProps.onClick}
          onPointerDown={iconButtonProps.onPointerDown}
        />
      }
    />
  );
}

function CoverPositionMetric({
  position,
  stateDisplay,
  openColors,
  theme,
  size,
}: Pick<SharedCoverLayoutProps, 'position' | 'stateDisplay' | 'openColors' | 'theme'> & {
  size: 'sm' | 'xl';
}) {
  return (
    <CardMetric
      value={`${position}%`}
      label={stateDisplay.text}
      size={size}
      isActive={position > 0}
      accentClassName={openColors.accent}
      theme={theme}
      labelClassName={stateDisplay.color}
    />
  );
}

// Small — no window visualization; the card background split IS the indicator.
function CompactCoverLayout({
  name,
  size,
  DeviceIcon,
  iconButtonProps,
  settingsButtonProps,
  deviceLabel,
  position,
  stateDisplay,
  openColors,
  theme,
  onOpen,
  onStop,
  onClose,
  canOpen,
  canStop,
  canClose,
}: SharedCoverLayoutProps) {
  return (
    <div className="pointer-events-none relative z-20 flex h-full flex-col [&_button]:pointer-events-auto">
      <CoverCardHeader
        name={name}
        size={size}
        DeviceIcon={DeviceIcon}
        iconButtonProps={iconButtonProps}
        deviceLabel={deviceLabel}
        position={position}
      />

      <CardMetricActionLayout
        size="small"
        metric={
          <CoverPositionMetric
            position={position}
            stateDisplay={stateDisplay}
            openColors={openColors}
            theme={theme}
            size="sm"
          />
        }
        actions={
          <CoverActionRow
            theme={theme}
            size="small"
            position={position}
            settingsButtonProps={settingsButtonProps}
            onOpen={onOpen}
            onStop={onStop}
            onClose={onClose}
            canOpen={canOpen}
            canStop={canStop}
            canClose={canClose}
          />
        }
      />
    </div>
  );
}

// Medium — no window visualization; the card background split IS the indicator.
function MediumCoverLayout({
  name,
  size,
  DeviceIcon,
  iconButtonProps,
  settingsButtonProps,
  deviceLabel,
  position,
  stateDisplay,
  openColors,
  theme,
  onOpen,
  onStop,
  onClose,
  canOpen,
  canStop,
  canClose,
}: SharedCoverLayoutProps) {
  return (
    <div className="pointer-events-none relative z-20 flex h-full flex-col [&_button]:pointer-events-auto">
      <CoverCardHeader
        name={name}
        size={size}
        DeviceIcon={DeviceIcon}
        iconButtonProps={iconButtonProps}
        deviceLabel={deviceLabel}
        position={position}
      />

      <CardMetricActionLayout
        size="medium"
        metric={
          <CoverPositionMetric
            position={position}
            stateDisplay={stateDisplay}
            openColors={openColors}
            theme={theme}
            size="sm"
          />
        }
        actions={
          <CoverActionRow
            theme={theme}
            size="medium"
            position={position}
            settingsButtonProps={settingsButtonProps}
            onOpen={onOpen}
            onStop={onStop}
            onClose={onClose}
            canOpen={canOpen}
            canStop={canStop}
            canClose={canClose}
          />
        }
      />
    </div>
  );
}

// Large — keeps the window visualization alongside the split background.
function LargeCoverLayout({
  name,
  size,
  DeviceIcon,
  iconButtonProps,
  settingsButtonProps,
  deviceLabel,
  positionAriaLabel,
  position,
  stateDisplay,
  openColors,
  theme,
  onPreviewPosition,
  onCommitPosition,
  onOpen,
  onStop,
  onClose,
  canOpen,
  canStop,
  canClose,
  canSetPosition,
}: SharedCoverLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <CoverCardHeader
        name={name}
        size={size}
        DeviceIcon={DeviceIcon}
        iconButtonProps={iconButtonProps}
        deviceLabel={deviceLabel}
        position={position}
      />

      <div className="mt-5 grid flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5">
        <CoverWindowVisualization
          position={position}
          theme={theme}
          ariaLabel={positionAriaLabel}
          onPreviewPosition={onPreviewPosition}
          onCommitPosition={onCommitPosition}
          disabled={!canSetPosition}
        />

        <div className="flex min-w-0 flex-col rounded-[28px] border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
          <CoverPositionMetric
            position={position}
            stateDisplay={stateDisplay}
            openColors={openColors}
            theme={theme}
            size="xl"
          />

          <div className="mt-auto pt-4">
            <CoverPresetChips
              position={position}
              theme={theme}
              onSetPosition={onCommitPosition}
              disabled={!canSetPosition}
            />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <CoverActionRow
          theme={theme}
          size="medium"
          position={position}
          settingsButtonProps={settingsButtonProps}
          onOpen={onOpen}
          onStop={onStop}
          onClose={onClose}
          canOpen={canOpen}
          canStop={canStop}
          canClose={canClose}
        />
      </div>
    </div>
  );
}
