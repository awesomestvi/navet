import type { Meta, StoryObj } from '@storybook/react';
import { MarketingPrivacySection } from './MarketingPrivacySection';

const meta = {
  title: 'Pages/Marketing/Privacy',
  component: MarketingPrivacySection,
} satisfies Meta<typeof MarketingPrivacySection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
