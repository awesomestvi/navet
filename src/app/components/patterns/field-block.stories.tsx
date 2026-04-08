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
        component: [
          'Form-field pattern wrapper that standardizes label, hint, required, and error presentation around control primitives.',
          '',
          'Status: ready.',
          '',
          'What this page covers:',
          '- Baseline hint and label pairing for text input controls.',
          '- Required and error states with predictable messaging placement.',
          '- Disabled-state behavior that preserves contextual copy.',
          '',
          'Usage notes:',
          '- Use this wrapper instead of hand-assembling label/hint/error stacks in feature forms.',
          '- Keep validation copy concise and specific to the expected user correction.',
          '',
          'Review expectations:',
          '- Verify error and hint copy remain readable in all themes.',
          '- Verify disabled and invalid states stay visually distinct.',
        ].join('\n'),
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
  parameters: {
    docs: {
      description: {
        story: 'Baseline field block with label and helper text wrapping a text input control.',
      },
    },
  },
};

export const Required: Story = {
  args: {
    required: true,
    hint: 'This value is needed before continuing.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Required-field presentation with mandatory indicator and supporting hint copy.',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    error: 'Enter a valid Home Assistant URL.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Validation-error state with inline error message and invalid input styling.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    hint: 'Disabled fields keep their label and hint text.',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled control state while preserving contextual label and hint messaging.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
