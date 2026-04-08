import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
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
  title: 'App Shell/Header/Search Input',
  component: HeaderSearchInputStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof HeaderSearchInputStory>;

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
