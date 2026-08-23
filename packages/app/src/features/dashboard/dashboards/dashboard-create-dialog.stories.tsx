import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { DashboardCreateDialog } from './dashboard-create-dialog';

const meta = {
  title: 'Pages/Dashboard/Multiple Dashboards/Create Dialog',
  component: DashboardCreateDialog,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onOpenChange: () => {},
  },
  parameters: {
    docs: {
      description: {},
    },
  },
} satisfies Meta<typeof DashboardCreateDialog>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters.docs,
    description: {
      ...meta.parameters.docs.description,
      component: richComponentDocsDescription,
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Create dashboard' });
    const workspace = within(dialog);

    await expect(workspace.getByLabelText('Name')).toBeInTheDocument();
    await expect(
      workspace.getByRole('navigation', { name: 'Create dashboard' })
    ).toBeInTheDocument();

    const nextButton = workspace.getByRole('button', { name: 'Next' });
    await expect(nextButton).toBeDisabled();

    await userEvent.type(workspace.getByLabelText('Name'), 'Upstairs');
    await expect(nextButton).toBeEnabled();
    await userEvent.click(nextButton);
    await expect(workspace.getByRole('button', { name: 'Copy current' })).toBeInTheDocument();

    await userEvent.click(workspace.getByRole('button', { name: 'Bedroom' }));
    await userEvent.click(workspace.getByRole('button', { name: 'Next' }));
    await expect(workspace.getByRole('button', { name: 'This device' })).toBeInTheDocument();
    await expect(workspace.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    await expect(workspace.getByRole('button', { name: 'Create dashboard' })).toBeInTheDocument();
  },
};

export const PhoneSheet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Create dashboard' });
    const workspace = within(dialog);

    await expect(dialog).toHaveClass('max-sm:!rounded-[30px]', 'max-sm:!bottom-2');
    await expect(page.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();

    await userEvent.type(workspace.getByLabelText('Name'), 'Upstairs');
    await userEvent.click(workspace.getByRole('button', { name: 'Next' }));
    await expect(workspace.getByRole('button', { name: 'Choose rooms' })).toBeInTheDocument();
  },
};
