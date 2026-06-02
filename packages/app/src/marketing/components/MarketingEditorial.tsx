import { Tag, Text } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import type { ReactNode } from 'react';

export function MarketingEyebrow({
  children,
  className,
  compactMobile = false,
}: {
  children: ReactNode;
  className?: string;
  compactMobile?: boolean;
}) {
  return (
    <Text
      className={cn(
        compactMobile
          ? 'text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56 sm:text-[11px] sm:tracking-[0.2em]'
          : 'text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56',
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
  compactMobile = false,
}: {
  children: ReactNode;
  className?: string;
  compactMobile?: boolean;
}) {
  return (
    <h2
      className={cn(
        compactMobile
          ? 'text-[1.9rem] leading-[1.02] font-semibold tracking-[-0.04em] text-white sm:text-3xl md:text-5xl'
          : 'text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl',
        className
      )}
    >
      {children}
    </h2>
  );
}

export function MarketingSupportText({
  children,
  className,
  compactMobile = false,
}: {
  children: ReactNode;
  className?: string;
  compactMobile?: boolean;
}) {
  return (
    <Text
      className={cn(
        compactMobile
          ? 'max-w-2xl text-[15px] leading-6 text-white/72 sm:text-base sm:leading-7 md:text-lg'
          : 'max-w-2xl text-base leading-7 text-white/72 md:text-lg',
        className
      )}
    >
      {children}
    </Text>
  );
}

export function MarketingPillGroup({
  items,
  className,
  compactMobile = false,
  mobileBehavior = 'wrap',
}: {
  items: readonly string[];
  className?: string;
  compactMobile?: boolean;
  mobileBehavior?: 'wrap' | 'scroll';
}) {
  const isScroll = mobileBehavior === 'scroll';

  return (
    <div
      className={cn(
        isScroll ? 'overflow-x-auto pb-1 scrollbar-hide md:overflow-visible md:pb-0' : undefined,
        className
      )}
    >
      <div
        className={cn(
          isScroll
            ? 'flex min-w-max gap-2 md:min-w-0 md:flex-wrap md:gap-2.5'
            : 'flex flex-wrap gap-2.5',
          compactMobile && !isScroll ? 'gap-2 sm:gap-2.5' : undefined
        )}
      >
        {items.map((item) => (
          <Tag
            key={item}
            className={cn(
              compactMobile
                ? 'px-2.5 py-[0.3125rem] text-[11px] leading-4 sm:px-2.5 sm:py-1 md:text-sm md:leading-5'
                : undefined
            )}
          >
            {item}
          </Tag>
        ))}
      </div>
    </div>
  );
}
