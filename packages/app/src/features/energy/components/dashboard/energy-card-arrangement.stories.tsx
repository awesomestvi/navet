import { BaseCard, Button } from '@navet/app/components/primitives';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { usePersistedState } from '@navet/app/hooks/use-persisted-state';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fireEvent, waitFor } from 'storybook/test';
import { EnergyCardArrangement } from './energy-card-arrangement';

function ArrangementDemo({ overview = false }: { overview?: boolean }) {
  const [order, setOrder] = usePersistedState<string[]>(
    overview ? STORAGE_KEYS.energyUsageCardOrder : STORAGE_KEYS.energyCardOrder,
    []
  );
  const [editing, setEditing] = useState(true);
  return (
    <div className="space-y-4 p-4">
      <Button onClick={() => setEditing((value) => !value)}>
        {editing ? 'Done' : 'Customize'}
      </Button>
      <div
        className={
          overview
            ? 'grid grid-cols-8 auto-rows-[72px] gap-3'
            : 'grid grid-cols-4 auto-rows-[72px] gap-3'
        }
      >
        <EnergyCardArrangement
          cards={(overview
            ? ['Current usage', 'Low usage', 'Average usage', 'Peak usage', 'Energy usage']
            : ['Heating', 'Kitchen', 'Energy widget']
          ).map((name) => ({
            id: name,
            name,
            size: 'small',
            style:
              overview && name === 'Energy usage'
                ? { gridColumn: 'span 8', gridRow: 'span 4' }
                : undefined,
            content: (
              <BaseCard size="small">
                <div className="p-4 pt-14">{name}</div>
              </BaseCard>
            ),
          }))}
          order={order}
          isEditMode={editing}
          onOrderChange={setOrder}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Energy/Card Arrangement',
  component: ArrangementDemo,
  beforeEach: () => {
    localStorage.removeItem(STORAGE_KEYS.energyCardOrder);
    localStorage.removeItem(STORAGE_KEYS.energyUsageCardOrder);
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ArrangementDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardArrangement: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const handle = canvas.getByRole('button', { name: 'Arrange Heating' });
    handle.focus();
    await userEvent.keyboard('[Space]');
    await waitFor(() => expect(handle).toHaveAttribute('aria-pressed', 'true'));
    await userEvent.keyboard('[ArrowRight]');
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-energy-card-id="Kitchen"]')).toHaveAttribute(
        'data-energy-drop-target',
        'true'
      )
    );
    await userEvent.keyboard('[Space]');
    await waitFor(() =>
      expect(
        [...canvasElement.querySelectorAll('[data-energy-card-id]')].map((node) =>
          node.getAttribute('data-energy-card-id')
        )
      ).toEqual(['Kitchen', 'Heating', 'Energy widget'])
    );
    await expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.energyCardOrder) ?? '[]')).toEqual([
      'Kitchen',
      'Heating',
      'Energy widget',
    ]);
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }));
    await expect(canvas.queryByRole('button', { name: 'Arrange Heating' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Customize' }));
    await expect(canvas.getByRole('button', { name: 'Arrange Heating' })).toBeVisible();
  },
};

export const MouseArrangement: Story = {
  play: async ({ canvas, canvasElement }) => {
    const handle = canvas.getByRole('button', { name: 'Arrange Heating' });
    const origin = handle.getBoundingClientRect();
    const destination = canvas
      .getByRole('button', { name: 'Arrange Kitchen' })
      .getBoundingClientRect();
    fireEvent.mouseDown(handle, {
      button: 0,
      buttons: 1,
      clientX: origin.x + 10,
      clientY: origin.y + 10,
    });
    fireEvent.mouseMove(document, { buttons: 1, clientX: origin.x + 24, clientY: origin.y + 10 });
    fireEvent.mouseMove(document, {
      buttons: 1,
      clientX: destination.x + 10,
      clientY: destination.y + 10,
    });
    fireEvent.mouseUp(document, { clientX: destination.x + 10, clientY: destination.y + 10 });
    await waitFor(() =>
      expect(
        [...canvasElement.querySelectorAll('[data-energy-card-id]')].map((node) =>
          node.getAttribute('data-energy-card-id')
        )
      ).toEqual(['Kitchen', 'Heating', 'Energy widget'])
    );
  },
};

export const UsageAndKpiArrangement: Story = {
  render: () => <ArrangementDemo overview />,
  play: async ({ canvas, canvasElement }) => {
    const source = canvas.getByRole('button', { name: 'Arrange Energy usage' });
    const target = canvas.getByRole('button', { name: 'Arrange Current usage' });
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    fireEvent.mouseDown(source, { button: 0, clientX: from.x + 10, clientY: from.y + 10 });
    fireEvent.mouseMove(document, { clientX: from.x + 24, clientY: from.y + 24 });
    fireEvent.mouseMove(document, { clientX: to.x + 10, clientY: to.y + 10 });
    fireEvent.mouseUp(document, { clientX: to.x + 10, clientY: to.y + 10 });
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-energy-card-id]')).toHaveAttribute(
        'data-energy-card-id',
        'Energy usage'
      )
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.energyUsageCardOrder) ?? '[]')[0]).toBe(
      'Energy usage'
    );
    expect(canvasElement.querySelector('[data-energy-card-id="Energy usage"]')).toHaveStyle({
      gridColumn: 'span 8',
      gridRow: 'span 4',
    });
  },
};
