import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import { ChevronDown, ChevronUp, Square } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { DialogHeader } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type ThemeType, useI18n } from '@/app/hooks';
import { getSecurityCardSurfaceTokens } from '../security-card-surface-tokens';
import type { CoverIconButtonProps, DeviceClass, DeviceClassConfig } from './types';

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
  cardColors: {
    gradient: string;
    border: string;
    iconBg: string;
    accent: string;
    glow: string;
  };
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
  room,
  position,
  deviceClass,
  deviceClassConfig,
  size,
  isEditMode: _isEditMode,
  cardId: _cardId,
  cardProps,
  cardColors,
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
  // Size-specific styling with intelligent layout adaptation
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const padding = isSmall ? 'p-4' : 'p-5';

  const surface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);

  const DeviceIcon = deviceClassConfig[deviceClass].icon;

  return (
    <div
      {...cardProps}
      className={`relative h-full bg-linear-to-br ${cardColors.gradient} ${cardShell.backdropClassName} rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} ${cardColors.border} overflow-hidden ${securitySurface.containerShadowClassName}`}
    >
      <div className={`absolute inset-0 bg-linear-to-br ${cardColors.glow} to-transparent`}></div>

      {/* Light theme frosted overlay */}
      {securitySurface.overlayClassName && (
        <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
      )}
      <div className="relative h-full flex flex-col">
        <EntityCardHeader
          title={name}
          subtitle={t(deviceClassConfig[deviceClass].labelKey)}
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

        {!isSmall && (
          <div className="mb-2 space-y-0.5">
            <p className={`truncate text-xs ${securitySurface.secondaryTextClassName}`}>{room}</p>
            <p className={`truncate text-xs ${stateDisplay.color}`}>{stateDisplay.text}</p>
          </div>
        )}

        {isSmall ? (
          <div className="flex-1 flex flex-col justify-end gap-2">
            <div className="flex flex-col">
              <div
                className={`mb-1 text-3xl font-bold leading-none ${securitySurface.primaryTextClassName}`}
              >
                {position}%
              </div>
              <div className={`text-xs ${stateDisplay.color}`}>{stateDisplay.text}</div>
            </div>

            <CardActionRow
              theme={theme}
              size="small"
              leftContent={
                <>
                  <RoundControlButton
                    theme={theme}
                    size="small"
                    variant="neutral"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen();
                    }}
                    className={`hover:scale-105 ${securitySurface.subtleButtonClassName}`}
                    title={t('cover.open')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </RoundControlButton>
                  <RoundControlButton
                    theme={theme}
                    size="small"
                    variant="neutral"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStop();
                    }}
                    className={`hover:scale-105 ${securitySurface.subtleButtonClassName}`}
                    title={t('cover.stop')}
                  >
                    <Square className="h-3 w-3" />
                  </RoundControlButton>
                </>
              }
              overflowItems={[
                {
                  key: 'close',
                  label: t('cover.close'),
                  icon: ChevronDown,
                  onSelect: handleClose,
                },
              ]}
              rightContent={
                <CardSettingsActionButton {...settingsButtonProps} theme={theme} size="small" />
              }
            />
          </div>
        ) : isMedium ? (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div
                className={`mb-1 text-3xl font-bold leading-none ${securitySurface.primaryTextClassName}`}
              >
                {position}%
              </div>
              <Slider.Root
                value={[position]}
                onValueChange={(value) => handlePositionChange(value[0])}
                max={100}
                step={1}
                className="relative flex items-center w-full h-5"
              >
                <Slider.Track
                  className={`relative h-1 grow rounded-full ${securitySurface.sliderTrackClassName}`}
                >
                  <Slider.Range className="absolute rounded-full h-full bg-linear-to-r from-indigo-400 to-indigo-600" />
                </Slider.Track>
                <Slider.Thumb
                  className="block w-4 h-4 bg-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  aria-label={t('cover.ariaLabel', { name })}
                />
              </Slider.Root>
            </div>
            <div className="mt-auto pt-2">
              <CardActionRow
                theme={theme}
                size="medium"
                leftContent={
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen();
                      }}
                      className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${securitySurface.actionButtonClassName}`}
                    >
                      <ChevronUp className="h-3 w-3" /> {t('cover.open')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStop();
                      }}
                      className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${securitySurface.actionButtonClassName}`}
                    >
                      <Square className="h-3 w-3" /> {t('cover.stop')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                      }}
                      className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${securitySurface.actionButtonClassName}`}
                    >
                      <ChevronDown className="h-3 w-3" /> {t('cover.close')}
                    </button>
                  </>
                }
                rightContent={
                  <CardSettingsActionButton {...settingsButtonProps} theme={theme} size="small" />
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-center">
              <div className={`mb-1 text-3xl font-bold ${securitySurface.primaryTextClassName}`}>
                {position}%
              </div>
              <Slider.Root
                value={[position]}
                onValueChange={(value) => handlePositionChange(value[0])}
                max={100}
                step={1}
                className="relative flex items-center w-full h-5 mb-3"
              >
                <Slider.Track
                  className={`relative h-1 grow rounded-full ${securitySurface.sliderTrackClassName}`}
                >
                  <Slider.Range className="absolute rounded-full h-full bg-linear-to-r from-indigo-400 to-indigo-600" />
                </Slider.Track>
                <Slider.Thumb
                  className="block w-4 h-4 bg-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  aria-label={t('cover.ariaLabel', { name })}
                />
              </Slider.Root>
            </div>
            <div className="mt-auto pt-4">
              <CardActionRow
                theme={theme}
                size="large"
                leftContent={
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen();
                      }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors ${securitySurface.actionButtonClassName}`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" /> {t('cover.open')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStop();
                      }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors ${securitySurface.actionButtonClassName}`}
                    >
                      <Square className="h-3.5 w-3.5" /> {t('cover.stop')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                      }}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors ${securitySurface.actionButtonClassName}`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" /> {t('cover.close')}
                    </button>
                  </>
                }
                rightContent={
                  <CardSettingsActionButton {...settingsButtonProps} theme={theme} size="medium" />
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Device Class Settings Dialog */}
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
