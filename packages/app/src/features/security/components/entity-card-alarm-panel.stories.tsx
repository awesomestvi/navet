import { AlarmPanelCard } from '@navet/app/features/security';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import type { Meta, StoryObj } from '@storybook/react';

function AlarmPanelCardStory({
  alarms,
  size = 'large',
}: {
  alarms: NavetAlarmEntity[];
  size?: 'large' | 'extra-large';
}) {
  return (
    <EntityCardStoryFrame size={size}>
      <AlarmPanelCard alarms={alarms} size={size} />
    </EntityCardStoryFrame>
  );
}

const baseAlarm: NavetAlarmEntity = {
  id: 'home_assistant:alarm_control_panel.home',
  name: 'Home Alarm',
  state: 'disarmed',
  supportedActions: ['arm_home', 'arm_away', 'disarm'],
  codeFormat: 'none',
  provider: 'home_assistant',
  availability: 'available',
};

const meta = {
  title: 'Cards/Entity/Alarm Panel',
  component: AlarmPanelCardStory,
  tags: ['autodocs'],
  args: {
    alarms: [baseAlarm],
    size: 'large',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['large', 'extra-large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof AlarmPanelCardStory>;

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

export const DisarmedNoCode: Story = {};

export const ArmedAwayNumericCodeRequired: Story = {
  args: {
    alarms: [{ ...baseAlarm, state: 'armed_away', codeFormat: 'number', requiresCode: true }],
  },
};

export const ArmedHome: Story = {
  args: {
    alarms: [{ ...baseAlarm, state: 'armed_home' }],
  },
};

export const ArmedNight: Story = {
  args: {
    alarms: [{ ...baseAlarm, state: 'armed_night', supportedActions: ['arm_night', 'disarm'] }],
  },
};

export const Pending: Story = {
  args: {
    alarms: [{ ...baseAlarm, state: 'pending' }],
  },
};

export const Triggered: Story = {
  args: {
    alarms: [{ ...baseAlarm, state: 'triggered', supportedActions: ['disarm', 'trigger'] }],
  },
};

export const Unavailable: Story = {
  args: {
    alarms: [{ ...baseAlarm, state: 'unavailable', availability: 'unavailable' }],
  },
};

export const ArmAwayAndDisarmOnly: Story = {
  args: {
    alarms: [{ ...baseAlarm, supportedActions: ['arm_away', 'disarm'] }],
  },
};

export const AllSupportedModes: Story = {
  args: {
    size: 'extra-large',
    alarms: [
      {
        ...baseAlarm,
        supportedActions: [
          'arm_home',
          'arm_away',
          'arm_night',
          'arm_vacation',
          'arm_custom_bypass',
          'disarm',
          'trigger',
        ],
        codeFormat: 'text',
      },
    ],
  },
};
