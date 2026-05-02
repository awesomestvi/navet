import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './button';
import { ModalSurface } from './modal-surface';

function ModalSurfaceStory() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open modal surface</Button>
      <ModalSurface
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="UI Kit modal surface"
        description="Shared centered dialog shell"
        contentClassName="max-w-md"
        bodyClassName="p-6"
      >
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Shared modal chrome</h2>
          <p className="text-sm text-white/76">
            Use this shell instead of rebuilding fixed centered dialog containers in feature code.
          </p>
        </div>
      </ModalSurface>
    </>
  );
}

const meta = {
  title: 'Components/Primitives/Modal Surface',
  component: ModalSurfaceStory,
  tags: ['autodocs'],
  render: () => <ModalSurfaceStory />,
} satisfies Meta<typeof ModalSurfaceStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ModalSurfaceStory />,
};
