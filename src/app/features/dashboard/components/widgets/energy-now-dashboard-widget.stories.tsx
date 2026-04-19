import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives/button';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@/app/storybook/story-frames';
import { EnergyNowSettingsDialog } from './energy-now-dashboard-widget';

function EnergyNowSettingsDialogStory() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState('sensor.home_energy_now');
  const [roomValue, setRoomValue] = useState('__home__');
  const [tintColor, setTintColor] = useState<string | undefined>('#f97316');

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(249,115,22,0.18),rgba(15,23,42,0.28))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open energy dialog
        </Button>
      </div>
      <EnergyNowSettingsDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        selectedSourceId={selectedSourceId}
        onSelectionChange={setSelectedSourceId}
        roomValue={roomValue}
        roomLabel={roomValue === '__home__' ? 'Home' : roomValue}
        roomOptions={[
          { label: 'Home', value: '__home__' },
          { label: 'Living Room', value: 'Living Room' },
          { label: 'Kitchen', value: 'Kitchen' },
        ]}
        onRoomChange={setRoomValue}
        tintColor={tintColor}
        onTintColorChange={setTintColor}
        options={[
          {
            id: 'sensor.home_energy_now',
            name: 'Home usage',
            currentPowerW: 1170,
            todayUsageKWh: 18.4,
            group: 'home',
          },
          {
            id: 'sensor.solar_energy_now',
            name: 'Solar',
            currentPowerW: 840,
            todayUsageKWh: 12.6,
            group: 'sources',
          },
          {
            id: 'sensor.grid_energy_now',
            name: 'Grid',
            currentPowerW: 330,
            todayUsageKWh: 8.9,
            group: 'sources',
          },
          {
            id: 'sensor.ev_charger_energy_now',
            name: 'EV charger',
            currentPowerW: 2200,
            todayUsageKWh: 5.2,
            group: 'devices',
          },
        ]}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Energy',
  component: EnergyNowSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof EnergyNowSettingsDialogStory>;

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
