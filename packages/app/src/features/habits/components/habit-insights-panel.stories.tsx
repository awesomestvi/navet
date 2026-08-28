import { integrationStore } from '@navet/app/stores/integration-store';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { HabitInsight, HabitRule } from '@navet/core/habits';
import type { NavetEntity } from '@navet/core/types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { useHabitStore } from '../habit-store';
import { HabitInsightsPanel } from './habit-insights-panel';

const kitchenLightId = 'home_assistant:light.kitchen_island';
const coffeeMakerId = 'home_assistant:switch.coffee_maker';

const suggestedRule = {
  id: 'habit-rule:weekday-breakfast',
  sourceCandidateId: 'habit-candidate:weekday-breakfast',
  enabled: true,
  scope: 'navet_local',
  trigger: {
    days: [1, 2, 3, 4, 5],
    startMinute: 420,
    endMinute: 480,
    presence: 'home',
  },
  action: {
    type: 'turn_on',
    entityIds: [kitchenLightId, coffeeMakerId],
  },
  safety: {
    allowDomains: ['light', 'switch'],
    requireUserCreated: true,
  },
  createdAt: '2026-07-01T06:00:00.000Z',
  updatedAt: '2026-07-01T06:00:00.000Z',
} satisfies HabitRule;

const morningInsight = {
  id: 'habit-insight:weekday-breakfast',
  candidateId: 'habit-candidate:weekday-breakfast',
  title: 'Weekday breakfast',
  summary: 'The kitchen lights and coffee maker are usually turned on before breakfast.',
  confidence: 0.86,
  confidenceLabel: 'high',
  evidence: ['Seen on 8 weekday mornings', 'Usually happens between 07:00 and 08:00'],
  suggestedRule,
  status: 'new',
  createdAt: '2026-07-10T07:30:00.000Z',
} satisfies HabitInsight;

const eveningInsight = {
  id: 'habit-insight:evening-kitchen',
  candidateId: 'habit-candidate:evening-kitchen',
  title: 'Kitchen shutdown',
  summary: 'Kitchen devices are usually turned off after the household settles for the night.',
  confidence: 0.68,
  confidenceLabel: 'medium',
  evidence: ['Seen 5 times this month', 'Most often happens after 22:30'],
  status: 'new',
  createdAt: '2026-07-12T22:45:00.000Z',
} satisfies HabitInsight;

function entity(id: string, name: string, type: 'light' | 'switch'): NavetEntity {
  return {
    id,
    canonicalId: id,
    providerId: 'home_assistant',
    externalId: id.split(':')[1] ?? id,
    type,
    name,
    primaryState: 'off',
    availability: 'available',
    attributes: {},
    capabilities: type === 'light' ? ['toggle', 'brightness'] : ['toggle'],
  };
}

type FixtureMode = 'suggestions' | 'learning' | 'empty' | 'disabled';

function HabitInsightsFixture({ mode }: { mode: FixtureMode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previousHabits = useHabitStore.getState();
    const previousIntegration = integrationStore.getState();

    integrationStore.setState({
      providerEntitiesByCanonicalId: {
        [kitchenLightId]: entity(kitchenLightId, 'Kitchen island', 'light'),
        [coffeeMakerId]: entity(coffeeMakerId, 'Coffee maker', 'switch'),
      },
    });
    useHabitStore.setState({
      enabled: mode !== 'disabled',
      initialized: mode !== 'learning',
      insights: mode === 'suggestions' ? [morningInsight, eveningInsight] : [],
    });
    setReady(true);

    return () => {
      useHabitStore.setState(previousHabits, true);
      integrationStore.setState(previousIntegration, true);
    };
  }, [mode]);

  return ready ? <HabitInsightsPanel /> : null;
}

const meta = {
  title: 'Pages/Tasks/Habit Insights',
  component: HabitInsightsFixture,
  tags: ['autodocs'],
  args: { mode: 'suggestions' },
  argTypes: {
    mode: {
      control: 'select',
      options: ['suggestions', 'learning', 'empty', 'disabled'],
    },
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: getStoryDocsDescription('Pages/Tasks/Habit Insights'),
      },
    },
  },
} satisfies Meta<typeof HabitInsightsFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Suggestions: Story = {};
export const Learning: Story = { args: { mode: 'learning' } };
export const NoSuggestionsYet: Story = { args: { mode: 'empty' } };
export const Disabled: Story = { args: { mode: 'disabled' } };
