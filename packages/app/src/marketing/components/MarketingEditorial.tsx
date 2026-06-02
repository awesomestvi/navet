import { Tag, Text } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import type { ReactNode } from 'react';

export function MarketingEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Text
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56',
        className
      )}
    >
      {children}
    </Text>
  );
}

export function MarketingHeadline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn('text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl', className)}
    >
      {children}
    </h2>
  );
}

export function MarketingSupportText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Text className={cn('max-w-2xl text-base leading-7 text-white/72 md:text-lg', className)}>
      {children}
    </Text>
  );
}

export function MarketingPillGroup({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2.5', className)}>
      {items.map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </div>
  );
}
