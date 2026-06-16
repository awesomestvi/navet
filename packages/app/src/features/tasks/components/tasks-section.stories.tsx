import { createPreviewStoryScenario } from '@navet/app/preview/runtime';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { TasksSection } from './tasks-section';

type TasksStoryMode = 'default' | 'empty' | 'many' | 'reconnecting' | 'low-power';

function TasksSectionStory({ mode = 'default' }: { mode?: TasksStoryMode }) {
  useEffect(() => {
    const previousSettingsState = useSettingsStore.getState();

    if (mode === 'low-power') {
      useSettingsStore.setState({
        ...previousSettingsState,
        effectsQuality: 'low',
        lowPowerMode: true,
      });
    }

    return () => {
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
  parameters: {
    previewRuntime: {
      scenario: {
        ...createPreviewStoryScenario(),
        taskRuntime: {
          ...createPreviewStoryScenario().taskRuntime,
          entities: {},
        },
      },
    },
  },
};

export const Reconnecting: Story = {
  args: { mode: 'reconnecting' },
  parameters: {
    previewRuntime: {
      scenario: {
        ...createPreviewStoryScenario(),
        homeAssistant: {
          ...createPreviewStoryScenario().homeAssistant,
          connected: false,
          reconnecting: true,
        },
      },
    },
  },
};

export const ManyRoutines: Story = {
  args: { mode: 'many' },
  parameters: {
    previewRuntime: {
      scenario: {
        ...createPreviewStoryScenario(),
        taskRuntime: {
          ...createPreviewStoryScenario().taskRuntime,
          entities: {
            ...createPreviewStoryScenario().taskRuntime.entities,
            'scene.cleaning': {
              entityId: 'scene.cleaning',
              state: 'scening',
              name: 'Cleaning',
              attributes: {},
            },
            'automation.vacation': {
              entityId: 'automation.vacation',
              state: 'on',
              name: 'Vacation',
              attributes: {
                description: 'Keeps the home steady.',
                mode: 'single',
              },
            },
            'automation.leaving': {
              entityId: 'automation.leaving',
              state: 'on',
              name: 'Leaving Home',
              attributes: {
                mode: 'single',
              },
            },
          },
        },
      },
    },
  },
};

export const LowPower: Story = {
  args: { mode: 'low-power' },
};
