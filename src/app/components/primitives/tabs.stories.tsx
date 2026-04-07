import type { Meta, StoryObj } from '@storybook/react';
import { Hand, Languages, Layers2, Palette, Sparkles } from 'lucide-react';
import { Heading } from './heading';
import { Panel } from './panel';
import { TabList, type TabListSize, TabPanel, Tabs, TabTrigger, type TabTriggerSize } from './tabs';
import { Text } from './text';

type TabsStoryProps = {
  variant: 'default' | 'with icons' | 'with icon and hints';
  size: TabListSize;
};

function TabsPlayground({ variant, size }: TabsStoryProps) {
  const isHintVariant = variant === 'with icon and hints';
  const isIconVariant = variant === 'with icons';
  const triggerSize: TabTriggerSize =
    size === 'compact' ? 'compact' : size === 'small' ? 'small' : 'default';
  const hintTriggerPaddingClassName =
    size === 'compact' ? 'px-2 py-1.5' : size === 'small' ? 'px-3 py-2.5' : 'px-4 py-3';

  if (isHintVariant) {
    return (
      <Tabs defaultValue="cards">
        <div className="space-y-4 rounded-[28px] bg-[#1b1b20] p-3">
          <TabList
            variant="segmented"
            size={size}
            className="grid-cols-2 border-white/10 bg-[#202026]"
          >
            <TabTrigger
              value="cards"
              size={triggerSize}
              className={`h-auto gap-0 flex-col items-start justify-start rounded-[20px] border-transparent text-left text-white data-[state=active]:border-[#7a4b2d] data-[state=active]:bg-[#5b3a27] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(170,102,56,0.24)] ${hintTriggerPaddingClassName}`}
            >
              <span className="flex items-center gap-2">
                <Layers2 className="h-4 w-4 text-white/90" />
                <span className="text-sm font-semibold text-white">Add Card</span>
              </span>
              <span className="mt-0.5 text-sm font-medium text-[#e4d2c5]">
                Browse every Home Assistant entity
              </span>
            </TabTrigger>
            <TabTrigger
              value="widgets"
              size={triggerSize}
              className={`h-auto gap-0 flex-col items-start justify-start rounded-[20px] border-transparent text-left text-white/90 ${hintTriggerPaddingClassName}`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-white/80" />
                <span className="text-sm font-semibold text-white/90">Add Custom Card</span>
              </span>
              <span className="mt-0.5 text-sm font-medium text-white/70">
                Create utility cards for dashboards
              </span>
            </TabTrigger>
          </TabList>

          <TabPanel value="cards">
            <Panel className="space-y-2">
              <Heading as="h4">Cards Library</Heading>
              <Text tone="muted">
                This variant matches the add-card dialog with icon, label, and hint content.
              </Text>
            </Panel>
          </TabPanel>
          <TabPanel value="widgets">
            <Panel className="space-y-2">
              <Heading as="h4">Custom Card Builder</Heading>
              <Text tone="muted">
                Use the segmented shell when tabs need richer supporting copy.
              </Text>
            </Panel>
          </TabPanel>
        </div>
      </Tabs>
    );
  }

  return (
    <Tabs defaultValue="appearance">
      <div className="space-y-4">
        <TabList variant="compact" size={size}>
          <TabTrigger value="appearance" size={triggerSize}>
            {isIconVariant ? (
              <span className="inline-flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </span>
            ) : (
              'Appearance'
            )}
          </TabTrigger>
          <TabTrigger value="localization" size={triggerSize}>
            {isIconVariant ? (
              <span className="inline-flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Localization
              </span>
            ) : (
              'Localization'
            )}
          </TabTrigger>
          <TabTrigger value="interaction" size={triggerSize}>
            {isIconVariant ? (
              <span className="inline-flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Interaction
              </span>
            ) : (
              'Interaction'
            )}
          </TabTrigger>
        </TabList>

        <TabPanel value="appearance">
          <Panel className="space-y-2">
            <Heading as="h4">Appearance</Heading>
            <Text tone="muted">Tune the card chrome, accents, and wallpaper.</Text>
          </Panel>
        </TabPanel>
        <TabPanel value="localization">
          <Panel className="space-y-2">
            <Heading as="h4">Localization</Heading>
            <Text tone="muted">Set language, time format, and temperature units.</Text>
          </Panel>
        </TabPanel>
        <TabPanel value="interaction">
          <Panel className="space-y-2">
            <Heading as="h4">Interaction</Heading>
            <Text tone="muted">Choose how tap targets and device controls behave.</Text>
          </Panel>
        </TabPanel>
      </div>
    </Tabs>
  );
}

const meta = {
  title: 'Components/Primitives/Tabs',
  component: TabsPlayground,
  tags: ['autodocs'],
  args: {
    variant: 'default',
    size: 'default',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'with icons', 'with icon and hints'],
    },
    size: {
      control: 'select',
      options: ['default', 'small', 'compact'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Shared tabs primitive styled to match Navet settings tabs and the add-card segmented control. `Small` is the tighter option, while `compact` is the most minimal footprint.',
      },
    },
  },
} satisfies Meta<typeof TabsPlayground>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
  },
};

export const WithIcons: Story = {
  args: {
    variant: 'with icons',
    size: 'default',
  },
};

export const WithIconAndHints: Story = {
  args: {
    variant: 'with icon and hints',
    size: 'default',
  },
};
