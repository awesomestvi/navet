import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Combobox } from './combobox';

function ComboboxStory(args: ComponentProps<typeof Combobox>) {
  const [expanded, setExpanded] = useState(args.expanded);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(args.expanded);
  }, [args.expanded]);

  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [expanded]);

  return (
    <div ref={rootRef} className={expanded ? 'w-full max-w-md pb-72' : 'w-full max-w-md'}>
      <Combobox
        {...args}
        expanded={expanded}
        onClick={(event) => {
          args.onClick?.(event);
          setExpanded(true);
        }}
        onFocus={(event) => {
          args.onFocus?.(event);
          setExpanded(true);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Combobox',
  component: ComboboxStory,
  tags: ['autodocs'],
  render: (args) => <ComboboxStory {...args} />,
  args: {
    placeholder: 'Search entities',
    expanded: false,
    listboxId: 'storybook-combobox-listbox',
    children: (
      <div className="space-y-1">
        <button
          type="button"
          role="option"
          aria-selected="true"
          className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-white hover:bg-white/10"
        >
          sensor.kitchen_power
        </button>
        <button
          type="button"
          role="option"
          className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-white hover:bg-white/10"
        >
          sensor.living_room_power
        </button>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Structural combobox shell for future shared autocomplete work. Intentionally leaves filtering, keyboard option management, and selection state to the caller until the app proves a stable shared behavior.',
      },
    },
  },
} satisfies Meta<typeof ComboboxStory>;

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

export const Open: Story = { args: { expanded: true } };
export const Closed: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
