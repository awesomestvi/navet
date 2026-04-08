import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '@/app/components/layout/sidebar';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';

function SidebarStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={`min-h-screen ${surface.appBg}`}>
      <Sidebar />
      <div className="pl-16 md:pl-16">
        <div className="min-h-screen px-8 py-8">
          <div
            className={`mx-auto max-w-5xl rounded-[32px] border p-8 ${surface.panel} ${surface.border}`}
          >
            <div className="space-y-3">
              <p className={`text-xs uppercase tracking-[0.22em] ${surface.textMuted}`}>Preview</p>
              <h1 className={`text-2xl font-semibold ${surface.textPrimary}`}>Dashboard shell</h1>
              <p className={`max-w-2xl text-sm ${surface.textSecondary}`}>
                Sidebar navigation should feel like a stable app shell control, not a generic
                picker.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'App Shell/Navigation/Sidebar',
  component: SidebarStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Primary app sidebar and mobile bottom navigation for section switching.',
      },
    },
  },
} satisfies Meta<typeof SidebarStory>;

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
