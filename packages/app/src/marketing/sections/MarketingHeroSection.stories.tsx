import type { Meta, StoryObj } from '@storybook/react';
import { MarketingHeroSection } from './MarketingHeroSection';

const meta = {
  title: 'Pages/Marketing/Hero',
  component: MarketingHeroSection,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MarketingHeroSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
