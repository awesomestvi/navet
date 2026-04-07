import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LockCard } from '@/app/features/security';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { EntityCardStoryFrame } from '../../dashboard/stories/entity-card-story-frame';

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
      toast.success(nextLocked ? 'Locked' : 'Unlocked');
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
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  args: {
    id: 'lock.front_door',
    name: 'Front Door',
    initialState: true,
    size: 'small',
    isEditMode: false,
  },
} satisfies Meta<typeof LockCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
