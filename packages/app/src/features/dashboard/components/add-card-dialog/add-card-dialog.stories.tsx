import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { AddCardDialogContainer } from './container';

const demoLibraryCards = [
  {
    id: 'light.living_room',
    title: 'Living Room Main Light',
    subtitle: 'light.living_room_main',
    room: 'Living Room',
    meta: 'Living Room',
    kind: 'device' as const,
  },
  {
    id: 'sensor.kitchen_temperature',
    title: 'Kitchen Temperature',
    subtitle: 'sensor.kitchen_temperature',
    room: 'Kitchen',
    meta: 'Kitchen',
    kind: 'device' as const,
  },
  {
    id: 'fan.hallway',
    title: 'Hallway Fan',
    subtitle: 'fan.hallway',
    room: 'Hallway',
    meta: 'Fan',
    kind: 'device' as const,
  },
  {
    id: 'widget.quick_note',
    title: 'Quick Note',
    subtitle: 'Widget',
    room: 'Living Room',
    meta: 'Custom',
    kind: 'widget' as const,
  },
];

const meta = {
  title: 'Pages/Dashboard/Add Card Dialog',
  component: AddCardDialogContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    onClose: () => {},
    onAddCard: () => {},
    onAddLibraryCard: () => {},
    currentRoom: 'Living Room',
    libraryCards: demoLibraryCards,
    showCardsTab: true,
  },
} satisfies Meta<typeof AddCardDialogContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PhoneCoverSheet: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Add Card' });
    const header = dialog.querySelector('[data-add-card-header]') as HTMLElement;
    const headerContent = within(header);
    await expect(dialog).toHaveClass(
      'max-sm:!h-[80dvh]',
      'max-sm:!rounded-t-[30px]',
      'max-sm:!rounded-b-none',
      'max-sm:!bottom-0'
    );
    await expect(header).toHaveClass('px-4', 'py-3', 'sm:px-5', 'sm:py-4');
    await expect(header).not.toHaveClass('flex');
    await expect(headerContent.getByRole('button', { name: 'All cards' })).toHaveClass('text-xs');
    await expect(headerContent.getByText('All cards')).toHaveClass('font-normal');
    await expect(headerContent.getByRole('button', { name: 'Custom cards' })).toHaveClass(
      'text-xs'
    );
    await expect(headerContent.getByText('Custom cards')).toHaveClass('font-normal');
    await expect(page.getByPlaceholderText('Search entities')).toHaveClass(
      '!text-sm',
      '!font-normal'
    );
    await userEvent.click(page.getByRole('button', { name: 'Filter' }));
    await expect(page.getByRole('menuitemradio', { name: 'All cards' })).toBeInTheDocument();
    await userEvent.click(page.getByRole('menuitemradio', { name: 'Kitchen' }));
    await expect(page.getByRole('button', { name: 'Filter: Kitchen' })).toBeInTheDocument();
    const addButton = page.getByRole('button', { name: 'Add: Kitchen Temperature' });
    const entityList = addButton.closest('[data-dashboard-library-list]');
    await expect(entityList).toHaveClass('rounded-[24px]', 'border');
    await expect(addButton).toHaveClass('h-[30px]', 'rounded-full');
    await userEvent.click(headerContent.getByRole('button', { name: 'Custom cards' }));
    await expect(dialog.querySelector('[data-custom-card-list]')).toHaveClass(
      'rounded-[24px]',
      'border'
    );
    await userEvent.click(page.getByRole('button', { name: /Action/ }));
    const backButton = page.getByRole('button', { name: 'Back' });
    const addWidgetButton = page.getByRole('button', { name: 'Add Widget' });
    await expect(backButton.parentElement).toHaveClass('!flex-nowrap', '!justify-between');
    await expect(backButton).not.toHaveClass('w-full');
    await expect(addWidgetButton).not.toHaveClass('w-full');
    await expect(
      page.getByRole('button', { name: 'Drag dialog to fullscreen or close' })
    ).toBeInTheDocument();
  },
  globals: {
    viewport: {
      value: 'mobile1',
      isRotated: false,
    },
  },
};

export const WidgetsOnly: Story = {
  args: {
    showCardsTab: false,
  },
};
