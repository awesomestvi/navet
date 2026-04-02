import type * as React from 'react';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import { DropdownMenuContent } from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import type { ThemeType } from '@/app/hooks/use-theme';

export interface ThemeDropdownContentProps
  extends React.ComponentProps<typeof DropdownMenuContent> {
  theme: ThemeType;
}

export function ThemeDropdownContent({
  theme,
  className,
  sideOffset = 8,
  ...props
}: ThemeDropdownContentProps) {
  return (
    <DropdownMenuContent
      sideOffset={sideOffset}
      className={cn(getThemeDropdownSurfaceClasses(theme), 'overflow-visible p-2', className)}
      {...props}
    />
  );
}
