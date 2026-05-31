import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { makeHassEntity } from '../test-utils';
import { TasksSection } from './tasks-section';

type TasksStoryMode = 'default' | 'empty' | 'many' | 'reconnecting' | 'low-power';

const baseEntities = {
  'automation.coffee': makeHassEntity({
    entity_id: 'automation.coffee',
    state: 'on',
    attributes: {
      friendly_name: 'Good Morning',
      description: 'Starts coffee, opens blinds, and warms the kitchen.',
      last_triggered: '2026-05-04T07:15:00.000Z',
      mode: 'single',
      current: 0,
    },
  }),
  'automation.night': makeHassEntity({
    entity_id: 'automation.night',
    state: 'off',
    attributes: {
      friendly_name: 'Sleep Mode',
      description: 'Locks the doors and settles the lights for the evening.',
    },
  }),
  'scene.movie': makeHassEntity({
    entity_id: 'scene.movie',
    state: 'scening',
    attributes: { friendly_name: 'Movie Time' },
  }),
  'script.goodnight': makeHassEntity({
    entity_id: 'script.goodnight',
    state: 'off',
    attributes: { friendly_name: 'Good Night' },
  }),
};

function getEntities(mode: TasksStoryMode) {
  if (mode === 'empty') {
    return {};
  }

  if (mode === 'many') {
    return {
      ...baseEntities,
      'scene.cleaning': makeHassEntity({
        entity_id: 'scene.cleaning',
        state: 'scening',
        attributes: { friendly_name: 'Cleaning' },
      }),
      'automation.vacation': makeHassEntity({
        entity_id: 'automation.vacation',
        state: 'on',
        attributes: { friendly_name: 'Vacation', description: 'Keeps the home steady.' },
      }),
      'automation.leaving': makeHassEntity({
        entity_id: 'automation.leaving',
        state: 'on',
        attributes: { friendly_name: 'Leaving Home' },
      }),
    };
  }

  return baseEntities;
}

function TasksSectionStory({ mode = 'default' }: { mode?: TasksStoryMode }) {
  useEffect(() => {
    const previousHaState = homeAssistantStore.getState();
    const previousSettingsState = useSettingsStore.getState();

    homeAssistantStore.setState({
      ...previousHaState,
      connected: mode !== 'reconnecting',
      areas: [
        { area_id: 'kitchen', name: 'Kitchen' },
        { area_id: 'living', name: 'Living Room' },
        { area_id: 'hall', name: 'Hallway' },
      ],
      deviceRegistry: [
        { id: 'device-kitchen', area_id: 'kitchen' },
        { id: 'device-living', area_id: 'living' },
        { id: 'device-hall', area_id: 'hall' },
      ],
      entityRegistry: [
        { entity_id: 'automation.coffee', device_id: 'device-kitchen' },
        { entity_id: 'automation.night', device_id: 'device-hall' },
        { entity_id: 'scene.movie', device_id: 'device-living' },
        { entity_id: 'script.goodnight', device_id: 'device-hall' },
      ],
      entities: getEntities(mode),
    });

    if (mode === 'low-power') {
      useSettingsStore.setState({
        ...previousSettingsState,
        effectsQuality: 'low',
        lowPowerMode: true,
      });
    }

    return () => {
      homeAssistantStore.setState(previousHaState);
      useSettingsStore.setState(previousSettingsState);
    };
  }, [mode]);

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto">
      <TasksSection />
    </div>
  );
}

const meta = {
  title: 'Pages/Tasks/Routines',
  component: TasksSectionStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Read-only routine surface for automations, scenes, and scripts, ' +
          'with automation enablement controls.',
      },
    },
  },
} satisfies Meta<typeof TasksSectionStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const TabletPortrait: Story = {
  args: { mode: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

export const Mobile: Story = {
  args: { mode: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const Empty: Story = {
  args: { mode: 'empty' },
};

export const Reconnecting: Story = {
  args: { mode: 'reconnecting' },
};

export const ManyRoutines: Story = {
  args: { mode: 'many' },
};

export const LowPower: Story = {
  args: { mode: 'low-power' },
};
