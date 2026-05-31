import type { Meta, StoryObj } from '@storybook/react';

const inventory = [
  {
    group: 'Primitives',
    description: 'Stable low-level UI exported from `/app/ui-kit/primitives`.',
    entries: [
      ['Badge', '@navet/app/ui-kit/primitives', 'status labels and compact metadata'],
      ['BaseCard', '@navet/app/ui-kit/primitives', 'base entity/custom-card surface'],
      ['BodyText', '@navet/app/ui-kit/primitives', 'compact readable text'],
      ['Button', '@navet/app/ui-kit/primitives'],
      ['CardMetric', '@navet/app/ui-kit/primitives', 'metric labels and values'],
      ['CardMetricActionLayout', '@navet/app/ui-kit/primitives', 'metric/action card composition'],
      ['CardSettingsDialog', '@navet/app/ui-kit/primitives'],
      ['CardSettingsDialogWithState', '@navet/app/ui-kit/primitives'],
      ['CardShell', '@navet/app/ui-kit/primitives'],
      ['Checkbox', '@navet/app/ui-kit/primitives'],
      ['ColorInputSwatch', '@navet/app/ui-kit/primitives'],
      ['Combobox', '@navet/app/ui-kit/primitives'],
      ['CustomDialogDoneButton', '@navet/app/ui-kit/primitives'],
      ['customCardDialogShellProps', '@navet/app/ui-kit/primitives'],
      ['DialogDoneButton', '@navet/app/ui-kit/primitives'],
      ['DialogDoneFooter', '@navet/app/ui-kit/primitives'],
      ['DialogFooter', '@navet/app/ui-kit/primitives'],
      ['DialogShell', '@navet/app/ui-kit/primitives', 'shared dialog shell helpers'],
      ['EntityCardHeader', '@navet/app/ui-kit/primitives'],
      ['EntityCardHeaderIcon', '@navet/app/ui-kit/primitives'],
      ['EntityCardTitleBlock', '@navet/app/ui-kit/primitives'],
      ['Heading', '@navet/app/ui-kit/primitives'],
      ['IconButton', '@navet/app/ui-kit/primitives'],
      ['Input', '@navet/app/ui-kit/primitives'],
      ['InteractivePill', '@navet/app/ui-kit/primitives'],
      ['Link', '@navet/app/ui-kit/primitives'],
      ['LoadingSpinner', '@navet/app/ui-kit/primitives'],
      ['MessageBar', '@navet/app/ui-kit/primitives'],
      ['ModalSurface', '@navet/app/ui-kit/primitives'],
      ['Panel', '@navet/app/ui-kit/primitives'],
      ['Radio', '@navet/app/ui-kit/primitives'],
      ['RoomEyebrow', '@navet/app/ui-kit/primitives'],
      ['RotaryKnob', '@navet/app/ui-kit/primitives'],
      ['RoundControlButton', '@navet/app/ui-kit/primitives'],
      ['Select', '@navet/app/ui-kit/primitives'],
      ['SheetSurface', '@navet/app/ui-kit/primitives'],
      ['SlideAction', '@navet/app/ui-kit/primitives'],
      ['Slider', '@navet/app/ui-kit/primitives'],
      ['Stepper', '@navet/app/ui-kit/primitives'],
      ['SurfacePanel', '@navet/app/ui-kit/primitives'],
      ['Switch', '@navet/app/ui-kit/primitives'],
      ['SettingsDialogDoneButton', '@navet/app/ui-kit/primitives'],
      ['settingsDialogContentClass', '@navet/app/ui-kit/primitives'],
      ['Tabs', '@navet/app/ui-kit/primitives'],
      ['TabList', '@navet/app/ui-kit/primitives'],
      ['TabPanel', '@navet/app/ui-kit/primitives'],
      ['TabTrigger', '@navet/app/ui-kit/primitives'],
      ['Tag', '@navet/app/ui-kit/primitives'],
      ['Text', '@navet/app/ui-kit/primitives'],
      ['Textarea', '@navet/app/ui-kit/primitives'],
      ['Tooltip', '@navet/app/ui-kit/primitives'],
    ],
  },
  {
    group: 'Patterns',
    description: 'Reusable compositions exported from `/app/ui-kit/patterns`.',
    entries: [
      ['CardActionRow', '@navet/app/ui-kit/patterns', 'compact card actions'],
      ['CardDialogBody', '@navet/app/ui-kit/patterns', 'entity/custom-card dialog body'],
      ['CardDialogChoicePill', '@navet/app/ui-kit/patterns'],
      ['CardDialogDoneFooter', '@navet/app/ui-kit/patterns'],
      ['CardDialogFooter', '@navet/app/ui-kit/patterns'],
      ['CardDialogHeader', '@navet/app/ui-kit/patterns'],
      ['CardDialogSection', '@navet/app/ui-kit/patterns'],
      ['CardDialogTabList', '@navet/app/ui-kit/patterns'],
      ['CardDialogTabTrigger', '@navet/app/ui-kit/patterns'],
      ['CardEmptyState', '@navet/app/ui-kit/patterns', 'compact card fallback'],
      ['DashboardEmptyState', '@navet/app/ui-kit/patterns'],
      ['DashboardHeroSection', '@navet/app/ui-kit/patterns'],
      ['FieldBlock', '@navet/app/ui-kit/patterns'],
      ['InteractionPreviewCard', '@navet/app/ui-kit/patterns'],
      ['SectionCard', '@navet/app/ui-kit/patterns'],
      ['SelectableCheckboxRow', '@navet/app/ui-kit/patterns'],
      ['SettingsLivePreviewFrame', '@navet/app/ui-kit/patterns'],
      ['TableCellContent', '@navet/app/ui-kit/patterns'],
    ],
  },
  {
    group: 'Tokens',
    description:
      'Theme, motion, density, layout, and surface helpers exported from `/app/ui-kit/tokens`.',
    entries: [
      ['getAccentCardShellTokens', '@navet/app/ui-kit/tokens'],
      ['getBaseCardGapClassName', '@navet/app/ui-kit/tokens'],
      ['getBaseCardRadiusClassName', '@navet/app/ui-kit/tokens'],
      ['getButtonSizeTokens', '@navet/app/ui-kit/tokens'],
      ['getCardShellSurfaceTokens', '@navet/app/ui-kit/tokens'],
      ['getCardStateSurfaceTokens', '@navet/app/ui-kit/tokens'],
      ['getControlFocusStyles', '@navet/app/ui-kit/tokens'],
      ['getDialogHeightClassName', '@navet/app/ui-kit/tokens'],
      ['getDialogMaxWidthClassName', '@navet/app/ui-kit/tokens'],
      ['getEntityIconPillStyles', '@navet/app/ui-kit/tokens'],
      ['getInputSizeTokens', '@navet/app/ui-kit/tokens'],
      ['getInteractivePillStyles', '@navet/app/ui-kit/tokens'],
      ['getNavetMotionProfile', '@navet/app/ui-kit/tokens'],
      ['getNavetMotionProfileName', '@navet/app/ui-kit/tokens'],
      ['getRoundControlStyles', '@navet/app/ui-kit/tokens'],
      ['getThemeColorValue', '@navet/app/ui-kit/tokens'],
      ['getThemeFocusRingClassName', '@navet/app/ui-kit/tokens'],
      ['getThemeSurfaceTokens', '@navet/app/ui-kit/tokens'],
      ['getUiKitGlassSheetGlowClassName', '@navet/app/ui-kit/tokens'],
      ['getUiKitModalContentClassName', '@navet/app/ui-kit/tokens'],
      ['getUiKitPanelSurfaceClassName', '@navet/app/ui-kit/tokens'],
      ['getUiKitSheetContentClassName', '@navet/app/ui-kit/tokens'],
      ['getUiKitSheetOverlayClassName', '@navet/app/ui-kit/tokens'],
      ['navetAccessibilityTokens', '@navet/app/ui-kit/tokens'],
      ['navetControlTokens', '@navet/app/ui-kit/tokens'],
      ['navetDensityTokens', '@navet/app/ui-kit/tokens'],
      ['navetFocusTokens', '@navet/app/ui-kit/tokens'],
      ['navetFoundationMetaTokens', '@navet/app/ui-kit/tokens'],
      ['navetIconSizeTokens', '@navet/app/ui-kit/tokens'],
      ['navetLayoutTokens', '@navet/app/ui-kit/tokens'],
      ['navetMotionTokens', '@navet/app/ui-kit/tokens'],
      ['navetRadiusTokens', '@navet/app/ui-kit/tokens'],
      ['navetSemanticColorTokens', '@navet/app/ui-kit/tokens'],
      ['navetSizeTokens', '@navet/app/ui-kit/tokens'],
      ['navetSpacingTokens', '@navet/app/ui-kit/tokens'],
      ['navetTypographyTokens', '@navet/app/ui-kit/tokens'],
      ['navetUiKitRadiusTokens', '@navet/app/ui-kit/tokens'],
      ['resolvePrimaryColorToken', '@navet/app/ui-kit/tokens'],
      ['resolvePrimaryColorValue', '@navet/app/ui-kit/tokens'],
      ['sanitizeCustomPrimaryColor', '@navet/app/ui-kit/tokens'],
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
          `packages/app/src/ui-kit/` and add it here in the same change.
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
