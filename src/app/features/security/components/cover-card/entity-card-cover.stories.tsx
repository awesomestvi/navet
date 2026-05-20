import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { CoverCard } from '@/app/features/security';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';

type CoverServiceData = {
  position?: unknown;
};

function CoverCardStory(args: Omit<ComponentProps<typeof CoverCard>, 'onSizeChange'>) {
  const [mockPosition, setMockPosition] = useState(args.initialPosition ?? 72);

  useEffect(() => {
    setMockPosition(args.initialPosition ?? 72);
  }, [args.initialPosition]);

  useEffect(() => {
    const originalCallService = homeAssistantService.callService.bind(homeAssistantService);

    homeAssistantService.callService = async (
      domain: string,
      service: string,
      serviceData?: CoverServiceData
    ) => {
      if (domain !== 'cover') {
        return originalCallService(domain, service, serviceData);
      }

      if (service === 'open_cover') {
        setMockPosition(100);
        return;
      }

      if (service === 'close_cover') {
        setMockPosition(0);
        return;
      }

      if (service === 'set_cover_position' && typeof serviceData?.position === 'number') {
        setMockPosition(Math.max(0, Math.min(100, Math.round(serviceData.position))));
        return;
      }
    };

    return () => {
      homeAssistantService.callService = originalCallService;
    };
  }, []);

  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <CoverCard {...args} initialPosition={mockPosition} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Cover',
  component: CoverCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
  args: {
    id: 'cover.living_room_blind',
    name: 'Living Room Blind',
    room: 'Living Room',
    initialPosition: 72,
    hasPosition: true,
    supportedFeatures: 15,
    initialDeviceClass: 'blind',
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CoverCardStory>;

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

export const Playground: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const LargeSwipe: Story = {
  args: {
    size: 'large',
    initialPosition: 50,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
