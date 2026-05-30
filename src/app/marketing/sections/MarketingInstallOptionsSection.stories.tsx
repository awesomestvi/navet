import type { Meta, StoryObj } from '@storybook/react';
import { MarketingInstallOptionsSection } from './MarketingInstallOptionsSection';

const meta = {
  title: 'Pages/Marketing/InstallOptions',
  component: MarketingInstallOptionsSection,
} satisfies Meta<typeof MarketingInstallOptionsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
