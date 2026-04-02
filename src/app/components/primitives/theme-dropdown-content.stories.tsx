import type { Meta, StoryObj } from '@storybook/react';
import { Check, Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useTheme } from '@/app/hooks';
import { InteractivePill } from './interactive-pill';
import { ThemeDropdownContent } from './theme-dropdown-content';

function ThemeAwareThemeDropdownContent() {
  const { theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InteractivePill active intent="navigation">
          Open menu
        </InteractivePill>
      </DropdownMenuTrigger>
      <ThemeDropdownContent theme={theme} align="start">
        <DropdownMenuItem className="rounded-xl px-3 py-2">
          <Sun className="h-4 w-4" />
          <span className="flex-1">Light</span>
          <Check className="h-4 w-4" />
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-xl px-3 py-2">
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
      </ThemeDropdownContent>
    </DropdownMenu>
  );
}

const meta = {
  title: 'Components/Primitives/Theme Dropdown Content',
  component: ThemeAwareThemeDropdownContent,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeAwareThemeDropdownContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
