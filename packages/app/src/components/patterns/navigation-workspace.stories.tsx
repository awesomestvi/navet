import { Input } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { useTheme } from '@navet/app/hooks';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ChevronRight,
  CircleUserRound,
  Languages,
  LayoutGrid,
  Palette,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { expect, within } from 'storybook/test';
import { NavigationWorkspace } from './navigation-workspace';

function MobileNavigationRow({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <NavigationWorkspace.Item active={false} accentColor="#f97316">
      <NavigationWorkspace.ItemButton data-testid="navigation-workspace-mobile-row">
        <NavigationWorkspace.ItemIcon>
          <Icon className={navetIconSizeTokens.sm} />
        </NavigationWorkspace.ItemIcon>
        <NavigationWorkspace.ItemText title={label} />
        <ChevronRight
          aria-hidden="true"
          className={`${navetIconSizeTokens.sm} ${surface.textMuted}`}
        />
      </NavigationWorkspace.ItemButton>
    </NavigationWorkspace.Item>
  );
}

function NavigationWorkspaceStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="min-h-[38rem] p-6">
      <NavigationWorkspace.Frame className="mx-auto h-[34rem] max-w-4xl">
        <NavigationWorkspace.Header className="px-5 py-4">
          <h1 className={navetTypographyTokens.pageHeading}>Navigation workspace</h1>
          <p className={`mt-1 ${navetTypographyTokens.body} ${surface.textSecondary}`}>
            A shared frame for sidebar-to-detail workflows.
          </p>
        </NavigationWorkspace.Header>
        <NavigationWorkspace.Body className="grid-cols-[16rem_minmax(0,1fr)]">
          <NavigationWorkspace.Sidebar className="p-4">
            <Input
              type="search"
              size="small"
              aria-label="Search destinations"
              placeholder="Search destinations"
              leading={<Search aria-hidden="true" className={navetIconSizeTokens.sm} />}
            />
            <nav aria-label="Example destinations" className="mt-4 grid gap-1">
              <NavigationWorkspace.Item active accentColor="#f97316">
                <NavigationWorkspace.ItemButton aria-current="page">
                  <NavigationWorkspace.ItemIcon>
                    <SlidersHorizontal className={navetIconSizeTokens.sm} />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText title="Overview" description="General controls" />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
              <NavigationWorkspace.Item active={false} accentColor="#f97316">
                <NavigationWorkspace.ItemButton>
                  <NavigationWorkspace.ItemIcon>
                    <CircleUserRound className={navetIconSizeTokens.sm} />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText title="Details" description="More information" />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
            </nav>
          </NavigationWorkspace.Sidebar>
          <NavigationWorkspace.Content>
            <NavigationWorkspace.ScrollArea className="p-6">
              <h2 className={navetTypographyTokens.sectionHeading}>Overview</h2>
              <p className={`mt-2 ${navetTypographyTokens.body} ${surface.textSecondary}`}>
                Detail content owns its own scroll region while the navigation remains in context.
              </p>
            </NavigationWorkspace.ScrollArea>
          </NavigationWorkspace.Content>
        </NavigationWorkspace.Body>
      </NavigationWorkspace.Frame>
    </div>
  );
}

function MobileGroupedNavigationWorkspaceStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="min-h-[38rem] p-5">
      <NavigationWorkspace.Frame className="mx-auto max-w-sm">
        <NavigationWorkspace.Header className="px-5 py-4">
          <h1 className={`${navetTypographyTokens.pageHeading} ${surface.textPrimary}`}>
            Settings
          </h1>
        </NavigationWorkspace.Header>
        <div className="p-3">
          <Input
            type="search"
            size="small"
            aria-label="Search destinations"
            placeholder="Search destinations"
            leading={<Search aria-hidden="true" className={navetIconSizeTokens.sm} />}
          />
          <nav aria-label="Grouped destinations" className="mt-4 grid gap-5">
            <NavigationWorkspace.Group>
              <MobileNavigationRow icon={Palette} label="Appearance" />
              <NavigationWorkspace.Separator />
              <MobileNavigationRow icon={Languages} label="Localization" />
              <NavigationWorkspace.Separator />
              <MobileNavigationRow icon={CircleUserRound} label="Interaction" />
            </NavigationWorkspace.Group>

            <section aria-labelledby="mobile-dashboard-group">
              <h2
                id="mobile-dashboard-group"
                className={`${navetTypographyTokens.caption} mb-2 px-2 font-semibold ${surface.textMuted}`}
              >
                Dashboard
              </h2>
              <NavigationWorkspace.Group>
                <MobileNavigationRow icon={LayoutGrid} label="Dashboard" />
              </NavigationWorkspace.Group>
            </section>
          </nav>
        </div>
      </NavigationWorkspace.Frame>
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Navigation Workspace',
  component: NavigationWorkspaceStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NavigationWorkspaceStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MobileGrouped: Story = {
  render: () => <MobileGroupedNavigationWorkspaceStory />,
  globals: { viewport: { value: 'iphone14', isRotated: false } },
  parameters: {
    docs: {
      description: {
        story:
          'The mobile composition uses equal-height Navet rows inside iOS-inspired grouped surfaces, with label-aligned separators and a compact single-row group.',
      },
    },
    viewport: { defaultViewport: 'iphone14' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = canvas.getAllByTestId('navigation-workspace-mobile-row');
    const rowHeights = rows.map((row) => row.getBoundingClientRect().height);

    await expect(rows).toHaveLength(4);
    await expect(rowHeights.every((height) => height === rowHeights[0])).toBe(true);
    await expect(
      canvasElement.querySelectorAll('[data-navigation-workspace-separator]')
    ).toHaveLength(2);
  },
};
