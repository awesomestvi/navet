import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { expect } from 'storybook/test';
import { EntityCardStoryFrame } from '@/app/features/dashboard/stories/entity-card-story-frame';
import { SwitchCard } from '@/app/features/lighting';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';

function SwitchCardDialogStory(args: ComponentProps<typeof SwitchCard>) {
  return (
    <SettingsDialogStoryFrame>
      <div className="relative flex min-h-[34rem] items-center justify-center p-8">
        <EntityCardStoryFrame size={args.size ?? 'small'}>
          <SwitchCard {...args} />
        </EntityCardStoryFrame>
      </div>
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Switch',
  component: SwitchCardDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
  args: {
    id: 'switch.espresso_machine',
    name: 'Espresso Machine',
    size: 'small',
    initialState: true,
    entityType: 'switch',
    serviceDomain: 'switch',
    serviceAction: 'toggle',
    isEditMode: false,
    power: 1140,
    voltage: 230,
    energy: 2.6,
  },
} satisfies Meta<typeof SwitchCardDialogStory>;

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

export const Default: Story = {
  play: async ({ canvas, canvasElement, step, userEvent }) => {
    const openSettingsButton = canvas.getByRole('button', {
      name: /open settings for espresso machine/i,
    });

    await step('opens the embedded switch dialog from the card action', async () => {
      await userEvent.click(openSettingsButton);
    });

    const dialogCanvas = canvasElement.ownerDocument.body;

    await step('renders the metric configuration section', async () => {
      await expect(dialogCanvas).toHaveTextContent(/card metric/i);
      await expect(dialogCanvas).toHaveTextContent(/power/i);
      await expect(dialogCanvas).toHaveTextContent(/voltage/i);
      await expect(dialogCanvas).toHaveTextContent(/energy/i);
    });
  },
};
