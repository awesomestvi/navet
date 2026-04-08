import type { Meta, StoryObj } from '@storybook/react';
import { Search, X } from 'lucide-react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { IconButton } from './icon-button';
import { Input } from './input';

const meta = {
  title: 'Components/Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Search devices',
    disabled: false,
    invalid: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: ready. Canonical single-line input primitive for new forms and search rows.',
      },
    },
  },
} satisfies Meta<typeof Input>;

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
export const WithLeadingIcon: Story = {
  args: { leading: <Search className="h-4 w-4 text-current/60" /> },
};
export const WithTrailingAction: Story = {
  args: {
    defaultValue: 'Kitchen',
    trailing: (
      <IconButton
        size="small"
        variant="ghost"
        label="Clear search"
        icon={<X className="h-4 w-4" />}
      />
    ),
  },
};
export const ErrorState: Story = { args: { invalid: true, defaultValue: 'http:/broken-url' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Disabled value' } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
