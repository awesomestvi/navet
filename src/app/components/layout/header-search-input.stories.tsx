import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import { HeaderSearchInput } from './header-search-input';

function HeaderSearchInputStory() {
  const [query, setQuery] = useState('living room');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="mx-auto w-full max-w-md p-8">
      <HeaderSearchInput
        activeColorValue="#22d3ee"
        hoverBg="hover:bg-white/10"
        inputBg="bg-white/5"
        inputRef={inputRef}
        isSearchActive={query.length > 0}
        isSearchFocused={focused}
        onBlur={() => setFocused(false)}
        onChange={setQuery}
        onClear={() => setQuery('')}
        onFocus={() => setFocused(true)}
        placeholder="Search entities"
        query={query}
        textPrimary="text-white"
        textSecondary="text-white/60"
      />
    </div>
  );
}

const meta = {
  title: 'App Shell/Header Search Input',
  component: HeaderSearchInputStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HeaderSearchInputStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
