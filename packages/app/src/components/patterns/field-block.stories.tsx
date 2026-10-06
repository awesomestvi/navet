import { FieldBlock } from '@navet/app/components/patterns';
import { Input } from '@navet/app/components/primitives';
import { useTheme } from '@navet/app/hooks';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
import { useId } from 'react';
import { expect } from 'storybook/test';

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
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const { theme } = useTheme();
  const iconClassName =
    theme === 'light' ? 'text-gray-500' : theme === 'black' ? 'text-gray-300' : 'text-white/64';

  return (
    <div className="w-full max-w-md space-y-4">
      <FieldBlock
        label="Search"
        htmlFor={inputId}
        hint={hint ? <span id={messageId}>{hint}</span> : undefined}
        error={error ? <span id={messageId}>{error}</span> : undefined}
        required={required}
      >
        <Input
          id={inputId}
          aria-describedby={error || hint ? messageId : undefined}
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
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('textbox', { name: /Search/ });
    await expect(input).toHaveAccessibleDescription(args.error ?? args.hint ?? '');
    if (args.error) await expect(input).toHaveAttribute('aria-invalid', 'true');
    if (args.disabled) await expect(input).toBeDisabled();
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Form-field pattern wrapper that standardizes label, hint, required, and error presentation around control primitives.',
          '',
          'Status: ready.',
          '',
          'What this story proves:',
          '- Baseline hint and label pairing for text input controls.',
          '- Required and error states with predictable messaging placement.',
          '- Disabled-state behavior that preserves contextual copy.',
          '',
          'Use this story when:',
          '- Use this wrapper instead of hand-assembling label/hint/error stacks in feature forms.',
          '- Keep validation copy concise and specific to the expected user correction.',
          '',
          'Review before merging:',
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

export const MultipleFields: Story = {
  render: () => (
    <>
      <FieldBlockStory hint="Search by room." />
      <FieldBlockStory error="Enter a valid device name." />
    </>
  ),
  play: async ({ canvas }) => {
    const inputs = canvas.getAllByRole('textbox', { name: /Search/ });
    await expect(inputs).toHaveLength(2);
    await expect(inputs[0]).toHaveAccessibleDescription('Search by room.');
    await expect(inputs[1]).toHaveAccessibleDescription('Enter a valid device name.');
    await expect(inputs[0].id).not.toBe(inputs[1].id);
    await expect(inputs[0].getAttribute('aria-describedby')).not.toBe(
      inputs[1].getAttribute('aria-describedby')
    );
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
