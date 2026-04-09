import type { Meta, StoryObj } from '@storybook/react';
import { CarFront, Lock, Unlock } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { SlideAction, type SlideActionProps } from './slide-action';

type SlideActionStoryProps = Omit<
  SlideActionProps,
  'actionLabel' | 'ariaLabel' | 'completionIcon' | 'onComplete'
> & {
  initialLocked?: boolean;
  vehicle?: boolean;
};

function SlideActionPreview({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-xs rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

function SlideActionStory({
  initialLocked = true,
  vehicle = false,
  ...args
}: SlideActionStoryProps) {
  const [isLocked, setIsLocked] = useState(initialLocked);
  const completionIcon = vehicle ? CarFront : isLocked ? Unlock : Lock;
  const actionLabel = isLocked ? 'Slide to unlock' : 'Slide to lock';

  return (
    <SlideActionPreview>
      <SlideAction
        {...args}
        actionLabel={actionLabel}
        ariaLabel={actionLabel}
        completionIcon={completionIcon}
        onComplete={() => {
          const nextLocked = !isLocked;
          setIsLocked(nextLocked);
          toast.success(nextLocked ? 'Locked' : 'Unlocked');
        }}
      />
    </SlideActionPreview>
  );
}

const meta = {
  title: 'Components/Primitives/Slide Action',
  component: SlideActionStory,
  tags: ['autodocs'],
  args: {
    size: 'small',
    theme: 'glass',
    disabled: false,
    initialLocked: true,
    vehicle: false,
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small'],
    },
    theme: {
      control: 'inline-radio',
      options: ['glass', 'dark', 'light', 'black'],
    },
    initialLocked: {
      control: 'boolean',
    },
    vehicle: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Generic slide-to-confirm primitive used by compact action cards. The thumb shows a chevron while dragging and can swap to a completion icon after a successful slide.',
      },
    },
  },
} satisfies Meta<typeof SlideActionStory>;

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
    size: 'small',
    theme: 'glass',
    disabled: false,
    initialLocked: true,
    vehicle: false,
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
  },
};
