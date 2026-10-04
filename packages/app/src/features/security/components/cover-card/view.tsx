import { BaseCard } from '@navet/app/components/primitives';
import { CardMetric } from '@navet/app/components/primitives/card-metric';
import { CardMetricActionLayout } from '@navet/app/components/primitives/card-metric-action-layout';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { type ThemeType, useI18n } from '@navet/app/hooks';
import type { HTMLAttributes, MouseEvent as ReactMouseEvent } from 'react';
import { getSecurityCardSurfaceTokens } from '../security-card-surface-tokens';
import { CoverActionRow } from './cover-action-row';
import { CoverDragHandle, CoverPositionFill } from './cover-position-fill';
import { CoverPositionGestureSurface } from './cover-position-gesture-surface';
import { CoverPresetChips } from './cover-preset-chips';
import { CoverSettingsDialog } from './cover-settings-dialog';
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
  stateDisplay: { text: string; color: string; unavailable?: boolean };
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
  room,
  position,
  deviceClass,
  deviceClassConfig,
  size,
  isEditMode,
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
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const clampedPosition = stateDisplay.unavailable ? 0 : Math.max(0, Math.min(100, position));

  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const DeviceIcon = deviceClassConfig[deviceClass].icon;
  const handleToggle = () => {
    if (clampedPosition > 0) {
      handleClose();
      return;
    }

    handleOpen();
  };
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
          <CoverPositionFill
            position={clampedPosition}
            theme={theme}
            coverageGradient={openColors.gradient}
            cardSize={size}
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
            disabled={!canSetPosition || isEditMode}
            mapToCardBounds
            className={`absolute ${size === 'extra-small' ? '-inset-x-2.5 -inset-y-2' : '-inset-3'} z-10 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current ${
              canSetPosition ? '' : 'pointer-events-none'
            }`}
            onPreviewPosition={onPreviewPosition}
            onCommitPosition={onCommitPosition}
            onTap={isEditMode ? undefined : handleToggle}
          >
            <span className="sr-only">{t('cover.ariaLabel', { name })}</span>
            {canSetPosition && !isEditMode && isMedium && (
              <CoverDragHandle position={clampedPosition} theme={theme} cardSize={size} />
            )}
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
            isEditMode={isEditMode}
            onToggle={handleToggle}
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
            isEditMode={isEditMode}
            onToggle={handleToggle}
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
            isEditMode={isEditMode}
            onToggle={handleToggle}
          />
        )}
      </div>

      {isSettingsOpen ? (
        <CoverSettingsDialog
          entityId={entityId}
          name={name}
          room={room}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          position={clampedPosition}
          stateLabel={stateDisplay.text}
          deviceClass={deviceClass}
          deviceClassConfig={deviceClassConfig}
          onDeviceClassChange={setDeviceClass}
          onPreviewPosition={onPreviewPosition}
          onCommitPosition={onCommitPosition}
          onOpen={handleOpen}
          onStop={handleStop}
          onClose={handleClose}
          canOpen={canOpen}
          canStop={canStop}
          canClose={canClose}
          canSetPosition={canSetPosition}
        />
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
  stateDisplay: { text: string; color: string; unavailable?: boolean };
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
  isEditMode: boolean;
  onToggle: () => void;
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
  const isExtraSmall = size === 'extra-small';

  return (
    <EntityCardHeader
      title={name}
      subtitle={deviceLabel}
      layout="eyebrow-first"
      size={size}
      compact={isExtraSmall}
      tone={tone}
      className="pointer-events-none [&_button]:pointer-events-auto"
      leading={
        <EntityCardHeaderIcon
          IconComponent={DeviceIcon}
          isActive={isCoverOpenTone(position)}
          size={isExtraSmall ? 'tiny' : size}
          tone={tone}
          ariaLabel={iconButtonProps['aria-label']}
          disabled={iconButtonProps.disabled}
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
  inlineState = false,
}: Pick<SharedCoverLayoutProps, 'position' | 'stateDisplay' | 'openColors' | 'theme'> & {
  size: 'sm' | 'xl';
  inlineState?: boolean;
}) {
  return (
    <CardMetric
      value={
        stateDisplay.unavailable ? (
          stateDisplay.text
        ) : inlineState ? (
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span>{position}%</span>
            <span className={`truncate text-base font-light leading-none ${stateDisplay.color}`}>
              {stateDisplay.text}
            </span>
          </span>
        ) : (
          `${position}%`
        )
      }
      label={inlineState || stateDisplay.unavailable ? undefined : stateDisplay.text}
      size={size}
      isActive={!stateDisplay.unavailable && position > 0}
      accentClassName={openColors.accent}
      theme={theme}
      labelClassName={stateDisplay.color}
      valueClassName={inlineState ? 'text-2xl font-light leading-none tracking-normal' : undefined}
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
  const isExtraSmall = size === 'extra-small';

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

      {isExtraSmall ? (
        <div className="mt-auto">
          <CoverPositionMetric
            position={position}
            stateDisplay={stateDisplay}
            openColors={openColors}
            theme={theme}
            size="sm"
            inlineState
          />
        </div>
      ) : (
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
      )}
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
  isEditMode,
  onToggle,
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
          onTap={isEditMode ? undefined : onToggle}
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
