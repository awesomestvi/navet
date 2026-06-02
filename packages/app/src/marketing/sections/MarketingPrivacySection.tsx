import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  MarketingHeadline,
  MarketingPillGroup,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MARKETING_PRIVACY } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';

export function MarketingPrivacySection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell variant="editorial" compactMobile className={className}>
      <section className="relative px-0.5 py-1 sm:px-1 sm:py-2 md:px-0">
        <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
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
        </div>
      </section>
    </MarketingSectionShell>
  );
}
