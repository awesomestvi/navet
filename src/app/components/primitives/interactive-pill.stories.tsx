import type { Meta, StoryObj } from '@storybook/react';
import { Circle, Droplets, Moon, Palette, Sliders, Star, Sun } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { InteractivePill } from './interactive-pill';

function InteractiveGroupedRowStory(args: ComponentProps<typeof InteractivePill>) {
  const [selectedTheme, setSelectedTheme] = useState('Dark');
  const [selectedLanguage, setSelectedLanguage] = useState('Deutsch');

  const themeOptions = ['Liquid Glass', 'Dark', 'Light', 'Black'] as const;
  const languageOptions = ['English', 'Svenska', 'Deutsch', 'Francais'] as const;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-current/70">Theme mode</p>
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((option) => (
            <InteractivePill
              key={option}
              {...args}
              active={selectedTheme === option}
              onClick={() => setSelectedTheme(option)}
            >
              {option}
            </InteractivePill>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-current/70">Language</p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((option) => (
            <InteractivePill
              key={option}
              {...args}
              active={selectedLanguage === option}
              onClick={() => setSelectedLanguage(option)}
            >
              {option}
            </InteractivePill>
          ))}
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Interactive Pill',
  component: InteractivePill,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Canonical selectable pill primitive for Navet.',
          '',
          'This is the standard pill language used by the current Settings `Theme mode` selector and the rest of the updated selection rows across the app.',
          '',
          'What makes this the standard:',
          '- Theme-aware idle and active states come from the same token system used by the shared appearance picker.',
          '- The active treatment is intentionally subtle: accented border plus tinted fill instead of a flat solid button treatment.',
          '- The primitive is designed to live inside grouped rows or compact pill clusters, not as a heavy segmented control.',
          '',
          'Usage guidance:',
          '- Use for compact choices such as theme mode, language, time format, temperature unit, and similar binary or short-option selections.',
          '- Use `active` to mark the selected value.',
          '- Keep labels short so the row stays readable and balanced.',
          '',
          'Review expectations:',
          '- Check idle borders in light mode.',
          '- Check active pills in glass, dark, light, and black themes.',
          '- Prefer this primitive over inventing one-off pill styles in feature code.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: 'English',
    active: false,
    intent: 'navigation',
    size: 'default',
    variant: 'default',
  },
  argTypes: {
    onClick: { action: 'clicked' },
    size: {
      control: 'select',
      options: ['default', 'small', 'compact'],
    },
  },
} satisfies Meta<typeof InteractivePill>;

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

export const GroupedRow: Story = {
  render: (args) => <InteractiveGroupedRowStory {...args} />,
};

function InteractiveGroupedRowWithIconsStory(args: ComponentProps<typeof InteractivePill>) {
  const [selectedTheme, setSelectedTheme] = useState('Dark');
  const [selectedTab, setSelectedTab] = useState('controls');

  const themeOptions = [
    { label: 'Liquid Glass', value: 'Liquid Glass', icon: Droplets },
    { label: 'Dark', value: 'Dark', icon: Moon },
    { label: 'Light', value: 'Light', icon: Sun },
    { label: 'Black', value: 'Black', icon: Circle },
  ] as const;

  const tabOptions = [
    { label: 'Controls', value: 'controls', icon: Sliders },
    { label: 'Card', value: 'card', icon: Palette },
    { label: 'Presets', value: 'presets', icon: Star },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium text-current/70">Theme mode (default size)</p>
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((option) => (
            <InteractivePill
              key={option.value}
              {...args}
              icon={option.icon}
              active={selectedTheme === option.value}
              onClick={() => setSelectedTheme(option.value)}
            >
              {option.label}
            </InteractivePill>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-current/70">Tab bar (compact size)</p>
        <div className="flex flex-wrap gap-2">
          {tabOptions.map((option) => (
            <InteractivePill
              key={option.value}
              {...args}
              size="compact"
              icon={option.icon}
              active={selectedTab === option.value}
              onClick={() => setSelectedTab(option.value)}
            >
              {option.label}
            </InteractivePill>
          ))}
        </div>
      </div>
    </div>
  );
}

export const GroupedRowWithIcons: Story = {
  render: (args) => <InteractiveGroupedRowWithIconsStory {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Grouped rows using the `icon` prop. `default`, `small`, and `compact` now form a clear density ladder, with `compact` tightening both icon size and horizontal spacing.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <InteractivePill size="compact" active>
          Compact
        </InteractivePill>
        <InteractivePill size="small" active>
          Small
        </InteractivePill>
        <InteractivePill size="default" active>
          Default
        </InteractivePill>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <InteractivePill size="compact" icon={Sliders} active>
          Controls
        </InteractivePill>
        <InteractivePill size="small" icon={Palette} active>
          Theme
        </InteractivePill>
        <InteractivePill size="default" icon={Star} active>
          Presets
        </InteractivePill>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Direct size comparison for text-only and icon pills so dense layouts can be checked quickly in Storybook.',
      },
    },
  },
};

export const GhostRow: Story = {
  args: {
    variant: 'ghost',
  },
  render: (args) => <InteractiveGroupedRowStory {...args} />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
