import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './button';
import { SheetSurface } from './sheet-surface';

function SheetSurfaceStory() {
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
        <div className="px-4">
          <h2 className="text-sm font-semibold text-white">Shared mobile sheet chrome</h2>
          <p className="mt-2 text-sm text-white/76">
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
