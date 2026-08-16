import { SettingsSection } from '@navet/app/features/settings';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Pages/Settings/Workspace',
  component: SettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Current Settings workspace with deep search, persistent desktop navigation, grouped mobile list-to-detail navigation, and contained detail groups without the retired accent-banner treatment.',
      },
    },
  },
} satisfies Meta<typeof SettingsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(canvasElement.querySelector('[data-settings-detail-header]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-settings-detail-group]')).toBeVisible();
    await expect(canvasElement.querySelector('[data-settings-legacy-banner]')).toBeNull();
  },
};

export const TabletPortrait: Story = {
  args: { layout: 'desktop' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

export const DeepSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search' }), 'visual quality');
    await userEvent.click(canvas.getByRole('button', { name: 'Visual quality, Appearance' }));
    await expect(canvas.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(canvas.getByRole('heading', { name: 'Visual quality' })).toBeVisible();
  },
};

export const MobileIndex: Story = {
  args: { layout: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const navigation = canvas.getByRole('navigation', { name: 'Settings' });
    const rows = within(navigation).getAllByRole('button');
    const rowHeights = rows.map((row) => row.getBoundingClientRect().height);

    await expect(navigation).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-navigation-workspace-group]')).toHaveLength(
      3
    );
    await expect(rowHeights.every((height) => height === rowHeights[0])).toBe(true);
    await expect(canvas.queryByText('A calmer place to tune Navet.')).not.toBeInTheDocument();
  },
};

export const MobileDetail: Story = {
  args: { layout: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Appearance' }));
    await expect(canvas.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  },
};
