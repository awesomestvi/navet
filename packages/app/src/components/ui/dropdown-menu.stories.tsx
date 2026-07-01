import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Bell,
  Check,
  ChevronRight,
  Grid2x2,
  Layers3,
  LogOut,
  Moon,
  Palette,
  Settings,
  Shield,
  Sun,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

function DropdownMenuStory() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [themeMode, setThemeMode] = useState('dark');

  return (
    <div className="flex items-center justify-center p-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <InteractivePill active intent="action">
            Open menu
          </InteractivePill>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={8} className="w-72 overflow-visible">
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
              <DropdownMenuShortcut>G then S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              <DropdownMenuShortcut>7</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" />
              Appearance
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-60">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={themeMode} onValueChange={setThemeMode}>
                <DropdownMenuRadioItem value="light">
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={reduceMotion}
                onCheckedChange={(checked) => setReduceMotion(checked === true)}
              >
                Reduce motion
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MegaMenuStory() {
  return (
    <div className="flex items-center justify-center p-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <InteractivePill active intent="navigation">
            Open mega menu
          </InteractivePill>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={10} className="w-[42rem] max-w-[calc(100vw-2rem)] p-3">
          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[20px] border border-white/10 bg-white/4 p-3">
              <DropdownMenuLabel className="px-0 pt-0">Quick actions</DropdownMenuLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    icon: Grid2x2,
                    title: 'Dashboard layouts',
                    body: 'Manage rooms, sections, and the home overview grid.',
                  },
                  {
                    icon: Zap,
                    title: 'Energy widgets',
                    body: 'Tune charts, live flow, and current usage summaries.',
                  },
                  {
                    icon: Shield,
                    title: 'Security views',
                    body: 'Open cameras, alarms, and lock controls from one place.',
                  },
                  {
                    icon: Layers3,
                    title: 'Theme surfaces',
                    body: 'Review shared surface tokens before adjusting card chrome.',
                  },
                ].map((entry) => {
                  const Icon = entry.icon;

                  return (
                    <DropdownMenuItem
                      key={entry.title}
                      className="min-h-28 items-start rounded-2xl px-4 py-3"
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/8 p-2.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.title}</span>
                            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                          </div>
                          <p className="mt-1 text-xs leading-5 opacity-75">{entry.body}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[20px] border border-white/10 bg-white/4 p-3">
              <DropdownMenuLabel className="px-0 pt-0">Recent changes</DropdownMenuLabel>
              <DropdownMenuGroup className="space-y-1">
                <DropdownMenuItem className="items-start px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium">Storybook inventory synced</span>
                    </div>
                    <p className="mt-1 pl-6 text-xs leading-5 opacity-75">
                      UI-kit exports now drive the aggregate inventory page.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="items-start px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium">Toast coverage restored</span>
                    </div>
                    <p className="mt-1 pl-6 text-xs leading-5 opacity-75">
                      Transient feedback states are back in the primitive review surface.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="items-start px-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium">Dialog docs aligned</span>
                    </div>
                    <p className="mt-1 pl-6 text-xs leading-5 opacity-75">
                      Shared docs copy now resolves against current public story titles.
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </section>
          </div>
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
          'Radix DropdownMenu wrapper used for compact action menus and wider mega-menu style surfaces.',
          '',
          'What this base story covers:',
          '- Standard item, submenu, radio, checkbox, separator, and shortcut behavior.',
          '- Wider layout support for grouped “mega menu” content without leaving the shared menu primitive.',
          '',
          'Usage notes:',
          '- Use the compact variant for short action lists and overflow menus.',
          '- Use the wider variant when the content is still menu-like but needs grouped destinations or richer summaries.',
          '',
          'Review expectations:',
          '- Verify keyboard navigation, focus treatment, and submenu behavior.',
          '- Verify wider menu layouts still feel like a menu rather than a floating page fragment.',
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

export const MegaMenu: Story = {
  render: () => <MegaMenuStory />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
