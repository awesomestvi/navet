import type { Meta, StoryObj } from '@storybook/react';
import { MarketingThemeShowcaseSection } from './MarketingThemeShowcaseSection';

const meta = {
  title: 'Pages/Marketing/ThemeShowcase',
  component: MarketingThemeShowcaseSection,
} satisfies Meta<typeof MarketingThemeShowcaseSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
