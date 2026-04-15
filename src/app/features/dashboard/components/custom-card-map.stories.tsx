import type { Meta, StoryObj } from '@storybook/react';
import type { HassEntities } from 'home-assistant-js-websocket';
import { useEffect } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

const sampleTrackerEntities: HassEntities = {
  'person.alice': {
    entity_id: 'person.alice',
    state: 'home',
    attributes: {
      friendly_name: 'Alice',
      latitude: 59.3293,
      longitude: 18.0686,
      gps_accuracy: 20,
      entity_picture: undefined,
    },
    last_changed: '2026-04-15T08:00:00+00:00',
    last_updated: '2026-04-15T08:00:00+00:00',
    context: { id: 'story-map-1', parent_id: null, user_id: null },
  },
  'person.bob': {
    entity_id: 'person.bob',
    state: 'away',
    attributes: {
      friendly_name: 'Bob',
      latitude: 59.3348,
      longitude: 18.0632,
      gps_accuracy: 45,
      entity_picture: undefined,
    },
    last_changed: '2026-04-15T09:15:00+00:00',
    last_updated: '2026-04-15T09:15:00+00:00',
    context: { id: 'story-map-2', parent_id: null, user_id: null },
  },
  'device_tracker.phone_charlie': {
    entity_id: 'device_tracker.phone_charlie',
    state: 'not_home',
    attributes: {
      friendly_name: 'Charlie',
      latitude: 59.3215,
      longitude: 18.0741,
      gps_accuracy: 12,
    },
    last_changed: '2026-04-15T10:30:00+00:00',
    last_updated: '2026-04-15T10:30:00+00:00',
    context: { id: 'story-map-3', parent_id: null, user_id: null },
  },
};

type MapStoryArgs = {
  size: CardSize;
};

function MapStoryFrame({ size }: MapStoryArgs) {
  useEffect(() => {
    const previousEntities = homeAssistantStore.getState().entities;
    homeAssistantStore.setState({ entities: sampleTrackerEntities });

    return () => {
      homeAssistantStore.setState({ entities: previousEntities });
    };
  }, []);

  return <CustomWidgetStoryFrame card={buildCustomCard('map', size)} />;
}

function MapEmptyStoryFrame({ size }: MapStoryArgs) {
  useEffect(() => {
    const previousEntities = homeAssistantStore.getState().entities;
    // Inject entities without GPS coordinates to show the empty state
    homeAssistantStore.setState({
      entities: {
        'person.alice': {
          entity_id: 'person.alice',
          state: 'home',
          attributes: { friendly_name: 'Alice' },
          last_changed: '2026-04-15T08:00:00+00:00',
          last_updated: '2026-04-15T08:00:00+00:00',
          context: { id: 'story-map-empty', parent_id: null, user_id: null },
        },
      },
    });

    return () => {
      homeAssistantStore.setState({ entities: previousEntities });
    };
  }, []);

  return <CustomWidgetStoryFrame card={buildCustomCard('map', size)} />;
}

const meta = {
  title: 'Cards/Custom/Map',
  component: MapStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<MapStoryArgs>;

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

type Story = StoryObj<MapStoryArgs>;

export const Playground: Story = {
  args: { size: 'medium' },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Medium: Story = {
  args: { size: 'medium' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const EmptyState: Story = {
  name: 'Empty State (no GPS)',
  render: (args) => <MapEmptyStoryFrame {...args} />,
  args: { size: 'medium' },
};
