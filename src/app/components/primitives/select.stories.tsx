import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './select';

const meta = {
  title: 'Components/Primitives/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    defaultValue: 'glass',
    disabled: false,
    invalid: false,
    children: [
      <option key="glass" value="glass">
        Glass
      </option>,
      <option key="dark" value="dark">
        Dark
      </option>,
      <option key="light" value="light">
        Light
      </option>,
      <option key="black" value="black">
        Black
      </option>,
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Minimal single-select wrapper for ordinary form choices. Use a richer app-specific control when options need previews or domain-specific behavior.',
      },
    },
  },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ErrorState: Story = { args: { invalid: true } };
export const Disabled: Story = { args: { disabled: true } };
