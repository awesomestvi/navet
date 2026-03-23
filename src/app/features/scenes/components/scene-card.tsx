import { Loader2, Play, Sparkles } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
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
  const isCompact = isCompactCardSize(size);

  const handleActivate = async () => {
    if (isEditMode || isActivating) {
      return;
    }

    setIsActivating(true);
    try {
      await homeAssistantService.callService('scene', 'turn_on', {}, { entity_id: id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('scene.activateFailed'));
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div
      className={`relative h-full overflow-hidden rounded-3xl border p-4 ${cardShell.backdropClassName} ${surface.panel} ${surface.border} ${surface.cardShadow}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 14% 10%, ${accentColor}28, transparent 36%), linear-gradient(155deg, transparent 28%, ${accentColor}14 100%)`,
        }}
      />

      {cardShell.sheenOverlayClassName ? <div className={cardShell.sheenOverlayClassName} /> : null}

      <div className="relative flex h-full flex-col">
        <EntityCardHeader
          title={name}
          subtitle={t('deviceType.scene')}
          size={size}
          titleClassName={surface.textPrimary}
          subtitleClassName={surface.textSecondary}
          leading={<EntityCardHeaderIcon IconComponent={Sparkles} isActive size={size} />}
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
    </div>
  );
});
