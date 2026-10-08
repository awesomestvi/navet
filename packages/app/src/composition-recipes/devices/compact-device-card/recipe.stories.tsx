import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CompactDeviceCard } from './template';

const meta = {
  title: 'Concepts/Composition recipes/Product compositions/Devices/Switch card',
  component: CompactDeviceCard,
  tags: ['autodocs', 'design-pending'],
  args: {
    id: 'switch.espresso_machine',
    name: 'Espresso Machine',
    size: 'small',
    initialState: true,
    power: 1140,
    voltage: 230,
    energy: 2.6,
  },
  decorators: [
    (Story, { args }) => (
      <EntityCardStoryFrame size={args.size ?? 'small'}>
        <Story />
      </EntityCardStoryFrame>
    ),
  ],
} satisfies Meta<typeof CompactDeviceCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CompactDeviceCardExample: Story = {};
export const Inactive: Story = { args: { initialState: false } };
export const Tiny: Story = { args: { size: 'tiny' } };
export const ExtraSmall: Story = { args: { size: 'extra-small' } };
export const EditMode: Story = { args: { isEditMode: true } };
export const LongName: Story = {
  args: { name: 'Lámpara de lectura junto al sofá de la sala de estar' },
};
