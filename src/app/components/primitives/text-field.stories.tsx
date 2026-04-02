import type { Meta, StoryObj } from '@storybook/react';
import { Eye, Search, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { TextField } from '@/app/components/primitives';
import { useTheme } from '@/app/hooks';

function TextFieldStory({
  invalid = false,
  disabled = false,
  type = 'text',
  placeholder = 'Search devices, rooms, or sections',
  defaultValue = '',
  longTrailing = false,
}: {
  invalid?: boolean;
  disabled?: boolean;
  type?: 'text' | 'password';
  placeholder?: string;
  defaultValue?: string;
  longTrailing?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const { theme } = useTheme();
  const iconClassName =
    theme === 'light' ? 'text-gray-500' : theme === 'black' ? 'text-gray-300' : 'text-white/64';

  return (
    <div className="w-full max-w-md space-y-4">
      <TextField
        type={type}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        invalid={invalid}
        disabled={disabled}
        leading={
          invalid ? (
            <TriangleAlert className={`h-4 w-4 ${iconClassName}`} />
          ) : (
            <Search className={`h-4 w-4 ${iconClassName}`} />
          )
        }
        trailing={
          longTrailing ? (
            <span className={`text-xs font-medium ${iconClassName}`}>12 matches</span>
          ) : value ? (
            <button
              type="button"
              className={`rounded p-0.5 transition-colors ${
                theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'
              }`}
              onClick={() => setValue('')}
              aria-label="Clear field"
            >
              <X className={`h-4 w-4 ${iconClassName}`} />
            </button>
          ) : type === 'password' ? (
            <button type="button" className={iconClassName} aria-label="Reveal password">
              <Eye className="h-4 w-4" />
            </button>
          ) : null
        }
      />
      <p className={`text-xs ${iconClassName}`}>Status: ready</p>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Text Field',
  component: TextField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theme-aware single-line input primitive for search, auth, and settings surfaces. Status: ready.',
      },
    },
  },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TextFieldStory defaultValue="Kitchen lights" />,
};

export const Disabled: Story = {
  render: () => <TextFieldStory disabled defaultValue="Read only value" />,
};

export const ErrorState: Story = {
  render: () => <TextFieldStory invalid defaultValue="not-a-valid-url" />,
};

export const Password: Story = {
  render: () => <TextFieldStory type="password" placeholder="Home Assistant token" />,
};

export const LongContent: Story = {
  render: () => (
    <TextFieldStory
      defaultValue="Living room accent lights grouped by media cabinet and sideboard"
      longTrailing
    />
  ),
};

export const EmptyFocused: Story = {
  render: () => <TextFieldStory placeholder="Focus this field to review keyboard states" />,
};
