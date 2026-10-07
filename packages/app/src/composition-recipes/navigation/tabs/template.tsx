import { TabList, TabPanel, Tabs, TabTrigger } from '@navet/app/ui-kit/primitives';
import type { ReactNode } from 'react';
export interface TabsRecipeProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: readonly { id: string; label: string; content: ReactNode; disabled?: boolean }[];
}
export function TabsRecipe({ label, value, onValueChange, items }: TabsRecipeProps) {
  return (
    <Tabs defaultValue={value} value={value} onValueChange={onValueChange}>
      <TabList aria-label={label}>
        {items.map((item) => (
          <TabTrigger key={item.id} value={item.id} disabled={item.disabled}>
            {item.label}
          </TabTrigger>
        ))}
      </TabList>
      {items.map((item) => (
        <TabPanel key={item.id} value={item.id}>
          {item.content}
        </TabPanel>
      ))}
    </Tabs>
  );
}
