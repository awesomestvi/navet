import type { Meta, StoryObj } from '@storybook/react';

const inventory = [
  {
    group: 'Primitives',
    entries: [
      ['Button', '@/app/ui-kit/primitives'],
      ['Input', '@/app/ui-kit/primitives'],
      ['Tabs', '@/app/ui-kit/primitives'],
      ['ModalSurface', '@/app/ui-kit/primitives'],
      ['SheetSurface', '@/app/ui-kit/primitives'],
      ['SurfacePanel', '@/app/ui-kit/primitives'],
    ],
  },
  {
    group: 'Patterns',
    entries: [
      ['DashboardHeroSection', '@/app/ui-kit/patterns'],
      ['SectionCard', '@/app/ui-kit/patterns'],
      ['FieldBlock', '@/app/ui-kit/patterns'],
      ['DashboardEmptyState', '@/app/ui-kit/patterns'],
    ],
  },
  {
    group: 'Tokens',
    entries: [
      ['getThemeSurfaceTokens', '@/app/ui-kit/tokens'],
      ['navetSpacingTokens', '@/app/ui-kit/tokens'],
      ['navetUiKitRadiusTokens', '@/app/ui-kit/tokens'],
      ['getUiKitPanelSurfaceClassName', '@/app/ui-kit/tokens'],
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
          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/82">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Export</th>
                  <th className="px-4 py-3 font-semibold">Import path</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {section.entries.map(([name, path]) => (
                  <tr key={name}>
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{path}</td>
                    <td className="px-4 py-3">Stable</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
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
