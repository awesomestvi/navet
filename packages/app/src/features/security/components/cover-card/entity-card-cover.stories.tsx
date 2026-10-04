import { CoverCard } from '@navet/app/features/security';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, within } from 'storybook/test';

function CoverCardStory(args: Omit<ComponentProps<typeof CoverCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <CoverCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Cover',
  component: CoverCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium'],
    },
  },
  args: {
    id: 'cover.living_room_blind',
    name: 'Living Room Blind',
    room: 'Living Room',
    initialPosition: 72,
    hasPosition: true,
    supportedFeatures: 15,
    initialDeviceClass: 'blind',
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CoverCardStory>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};

export const ControlsDialog: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Open settings for/i }));
    const scope = within(await within(document.body).findByRole('dialog'));
    await expect(scope.getByRole('button', { name: 'Open' })).toBeEnabled();
    await expect(scope.getByRole('button', { name: 'Stop' })).toBeEnabled();
    await userEvent.click(scope.getByRole('button', { name: '50%' }));
    const slider = scope.getByRole('slider', { name: 'Living Room Blind cover' });
    const coverage = slider.querySelector('[data-cover-coverage]');
    await expect(coverage).not.toBeNull();
    const boundsAtHalf = slider.getBoundingClientRect();
    await expect(coverage?.getBoundingClientRect().height).toBeCloseTo(
      (boundsAtHalf.height - 2) / 2,
      0
    );
    await expect(slider).toHaveAttribute('aria-valuenow', '50');
    await expect(slider).toHaveAttribute('aria-orientation', 'vertical');
    slider.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(slider).toHaveAttribute('aria-valuenow', '55');
    for (const [key, value] of [
      ['{Home}', '0'],
      ['{End}', '100'],
    ] as const) {
      await userEvent.keyboard(key);
      await expect(slider).toHaveAttribute('aria-valuenow', value);
      const coverageHeight = coverage?.getBoundingClientRect().height ?? -1;
      if (value === '100') await expect(coverageHeight).toBe(0);
      else await expect(coverageHeight).toBeGreaterThan(slider.getBoundingClientRect().height - 3);
      const handle = slider.querySelector('[data-cover-position-handle]');
      await expect(handle).not.toBeNull();
      const bounds = slider.getBoundingClientRect();
      const handleBounds = handle?.getBoundingClientRect();
      await expect(handleBounds?.top).toBeGreaterThanOrEqual(bounds.top - 1);
      await expect(handleBounds?.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
    }
    await userEvent.click(scope.getByRole('button', { name: 'More actions' }));
    const menu = within(await within(document.body).findByRole('menu'));
    await userEvent.click(menu.getByRole('menuitem', { name: 'Customize' }));
    await userEvent.click(scope.getByRole('button', { name: 'Back to controls' }));
    await expect(scope.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  },
};

export const MobileControlsDialog: Story = {
  ...ControlsDialog,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const SmallPositionControl: Story = {
  args: { size: 'small' },
  play: async ({ canvas, userEvent }) => {
    const slider = canvas.getByRole('slider', { name: 'Living Room Blind cover' });
    const handle = slider.querySelector('[data-cover-position-handle]');
    const coverage = canvas
      .getByRole('heading', { name: 'Living Room Blind' })
      .closest('[data-cover-card-root="true"]')
      ?.querySelector('[data-cover-coverage]');
    await expect(handle).toBeNull();
    await expect(coverage).not.toBeNull();
    slider.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(slider).toHaveAttribute('aria-valuenow', '67');
  },
};

export const ExtraSmallPositionControl: Story = {
  ...SmallPositionControl,
  args: { size: 'extra-small' },
};

export const HandleSizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-start gap-6">
      {(['medium', 'small', 'extra-small'] as const).map((size) => (
        <CoverCardStory key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

export const WindowCover: Story = {
  args: {
    id: 'cover.window_fixture',
    initialDeviceClass: 'window',
    name: 'Kitchen Window',
    initialState: 'open',
  },
};

export const Unavailable: Story = {
  args: {
    id: 'cover.unavailable_garage_fixture',
    initialDeviceClass: 'garage',
    name: 'Garage Door',
    initialState: 'unavailable',
    initialPosition: 0,
    hasPosition: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Unavailable')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Open' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Toggle Garage Door cover' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Garage Door cover' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  },
};
