import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarketingProductPreviewSection } from './MarketingProductPreviewSection';

const meta = {
  title: 'Pages/Marketing/ProductPreview',
  component: MarketingProductPreviewSection,
} satisfies Meta<typeof MarketingProductPreviewSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
