import { Button } from '@navet/app/components/primitives/button';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks/use-theme';
import {
  MarketingHeadline,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingReveal } from '@navet/app/marketing/components/MarketingReveal';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { ArrowUpRight } from 'lucide-react';

export function MarketingDemoCtaSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section className={cn('relative py-8 sm:py-14', className)}>
      <MarketingReveal className="flex flex-col items-center text-center">
        <MarketingHeadline compactMobile className={cn('max-w-[16ch]', surface.textPrimary)}>
          Use the demo. Then run it at home.
        </MarketingHeadline>
        <MarketingSupportText className={cn('mt-5 max-w-[38ch]', surface.textSecondary)}>
          A whole home to explore. Real Navet cards, sample data, and no account needed.
        </MarketingSupportText>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.assign(MARKETING_URLS.demo)}>
            <span className="inline-flex items-center gap-2">
              Open demo <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.assign(MARKETING_URLS.install.page)}
          >
            How to install
          </Button>
        </div>
      </MarketingReveal>
    </section>
  );
}
