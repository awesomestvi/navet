import { Loader2, Play, Sparkles } from 'lucide-react';
import { memo, useState } from 'react';
import { BaseCard } from '@/app/components/primitives';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { EntityCardTitleBlock } from '@/app/components/primitives/entity-card-title-block';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import {
  type CardSize,
  isCompactCardSize,
  isTinyCardSize,
} from '@/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { TinyCardWatermark } from '@/app/components/shared/tiny-card-watermark';
import { useI18n, useServiceActionHandler, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface SceneCardProps {
  id: string;
  name: string;
  room: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export const SceneCard = memo(function SceneCard({
  id,
  name,
  room,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
}: SceneCardProps) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const [isActivating, setIsActivating] = useState(false);
  const runAction = useServiceActionHandler();
  const isTiny = isTinyCardSize(size);
  const isCompact = isCompactCardSize(size);
  const tinyTextTokens = getCardReadableTextTokens({
    theme,
    tone: 'primary',
    accentColor,
  });

  const handleActivate = () => {
    if (isEditMode || isActivating) {
      return;
    }

    setIsActivating(true);
    void runAction(
      () => homeAssistantService.callService('scene', 'turn_on', {}, { entity_id: id }),
      t('scene.activateFailed')
    ).finally(() => {
      setIsActivating(false);
    });
  };

  if (isTiny) {
    return (
      <BaseCard
        size="tiny"
        className={`transition-opacity ${isEditMode || isActivating ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
        disableDefaultSheen
        overlay={
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 18% 12%, ${accentColor}28, transparent 34%), linear-gradient(155deg, transparent 24%, ${accentColor}14 100%)`,
              }}
            />
            {cardShell.sheenOverlayClassName ? (
              <div className={cardShell.sheenOverlayClassName} />
            ) : null}
          </>
        }
        contentClassName="h-full"
      >
        {isActivating ? (
          <TinyCardWatermark
            IconComponent={Loader2}
            color={tinyTextTokens.titleColor}
            className="opacity-20"
            spin
          />
        ) : (
          <TinyCardWatermark
            IconComponent={Sparkles}
            color={tinyTextTokens.titleColor}
            className="opacity-20"
          />
        )}

        <div className="relative flex h-full w-full flex-col justify-between text-left">
          <div className="min-w-0 w-full">
            <EntityCardTitleBlock
              title={name}
              subtitle={t('deviceType.scene')}
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
          className="absolute inset-0"
          onClick={handleActivate}
          disabled={isEditMode || isActivating}
          aria-label={isActivating ? t('scene.activating') : t('scene.activate')}
        />
      </BaseCard>
    );
  }

  return (
    <BaseCard
      size={size}
      disableDefaultSheen
      overlay={
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 14% 10%, ${accentColor}28, transparent 36%), linear-gradient(155deg, transparent 28%, ${accentColor}14 100%)`,
            }}
          />
          {cardShell.sheenOverlayClassName ? (
            <div className={cardShell.sheenOverlayClassName} />
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      <div className="relative flex h-full flex-col">
        <EntityCardHeader
          title={name}
          subtitle={t('deviceType.scene')}
          layout="eyebrow-first"
          size={size}
          tone="primary"
          titleClassName={surface.textPrimary}
          subtitleClassName={surface.textSecondary}
          leading={
            <EntityCardHeaderIcon IconComponent={Sparkles} isActive size={size} tone="primary" />
          }
        />

        <div
          className={`flex flex-1 ${isCompact ? 'items-end justify-between gap-3' : 'flex-col justify-between gap-4'}`}
        >
          <div className={isCompact ? 'min-w-0 flex-1' : ''}>
            <p className={`text-sm ${surface.textSecondary}`}>{room}</p>
            {!isCompact ? (
              <p className={`mt-1 text-xs ${surface.textMuted}`}>{t('scene.tapToActivate')}</p>
            ) : null}
          </div>

          <div className={isCompact ? 'shrink-0' : 'flex justify-end'}>
            <RoundControlButton
              theme={theme}
              size={isCompact ? 'small' : 'large'}
              variant="emphasis"
              onClick={handleActivate}
              disabled={isEditMode || isActivating}
              aria-label={isActivating ? t('scene.activating') : t('scene.activate')}
              className="shadow-lg disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 14px 30px -16px ${accentColor}`,
              }}
            >
              {isActivating ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Play className="h-4 w-4 fill-current text-white" />
              )}
            </RoundControlButton>
          </div>
        </div>
      </div>
    </BaseCard>
  );
});
