import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarketingRoadmapSection } from './MarketingRoadmapSection';

const meta = {
  title: 'Pages/Marketing/Roadmap',
  component: MarketingRoadmapSection,
} satisfies Meta<typeof MarketingRoadmapSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
