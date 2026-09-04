import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  MarketingHeadline,
  MarketingPillGroup,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingReveal } from '@navet/app/marketing/components/MarketingReveal';
import { MARKETING_PRIVACY } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { House, LockKeyhole } from 'lucide-react';

export function MarketingPrivacySection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell variant="editorial" compactMobile className={className}>
      <MarketingReveal className={cn('relative border-y py-8 sm:py-12', surface.border)}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div className="space-y-2.5 sm:space-y-3">
            <MarketingHeadline compactMobile className={cn('max-w-[11ch]', surface.textPrimary)}>
              {MARKETING_PRIVACY.title}
            </MarketingHeadline>
            <MarketingSupportText
              compactMobile
              className={cn('max-w-[36ch] sm:max-w-[60ch]', surface.textSecondary)}
            >
              {MARKETING_PRIVACY.description}
            </MarketingSupportText>
            <MarketingPillGroup
              items={MARKETING_PRIVACY.pills}
              compactMobile
              mobileBehavior="wrap"
              className="mt-6 md:mt-8 lg:mt-10"
            />
          </div>
          <div className={cn('flex items-center gap-4 lg:justify-center', surface.textSecondary)}>
            <div
              className={cn(
                'relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border',
                surface.border,
                surface.iconBg
              )}
            >
              <House size={32} strokeWidth={1.5} aria-hidden="true" />
              <span className="absolute -right-2 -bottom-2 rounded-full bg-orange-500 p-2 text-white">
                <LockKeyhole size={16} aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-1 pl-2">
              <p className={cn('font-semibold', surface.textPrimary)}>Your home stays yours.</p>
              <p className="text-sm">Self-hosted. Open source.</p>
            </div>
          </div>
        </div>
      </MarketingReveal>
    </MarketingSectionShell>
  );
}
