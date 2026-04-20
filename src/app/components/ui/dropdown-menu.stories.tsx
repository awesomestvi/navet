import type { Meta, StoryObj } from '@storybook/react';
import { LogOut, Moon, Palette, Settings, Sun } from 'lucide-react';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

function DropdownMenuStory() {
  return (
    <div className="flex items-center justify-center p-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <InteractivePill active intent="action">
            Open menu
          </InteractivePill>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={8} className="overflow-visible">
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Sun className="mr-2 h-4 w-4" />
            Light mode
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Moon className="mr-2 h-4 w-4" />
            Dark mode
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Dropdown Menu',
  component: DropdownMenuStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Radix DropdownMenu wrapper used by header actions and overflow menus.',
          '',
          'What this base story covers:',
          '- Trigger, grouped items, separators, and icon+label row layout.',
          '- Theme-aware menu chrome with semantic surface tokens.',
          '- Highlight/focus styling that follows accent-driven hover tokens.',
          '',
          'Usage notes:',
          '- Keep menu item labels short and action-specific.',
          '- Group related actions and use separators only for meaningful boundaries.',
          '',
          'Review expectations:',
          '- Verify keyboard navigation and focus-highlight behavior.',
          '- Verify hover and highlight states remain readable across all themes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof DropdownMenuStory>;

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

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
