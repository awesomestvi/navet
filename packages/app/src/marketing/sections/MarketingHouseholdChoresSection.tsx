import { Link, Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  MarketingHeadline,
  MarketingPillGroup,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import { MarketingReveal } from '@navet/app/marketing/components/MarketingReveal';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_HOUSEHOLD_CHORES } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { MarketingChoreDemo } from './MarketingChoreDemo';

export function MarketingHouseholdChoresSection({ className }: { className?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <MarketingSectionShell variant="editorial" compactMobile className={className}>
      <MarketingReveal className="marketing-household-layout">
        <MarketingChoreDemo />

        <div className="marketing-household-copy">
          <MarketingHeadline compactMobile className={cn('max-w-[13ch]', surface.textPrimary)}>
            {MARKETING_HOUSEHOLD_CHORES.title}
          </MarketingHeadline>
          <MarketingSupportText compactMobile className={cn('max-w-[39ch]', surface.textSecondary)}>
            {MARKETING_HOUSEHOLD_CHORES.description}
          </MarketingSupportText>
          <MarketingPillGroup
            items={MARKETING_HOUSEHOLD_CHORES.capabilities}
            compactMobile
            className="pt-1"
          />
          <Text className={cn('max-w-[46ch] text-sm leading-6', surface.textSecondary)}>
            {MARKETING_HOUSEHOLD_CHORES.nativeNote}
          </Text>
          <Link
            href={MARKETING_URLS.householdChoresGuide}
            target="_blank"
            rel="noopener noreferrer"
            showExternalIcon
          >
            See how Household works
          </Link>
        </div>
      </MarketingReveal>
    </MarketingSectionShell>
  );
}
