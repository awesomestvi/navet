import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Label } from './label';

function LabelStory() {
  return (
    <div className="space-y-2">
      <Label htmlFor="demo-input" className="text-white/80">
        Device name
      </Label>
      <input
        id="demo-input"
        className="w-64 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
        defaultValue="Living room lamp"
      />
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Label',
  component: LabelStory,
  tags: ['autodocs'],
  render: () => <LabelStory />,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'Base form-label primitive used for accessible control naming.',
          '',
          'What this base story covers:',
          '- Label-to-control association through `htmlFor` and matching input `id`.',
          '- Minimal baseline typography so higher-level primitives can layer tokenized styles.',
          '',
          'Usage notes:',
          '- Always associate labels with real form controls; avoid decorative labels with no target.',
          '- Keep label text concise and domain-specific so form scanning remains fast.',
          '',
          'Review expectations:',
          '- Verify label remains legible and contrast-safe in all themes.',
          '- Verify click/focus behavior correctly targets the associated control.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof LabelStory>;

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

export const Default: Story = {
  render: () => <LabelStory />,
};
