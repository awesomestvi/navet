import type { Meta, StoryObj } from '@storybook/react';
import { MarketingDemoCtaSection } from './MarketingDemoCtaSection';

const meta = {
  title: 'Pages/Marketing/DemoCTA',
  component: MarketingDemoCtaSection,
} satisfies Meta<typeof MarketingDemoCtaSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
