import { BaseCard } from '@navet/app/components/primitives';
import { DashboardEditActions } from '@navet/app/features/dashboard/components/dashboard-edit-actions';
import type { DeviceWithType, LockDevice } from '@navet/app/types/device.types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import { placeSecurityQuickviewEntity } from '../utils/security-quickview-preferences';
import {
  SecurityQuickviewCard,
  SecurityQuickviewDropZone,
  SecurityQuickviewEditor,
} from './security-quickview-editor';

const entities: (LockDevice & { type: 'locks' })[] = [
  {
    id: 'lock.front',
    name: 'Front door',
    room: 'Entrance',
    type: 'locks',
    state: true,
    size: 'small',
  },
  {
    id: 'lock.garden',
    name: 'Garden gate',
    room: 'Garden',
    type: 'locks',
    state: true,
    size: 'small',
  },
];

function QuickviewEditorStory({ initiallyEmpty = false }: { initiallyEmpty?: boolean }) {
  const [ids, setIds] = useState(initiallyEmpty ? [] : [entities[0].id]);
  const card = (device: DeviceWithType, location: 'quickview' | 'devices') => (
    <SecurityQuickviewCard
      key={device.id}
      device={device}
      location={location}
      isEditMode
      className="h-36 min-w-0"
    >
      <BaseCard size="small">
        <div className="p-4 pt-14">
          <p>{device.name}</p>
          <p>{device.room}</p>
        </div>
      </BaseCard>
    </SecurityQuickviewCard>
  );
  return (
    <div className="space-y-4 p-4">
      <DashboardEditActions isEditMode>
        <SecurityQuickviewEditor
          entities={entities}
          entityIds={ids}
          onPin={(id, overId) =>
            setIds((current) => placeSecurityQuickviewEntity(current, id, overId).entityIds)
          }
          onUnpin={(id) => setIds((current) => current.filter((value) => value !== id))}
        >
          <SecurityQuickviewDropZone location="quickview" isEditMode>
            <div className="grid grid-cols-2 gap-3">
              {ids.map((id) =>
                card(entities.find((device) => device.id === id) as DeviceWithType, 'quickview')
              )}
            </div>
          </SecurityQuickviewDropZone>
          <SecurityQuickviewDropZone location="devices" isEditMode>
            <div className="grid grid-cols-2 gap-3">
              {entities.map((device) => card(device, 'devices'))}
            </div>
          </SecurityQuickviewDropZone>
        </SecurityQuickviewEditor>
      </DashboardEditActions>
    </div>
  );
}

const meta = {
  title: 'Pages/Security/Quickview Editor',
  component: QuickviewEditorStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Uses Security dashboard card geometry and Home’s interaction-safe mouse, touch, and keyboard drag sensors. Quickview is edited directly on the dashboard.',
      },
    },
  },
} satisfies Meta<typeof QuickviewEditorStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DragIntoQuickview: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const handle = page.getByRole('button', { name: /Garden gate/ });
    const target = canvasElement.querySelector(
      '[data-security-drop-zone="quickview"]'
    ) as HTMLElement;
    const grip = handle;
    const origin = grip.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    fireEvent.pointerDown(grip, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
    fireEvent.mouseDown(grip, {
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: origin.x + 10,
      clientY: origin.y + 10,
    });
    fireEvent.mouseMove(canvasElement.ownerDocument, {
      buttons: 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: origin.x + 20,
      clientY: origin.y - 15,
    });
    fireEvent.mouseMove(canvasElement.ownerDocument, {
      buttons: 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: destination.right - 30,
      clientY: destination.top + 35,
    });
    fireEvent.mouseUp(canvasElement.ownerDocument, {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: destination.right - 30,
      clientY: destination.top + 35,
    });
    await expect(within(target).getByRole('button', { name: /Garden gate/ })).toBeInTheDocument();
  },
};
export const EmptyQuickview: Story = { args: { initiallyEmpty: true } };

export const KeyboardDrag: Story = {
  play: async ({ canvasElement }) => {
    const quickview = canvasElement.querySelector(
      '[data-security-drop-zone="quickview"]'
    ) as HTMLElement;
    const devices = canvasElement.querySelector(
      '[data-security-drop-zone="devices"]'
    ) as HTMLElement;
    const handle = within(devices).getByRole('button', { name: /Garden gate/ });
    (handle.closest('[data-card-drag-surface]') as HTMLElement).focus();
    await userEvent.keyboard(' {ArrowUp}{Escape}');
    await expect(within(quickview).queryByText('Garden gate')).not.toBeInTheDocument();
    (handle.closest('[data-card-drag-surface]') as HTMLElement).focus();
    await userEvent.keyboard(' {ArrowUp} ');
    await expect(within(quickview).getByText('Garden gate')).toBeInTheDocument();
    (
      within(quickview)
        .getByRole('button', { name: /Garden gate/ })
        .closest('[data-card-drag-surface]') as HTMLElement
    ).focus();
    await userEvent.keyboard(' {ArrowLeft} ');
    await expect(
      within(quickview).getAllByRole('button', { name: /Front door|Garden gate/ })[0]
    ).toHaveTextContent('Garden gate');
    (
      within(quickview)
        .getByRole('button', { name: /Garden gate/ })
        .closest('[data-card-drag-surface]') as HTMLElement
    ).focus();
    await userEvent.keyboard(' {ArrowDown} ');
    await expect(within(quickview).queryByText('Garden gate')).not.toBeInTheDocument();
    await expect(within(devices).getByText('Garden gate')).toBeInTheDocument();
  },
};
