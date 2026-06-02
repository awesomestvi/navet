import { Text } from '@navet/app/components/primitives';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getEntityIconPillStyles } from '@navet/app/components/shared/theme/entity-icon-pill-styles';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { CardWrapper } from '@navet/app/components/ui/card-wrapper';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  MarketingEyebrow,
  MarketingPillGroup,
} from '@navet/app/marketing/components/MarketingEditorial';
import {
  MARKETING_FEATURES,
  MARKETING_PRODUCT_PROOF,
} from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';

const FEATURE_CARD_STYLES = [
  {
    primaryColor: 'green',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(73,220,177,0.10),rgba(8,13,16,0.98))] text-emerald-100',
  },
  {
    primaryColor: 'orange',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(255,177,79,0.10),rgba(18,12,8,0.98))] text-orange-100',
  },
  {
    primaryColor: 'blue',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(74,168,255,0.10),rgba(9,14,22,0.98))] text-sky-100',
  },
  {
    primaryColor: 'purple',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(167,139,250,0.10),rgba(14,11,24,0.98))] text-violet-100',
  },
  {
    primaryColor: 'pink',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(244,114,182,0.10),rgba(20,10,16,0.98))] text-pink-100',
  },
  {
    primaryColor: 'yellow',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(253,224,71,0.10),rgba(22,16,7,0.98))] text-amber-100',
  },
] as const;

export function MarketingFeatureGridSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const shell = getCardShellSurfaceTokens(theme);
  const numberTone =
    theme === 'light' ? 'text-slate-400/80' : theme === 'glass' ? 'text-white/34' : 'text-white/28';

  return (
    <MarketingSectionShell
      title={MARKETING_PRODUCT_PROOF.title}
      description={MARKETING_PRODUCT_PROOF.description}
      variant="editorial"
      compactMobile
      className={className}
    >
      <div className="grid gap-6 sm:gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="grid gap-5 pt-0 sm:gap-8 sm:pt-8 md:grid-cols-2 xl:grid-cols-1">
          {MARKETING_PRODUCT_PROOF.columns.map((column) => (
            <div key={column.title} className="space-y-3 sm:space-y-4">
              <MarketingEyebrow compactMobile>{column.kicker}</MarketingEyebrow>
              <Text
                className={cn(
                  'max-w-[18ch] text-[1.35rem] font-semibold tracking-[-0.03em] sm:text-2xl',
                  surface.textPrimary
                )}
              >
                {column.title}
              </Text>
              <MarketingPillGroup items={column.items} compactMobile mobileBehavior="wrap" />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-2">
          {MARKETING_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const style = FEATURE_CARD_STYLES[index % FEATURE_CARD_STYLES.length];
            const iconPill = getEntityIconPillStyles({
              isActive: true,
              isInteractive: false,
              primaryColor: style.primaryColor,
              size: 'medium',
              theme,
              tone: 'primary',
            });

            return (
              <div key={feature.title}>
                <CardWrapper
                  className={cn(
                    'min-h-[148px] p-4 sm:min-h-[172px] sm:p-5 md:p-6',
                    theme === 'glass'
                      ? `${shell.backdropClassName} ${surface.panel} ${surface.border} ${surface.cardShadow}`
                      : `${surface.panel} ${surface.border} ${theme === 'light' ? 'shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]' : surface.cardShadow}`
                  )}
                  showShadow={theme === 'light'}
                >
                  <div className="relative z-10 flex h-full flex-col gap-4 sm:gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={cn(iconPill.badgeClassName, style.iconSurface)}
                        style={iconPill.badgeStyle}
                      >
                        <Icon
                          className={cn(iconPill.iconClassName, 'h-5 w-5')}
                          style={iconPill.iconStyle}
                          aria-hidden="true"
                        />
                      </div>
                      <div
                        className={cn(
                          'text-[11px] font-medium uppercase tracking-[0.18em]',
                          numberTone
                        )}
                      >
                        0{index + 1}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Text
                        className={cn(
                          'text-base font-semibold tracking-[-0.02em] sm:text-lg',
                          surface.textPrimary
                        )}
                      >
                        {feature.title}
                      </Text>
                      <Text
                        className={cn(
                          'max-w-[30ch] text-sm leading-6 sm:text-[15px] sm:leading-7',
                          theme === 'light' ? 'text-slate-600' : surface.textSecondary
                        )}
                      >
                        {feature.description}
                      </Text>
                    </div>
                  </div>
                </CardWrapper>
              </div>
            );
          })}
        </div>
      </div>
    </MarketingSectionShell>
  );
}
