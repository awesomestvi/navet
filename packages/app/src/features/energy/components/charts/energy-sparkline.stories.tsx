import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent } from 'storybook/test';
import { EnergySparkline } from './energy-sparkline';

const now = Date.now();

const meta = {
  title: 'Components/Charts/Sparkline',
  component: EnergySparkline,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    accentColor: '#22d3ee',
    data: [
      { value: 910, timestampMs: now - 5 * 60_000 },
      { value: 1220, timestampMs: now - 4 * 60_000 },
      { value: 980, timestampMs: now - 3 * 60_000 },
      { value: 1310, timestampMs: now - 2 * 60_000 },
      { value: 1170, timestampMs: now - 60_000 },
      { value: 1060, timestampMs: now },
    ],
    height: 56,
  },
} satisfies Meta<typeof EnergySparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithYAxisMarks: Story = {
  args: {
    showYAxisMarks: true,
  },
};

export const HourlyEnergy: Story = {
  args: {
    valueKind: 'energy',
    showYAxisMarks: true,
    data: [
      { value: 0.9, timestampMs: now - 5 * 60 * 60_000 },
      { value: 1.2, timestampMs: now - 4 * 60 * 60_000 },
      { value: 0.8, timestampMs: now - 3 * 60 * 60_000 },
      { value: 1.6, timestampMs: now - 2 * 60 * 60_000 },
      { value: 1.1, timestampMs: now - 60 * 60_000 },
      { value: 0.7, timestampMs: now },
    ],
  },
};

export const RecordedPowerPeaks: Story = {
  render: (args) => (
    <div style={{ height: 240 }}>
      <EnergySparkline {...args} />
    </div>
  ),
  args: {
    showYAxisMarks: true,
    showPowerRange: true,
    data: [
      { value: 910, minValue: 600, maxValue: 1200, timestampMs: now - 10 * 60_000 },
      { value: 2279.3, minValue: 572, maxValue: 5287, timestampMs: now - 5 * 60_000 },
      { value: 1060, minValue: 700, maxValue: 1400, timestampMs: now },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('2,279')).toBeVisible();
    await expect(canvas.queryByText('5,287')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Average', { exact: true })).not.toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('svg line')).toHaveLength(0);
    const chart = canvas.getByRole('img', { name: 'Power sparkline' });
    const bounds = chart.getBoundingClientRect();
    fireEvent.mouseMove(chart, {
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    });
    await expect(canvas.getByText('High', { exact: true }).parentElement).toHaveTextContent(
      '5,287 W'
    );
    await expect(canvas.getByText('Low', { exact: true }).parentElement).toHaveTextContent('572 W');
    await expect(
      canvas.getAllByText('Average', { exact: true }).at(-1)?.parentElement
    ).toHaveTextContent('2,279.3 W');
  },
};
