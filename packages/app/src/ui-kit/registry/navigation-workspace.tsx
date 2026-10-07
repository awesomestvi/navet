import { useAccentColor } from '@navet/app/hooks';
import { NavigationWorkspace } from '@navet/app/ui-kit/patterns';
import { type ReactNode, useId } from 'react';
export interface NavigationWorkspaceRecipeProps {
  label: string;
  selectedId: string;
  onSelect: (id: string) => void;
  items: readonly {
    id: string;
    label: string;
    description?: string;
    content: ReactNode;
    disabled?: boolean;
  }[];
}
export function NavigationWorkspaceRecipe({
  label,
  selectedId,
  onSelect,
  items,
}: NavigationWorkspaceRecipeProps) {
  const accentColor = useAccentColor();
  const id = useId();
  return (
    <NavigationWorkspace.Frame aria-label={label}>
      <NavigationWorkspace.Body className="grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)]">
        <NavigationWorkspace.Sidebar className="border-r-0 md:border-r">
          <nav aria-label={label} className="p-3">
            <NavigationWorkspace.Group>
              {items.map((item, index) => (
                <NavigationWorkspace.Item
                  key={item.id}
                  active={selectedId === item.id}
                  accentColor={accentColor}
                >
                  <NavigationWorkspace.ItemButton
                    aria-current={selectedId === item.id ? 'page' : undefined}
                    aria-controls={`${id}-content-${index}`}
                    disabled={item.disabled}
                    onClick={() => onSelect(item.id)}
                  >
                    <NavigationWorkspace.ItemText
                      title={item.label}
                      description={item.description}
                    />
                  </NavigationWorkspace.ItemButton>
                </NavigationWorkspace.Item>
              ))}
            </NavigationWorkspace.Group>
          </nav>
        </NavigationWorkspace.Sidebar>
        <NavigationWorkspace.Content className="p-4">
          {items.map((item, index) => (
            <section
              key={item.id}
              id={`${id}-content-${index}`}
              aria-label={item.label}
              hidden={selectedId !== item.id}
            >
              {item.content}
            </section>
          ))}
        </NavigationWorkspace.Content>
      </NavigationWorkspace.Body>
    </NavigationWorkspace.Frame>
  );
}
