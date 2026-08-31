import { WorkbenchIntro, WorkbenchPage, WorkbenchPanel } from '@navet/app/storybook/workbench-docs';
import * as patterns from '@navet/app/ui-kit/patterns';
import * as primitives from '@navet/app/ui-kit/primitives';
import * as tokens from '@navet/app/ui-kit/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';

type InventoryEntry = readonly [name: string, path: string, useFor?: string];

const exportDescriptions: Record<string, string> = {
  Badge: 'status labels and compact metadata',
  BaseCard: 'base entity/custom-card surface',
  BaseCardDialog: 'shared entity/custom-card dialog shell',
  BaseCardDialogWithState: 'dialog shell with local tab/state helpers',
  BodyText: 'compact readable text',
  CardActionRow: 'compact card actions',
  CardDialogBody: 'entity/custom-card dialog body',
  CardEmptyState: 'compact card fallback',
  CardMetric: 'metric labels and values',
  CardMetricActionLayout: 'metric/action card composition',
  CardShell: 'shared card chrome and surface wrapper',
  ColorInputSwatch: 'theme-aware color preview and selection trigger',
  Combobox: 'searchable single-select field',
  DashboardEmptyState: 'dashboard-level zero-state composition',
  DashboardHeroSection: 'introductory layout for setup, editing, and other orientation-heavy flows',
  FieldBlock: 'form field label, helper, and content wrapper',
  getAccentCardShellTokens: 'accent-aware card shell treatment',
  getCardShellSurfaceTokens: 'card shell surface recipe selection',
  getCardStateSurfaceTokens: 'semantic card state surfaces',
  getControlFocusStyles: 'shared focus treatment helpers',
  getEntityIconPillStyles: 'entity icon chip styling tokens',
  getInteractivePillStyles: 'pill treatment for active/inactive states',
  getNavetMotionProfile: 'resolved motion profile by mode',
  getNavetMotionProfileName: 'motion profile naming helper',
  getPortalActionDockAnchorRect: 'positioning helper for floating action docks',
  getRoundControlStyles: 'round action button treatment',
  getThemeColorValue: 'theme token value resolution',
  getThemeFocusRingClassName: 'theme-aware focus ring class',
  getThemeSurfaceTokens: 'theme surface recipes for panels and text',
  getUiKitGlassSheetGlowClassName: 'glass-sheet accent glow helper',
  getUiKitGlassWorkspaceGlowClassName: 'glass workspace specular highlight helper',
  getUiKitModalContentClassName: 'modal surface class composition',
  getUiKitPanelSurfaceClassName: 'panel surface class composition',
  getUiKitSheetContentClassName: 'sheet content class composition',
  getUiKitSheetOverlayClassName: 'sheet overlay class composition',
  Heading: 'section and card heading text',
  Input: 'text input control',
  InteractionPreviewCard: 'preview card for settings and interactions',
  InteractivePill: 'compact segmented/action pill',
  Link: 'themed inline or standalone link',
  LoadingSpinner: 'compact loading state indicator',
  MessageBar: 'inline feedback and notice surface',
  ModalSurface: 'shared modal framing surface',
  OverlayScrollArea: 'scroll container with overlay chrome',
  Panel: 'generic content panel surface',
  PortalActionDock: 'floating action dock for contextual controls',
  RoomEyebrow: 'compact location/room label',
  RotaryKnob: 'dial-style numeric adjustment control',
  RoundControlButton: 'round single-action control',
  SectionCard: 'section-level content grouping shell',
  SelectableCheckboxRow: 'row selection with integrated checkbox affordance',
  SettingsLivePreviewFrame: 'framed live preview layout',
  SheetSurface: 'shared sheet framing surface',
  SheetSurfaceHeader: 'sheet header composition',
  SlideAction: 'gesture-driven reveal action row',
  SurfacePanel: 'variant panel wrapper for cards and dialogs',
  TableCellContent: 'dense table cell text and metadata layout',
};

function toInventoryEntries(
  moduleExports: Record<string, unknown>,
  path: string
): InventoryEntry[] {
  return Object.keys(moduleExports)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => [name, path, exportDescriptions[name] ?? 'shared UI composition'] as const);
}

const inventory = [
  {
    group: 'Primitives',
    description: 'Stable low-level UI exported from `/app/ui-kit/primitives`.',
    entries: toInventoryEntries(primitives, '@navet/app/ui-kit/primitives'),
  },
  {
    group: 'Patterns',
    description: 'Reusable compositions exported from `/app/ui-kit/patterns`.',
    entries: toInventoryEntries(patterns, '@navet/app/ui-kit/patterns'),
  },
  {
    group: 'Tokens',
    description:
      'Theme, motion, density, layout, and surface helpers exported from `/app/ui-kit/tokens`.',
    entries: toInventoryEntries(tokens, '@navet/app/ui-kit/tokens'),
  },
];

function InventoryStory() {
  return (
    <WorkbenchPage>
      <WorkbenchIntro eyebrow="Shared UI inventory" title="Know what is stable before you compose">
        <p>
          Browse the public primitives, patterns, and token helpers that feature work can depend on.
          This is an authoring map, not a list of every internal implementation detail.
        </p>
      </WorkbenchIntro>
      {inventory.map((section) => (
        <WorkbenchPanel key={section.group} title={section.group} summary={section.description}>
          <div className="overflow-x-auto rounded-[16px] border border-current/10">
            <table className="min-w-full divide-y divide-current/10 text-left text-sm">
              <thead className="bg-current/5 opacity-75">
                <tr>
                  <th className="px-4 py-3 font-semibold">Export</th>
                  <th className="px-4 py-3 font-semibold">Import path</th>
                  <th className="px-4 py-3 font-semibold">Use for</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                {section.entries.map(([name, path, useFor = 'shared UI composition']) => (
                  <tr key={name}>
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{path}</td>
                    <td className="px-4 py-3 opacity-75">{useFor}</td>
                    <td className="px-4 py-3">Stable</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkbenchPanel>
      ))}
      <WorkbenchPanel title="Inventory rule">
        <p className="text-sm leading-6">
          This page tracks the stable UI-kit surface, not every implementation detail. If a new
          primitive or pattern is intended for cross-feature use, export it through
          `packages/app/src/ui-kit/` and add it here in the same change.
        </p>
      </WorkbenchPanel>
    </WorkbenchPage>
  );
}

const meta = {
  title: 'Concepts/UI Kit Inventory',
  component: InventoryStory,
  tags: ['autodocs'],
} satisfies Meta<typeof InventoryStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Inventory: Story = {};
