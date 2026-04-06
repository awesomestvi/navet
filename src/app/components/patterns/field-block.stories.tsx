import type { Meta, StoryObj } from '@storybook/react';
import { Search } from 'lucide-react';
import { FieldBlock } from '@/app/components/patterns';
import { Input } from '@/app/components/primitives';
import { useTheme } from '@/app/hooks';

function FieldBlockStory({
  hint,
  error,
  required = false,
  disabled = false,
}: {
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const iconClassName =
    theme === 'light' ? 'text-gray-500' : theme === 'black' ? 'text-gray-300' : 'text-white/64';

  return (
    <div className="w-full max-w-md space-y-4">
      <FieldBlock
        label="Search"
        htmlFor="storybook-field-block"
        hint={hint}
        error={error}
        required={required}
      >
        <Input
          id="storybook-field-block"
          type="text"
          placeholder="Find sensors or devices"
          disabled={disabled}
          invalid={Boolean(error)}
          leading={<Search className={`h-4 w-4 ${iconClassName}`} />}
        />
      </FieldBlock>
      <p className={`text-xs ${iconClassName}`}>Status: ready</p>
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Form Field',
  component: FieldBlockStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Pattern wrapper for labels, hints, and field-level errors around a control primitive. Status: ready.',
      },
    },
  },
} satisfies Meta<typeof FieldBlockStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hint: 'Search by name, room, or type.',
  },
};

export const Required: Story = {
  args: {
    required: true,
    hint: 'This value is needed before continuing.',
  },
};

export const ErrorState: Story = {
  args: {
    error: 'Enter a valid Home Assistant URL.',
  },
};

export const Disabled: Story = {
  args: {
    hint: 'Disabled fields keep their label and hint text.',
    disabled: true,
  },
};
