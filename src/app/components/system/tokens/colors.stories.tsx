import type { Meta, StoryObj } from '@storybook/react';
import { navetSemanticColorTokens } from './foundations';
import { ThemeTokenShowcase } from './theme-token-showcase';

function ColorsStory() {
  return (
    <ThemeTokenShowcase
      intro="Semantic color tokens for info, success, warning, and error states used by inline feedback and status surfaces."
      tokens={navetSemanticColorTokens}
      previewTitle="Examples"
      preview={
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`${navetSemanticColorTokens.info} rounded-[20px] border p-4 text-sm`}>
            Info: New firmware is available.
          </div>
          <div className={`${navetSemanticColorTokens.success} rounded-[20px] border p-4 text-sm`}>
            Success: Settings saved.
          </div>
          <div className={`${navetSemanticColorTokens.warning} rounded-[20px] border p-4 text-sm`}>
            Warning: Effects quality reduced on this device.
          </div>
          <div className={`${navetSemanticColorTokens.error} rounded-[20px] border p-4 text-sm`}>
            Error: Could not connect to Home Assistant.
          </div>
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Colors',
  component: ColorsStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Semantic status color tokens for inline feedback and message surfaces.',
          '',
          'What this page covers:',
          '- Shared semantic tones: `info`, `success`, `warning`, and `error`.',
          '- Combined border, background tint, and text color behavior for status callouts.',
          '',
          'Usage notes:',
          '- Use semantic tokens for state meaning; do not map arbitrary domain colors into these slots.',
          '- Keep message text short and clear so semantic color supports, rather than replaces, readability.',
          '',
          'Review expectations:',
          '- Confirm contrast remains readable across all themes.',
          '- Confirm warning and error are distinct at a glance on low-quality displays.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ColorsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
