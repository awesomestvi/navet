import type { NavetAiState } from '@navet/app/features/navet-ai/navet-ai.contract';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavetAiSection } from './navet-ai-section';

const storyState: NavetAiState = {
  contract: 'navet.ai',
  version: 2,
  settings: {
    enabled: true,
    dailyGenerationEnabled: true,
    locale: 'en',
    modelDownloadConsented: true,
    priorityFeedEnabled: true,
    learningEnabled: true,
    historyBackfillEnabled: false,
    prioritySources: {
      security: true,
      chores: true,
      weather: true,
      calendar: true,
      maintenance: true,
      energy: true,
    },
    privateDetails: { calendarTitles: false, notificationText: false },
  },
  capabilities: {
    available: true,
    readOnly: true,
    supportsHistoryBackfill: true,
    storageOwner: 'installation',
    rawRetentionDays: 30,
    aggregateRetentionMonths: 12,
    model: { status: 'ready', selectedId: 'qwen3.5-0.8b', downloadBytes: 563_036_064 },
  },
  insights: [
    {
      id: 'insight:morning-kitchen',
      evidenceId: 'morning-kitchen',
      detectorId: 'manual_light_routine',
      category: 'routine',
      observation: 'activation_pattern',
      title: 'A consistent morning pattern',
      summary: 'Kitchen lighting activity has clustered near 07:00 on recent weekdays.',
      confidence: 0.87,
      confidenceLabel: 'high',
      facts: [
        'Observed 8 similar turn-on events around 07:00.',
        'The pattern appeared on weekday mornings.',
      ],
      roomId: 'kitchen',
      entityIds: ['home_assistant:light.kitchen'],
      status: 'new',
      createdAt: '2026-08-30T05:30:00.000Z',
      narration: {
        modelId: 'qwen3.5-0.8b',
        locale: 'en',
        generatedAt: '2026-08-30T05:30:00.000Z',
      },
    },
  ],
  feedback: [],
  eventCount: 184,
  lastGeneratedAt: '2026-08-30T05:30:00.000Z',
  historyBackfilledAt: '2026-08-29T18:00:00.000Z',
  priorityFeedback: [],
};

function NavetAiSectionStory() {
  useNavetAiStore.setState({ state: storyState, loading: false, error: null });
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <NavetAiSection />
    </main>
  );
}

const meta = {
  title: 'Pages/Home insights/Insights',
  component: NavetAiSectionStory,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NavetAiSectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithVerifiedInsight: Story = {};
