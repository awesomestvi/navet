import { Button } from '@navet/app/components/primitives/button';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { VacuumSettingsDialog } from './vacuum-settings-dialog';

function VacuumSettingsDialogStory(
  args: Omit<ComponentProps<typeof VacuumSettingsDialog>, 'isOpen' | 'onClose'>
) {
  const [isOpen, setIsOpen] = useState(false);
  const [tintColor, setTintColor] = useState(args.tintColor);

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(155deg,rgba(14,165,233,0.05),transparent_60%)]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open vacuum dialog
        </Button>
      </div>
      <VacuumSettingsDialog
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tintColor={tintColor}
        onTintColorChange={setTintColor}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Vacuum',
  component: VacuumSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
  args: {
    entityId: 'vacuum.roborock_s7',
    onStartCleaning: () => {},
    onStartAreaCleaning: () => {},
    onPauseCleaning: () => {},
    onReturnHome: () => {},
    onSetFanSpeed: () => {},
    name: 'Robo Cleaner',
    room: 'Whole Home',
    theme: 'glass',
    accentColorValue: '#22d3ee',
    currentStatus: 'cleaning',
    fanSpeed: 'Standard',
    fanSpeeds: ['Quiet', 'Standard', 'Max'],
    availableCleaningAreas: [
      { id: 'living_room', label: 'Living Room' },
      { id: 'kitchen', label: 'Kitchen' },
      { id: 'hallway', label: 'Hallway' },
      { id: 'bedroom', label: 'Bedroom' },
    ],
    capabilities: {
      canStart: true,
      canPause: true,
      canStop: false,
      canReturnHome: true,
      canLocate: true,
      canCleanSpot: true,
      canSetFanSpeed: true,
      currentFanSpeed: 'Standard',
      fanSpeedOptions: ['Quiet', 'Standard', 'Max'],
      canCycleFanSpeed: true,
      canShowMap: true,
      canCleanByArea: true,
      canOrderAreaCleaning: false,
      availableCleaningAreas: [
        { id: 'living_room', label: 'Living Room' },
        { id: 'kitchen', label: 'Kitchen' },
        { id: 'hallway', label: 'Hallway' },
        { id: 'bedroom', label: 'Bedroom' },
      ],
    },
    tintColor: '#22d3ee',
    onTintColorChange: () => {},
  },
} satisfies Meta<typeof VacuumSettingsDialogStory>;

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

export const Default: Story = {};

export const MultiSpeed: Story = {
  args: {
    fanSpeed: 'Balanced',
    fanSpeeds: ['Silent', 'Balanced', 'Turbo'],
    supportsFanSpeed: true,
  },
};

export const NoFanSpeedSupport: Story = {
  args: {
    fanSpeed: undefined,
    fanSpeeds: [],
    supportsFanSpeed: false,
  },
};

export const NoMappedAreas: Story = {
  args: {
    availableCleaningAreas: [],
    capabilities: {
      canStart: true,
      canPause: true,
      canStop: false,
      canReturnHome: true,
      canLocate: true,
      canCleanSpot: true,
      canSetFanSpeed: true,
      currentFanSpeed: 'Standard',
      fanSpeedOptions: ['Quiet', 'Standard', 'Max'],
      canCycleFanSpeed: true,
      canShowMap: false,
      canCleanByArea: false,
      canOrderAreaCleaning: false,
      availableCleaningAreas: [],
    },
  },
};

export const OrderedAreaCleaning: Story = {
  args: {
    capabilities: {
      canStart: true,
      canPause: true,
      canStop: false,
      canReturnHome: true,
      canLocate: true,
      canCleanSpot: true,
      canSetFanSpeed: true,
      currentFanSpeed: 'Standard',
      fanSpeedOptions: ['Quiet', 'Standard', 'Max'],
      canCycleFanSpeed: true,
      canShowMap: true,
      canCleanByArea: true,
      canOrderAreaCleaning: true,
      availableCleaningAreas: [
        { id: 'living_room', label: 'Living Room' },
        { id: 'kitchen', label: 'Kitchen' },
        { id: 'hallway', label: 'Hallway' },
        { id: 'bedroom', label: 'Bedroom' },
      ],
    },
  },
};
