import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { expect } from 'storybook/test';
import { LockCard } from '@/app/features/security';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@/app/storybook/story-frames';

function LockCardStory(args: ComponentProps<typeof LockCard>) {
  const [mockState, setMockState] = useState(args.initialState ?? true);

  useEffect(() => {
    setMockState(args.initialState ?? true);
  }, [args.initialState]);

  useEffect(() => {
    const originalUpdateLock = homeAssistantService.updateLock.bind(homeAssistantService);

    homeAssistantService.updateLock = async (_entityId: string, state: 'locked' | 'unlocked') => {
      const nextLocked = state === 'locked';
      setMockState(nextLocked);
    };

    return () => {
      homeAssistantService.updateLock = originalUpdateLock;
    };
  }, []);

  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <LockCard {...args} initialState={mockState} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Lock',
  component: LockCardStory,
  tags: ['autodocs'],
  argTypes: {
    id: {
      control: 'select',
      options: ['lock.front_door', 'lock.car_trunk'],
    },
    name: {
      control: 'select',
      options: ['Front Door', 'Car Trunk'],
    },
    initialState: {
      control: 'boolean',
    },
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small'],
    },
  },
  args: {
    id: 'lock.front_door',
    name: 'Front Door',
    initialState: true,
    size: 'small',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof LockCardStory>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    size: 'extra-small',
    initialState: true,
    id: 'lock.front_door',
    name: 'Front Door',
  },
  play: async ({ canvas, userEvent, step }) => {
    const actionButton = canvas.getByRole('button', { name: /slide to unlock/i });

    await step('shows the lock as locked initially', async () => {
      await expect(canvas.getByText(/locked/i)).toBeInTheDocument();
    });

    await step('toggles to unlocked when pressed', async () => {
      actionButton.focus();
      await userEvent.keyboard('[Space]');
      await expect(canvas.getByText(/unlocked/i)).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: /slide to lock/i })).toBeInTheDocument();
    });
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
    initialState: true,
    id: 'lock.front_door',
    name: 'Front Door',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    initialState: true,
    id: 'lock.front_door',
    name: 'Front Door',
  },
};

export const ExtraSmallUnlocked: Story = {
  args: {
    size: 'extra-small',
    initialState: false,
    id: 'lock.front_door',
    name: 'Front Door',
  },
};

export const SmallUnlocked: Story = {
  args: {
    size: 'small',
    initialState: false,
    id: 'lock.front_door',
    name: 'Front Door',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
