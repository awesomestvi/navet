import { Check, Play, Power, Settings2 } from 'lucide-react';
import { memo } from 'react';
import { TinyActionCard } from '@/app/components/patterns/tiny-action-card';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { isTinyCardSize } from '@/app/components/shared/card-size-selector';
import { DialogHeader } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { TinyCardWatermark } from '@/app/components/shared/tiny-card-watermark';
import type { SwitchCardProps } from './switch-card.types';
import { useSwitchCardController } from './use-switch-card-controller';

export const SwitchCard = memo(function SwitchCard(props: Omit<SwitchCardProps, 'room'>) {
  const controller = useSwitchCardController(props);
  const cardShell = getCardShellSurfaceTokens(controller.theme);
  const stateSurface = getCardStateSurfaceTokens(controller.theme, controller.isOn);
  const themeSurface = getThemeSurfaceTokens(controller.theme);
  const isTiny = isTinyCardSize(props.size);
  const tinyTextTokens = getCardReadableTextTokens({
    theme: controller.theme,
    tone: controller.isOn ? 'primary' : 'neutral',
    accentColor: controller.accentColor,
  });
  const stateOverlay = stateSurface.overlayClassName ? (
    <div className={`absolute inset-0 ${stateSurface.overlayClassName}`} />
  ) : null;
  const sheenOverlay = cardShell.sheenOverlayClassName ? (
    <div className={cardShell.sheenOverlayClassName} />
  ) : null;
  const lightOverlay =
    controller.theme === 'light' ? <div className="absolute inset-0 bg-white/58" /> : null;
  const HeaderIcon = controller.isScript ? Play : Power;

  const controlsDialog =
    controller.hasControlsDialog && controller.isDialogOpen ? (
      <DialogShell
        isOpen={controller.isDialogOpen}
        onOpenChange={controller.setIsDialogOpen}
        overlayClassName={themeSurface.dialogBackdrop}
        contentClassName={`fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[28px] border p-6 shadow-2xl ${controller.dialogSurface}`}
      >
        <DialogHeader
          title={props.name}
          description={controller.entityType}
          isOn={controller.theme !== 'light'}
          supportingContent={
            <EntityRoomSelector entityId={props.id} label={controller.roomLabel} compact />
          }
        />

        <div className="space-y-4">
          {controller.hasMetrics && (
            <div
              className={`rounded-2xl p-4 ${
                controller.theme === 'light'
                  ? 'bg-gray-100'
                  : controller.theme === 'glass'
                    ? 'bg-white/8'
                    : 'bg-white/5'
              }`}
            >
              <p className={`text-xs uppercase tracking-[0.16em] ${controller.labelColor}`}>
                {controller.metricSectionTitle}
              </p>
              <p className={`mt-1 text-xs ${controller.labelColor}`}>
                {controller.metricSectionDescription}
              </p>
              <div className="mt-3 space-y-2">
                {controller.availableMetrics.map((metric) => {
                  const isSelected = controller.selectedMetricLabels.includes(metric.label);
                  return (
                    <button
                      type="button"
                      key={`dialog-${metric.label}`}
                      onClick={() => controller.handleMetricToggle(metric.label)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                        !isSelected
                          ? controller.theme === 'light'
                            ? 'border-transparent bg-white/60 hover:bg-white'
                            : 'border-transparent bg-white/5 hover:bg-white/10'
                          : ''
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: `${controller.accentColor}55`,
                              backgroundColor:
                                controller.theme === 'light'
                                  ? `${controller.accentColor}10`
                                  : `${controller.accentColor}18`,
                            }
                          : undefined
                      }
                    >
                      <span className={`min-w-0 flex items-center gap-2 ${controller.labelColor}`}>
                        {controller.renderMetricIcon(metric, 'h-4 w-4 flex-shrink-0')}
                        <span className="truncate">{controller.getMetricLabel(metric)}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={`font-medium ${controller.textColor}`}>
                          {controller.formatMetricValue(metric)}
                        </span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            !isSelected
                              ? controller.theme === 'light'
                                ? 'border-gray-400 bg-transparent'
                                : 'border-white/40 bg-transparent'
                              : ''
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: controller.accentColor,
                                  backgroundColor: controller.accentColor,
                                }
                              : undefined
                          }
                        >
                          {isSelected ? (
                            <Check
                              className={`h-3 w-3 ${
                                controller.theme === 'light' ? 'text-white' : 'text-black'
                              }`}
                            />
                          ) : null}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogShell>
    ) : null;

  if (isTiny) {
    return (
      <>
        <TinyActionCard
          rootProps={controller.cardInteraction.cardProps}
          rootClassName={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[26px] bg-linear-to-br px-3 py-2.5 transition-all duration-500 ${controller.cardColors.gradient} ${cardShell.backdropClassName} ${controller.cardColors.border} ${stateSurface.containerClassName} ${!props.isEditMode ? 'cursor-pointer' : ''}`}
          metadata={controller.entityType}
          title={props.name}
          metadataClassName={stateSurface.mutedTextClassName}
          titleClassName={stateSurface.primaryTextClassName}
          detailClassName={`w-full ${stateSurface.mutedTextClassName}`}
          metadataStyle={{ color: tinyTextTokens.subtitleColor }}
          titleStyle={{ color: tinyTextTokens.titleColor }}
          detailStyle={{ color: tinyTextTokens.subtitleColor }}
          watermark={
            <TinyCardWatermark
              IconComponent={HeaderIcon}
              color={tinyTextTokens.titleColor}
              className={controller.isOn ? 'opacity-18' : 'opacity-12'}
            />
          }
          overlays={
            <>
              {controller.isOn ? (
                <div
                  className={`absolute inset-0 bg-linear-to-br ${controller.cardColors.glow} to-transparent opacity-90 transition-all duration-500`}
                />
              ) : null}
              {lightOverlay}
              {sheenOverlay}
              {stateOverlay}
            </>
          }
        />

        {controlsDialog}
      </>
    );
  }

  if (controller.isExtraSmall) {
    return (
      <>
        <div
          {...controller.cardInteraction.cardProps}
          className={`relative h-full w-full overflow-hidden rounded-3xl bg-linear-to-br px-3 py-2.5 transition-all duration-500 ${controller.cardColors.gradient} ${cardShell.backdropClassName} ${controller.cardColors.border} ${stateSurface.containerClassName} ${!props.isEditMode ? 'cursor-pointer' : ''}`}
        >
          {controller.isOn ? (
            <div
              className={`absolute inset-0 bg-linear-to-r ${controller.cardColors.glow} via-transparent to-transparent opacity-90 transition-all duration-500`}
            />
          ) : null}

          {lightOverlay}
          {sheenOverlay}
          {stateOverlay}

          <div className="relative flex h-full items-center">
            <EntityCardHeader
              title={props.name}
              subtitle={controller.entityType}
              size="extra-small"
              align="center"
              layout="eyebrow-first"
              tone={controller.isOn ? 'primary' : 'neutral'}
              titleClassName={stateSurface.primaryTextClassName}
              subtitleClassName={stateSurface.mutedTextClassName}
              className="w-full"
              contentClassName="justify-center"
              marginBottomClassName="mb-0"
              leading={
                <EntityCardHeaderIcon
                  IconComponent={HeaderIcon}
                  isActive={controller.isOn}
                  size="extra-small"
                  tone={controller.isOn ? 'primary' : 'neutral'}
                  ariaLabel={controller.cardInteraction.iconButtonProps['aria-label']}
                  onClick={controller.cardInteraction.iconButtonProps.onClick}
                />
              }
            />
          </div>
        </div>

        {controlsDialog}
      </>
    );
  }

  return (
    <>
      <div
        {...controller.cardInteraction.cardProps}
        className={`relative h-full w-full bg-linear-to-br ${controller.cardColors.gradient} ${cardShell.backdropClassName} rounded-3xl ${controller.cardColors.border} overflow-hidden transition-all duration-500 ${!props.isEditMode ? 'cursor-pointer' : ''} ${controller.isExtraSmall ? 'px-3.5 pb-3.5 pt-3' : 'p-4'} ${stateSurface.containerClassName}`}
      >
        {controller.isOn && (
          <div
            className={`absolute inset-0 bg-linear-to-br ${controller.cardColors.glow} to-transparent transition-all duration-500`}
          />
        )}

        {controller.theme === 'light' && <div className="absolute inset-0 bg-white/60" />}

        {sheenOverlay}

        {stateOverlay}

        <div className="relative h-full flex flex-col">
          <EntityCardHeader
            title={props.name}
            subtitle={controller.entityType}
            layout="eyebrow-first"
            size={controller.isExtraSmall ? 'extra-small' : 'small'}
            tone={controller.isOn ? 'primary' : 'neutral'}
            titleClassName={`${stateSurface.primaryTextClassName} transition-colors duration-500 text-left ${controller.isExtraSmall ? 'text-[11px]' : ''}`}
            subtitleClassName={`${stateSurface.mutedTextClassName} text-left ${controller.isExtraSmall ? 'text-[9px]' : ''}`}
            className={`${controller.isExtraSmall ? 'mb-1.5' : 'mb-2'}`}
            leading={
              <EntityCardHeaderIcon
                IconComponent={HeaderIcon}
                isActive={controller.isOn}
                size={controller.isExtraSmall ? 'extra-small' : 'small'}
                tone={controller.isOn ? 'primary' : 'neutral'}
                ariaLabel={controller.cardInteraction.iconButtonProps['aria-label']}
                onClick={controller.cardInteraction.iconButtonProps.onClick}
              />
            }
          />

          <div className="flex-1" />

          <div className="relative">
            {controller.showSettingsButton && !controller.isExtraSmall && (
              <div className="absolute bottom-0 right-0">
                <RoundControlButton
                  theme={controller.theme}
                  size="small"
                  variant="soft"
                  {...controller.cardInteraction.settingsButtonProps}
                  className={controller.settingsButtonClass}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </RoundControlButton>
              </div>
            )}
            {controller.selectedMetrics.length > 0 && (
              <div className={controller.isExtraSmall ? 'space-y-1' : 'space-y-1.5'}>
                {controller.selectedMetrics.map((metric, i) => (
                  <div
                    key={metric.label}
                    className={`flex min-w-0 flex-col ${i === controller.selectedMetrics.length - 1 && controller.showSettingsButton && !controller.isExtraSmall ? 'pr-10' : ''}`}
                  >
                    <span
                      className={`${stateSurface.secondaryTextClassName} flex items-center ${controller.isExtraSmall ? 'gap-1 text-[9px]' : 'gap-1 text-[10px]'}`}
                    >
                      {controller.renderMetricIcon(
                        metric,
                        `${controller.isExtraSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} flex-shrink-0`
                      )}
                      <span className="truncate">{controller.getMetricLabel(metric)}</span>
                    </span>
                    <span
                      className={`${stateSurface.primaryTextClassName} ${controller.isExtraSmall ? 'pl-3.5 text-[10px]' : 'pl-4 text-xs'} font-medium`}
                    >
                      {controller.formatMetricValue(metric)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {controlsDialog}
    </>
  );
});
