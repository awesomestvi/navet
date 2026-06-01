import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { Settings2, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { PortalActionDock } from './portal-action-dock';

function PortalActionDockStory() {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-10">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div className="text-sm font-medium text-white/72">Dashboard card anchor</div>
        <div className="mt-2 text-2xl font-semibold text-white">Living room lights</div>
        <div className="mt-3 text-sm text-white/58">
          Preview of the floating action dock used for compact card editing controls.
        </div>
      </div>
      {open ? (
        <PortalActionDock
          accentColor="#f97316"
          anchorRect={{ top: 260, left: 0, width: 420, height: 180 }}
          onClose={() => setOpen(false)}
          subtitle="Lights"
          title="Living room lights"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { key: 'size', label: 'Size', icon: SlidersHorizontal },
              { key: 'settings', label: 'Settings', icon: Settings2 },
              { key: 'remove', label: 'Remove', icon: X },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  className="flex h-11 min-w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 px-3 text-white transition-colors hover:bg-white/12"
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{item.label}</span>
                </button>
              );
            })}
          </div>
        </PortalActionDock>
      ) : null}
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Portal Action Dock',
  component: PortalActionDock,
  tags: ['autodocs'],
  render: () => <PortalActionDockStory />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: getStoryDocsDescription('Components/Patterns/Portal Action Dock'),
      },
    },
  },
} satisfies Meta<typeof PortalActionDock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    accentColor: '#f97316',
    anchorRect: { top: 260, left: 0, width: 420, height: 180 },
    children: null,
    onClose: () => undefined,
    subtitle: 'Lights',
    title: 'Living room lights',
  },
};
