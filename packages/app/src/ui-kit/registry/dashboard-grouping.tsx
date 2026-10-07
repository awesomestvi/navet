import { DashboardGroupingNavigation } from '@navet/app/ui-kit/patterns';
import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

export interface DashboardGroupingProps
  extends Omit<
    ComponentProps<typeof DashboardGroupingNavigation>,
    'idPrefix' | 'keyboardNavigation'
  > {
  renderPanel: (id: string) => ReactNode;
}
export function DashboardGrouping({ renderPanel, ...props }: DashboardGroupingProps) {
  const id = useId();
  return (
    <div>
      <DashboardGroupingNavigation {...props} idPrefix={id} keyboardNavigation />
      {props.items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${id}-panel-${item.id}`}
          aria-labelledby={`${id}-tab-${item.id}`}
          hidden={props.selectedItemId !== item.id}
        >
          {renderPanel(item.id)}
        </div>
      ))}
    </div>
  );
}
