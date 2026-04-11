import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { CardMetric } from '@/app/components/primitives/card-metric';
import { CardMetricActionLayout } from '@/app/components/primitives/card-metric-action-layout';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import {
  type CardSize,
  getStandardCardPadding,
  isCompactCardSize,
} from '@/app/components/shared/card-size-selector';
import { DialogHeader } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type ThemeType, useI18n } from '@/app/hooks';
import { getSecurityCardSurfaceTokens } from '../security-card-surface-tokens';
import type { CoverIconButtonProps, DeviceClass, DeviceClassConfig } from './types';

type CoverColorSet = {
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
  glow: string;
};

function CoverPauseIcon() {
  return (
    <span className="inline-flex h-3.5 items-center justify-center gap-0.75" aria-hidden="true">
      <span className="h-3 w-0.5 rounded-full bg-current" />
      <span className="h-3 w-0.5 rounded-full bg-current" />
    </span>
  );
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
  handlePositionChange: (newPosition: number) => void;
  handleOpen: () => void;
  handleClose: () => void;
  handleStop: () => void;
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
  handlePositionChange,
  handleOpen,
  handleClose,
  handleStop,
  setDeviceClass,
}: CoverCardViewProps) {
  const { t } = useI18n();
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const padding = getStandardCardPadding(size);
  const clampedPosition = Math.max(0, Math.min(100, position));

  const surface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);

  const DeviceIcon = deviceClassConfig[deviceClass].icon;

  return (
    <div
      {...cardProps}
      className={`relative h-full bg-linear-to-br ${closedColors.gradient} ${cardShell.backdropClassName} rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} ${clampedPosition > 50 ? openColors.border : closedColors.border} overflow-hidden ${securitySurface.containerShadowClassName}`}
    >
      {/* Open-state fill — grows from the bottom as position increases */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-linear-to-br ${openColors.gradient} transition-[height] duration-100 ease-out`}
        style={{ height: `${clampedPosition}%` }}
      />

      {/* Accent glow */}
      <div className={`absolute inset-0 bg-linear-to-br ${openColors.glow} to-transparent`} />

      {securitySurface.overlayClassName && (
        <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
      )}

      <div className="relative flex h-full flex-col">
        {isSmall ? (
          <CompactCoverLayout
            name={name}
            size={size}
            DeviceIcon={DeviceIcon}
            iconButtonProps={iconButtonProps}
            settingsButtonProps={settingsButtonProps}
            deviceLabel={t(deviceClassConfig[deviceClass].labelKey)}
            openColors={openColors}
            position={clampedPosition}
            stateDisplay={stateDisplay}
            theme={theme}
            onOpen={handleOpen}
            onStop={handleStop}
            onClose={handleClose}
            onSetPosition={handlePositionChange}
          />
        ) : isMedium ? (
          <MediumCoverLayout
            name={name}
            size={size}
            DeviceIcon={DeviceIcon}
            iconButtonProps={iconButtonProps}
            settingsButtonProps={settingsButtonProps}
            deviceLabel={t(deviceClassConfig[deviceClass].labelKey)}
            openColors={openColors}
            position={clampedPosition}
            stateDisplay={stateDisplay}
            theme={theme}
            onOpen={handleOpen}
            onStop={handleStop}
            onClose={handleClose}
            onSetPosition={handlePositionChange}
          />
        ) : (
          <LargeCoverLayout
            name={name}
            size={size}
            DeviceIcon={DeviceIcon}
            iconButtonProps={iconButtonProps}
            settingsButtonProps={settingsButtonProps}
            deviceLabel={t(deviceClassConfig[deviceClass].labelKey)}
            openColors={openColors}
            position={clampedPosition}
            stateDisplay={stateDisplay}
            theme={theme}
            onOpen={handleOpen}
            onStop={handleStop}
            onClose={handleClose}
            onSetPosition={handlePositionChange}
          />
        )}
      </div>

      {isSettingsOpen ? (
        <DialogShell
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
          contentClassName={`fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${securitySurface.dialogContentClassName}`}
        >
          <DialogHeader
            title={t('cover.settings.deviceType')}
            description={t('cover.settings.description', { name })}
            isOn
            supportingContent={
              <EntityRoomSelector entityId={entityId} label={t('common.room')} compact />
            }
          />

          <div className="grid grid-cols-2 gap-3 mb-6">
            {(Object.keys(deviceClassConfig) as DeviceClass[]).map((type) => {
              const config = deviceClassConfig[type];
              const Icon = config.icon;
              const isSelected = deviceClass === type;

              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => setDeviceClass(type)}
                  className={`rounded-2xl border-2 p-4 transition-all duration-200 ${securitySurface.dialogOptionClassName(isSelected)}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${securitySurface.dialogOptionIconWrapClassName(isSelected)}`}
                    >
                      <Icon
                        className={`h-6 w-6 ${securitySurface.dialogOptionIconClassName(isSelected)}`}
                      />
                    </div>
                    <span
                      className={`text-center text-xs font-medium ${securitySurface.dialogOptionTextClassName(isSelected)}`}
                    >
                      {t(config.labelKey)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors ${securitySurface.dialogCancelButtonClassName}`}
              >
                {t('common.cancel')}
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white text-sm font-medium transition-colors"
              >
                {t('common.done')}
              </button>
            </Dialog.Close>
          </div>
        </DialogShell>
      ) : null}
    </div>
  );
}

