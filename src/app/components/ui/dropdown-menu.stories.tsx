import type { Meta, StoryObj } from '@storybook/react';
import { LogOut, Moon, Palette, Settings, Sun } from 'lucide-react';
import type { CSSProperties } from 'react';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

function DropdownMenuStory() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const itemClassName = cn(
    'rounded-xl border border-transparent px-3 py-2 text-sm outline-none transition-colors',
    surface.textPrimary,
    'data-[highlighted]:bg-[var(--menu-hover-bg)] data-[highlighted]:border-[var(--menu-hover-border)]',
    'focus:bg-[var(--menu-hover-bg)] focus:border-[var(--menu-hover-border)]'
  );
  const itemHoverStyle = {
    '--menu-hover-bg':
      theme === 'light'
        ? `${accentColor}14`
        : theme === 'glass'
          ? `${accentColor}1a`
          : `${accentColor}20`,
    '--menu-hover-border':
      theme === 'light'
        ? `${accentColor}33`
        : theme === 'glass'
          ? `${accentColor}40`
          : `${accentColor}4d`,
  } as CSSProperties;

  return (
    <div className="flex items-center justify-center p-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <InteractivePill active intent="action">
            Open menu
          </InteractivePill>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          sideOffset={8}
          className={cn(getThemeDropdownSurfaceClasses(theme), 'overflow-visible p-2')}
        >
          <DropdownMenuItem className={itemClassName} style={itemHoverStyle}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClassName} style={itemHoverStyle}>
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={itemClassName} style={itemHoverStyle}>
            <Sun className="mr-2 h-4 w-4" />
            Light mode
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClassName} style={itemHoverStyle}>
            <Moon className="mr-2 h-4 w-4" />
            Dark mode
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={itemClassName} style={itemHoverStyle}>
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
