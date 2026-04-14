import { memo } from 'react';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { EntityCardTitleBlock } from '@/app/components/primitives/entity-card-title-block';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { isTinyCardSize } from '@/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCardStateSurfaceStyleTokens,
  getCardStateSurfaceTokens,
} from '@/app/components/shared/theme/card-state-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { TinyCardWatermark } from '@/app/components/shared/tiny-card-watermark';
import type { SwitchCardProps } from './switch-card.types';
import { SwitchSettingsDialog } from './switch-settings-dialog';
import { useSwitchCardController } from './use-switch-card-controller';

export const SwitchCard = memo(function SwitchCard(props: Omit<SwitchCardProps, 'room'>) {
  const controller = useSwitchCardController(props);
  const cardShell = getCardShellSurfaceTokens(controller.theme);
  const stateSurface = getCardStateSurfaceTokens(controller.theme, controller.isOn);
  const isTiny = isTinyCardSize(props.size);
  const tintSurface = getCustomCardTintSurface(controller.theme, controller.tintColor);
  const tinyTextTokens = getCardReadableTextTokens({
    theme: controller.theme,
    tone: controller.isOn ? 'primary' : 'neutral',
    accentColor: controller.accentColor,
  });
  const metricTextTokens = getCardReadableTextTokens({
    theme: controller.theme,
    tone: controller.isOn ? 'primary' : 'neutral',
    accentColor: controller.accentColor,
    baseColor: controller.isOn ? controller.tintColor || controller.accentColor : undefined,
  });
  const stateOverlay = stateSurface.overlayClassName ? (
    <div className={`absolute inset-0 ${stateSurface.overlayClassName}`} />
  ) : null;
  const sheenOverlay = cardShell.sheenOverlayClassName ? (
    <div className={cardShell.sheenOverlayClassName} />
  ) : null;
  const lightOverlay =
    controller.theme === 'light' ? <div className="absolute inset-0 bg-white/58" /> : null;
  const tintOverlay = tintSurface.overlayClassName ? (
    <div className={`absolute inset-0 ${tintSurface.overlayClassName}`} />
  ) : null;
  const tintGlow = tintSurface.glowStyle ? (
    <div className="absolute inset-0" style={tintSurface.glowStyle} />
  ) : null;
  const blackActiveSurface =
    controller.theme === 'black' && controller.isOn
      ? getCardStateSurfaceStyleTokens({
          theme: controller.theme,
          isActive: true,
          baseColor: controller.tintColor || controller.accentColor,
          borderAlphaHex: controller.tintColor ? '33' : '47',
        })
      : null;

  const controlsDialog =
    controller.hasControlsDialog && controller.isDialogOpen ? (
      <SwitchSettingsDialog
        entityId={props.id}
        isOpen={controller.isDialogOpen}
        onOpenChange={controller.setIsDialogOpen}
        name={props.name}
        entityType={controller.entityType}
        isOn={controller.isOn}
        metricSectionTitle={controller.metricSectionTitle}
        metricSectionDescription={controller.metricSectionDescription}
        availableMetrics={controller.availableMetrics}
        selectedMetricLabels={controller.selectedMetricLabels}
        formatMetricValue={controller.formatMetricValue}
        getMetricLabel={controller.getMetricLabel}
        onMetricToggle={controller.handleMetricToggle}
        selectedIcon={controller.selectedIcon}
        onIconChange={controller.setSelectedIcon}
        siblingEntities={controller.siblingEntities}
        tintColor={controller.tintColor}
        onTintColorChange={controller.setTintColor}
      />
    ) : null;

  if (isTiny) {
    return (
      <>
        <div
          {...controller.cardInteraction.cardProps}
          className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[26px] bg-linear-to-br px-3 py-2.5 transition-all duration-500 ${controller.theme !== 'dark' ? 'border' : ''} ${controller.cardColors.gradient} ${cardShell.backdropClassName} ${controller.cardColors.border} ${stateSurface.containerClassName} ${!props.isEditMode ? 'cursor-pointer' : ''}`}
          style={blackActiveSurface?.cardStyle ?? tintSurface.panelStyle}
        >
          {controller.isOn ? (
            <div
              className={`absolute inset-0 bg-linear-to-br ${controller.cardColors.glow} to-transparent opacity-90 transition-all duration-500`}
            />
          ) : null}
          {tintGlow}
          {lightOverlay}
          {blackActiveSurface?.innerOverlayClassName ? (
            <div
              className={blackActiveSurface.innerOverlayClassName}
              style={blackActiveSurface.innerOverlayStyle}
            />
          ) : null}
          {sheenOverlay}
          {blackActiveSurface?.shineOverlayClassName ? (
            <div className={blackActiveSurface.shineOverlayClassName} />
          ) : null}
          {stateOverlay}
          {tintOverlay}
          <TinyCardWatermark
            IconComponent={controller.HeaderIconComponent}
            iconText={controller.headerIconText}
            color={tinyTextTokens.titleColor}
            className={controller.isOn ? 'opacity-18' : 'opacity-12'}
          />

          <div className="relative flex h-full w-full flex-col justify-between text-left">
            <div className="min-w-0 w-full pt-1">
              <EntityCardTitleBlock
                title={props.name}
                subtitle={controller.entityType}
                layout="eyebrow-first"
                titleClassName={`mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight ${stateSurface.primaryTextClassName}`}
                subtitleClassName={`truncate text-[10px] tracking-normal ${stateSurface.mutedTextClassName}`}
                titleStyle={{ color: tinyTextTokens.titleColor }}
                subtitleStyle={{ color: tinyTextTokens.subtitleColor }}
              />
            </div>
            <span />
          </div>
        </div>

        {controlsDialog}
      </>
    );
  }

  if (controller.isExtraSmall) {
    return (
      <>
        <div
          {...controller.cardInteraction.cardProps}
          className={`relative h-full w-full overflow-hidden rounded-3xl bg-linear-to-br px-3 py-2.5 transition-all duration-500 ${controller.theme !== 'dark' ? 'border' : ''} ${controller.cardColors.gradient} ${cardShell.backdropClassName} ${controller.cardColors.border} ${stateSurface.containerClassName} ${!props.isEditMode ? 'cursor-pointer' : ''}`}
          style={blackActiveSurface?.cardStyle ?? tintSurface.panelStyle}
        >
          {controller.isOn ? (
            <div
              className={`absolute inset-0 bg-linear-to-r ${controller.cardColors.glow} via-transparent to-transparent opacity-90 transition-all duration-500`}
            />
          ) : null}

          {tintGlow}
          {lightOverlay}
          {blackActiveSurface?.innerOverlayClassName ? (
            <div
              className={blackActiveSurface.innerOverlayClassName}
              style={blackActiveSurface.innerOverlayStyle}
            />
          ) : null}
          {sheenOverlay}
          {blackActiveSurface?.shineOverlayClassName ? (
            <div className={blackActiveSurface.shineOverlayClassName} />
          ) : null}
          {stateOverlay}
          {tintOverlay}

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
                  IconComponent={controller.HeaderIconComponent}
                  iconText={controller.headerIconText}
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
        className={`relative h-full w-full overflow-hidden rounded-3xl bg-linear-to-br ${controller.theme !== 'dark' ? 'border' : ''} ${controller.cardColors.gradient} ${cardShell.backdropClassName} ${controller.cardColors.border} transition-all duration-500 ${!props.isEditMode ? 'cursor-pointer' : ''} ${controller.isExtraSmall ? 'px-3.5 pb-3.5 pt-3' : 'p-4'} ${stateSurface.containerClassName}`}
        style={blackActiveSurface?.cardStyle ?? tintSurface.panelStyle}
      >
        {controller.isOn && (
          <div
            className={`absolute inset-0 bg-linear-to-br ${controller.cardColors.glow} to-transparent transition-all duration-500`}
          />
        )}

        {tintGlow}
        {controller.theme === 'light' && <div className="absolute inset-0 bg-white/60" />}
        {blackActiveSurface?.innerOverlayClassName ? (
          <div
            className={blackActiveSurface.innerOverlayClassName}
            style={blackActiveSurface.innerOverlayStyle}
          />
        ) : null}

        {sheenOverlay}
        {blackActiveSurface?.shineOverlayClassName ? (
          <div className={blackActiveSurface.shineOverlayClassName} />
        ) : null}

        {stateOverlay}
        {tintOverlay}

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
                IconComponent={controller.HeaderIconComponent}
                iconText={controller.headerIconText}
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
                <CardSettingsActionButton
                  theme={controller.theme}
                  size="small"
                  variant="soft"
                  tone={controller.isOn ? 'default' : 'muted'}
                  {...controller.cardInteraction.settingsButtonProps}
                />
              </div>
            )}
            {controller.selectedMetrics.length > 0 && (
              <div className={controller.isExtraSmall ? 'space-y-1.5' : 'space-y-2'}>
                {controller.selectedMetrics.map((metric, i) => (
                  <div
                    key={metric.label}
                    className={`flex min-w-0 flex-col ${i === controller.selectedMetrics.length - 1 && controller.showSettingsButton && !controller.isExtraSmall ? 'pr-10' : ''}`}
                  >
                    <span
                      className={`${stateSurface.secondaryTextClassName} flex min-w-0 items-start ${controller.isExtraSmall ? 'gap-1 text-[9px] leading-[1.05]' : 'gap-1 text-[10px] leading-[1.1]'}`}
                      style={{ color: metricTextTokens.subtitleColor }}
                    >
                      {controller.renderMetricIcon(
                        metric,
                        `${controller.isExtraSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} mt-0.5 flex-shrink-0`
                      )}
                      <span className="min-w-0 whitespace-normal break-words">
                        {controller.getMetricLabel(metric)}
                      </span>
                    </span>
                    <span
                      className={`${stateSurface.primaryTextClassName} ${controller.isExtraSmall ? 'mt-0.5 pl-3.5 text-[10px]' : 'mt-0.5 pl-4 text-xs'} font-medium`}
                      style={{ color: metricTextTokens.titleColor }}
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
