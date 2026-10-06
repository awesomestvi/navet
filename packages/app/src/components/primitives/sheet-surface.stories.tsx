import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from './button';
import { SheetSurface, SheetSurfaceHeader } from './sheet-surface';

function SheetSurfaceStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open sheet surface</Button>
      <SheetSurface
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="UI Kit mobile sheet"
        description="Shared bottom-sheet shell"
        accentColor="#f97316"
      >
        <SheetSurfaceHeader
          title="UI Kit mobile sheet"
          description="Shared bottom-sheet shell"
          closeLabel="Close sheet"
          onClose={() => setIsOpen(false)}
        />
        <div className="px-4 pt-4">
          <h2 className={`text-sm font-semibold ${surface.textPrimary}`}>
            Shared mobile sheet chrome
          </h2>
          <p className={`mt-2 text-sm ${surface.textSecondary}`}>
            Use this shell for bottom-docked mobile overlays instead of reauthoring the same fixed
            container markup.
          </p>
        </div>
      </SheetSurface>
    </>
  );
}

const meta = {
  title: 'Components/Primitives/Sheet Surface',
  component: SheetSurfaceStory,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => <SheetSurfaceStory />,
} satisfies Meta<typeof SheetSurfaceStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SheetSurfaceStory />,
};
