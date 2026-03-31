import type { Meta, StoryObj } from '@storybook/react';
import { Header } from '@/app/components/layout/header';

const meta = {
  title: 'App Shell/Topbar',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Topbar with greeting, date/time, search, user menu, and notification entry points.',
      },
    },
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
