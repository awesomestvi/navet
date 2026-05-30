import type { Meta, StoryObj } from '@storybook/react';
import { MarketingCurrentSupportSection } from './MarketingCurrentSupportSection';

const meta = {
  title: 'Pages/Marketing/CurrentSupport',
  component: MarketingCurrentSupportSection,
} satisfies Meta<typeof MarketingCurrentSupportSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