interface SharedCoverLayoutProps {
  name: string;
  size: CardSize;
  DeviceIcon: DeviceClassConfig['icon'];
  iconButtonProps: CoverIconButtonProps;
  settingsButtonProps: CoverIconButtonProps;
  deviceLabel: string;
  position: number;
  stateDisplay: { text: string; color: string };
  openColors: CoverColorSet;
  theme: ThemeType;
  onOpen: () => void;
  onStop: () => void;
  onClose: () => void;
  onSetPosition?: (newPosition: number) => void;
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
}: SharedCoverLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <EntityCardHeader
        title={name}
        subtitle={deviceLabel}
        layout="eyebrow-first"
        size={size}
        tone={position > 50 ? 'primary' : 'neutral'}
        leading={
          <EntityCardHeaderIcon
            IconComponent={DeviceIcon}
            isActive={position > 50}
            size={size}
            tone={position > 50 ? 'primary' : 'neutral'}
            ariaLabel={iconButtonProps['aria-label']}
            onClick={iconButtonProps.onClick}
            onPointerDown={iconButtonProps.onPointerDown}
          />
        }
      />

      <CardMetricActionLayout
        size="small"
        metric={
          <CardMetric
            value={`${position}%`}
            label={stateDisplay.text}
            size="sm"
            isActive={position > 0}
            accentClassName={openColors.accent}
            theme={theme}
            labelClassName={stateDisplay.color}
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
}: SharedCoverLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <EntityCardHeader
        title={name}
        subtitle={deviceLabel}
        layout="eyebrow-first"
        size={size}
        tone={position > 50 ? 'primary' : 'neutral'}
        leading={
          <EntityCardHeaderIcon
            IconComponent={DeviceIcon}
            isActive={position > 50}
            size={size}
            tone={position > 50 ? 'primary' : 'neutral'}
            ariaLabel={iconButtonProps['aria-label']}
            onClick={iconButtonProps.onClick}
            onPointerDown={iconButtonProps.onPointerDown}
          />
        }
      />

      <CardMetricActionLayout
        size="medium"
        metric={
          <CardMetric
            value={`${position}%`}
            label={stateDisplay.text}
            size="sm"
            isActive={position > 0}
            accentClassName={openColors.accent}
            theme={theme}
            labelClassName={stateDisplay.color}
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
  position,
  stateDisplay,
  openColors,
  theme,

  onOpen,
  onStop,
  onClose,
  onSetPosition,
}: SharedCoverLayoutProps) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <EntityCardHeader
        title={name}
        subtitle={deviceLabel}
        layout="eyebrow-first"
        size={size}
        tone={position > 50 ? 'primary' : 'neutral'}
        leading={
          <EntityCardHeaderIcon
            IconComponent={DeviceIcon}
            isActive={position > 50}
            size={size}
            tone={position > 50 ? 'primary' : 'neutral'}
            ariaLabel={iconButtonProps['aria-label']}
            onClick={iconButtonProps.onClick}
            onPointerDown={iconButtonProps.onPointerDown}
          />
        }
      />

      <div className="mt-5 grid flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5">
        <CoverWindowVisualization
          position={position}
          theme={theme}
          ariaLabel={t('cover.ariaLabel', { name })}
          onSetPosition={onSetPosition ?? (() => undefined)}
        />

        <div className="flex min-w-0 flex-col rounded-[28px] border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
          <CardMetric
            value={`${position}%`}
            label={stateDisplay.text}
            size="xl"
            isActive={position > 0}
            accentClassName={openColors.accent}
            theme={theme}
            labelClassName={stateDisplay.color}
          />

          {onSetPosition && (
            <div className="mt-auto pt-4">
              <CoverPresetChips position={position} theme={theme} onSetPosition={onSetPosition} />
            </div>
          )}
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
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action row — Open / Stop / Close buttons + settings. Shared across all sizes.
// ---------------------------------------------------------------------------

