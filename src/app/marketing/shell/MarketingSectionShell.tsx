import type { ReactNode } from 'react';
import { Heading, Text } from '@/app/components/primitives';
import { cn } from '@/app/components/ui/utils';

interface MarketingSectionShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function MarketingSectionShell({
  eyebrow: _eyebrow,
  title,
  description,
  children,
  className,
}: MarketingSectionShellProps) {
  return (
    <section className={cn('space-y-6 md:space-y-8', className)}>
      <div className="max-w-3xl space-y-3">
        <Heading as="h2" className="text-3xl md:text-4xl">
          {title}
        </Heading>
        {description ? (
          <Text className="max-w-2xl text-base leading-7 md:text-lg">{description}</Text>
        ) : null}
      </div>
      {children}
    </section>
  );
}
