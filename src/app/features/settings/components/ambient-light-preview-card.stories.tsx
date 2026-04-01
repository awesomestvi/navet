import type { Meta, StoryObj } from '@storybook/react';
import { AmbientLightPreviewCard } from './ambient-light-preview-card';

const meta = {
  title: 'Settings/Sections/Ambient Light Preview',
  component: AmbientLightPreviewCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AmbientLightPreviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BleedEnabled: Story = {
  args: {
    accentColor: '#f97316',
    ambientLightBleed: true,
    theme: 'glass',
  },
};

export const Contained: Story = {
  args: {
    accentColor: '#22d3ee',
    ambientLightBleed: false,
    theme: 'dark',
  },
};

export const LightTheme: Story = {
  args: {
    accentColor: '#3b82f6',
    ambientLightBleed: true,
    theme: 'light',
  },
};
