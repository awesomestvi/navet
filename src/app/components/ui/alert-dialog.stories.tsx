import type { Meta, StoryObj } from '@storybook/react';
import { Trash2 } from 'lucide-react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

function AlertDialogStory() {
  return (
    <div className="flex items-center justify-center p-12">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete card
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the card and all its configuration. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Alert Dialog',
  component: AlertDialogStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Confirmation dialog for destructive and irreversible actions.',
          '',
          'What this base story covers:',
          '- Radix `AlertDialog` structure and focus-trap behavior in Navet styling.',
          '- Header/body/footer composition for clear action framing.',
          '- Destructive CTA pairing (`Cancel` + `Delete`) in the same shell used by production dialogs.',
          '',
          'Usage notes:',
          '- Use for high-risk actions (delete/remove/reset), not ordinary settings confirmations.',
          '- Keep title/action language explicit and short; avoid vague confirmations.',
          '',
          'Review expectations:',
          '- Verify keyboard focus order and escape/cancel behavior.',
          '- Verify destructive action prominence without making cancel hard to find.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof AlertDialogStory>;

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
