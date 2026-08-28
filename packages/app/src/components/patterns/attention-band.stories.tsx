import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, Flame, ShieldAlert } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { AttentionBand, type AttentionBandItem } from './attention-band';

function ThemeFixture({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  useEffect(() => {
    const previousTheme = useThemeStore.getState();
    useThemeStore.setState({ ...previousTheme, theme, followSystemTheme: false, wallpaper: null });
    return () => {
      useThemeStore.setState(previousTheme);
    };
  }, [theme]);
  return <>{children}</>;
}

function withTheme(theme: ThemeMode): Decorator {
  return (Story) => (
    <ThemeFixture theme={theme}>
      <Story />
    </ThemeFixture>
  );
}

const items: AttentionBandItem[] = [
  {
    id: 'front-door',
    title: 'Front door is unlocked',
    detail: 'Entry · unlocked for 12 minutes',
    priority: 'attention',
    icon: ShieldAlert,
    actionLabel: 'Review',
  },
  {
    id: 'smoke',
    title: 'Smoke alarm triggered',
    detail: 'Kitchen · detected now',
    priority: 'critical',
    icon: Flame,
    actionLabel: 'Open',
  },
  {
    id: 'camera',
    title: 'Driveway camera unavailable',
    detail: 'Last available 8 minutes ago',
    priority: 'attention',
    icon: CircleAlert,
  },
];

const meta = {
  title: 'Components/Patterns/Attention Band',
  component: AttentionBand,
  tags: ['autodocs'],
  args: {
    ariaLabel: 'Needs attention',
    items,
  },
  decorators: [withTheme('glass')],
} satisfies Meta<typeof AttentionBand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PriorityOrdering: Story = {};

export const AttentionOnly: Story = {
  args: { items: items.filter((item) => item.priority === 'attention') },
};

export const LightTheme: Story = {
  decorators: [withTheme('light')],
};

export const BlackTheme: Story = {
  decorators: [withTheme('black')],
};

export const Phone: Story = {
  globals: {
    viewport: {
      value: 'iphone14',
      isRotated: false,
    },
  },
};
