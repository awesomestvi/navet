import { getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { cn } from '@navet/app/components/ui/utils';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { Children, type CSSProperties, type ReactNode } from 'react';

export function ChoreDashboardGrid({ children }: { children: ReactNode }) {
  const breakpointCols = useBreakpointCols();
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);

  return (
    <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
      <div
        ref={innerRef}
        className={cn('w-full', isAutoScaled && 'absolute top-0 left-0 origin-top-left')}
        style={innerContainerStyle}
      >
        <div
          className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
          style={gridStyle as CSSProperties}
        >
          {Children.map(children, (child) =>
            child ? (
              <div className={cn(getCardSpanClass('medium'), '[&>*]:h-full')}>{child}</div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
