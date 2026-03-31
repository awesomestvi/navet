import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { IconPicker } from './icon-picker';

function IconPickerStory({ isLightOn }: { isLightOn: boolean }) {
  const [selectedIcon, setSelectedIcon] = useState('Lightbulb');
  return (
    <div className="flex justify-center p-8">
      <div className="w-80 rounded-3xl border border-white/10 bg-zinc-900/80 p-5 backdrop-blur-xl">
        <IconPicker
          selectedIcon={selectedIcon}
          onIconChange={setSelectedIcon}
          isLightOn={isLightOn}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Shared/Icon Picker',
  component: IconPickerStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Icon picker used in the light card settings dialog. Supports typed Lucide icon names, emoji input, and direct library browsing.',
      },
    },
  },
  argTypes: {
    isLightOn: { control: 'boolean' },
  },
} satisfies Meta<typeof IconPickerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LightOn: Story = {
  args: { isLightOn: true },
};

export const LightOff: Story = {
  args: { isLightOn: false },
};
