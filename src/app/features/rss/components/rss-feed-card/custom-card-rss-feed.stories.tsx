import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  buildCustomCard,
  CustomWidgetStoryFrame,
} from '../../../dashboard/stories/custom-card-story-helpers';

function RSSFeedStory({
  size = 'large',
  tintColor = '#3b82f6',
}: {
  size?: CardSize;
  tintColor?: string;
}) {
  return <CustomWidgetStoryFrame card={buildCustomCard('rss', size, { tintColor })} />;
}

const meta = {
  title: 'Cards/Custom/RSS Feed',
  component: RSSFeedStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    tintColor: {
      control: 'color',
    },
  },
  args: {
    size: 'large',
    tintColor: '#3b82f6',
  },
  parameters: {
    docs: {
      description: {
        component: 'Custom RSS Feed card rendered through the dashboard widget card runtime.',
      },
    },
  },
} satisfies Meta<typeof RSSFeedStory>;

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

export const Large: Story = {
  args: {
    size: 'large',
  },
};
