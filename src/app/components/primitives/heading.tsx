import type { ReactNode } from 'react';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface HeadingProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  children: ReactNode;
}

// Status: proposed. Semantic heading primitive for shared dialog and section headings.
export function Heading({ as: Component = 'h2', className, children }: HeadingProps) {
  const { theme } = useTheme();

  const sizeClassName =
    Component === 'h1'
      ? navetTypographyTokens.pageHeading
      : Component === 'h2'
        ? navetTypographyTokens.featureHeading
        : Component === 'h3'
          ? navetTypographyTokens.sectionHeading
          : navetTypographyTokens.titleMd;

  return (
    <Component
      className={cn(sizeClassName, theme === 'light' ? 'text-gray-900' : 'text-white', className)}
    >
      {children}
    </Component>
  );
}
