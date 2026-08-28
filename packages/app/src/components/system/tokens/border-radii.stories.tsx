import { useTheme } from '@navet/app/hooks';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { navetRadiusTokens } from './foundations';
import { ThemeTokenShowcase } from './theme-token-showcase';

function BorderRadiiStory() {
  const { accentColor } = useTheme();
  const sampleStyle = {
    borderColor: `${accentColor}80`,
    background: `linear-gradient(145deg, ${accentColor}12, ${accentColor}05)`,
    boxShadow: `inset 0 1px 0 ${accentColor}18`,
  };

  return (
    <ThemeTokenShowcase
      intro="Border radius tokens for fields, actions, panel insets, and card shells. Use these before introducing one-off radius values."
      tokens={navetRadiusTokens}
      previewTitle="Examples"
      preview={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/70">Field radius</p>
            <div className={`${navetRadiusTokens.field} h-20 border-2`} style={sampleStyle} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-white/70">Action radius</p>
            <div className={`${navetRadiusTokens.action} h-14 border-2`} style={sampleStyle} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-white/70">Panel inset radius</p>
            <div className={`${navetRadiusTokens.panelInset} h-24 border-2`} style={sampleStyle} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-white/70">Panel radius</p>
            <div className={`${navetRadiusTokens.panel} h-28 border-2`} style={sampleStyle} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-white/70">Pill radius</p>
            <div className={`${navetRadiusTokens.pill} h-12 border-2`} style={sampleStyle} />
          </div>
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Border Radii',
  component: BorderRadiiStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Border radius foundation tokens used across shared primitives and card shells.',
          '',
          'What this story proves:',
          '- `field`, `action`, `panelInset`, `panel`, and `pill` radius decisions from the shared foundation layer.',
          '- Visual size comparison so rounded shapes remain intentional and consistent between controls and larger surfaces.',
          '',
          'Review before merging:',
          '- Keep neighboring radius levels visibly distinct; avoid collapsing tokens into near-identical shapes.',
          '- Prefer these tokens over ad hoc rounded classes in primitives and patterns.',
          '- Verify radius hierarchy stays coherent across glass, dark, light, and black themes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof BorderRadiiStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
