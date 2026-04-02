import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Meta, StoryObj } from '@storybook/react';
import { ChevronDown, Monitor, Palette, Sparkles } from 'lucide-react';
import { useTheme } from '@/app/hooks';
import { ThemeDropdownContent } from './theme-dropdown-content';

function ThemeDropdownContentStory() {
  const { theme } = useTheme();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm text-white backdrop-blur-xl"
        >
          <Palette className="h-4 w-4" />
          Open themed menu
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <ThemeDropdownContent theme={theme} align="start">
        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-white/10">
          <Monitor className="h-4 w-4" />
          System
        </DropdownMenu.Item>
        <DropdownMenu.Item className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-white/10">
          <Palette className="h-4 w-4" />
          Glass
        </DropdownMenu.Item>
        <DropdownMenu.Item className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-white/10">
          <Sparkles className="h-4 w-4" />
          Accent presets
        </DropdownMenu.Item>
      </ThemeDropdownContent>
    </DropdownMenu.Root>
  );
}

const meta = {
  title: 'Components/Primitives/Theme Dropdown Content',
  component: ThemeDropdownContentStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theme-aware dropdown content wrapper for Radix menus. Keeps surface styling and spacing consistent without leaking app-specific menu structure into the primitive.',
      },
    },
  },
} satisfies Meta<typeof ThemeDropdownContentStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
