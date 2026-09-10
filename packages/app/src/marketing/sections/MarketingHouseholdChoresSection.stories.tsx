import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarketingHouseholdChoresSection } from './MarketingHouseholdChoresSection';

const meta = {
  title: 'Pages/Marketing/HouseholdChores',
  component: MarketingHouseholdChoresSection,
} satisfies Meta<typeof MarketingHouseholdChoresSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
