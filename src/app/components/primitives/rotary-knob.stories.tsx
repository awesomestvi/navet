import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { RotaryKnob, type RotaryKnobProps } from './rotary-knob';

type RotaryKnobStoryProps = Omit<
  RotaryKnobProps,
  'bandGlowColor' | 'bandPrimaryColor' | 'bandSecondaryColor'
>;

function RotaryKnobPlayground({
  id,
  value,
  min = 16,
  max = 30,
  step = 0.5,
  isOn = true,
  className,
  glowClassName,
}: RotaryKnobStoryProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const { theme } = useTheme();
  const progress = (currentValue - min) / Math.max(max - min, step || 0.5);
  const bandHue = 205 - Math.max(0, Math.min(1, progress)) * 175;
  const bandPrimaryColor = `hsl(${bandHue}, 92%, 60%)`;
  const bandSecondaryColor = `hsl(${Math.max(bandHue - 18, 8)}, 94%, 70%)`;
  const bandGlowColor = `hsla(${bandHue}, 92%, 60%, 0.45)`;

  return (
    <div
      className={
        theme === 'light'
          ? 'flex min-h-[30rem] items-center justify-center rounded-[32px] bg-slate-100 p-8'
          : 'flex min-h-[30rem] items-center justify-center rounded-[32px] bg-[linear-gradient(180deg,#273c88,#233677)] p-8'
      }
    >
      <RotaryKnob
        id={id}
        value={currentValue}
        min={min}
        max={max}
        step={step}
        isOn={isOn}
        className={className}
        glowClassName={glowClassName}
        bandPrimaryColor={bandPrimaryColor}
        bandSecondaryColor={bandSecondaryColor}
        bandGlowColor={bandGlowColor}
        onValueChange={setCurrentValue}
      />
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Rotary Knob',
  component: RotaryKnobPlayground,
  tags: ['autodocs'],
  args: {
    id: 'storybook-rotary-knob',
    value: 22,
    min: 16,
    max: 30,
    step: 0.5,
    isOn: true,
    className: '',
    glowClassName: 'bg-blue-400',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Docked rotary thermostat control used by HVAC. Supports continuous drag and wheel interaction with a temperature-reactive accent band.',
      },
    },
  },
} satisfies Meta<typeof RotaryKnobPlayground>;

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

export const Off: Story = {
  args: {
    isOn: false,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
