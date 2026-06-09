import { Badge } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { getAppReleaseBadgeLabel } from '@navet/app/constants/app-build-metadata';

interface AppReleaseBadgeProps {
  className?: string;
}

export function AppReleaseBadge({ className = '' }: AppReleaseBadgeProps) {
  const badgeLabel = getAppReleaseBadgeLabel();

  if (!badgeLabel) {
    return null;
  }

  return (
    <Badge tone="accent" size="small" className={cn('font-normal', className)}>
      {badgeLabel}
    </Badge>
  );
}
