import { SummaryBar } from '@navet/app/features/sensors';
import type { Meta, StoryObj } from '@storybook/react';
import { Clipboard, Fan, Lightbulb, Lock, Speaker, Zap } from 'lucide-react';
import type { HomeStatusSummaryItem } from './home-status-summary-model';

const items: HomeStatusSummaryItem[] = [
  {
    id: 'energy',
    title: 'Energy',
    value: '8.2 kWh',
    icon: Zap,
    iconColor: '#f59e0b',
    targetSection: 'energy',
  },
  {
    id: 'climate',
    title: 'Climate',
    value: '23,0–24,5°',
    icon: Fan,
    iconColor: '#22d3ee',
    targetSection: 'climate',
  },
  {
    id: 'security',
    title: 'Security',
    value: 'No Alerts',
    icon: Lock,
    iconColor: '#2dd4bf',
    targetSection: 'security',
  },
  {
    id: 'lights',
    title: 'Lights',
    value: '1 On',
    icon: Lightbulb,
    iconColor: '#facc15',
    targetSection: 'lights',
  },
  {
    id: 'media',
    title: 'Speakers & TVs',
    value: 'None Playing',
    icon: Speaker,
    iconColor: '#cbd5e1',
    targetSection: 'media',
  },
  {
    id: 'routines',
    title: 'Routines',
    value: '5 Routines',
    icon: Clipboard,
    iconColor: '#a78bfa',
    targetSection: 'tasks',
  },
];

function SummaryBarStory({ items: storyItems }: { items: HomeStatusSummaryItem[] }) {
  return (
    <div className="w-[min(56rem,100%)] rounded-[28px] border border-white/10 bg-zinc-950 p-5">
      <SummaryBar items={storyItems} onNavigate={() => {}} />
    </div>
  );
}

const meta = {
  title: 'Cards/Entity/Summary Bar',
  component: SummaryBarStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Navet dashboard summary strip for important sections like energy, climate, security, lights, media, and routines.',
      },
    },
  },
} satisfies Meta<typeof SummaryBarStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Summary: Story = {
  args: {
    items,
  },
};

export const RoomSummary: Story = {
  args: {
    items: items
      .slice(0, 3)
      .map((item) =>
        item.id === 'climate'
          ? { ...item, value: '23°' }
          : item.id === 'lights'
            ? { ...item, value: '2 On' }
            : item
      ),
  },
};

export const SecurityAlert: Story = {
  args: {
    items: items.map((item) =>
      item.id === 'security' ? { ...item, value: '2 Alerts', iconColor: '#f87171' } : item
    ),
  },
};

export const LongLabel: Story = {
  args: {
    items: [
      {
        ...items[3],
        title: 'Whole Home Automations & Evening Scenes',
      },
    ],
  },
};