function CoverActionRow({
  theme,
  size,
  position,
  settingsButtonProps,
  onOpen,
  onStop,
  onClose,
}: {
  theme: ThemeType;
  size: 'small' | 'medium';
  position: number;
  settingsButtonProps: CoverIconButtonProps;
  onOpen: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const gap = size === 'small' ? 'gap-1' : 'gap-2';

  return (
    <CardActionRow
      theme={theme}
      size={size}
      leftContent={
        <div className={`flex items-center ${gap}`}>
          <CoverControlButton theme={theme} size={size} label={t('cover.open')} onClick={onOpen}>
            <ChevronUp className="h-3.5 w-3.5" />
          </CoverControlButton>
          <CoverControlButton theme={theme} size={size} label={t('cover.stop')} onClick={onStop}>
            <CoverPauseIcon />
          </CoverControlButton>
          <CoverControlButton theme={theme} size={size} label={t('cover.close')} onClick={onClose}>
            <ChevronDown className="h-3.5 w-3.5" />
          </CoverControlButton>
        </div>
      }
      rightContent={
        <CardSettingsActionButton
          {...settingsButtonProps}
          theme={theme}
          size={size}
          variant="soft"
          tone={position > 0 ? 'default' : 'muted'}
        />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Window visualization (large card only) — blind descends from a cassette
// housing at the top of a window frame. Height of blind = (100 - position)%.
// ---------------------------------------------------------------------------

function CoverWindowVisualization({
  position,
  theme,
  ariaLabel,
  onSetPosition,
}: {
  position: number;
  theme: ThemeType;
  ariaLabel: string;
  onSetPosition: (newPosition: number) => void;
}) {
  const blindCoverage = Math.max(0, Math.min(1, (100 - position) / 100));
  const isLight = theme === 'light';
  const cassetteH = 12;
  const slatCount = 11;

  return (
    <Slider.Root
      orientation="vertical"
      value={[100 - position]}
      min={0}
      max={100}
      step={1}
      inverted
      onValueChange={(values) => {
        const v = values[0];
        if (typeof v === 'number') onSetPosition(100 - v);
      }}
      className="relative flex h-full min-h-52 w-full max-w-40 touch-none select-none items-center justify-center"
      aria-label={ariaLabel}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Window frame */}
      <div
        className={`absolute inset-0 overflow-hidden rounded-2xl border ${
          isLight ? 'border-slate-300/70 bg-sky-50/60' : 'border-white/14 bg-black/22'
        }`}
      >
        {/* Cassette housing */}
        <div
          className={`absolute inset-x-0 top-0 rounded-t-2xl border-b ${
            isLight ? 'border-slate-300/50 bg-slate-200/80' : 'border-white/10 bg-white/16'
          }`}
          style={{ height: cassetteH }}
        />

        {/* Cavity below cassette */}
        <div className="absolute inset-x-0 bottom-0" style={{ top: cassetteH }}>
          {/* Sky gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: isLight
                ? 'linear-gradient(180deg, rgba(186,230,253,0.28) 0%, rgba(224,242,254,0.08) 100%)'
                : 'linear-gradient(180deg, rgba(147,197,253,0.07) 0%, rgba(255,255,255,0.02) 100%)',
            }}
          />

          {/* Blind material */}
          {blindCoverage > 0.01 && (
            <div
              className="absolute inset-x-0 top-0 overflow-hidden"
              style={{ height: `${blindCoverage * 100}%` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: isLight
                    ? 'linear-gradient(180deg, rgba(248,250,252,0.97) 0%, rgba(218,226,238,0.93) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.11) 100%)',
                }}
              />
              {Array.from({ length: slatCount }, (_, i) => (
                <div
                  key={i}
                  className={`pointer-events-none absolute inset-x-0 border-b ${
                    isLight ? 'border-slate-300/55' : 'border-white/10'
                  }`}
                  style={{ top: `${((i + 1) / (slatCount + 1)) * 100}%` }}
                />
              ))}
              <div
                className={`absolute inset-x-1.5 bottom-0 h-2 rounded-[3px] border ${
                  isLight ? 'border-slate-300/80 bg-slate-300/70' : 'border-white/18 bg-white/30'
                }`}
              />
            </div>
          )}
        </div>

        {/* Position badge */}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/44 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {position}%
        </div>
      </div>

      <Slider.Track className="absolute inset-0 h-full w-full cursor-ns-resize opacity-0" />
      <Slider.Thumb
        className="absolute h-0.5 w-full opacity-0 outline-none"
        aria-label={ariaLabel}
      />
    </Slider.Root>
  );
}

// ---------------------------------------------------------------------------
// Preset position chips (large card only).
// ---------------------------------------------------------------------------

function CoverPresetChips({
  position,
  theme,
  onSetPosition,
}: {
  position: number;
  theme: ThemeType;
  onSetPosition: (pos: number) => void;
}) {
  const isLight = theme === 'light';
  return (
    <div className="flex gap-1.5">
      {([0, 25, 50, 75, 100] as const).map((preset) => {
        const isActive = Math.abs(position - preset) < 8;
        return (
          <button
            key={preset}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSetPosition(preset);
            }}
            className={`flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? isLight
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-indigo-500/28 text-indigo-300'
                : isLight
                  ? 'bg-white/60 text-slate-500 hover:bg-white/80 hover:text-slate-700'
                  : 'bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/70'
            }`}
          >
            {preset}
          </button>
        );
      })}
    </div>
  );
}

function CoverControlButton({
  theme,
  size,
  label,
  onClick,
  children,
}: {
  theme: ThemeType;
  size: CardSize | 'large';
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <RoundControlButton
      theme={theme}
      size={size}
      variant="soft"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
    >
      {children}
    </RoundControlButton>
  );
}
