import * as Dialog from '@radix-ui/react-dialog';
import type { Meta, StoryObj } from '@storybook/react';
import { Palette, Sliders, Star } from 'lucide-react';
import { useState } from 'react';
import { RoomEyebrow } from '@/app/components/primitives/room-eyebrow';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  CardDialogChoicePill,
  CardDialogDoneFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from './card-dialog';

function CardDialogPreviewStory() {
  const [activeTab, setActiveTab] = useState('controls');
  const [selectedMode, setSelectedMode] = useState('auto');

  return (
    <Dialog.Root open modal={false}>
      <Dialog.Content asChild>
        <div className="max-w-md rounded-[28px] border border-white/10 bg-linear-to-br from-slate-900/95 to-slate-950/95 p-8 shadow-2xl backdrop-blur-xl">
          <CardDialogHeader
            title="Pax Calima"
            description="Switch"
            showRoomSelector={false}
            eyebrow={<RoomEyebrow room="Bathroom" forceDark />}
          />

          <CardDialogTabList>
            <CardDialogTabTrigger
              active={activeTab === 'controls'}
              icon={Sliders}
              onClick={() => setActiveTab('controls')}
            >
              Controls
            </CardDialogTabTrigger>
            <CardDialogTabTrigger
              active={activeTab === 'presets'}
              icon={Star}
              onClick={() => setActiveTab('presets')}
            >
              Presets
            </CardDialogTabTrigger>
            <CardDialogTabTrigger
              active={activeTab === 'customization'}
              icon={Palette}
              onClick={() => setActiveTab('customization')}
            >
              Customize
            </CardDialogTabTrigger>
          </CardDialogTabList>

          <div className="mt-5 space-y-6">
            <CardDialogSection
              label="Cleaning mode"
              helperText="Shared section spacing and readable label/helper defaults for card dialogs."
            >
              <div className="flex flex-wrap gap-2">
                {(['auto', 'boost', 'night'] as const).map((option) => (
                  <CardDialogChoicePill
                    key={option}
                    active={selectedMode === option}
                    onClick={() => setSelectedMode(option)}
                  >
                    {option[0]?.toUpperCase()}
                    {option.slice(1)}
                  </CardDialogChoicePill>
                ))}
              </div>
            </CardDialogSection>

            <CardDialogSection label="Available tabs">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/70">
                Use these patterns to keep card dialog headers, sections, top tabs, and compact
                choice pills visually aligned across card types.
              </div>
            </CardDialogSection>
          </div>

          <CardDialogDoneFooter label="Done" />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

const meta = {
  title: 'Components/Patterns/Card Dialog',
  component: CardDialogHeader,
  tags: ['autodocs'],
  render: () => <CardDialogPreviewStory />,
  parameters: {
    docs: {
      description: {
        component:
          'Shared card-dialog pattern set for header, labeled sections, compact top tabs, and default choice pills. Use this pattern instead of hand-rolling card-dialog structure per feature.',
      },
    },
  },
} satisfies Meta<typeof CardDialogHeader>;

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

export const Preview: Story = {
  args: {
    title: 'Pax Calima',
  },
  render: () => <CardDialogPreviewStory />,
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `import * as Dialog from '@radix-ui/react-dialog';
import { Palette, Sliders, Star } from 'lucide-react';
import { RoomEyebrow } from '@/app/components/primitives/room-eyebrow';
import {
  CardDialogChoicePill,
  CardDialogDoneFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';

export function Example() {
  return (
    <Dialog.Root open modal={false}>
      <Dialog.Content asChild>
        <div className="rounded-[28px] border border-white/10 bg-linear-to-br from-slate-900/95 to-slate-950/95 p-8">
          <CardDialogHeader
            title="Pax Calima"
            description="Switch"
            showRoomSelector={false}
            eyebrow={<RoomEyebrow room="Bathroom" forceDark />}
          />

          <CardDialogTabList>
            <CardDialogTabTrigger active icon={Sliders}>
              Controls
            </CardDialogTabTrigger>
            <CardDialogTabTrigger icon={Star}>Presets</CardDialogTabTrigger>
            <CardDialogTabTrigger icon={Palette}>Customization</CardDialogTabTrigger>
          </CardDialogTabList>

          <div className="mt-5 space-y-6">
            <CardDialogSection
              label="Cleaning mode"
              helperText="Shared dialog section layout for card settings."
            >
              <div className="flex flex-wrap gap-2">
                <CardDialogChoicePill active>Auto</CardDialogChoicePill>
                <CardDialogChoicePill>Boost</CardDialogChoicePill>
                <CardDialogChoicePill>Night</CardDialogChoicePill>
              </div>
            </CardDialogSection>
          </div>

          <CardDialogDoneFooter label="Done" />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}`,
      },
    },
  },
};
