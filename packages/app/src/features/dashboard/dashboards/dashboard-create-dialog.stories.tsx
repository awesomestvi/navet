import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
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
    await expect(workspace.queryByRole('navigation', { name: 'Create dashboard' })).toBeNull();
    await expect(workspace.queryByText('Not yet')).toBeNull();
    await waitFor(() => expect(workspace.getByText('Step 1 of 3')).toBeVisible());
    await expect(
      workspace.getByRole('heading', { name: 'Name your dashboard' })
    ).toBeInTheDocument();
    await expect(
      workspace.getByText('Choose a name that makes this view easy to recognize.')
    ).toBeInTheDocument();

    const nextButton = workspace.getByRole('button', { name: 'Next' });
    await expect(nextButton).toBeDisabled();
    await expect(nextButton.parentElement).toHaveClass('justify-between');
    await expect(workspace.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    await userEvent.type(workspace.getByLabelText('Name'), 'Upstairs');
    await expect(nextButton).toBeEnabled();
    await userEvent.click(nextButton);
    await waitFor(() => expect(workspace.getByText('Step 2 of 3')).toBeVisible());
    await expect(
      workspace.getByRole('heading', { name: 'Choose what to include' })
    ).toBeInTheDocument();
    await expect(
      workspace.getByText('Start with rooms, copy the current dashboard, or begin blank.')
    ).toBeInTheDocument();
    await expect(workspace.getByRole('button', { name: 'Copy current' })).toBeInTheDocument();

    await userEvent.click(workspace.getByRole('button', { name: 'Bedroom' }));
    await userEvent.click(workspace.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(workspace.getByText('Step 3 of 3')).toBeVisible());
    await expect(
      workspace.getByRole('heading', { name: 'Choose where it opens' })
    ).toBeInTheDocument();
    await expect(
      workspace.getByText('Assign it to this device or leave it unassigned for now.')
    ).toBeInTheDocument();
    await expect(workspace.getByRole('button', { name: 'This device' })).toBeInTheDocument();
    await expect(workspace.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    await expect(workspace.getByRole('button', { name: 'Create dashboard' })).toBeInTheDocument();
  },
};

export const PhoneSheet: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Create dashboard' });
    const workspace = within(dialog);

    await expect(dialog).toHaveClass(
      'max-sm:!h-[80dvh]',
      'max-sm:!rounded-t-[30px]',
      'max-sm:!rounded-b-none',
      'max-sm:!bottom-0'
    );
    await expect(
      page.getByRole('button', { name: 'Drag dialog to fullscreen or close' })
    ).toBeInTheDocument();
    const headerDescription = dialog.querySelector('[data-dashboard-create-workspace] header p');
    await waitFor(() => expect(headerDescription).toBeVisible());
    await expect(headerDescription).toHaveTextContent(
      'Choose what belongs on this Home dashboard, then decide where it should open by default.'
    );
    await expect(workspace.queryByRole('navigation', { name: 'Create dashboard' })).toBeNull();
    await waitFor(() => expect(workspace.getByText('Step 1 of 3')).toBeVisible());
    await expect(workspace.getByRole('heading', { name: 'Name your dashboard' })).toBeVisible();
    const nextButton = workspace.getByRole('button', { name: 'Next' });
    await expect(nextButton.parentElement).toHaveClass('justify-between');
    await expect(workspace.getByRole('button', { name: 'Cancel' })).toBeVisible();

    await userEvent.type(workspace.getByLabelText('Name'), 'Upstairs');
    await userEvent.click(nextButton);
    await waitFor(() => expect(workspace.getByText('Step 2 of 3')).toBeVisible());
    await expect(workspace.getByRole('button', { name: 'Choose rooms' })).toBeInTheDocument();
  },
  globals: {
    viewport: {
      value: 'mobile1',
      isRotated: false,
    },
  },
};
