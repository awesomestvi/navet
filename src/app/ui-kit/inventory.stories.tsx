import type { Meta, StoryObj } from '@storybook/react';

const inventory = [
  {
    group: 'Primitives',
    description: 'Stable low-level UI exported from `@/app/ui-kit/primitives`.',
    entries: [
      ['Badge', '@/app/ui-kit/primitives', 'status labels and compact metadata'],
      ['BaseCard', '@/app/ui-kit/primitives', 'base entity/custom-card surface'],
      ['BodyText', '@/app/ui-kit/primitives', 'compact readable text'],
      ['Button', '@/app/ui-kit/primitives'],
      ['CardMetric', '@/app/ui-kit/primitives', 'metric labels and values'],
      ['CardMetricActionLayout', '@/app/ui-kit/primitives', 'metric/action card composition'],
      ['CardSettingsDialog', '@/app/ui-kit/primitives'],
      ['CardSettingsDialogWithState', '@/app/ui-kit/primitives'],
      ['CardShell', '@/app/ui-kit/primitives'],
      ['Checkbox', '@/app/ui-kit/primitives'],
      ['ColorInputSwatch', '@/app/ui-kit/primitives'],
      ['Combobox', '@/app/ui-kit/primitives'],
      ['CustomDialogDoneButton', '@/app/ui-kit/primitives'],
      ['customCardDialogShellProps', '@/app/ui-kit/primitives'],
      ['DialogDoneButton', '@/app/ui-kit/primitives'],
      ['DialogDoneFooter', '@/app/ui-kit/primitives'],
      ['DialogFooter', '@/app/ui-kit/primitives'],
      ['DialogShell', '@/app/ui-kit/primitives', 'shared dialog shell helpers'],
      ['EntityCardHeader', '@/app/ui-kit/primitives'],
      ['EntityCardHeaderIcon', '@/app/ui-kit/primitives'],
      ['EntityCardTitleBlock', '@/app/ui-kit/primitives'],
      ['Heading', '@/app/ui-kit/primitives'],
      ['IconButton', '@/app/ui-kit/primitives'],
      ['Input', '@/app/ui-kit/primitives'],
      ['InteractivePill', '@/app/ui-kit/primitives'],
      ['Link', '@/app/ui-kit/primitives'],
      ['LoadingSpinner', '@/app/ui-kit/primitives'],
      ['MessageBar', '@/app/ui-kit/primitives'],
      ['ModalSurface', '@/app/ui-kit/primitives'],
      ['Panel', '@/app/ui-kit/primitives'],
      ['Radio', '@/app/ui-kit/primitives'],
      ['RoomEyebrow', '@/app/ui-kit/primitives'],
      ['RotaryKnob', '@/app/ui-kit/primitives'],
      ['RoundControlButton', '@/app/ui-kit/primitives'],
      ['Select', '@/app/ui-kit/primitives'],
      ['SheetSurface', '@/app/ui-kit/primitives'],
      ['SlideAction', '@/app/ui-kit/primitives'],
      ['Slider', '@/app/ui-kit/primitives'],
      ['Stepper', '@/app/ui-kit/primitives'],
      ['SurfacePanel', '@/app/ui-kit/primitives'],
      ['Switch', '@/app/ui-kit/primitives'],
      ['SettingsDialogDoneButton', '@/app/ui-kit/primitives'],
      ['settingsDialogContentClass', '@/app/ui-kit/primitives'],
      ['Tabs', '@/app/ui-kit/primitives'],
      ['TabList', '@/app/ui-kit/primitives'],
      ['TabPanel', '@/app/ui-kit/primitives'],
      ['TabTrigger', '@/app/ui-kit/primitives'],
      ['Tag', '@/app/ui-kit/primitives'],
      ['Text', '@/app/ui-kit/primitives'],
      ['Textarea', '@/app/ui-kit/primitives'],
      ['Tooltip', '@/app/ui-kit/primitives'],
    ],
  },
  {
    group: 'Patterns',
    description: 'Reusable compositions exported from `@/app/ui-kit/patterns`.',
    entries: [
      ['CardActionRow', '@/app/ui-kit/patterns', 'compact card actions'],
      ['CardDialogBody', '@/app/ui-kit/patterns', 'entity/custom-card dialog body'],
      ['CardDialogChoicePill', '@/app/ui-kit/patterns'],
      ['CardDialogDoneFooter', '@/app/ui-kit/patterns'],
      ['CardDialogFooter', '@/app/ui-kit/patterns'],
      ['CardDialogHeader', '@/app/ui-kit/patterns'],
      ['CardDialogSection', '@/app/ui-kit/patterns'],
      ['CardDialogTabList', '@/app/ui-kit/patterns'],
      ['CardDialogTabTrigger', '@/app/ui-kit/patterns'],
      ['CardEmptyState', '@/app/ui-kit/patterns', 'compact card fallback'],
      ['DashboardEmptyState', '@/app/ui-kit/patterns'],
      ['DashboardHeroSection', '@/app/ui-kit/patterns'],
      ['FieldBlock', '@/app/ui-kit/patterns'],
      ['InteractionPreviewCard', '@/app/ui-kit/patterns'],
      ['SectionCard', '@/app/ui-kit/patterns'],
      ['SelectableCheckboxRow', '@/app/ui-kit/patterns'],
      ['SettingsLivePreviewFrame', '@/app/ui-kit/patterns'],
      ['TableCellContent', '@/app/ui-kit/patterns'],
    ],
  },
  {
    group: 'Tokens',
    description:
      'Theme, motion, density, layout, and surface helpers exported from `@/app/ui-kit/tokens`.',
    entries: [
      ['getAccentCardShellTokens', '@/app/ui-kit/tokens'],
      ['getBaseCardGapClassName', '@/app/ui-kit/tokens'],
      ['getBaseCardRadiusClassName', '@/app/ui-kit/tokens'],
      ['getButtonSizeTokens', '@/app/ui-kit/tokens'],
      ['getCardShellSurfaceTokens', '@/app/ui-kit/tokens'],
      ['getCardStateSurfaceTokens', '@/app/ui-kit/tokens'],
      ['getControlFocusStyles', '@/app/ui-kit/tokens'],
      ['getDialogHeightClassName', '@/app/ui-kit/tokens'],
      ['getDialogMaxWidthClassName', '@/app/ui-kit/tokens'],
      ['getEntityIconPillStyles', '@/app/ui-kit/tokens'],
      ['getInputSizeTokens', '@/app/ui-kit/tokens'],
      ['getInteractivePillStyles', '@/app/ui-kit/tokens'],
      ['getNavetMotionProfile', '@/app/ui-kit/tokens'],
      ['getNavetMotionProfileName', '@/app/ui-kit/tokens'],
      ['getRoundControlStyles', '@/app/ui-kit/tokens'],
      ['getThemeColorValue', '@/app/ui-kit/tokens'],
      ['getThemeFocusRingClassName', '@/app/ui-kit/tokens'],
      ['getThemeSurfaceTokens', '@/app/ui-kit/tokens'],
      ['getUiKitGlassSheetGlowClassName', '@/app/ui-kit/tokens'],
      ['getUiKitModalContentClassName', '@/app/ui-kit/tokens'],
      ['getUiKitPanelSurfaceClassName', '@/app/ui-kit/tokens'],
      ['getUiKitSheetContentClassName', '@/app/ui-kit/tokens'],
      ['getUiKitSheetOverlayClassName', '@/app/ui-kit/tokens'],
      ['navetAccessibilityTokens', '@/app/ui-kit/tokens'],
      ['navetControlTokens', '@/app/ui-kit/tokens'],
      ['navetDensityTokens', '@/app/ui-kit/tokens'],
      ['navetFocusTokens', '@/app/ui-kit/tokens'],
      ['navetFoundationMetaTokens', '@/app/ui-kit/tokens'],
      ['navetIconSizeTokens', '@/app/ui-kit/tokens'],
      ['navetLayoutTokens', '@/app/ui-kit/tokens'],
      ['navetMotionTokens', '@/app/ui-kit/tokens'],
      ['navetRadiusTokens', '@/app/ui-kit/tokens'],
      ['navetSemanticColorTokens', '@/app/ui-kit/tokens'],
      ['navetSizeTokens', '@/app/ui-kit/tokens'],
      ['navetSpacingTokens', '@/app/ui-kit/tokens'],
      ['navetTypographyTokens', '@/app/ui-kit/tokens'],
      ['navetUiKitRadiusTokens', '@/app/ui-kit/tokens'],
      ['resolvePrimaryColorToken', '@/app/ui-kit/tokens'],
      ['resolvePrimaryColorValue', '@/app/ui-kit/tokens'],
      ['sanitizeCustomPrimaryColor', '@/app/ui-kit/tokens'],
    ],
  },
];

function InventoryStory() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {inventory.map((section) => (
        <section
          key={section.group}
          className="rounded-[28px] border border-white/10 bg-white/6 p-6"
        >
          <h2 className="text-xl font-semibold text-white">{section.group}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{section.description}</p>
          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/82">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Export</th>
                  <th className="px-4 py-3 font-semibold">Import path</th>
                  <th className="px-4 py-3 font-semibold">Use for</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {section.entries.map(([name, path, useFor = 'shared UI composition']) => (
                  <tr key={name}>
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{path}</td>
                    <td className="px-4 py-3 text-white/70">{useFor}</td>
                    <td className="px-4 py-3">Stable</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <h2 className="text-xl font-semibold text-white">Inventory rule</h2>
        <p className="mt-2 text-sm leading-6 text-white/78">
          This page tracks the stable UI-kit surface, not every implementation detail. If a new
          primitive or pattern is intended for cross-feature use, export it through
          `src/app/ui-kit/` and add it here in the same change.
        </p>
      </section>
    </div>
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
