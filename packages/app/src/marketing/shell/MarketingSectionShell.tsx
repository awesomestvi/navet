import { Text } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import {
  MarketingHeadline,
  MarketingSupportText,
} from '@navet/app/marketing/components/MarketingEditorial';
import type { ReactNode } from 'react';

interface MarketingSectionShellProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'editorial';
  headerClassName?: string;
}

export function MarketingSectionShell({
  title,
  description,
  children,
  className,
  variant = 'default',
  headerClassName,
}: MarketingSectionShellProps) {
  const hasHeader = Boolean(title || description);
  const isEditorial = variant === 'editorial';

  return (
    <section
      className={cn(isEditorial ? 'space-y-8 md:space-y-10' : 'space-y-6 md:space-y-8', className)}
    >
      {hasHeader ? (
        <div
          className={cn(
            isEditorial ? 'max-w-4xl space-y-4' : 'max-w-3xl space-y-3',
            headerClassName
          )}
        >
          {title ? (
            <MarketingHeadline className={isEditorial ? 'max-w-[13ch]' : 'md:text-4xl'}>
              {title}
            </MarketingHeadline>
          ) : null}
          {description ? (
            isEditorial ? (
              <MarketingSupportText>{description}</MarketingSupportText>
            ) : (
              <Text className="max-w-2xl text-base leading-7 md:text-lg">{description}</Text>
            )
          ) : null}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
