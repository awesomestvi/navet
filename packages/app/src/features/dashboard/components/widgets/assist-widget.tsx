import { BaseCard, EntityCardHeader, EntityCardHeaderIcon } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { TinyCardWatermark } from '@navet/app/components/shared/tiny-card-watermark';
import { useI18n, useIntegrationStore, useTheme } from '@navet/app/hooks';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { MessageCircle } from 'lucide-react';
import { type MouseEvent, type PointerEvent, useCallback, useEffect, useState } from 'react';
import { AssistDialog } from './assist-dialog';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

export interface AssistWidgetData {
  providerId?: IntegrationProviderId;
  pipelineId?: string;
  label?: string;
  tintColor?: string;
}

interface AssistWidgetProps {
  size: CardSize;
  data?: AssistWidgetData;
  onUpdate?: (data: AssistWidgetData) => void;
  isEditMode?: boolean;
  openSettingsRequestKey?: number;
}

export function AssistWidget({
  size,
  data = {},
  onUpdate,
  isEditMode = false,
  openSettingsRequestKey = 0,
}: AssistWidgetProps) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const providerId = data.providerId ?? 'home_assistant';
  const hasSession = useIntegrationStore((state) => Boolean(state.providerSessions[providerId]));
  const isConnected = useIntegrationStore(
    (state) => state.providerHealth[providerId]?.connected === true
  );
  const [dialogMode, setDialogMode] = useState<'conversation' | 'settings' | null>(null);
  const surface = getDashboardWidgetSurfaceTokens(theme, data.tintColor);
  const cardShell = getCardShellSurfaceTokens(theme);
  const accent = data.tintColor ?? getThemeColorValue(primaryColor);
  const label = data.label || t('widgets.assist.title');
  const available = hasSession && isConnected;
  const subtitle = !hasSession
    ? t('widgets.assist.reconnect')
    : !isConnected
      ? t('widgets.assist.unavailable')
      : t('widgets.assist.tapToOpen');
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);

  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) setDialogMode('settings');
  }, [onUpdate, openSettingsRequestKey]);

  const handlePipelineChange = useCallback(
    (pipelineId: string | undefined) =>
      onUpdate?.({
        providerId,
        pipelineId,
        label: data.label,
        tintColor: data.tintColor,
      }),
    [data.label, data.tintColor, onUpdate, providerId]
  );

  const stopInteraction = (event: MouseEvent | PointerEvent) => event.stopPropagation();
  const openConversation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isEditMode && available) setDialogMode('conversation');
  };

  return (
    <BaseCard
      size={size}
      fullBleed
      style={theme === 'light' || theme === 'glass' ? surface.panelStyle : undefined}
      frameClassName="overflow-hidden"
      contentClassName="h-full"
      disableDefaultSheen
      overlay={
        cardShell.sheenOverlayClassName ? (
          <div className={cardShell.sheenOverlayClassName} />
        ) : undefined
      }
    >
      <div className={`relative z-[2] h-full ${isTiny || isExtraSmall ? 'p-3' : 'p-4'}`}>
        {isTiny ? (
          <>
            <TinyCardWatermark
              IconComponent={MessageCircle}
              color={accent}
              className="opacity-18"
            />
            <div className="relative flex h-full flex-col justify-between">
              <span className={`line-clamp-2 text-xs font-semibold ${surface.textPrimary}`}>
                {label}
              </span>
              <span className={`truncate text-xs ${surface.textMuted}`}>{subtitle}</span>
            </div>
          </>
        ) : (
          <EntityCardHeader
            title={label}
            subtitle={subtitle}
            size={isExtraSmall ? 'extra-small' : 'small'}
            compact={isExtraSmall}
            layout="eyebrow-first"
            tone="primary"
            titleClassName={surface.textPrimary}
            subtitleClassName={surface.textMuted}
            leading={
              <EntityCardHeaderIcon
                IconComponent={MessageCircle}
                isActive={available}
                size={isExtraSmall ? 'tiny' : 'small'}
                tone="primary"
                baseColor={accent}
              />
            }
          />
        )}
        <button
          type="button"
          className="absolute inset-0 z-[3] disabled:cursor-default"
          onClick={openConversation}
          onPointerDown={stopInteraction}
          disabled={isEditMode || !available}
          aria-label={available ? t('widgets.assist.open') : subtitle}
        />
        {dialogMode ? (
          <AssistDialog
            open
            onOpenChange={(open) => {
              if (!open) setDialogMode(null);
            }}
            providerId={providerId}
            pipelineId={data.pipelineId}
            onPipelineChange={handlePipelineChange}
            settingsOnly={dialogMode === 'settings'}
          />
        ) : null}
      </div>
    </BaseCard>
  );
}
