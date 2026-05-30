import type { Meta, StoryObj } from '@storybook/react';
import { MarketingFeatureGridSection } from './MarketingFeatureGridSection';

const meta = {
  title: 'Pages/Marketing/FeatureGrid',
  component: MarketingFeatureGridSection,
} satisfies Meta<typeof MarketingFeatureGridSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
