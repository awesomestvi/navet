import { Button } from '@navet/app/components/primitives';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SelectableCheckboxList, SelectableCheckboxRow } from './selectable-checkbox-row';

function SelectableCheckboxRowStory() {
  const [basicChecked, setBasicChecked] = useState(true);
  const [leadingChecked, setLeadingChecked] = useState(true);
  const [metricChecked, setMetricChecked] = useState(false);
  const [actionChecked, setActionChecked] = useState(true);
  const [longChecked, setLongChecked] = useState(true);

  return (
    <div className="w-full max-w-xl">
      <SelectableCheckboxList>
        <li>
          <SelectableCheckboxRow
            checked={basicChecked}
            onCheckedChange={setBasicChecked}
            label="Front Door Sensor"
            labelClassName="text-white"
            descriptionClassName="text-white/70"
          />
        </li>

        <li>
          <SelectableCheckboxRow
            checked={leadingChecked}
            onCheckedChange={setLeadingChecked}
            label="Family Calendar"
            description="Home"
            leading={<div className="h-5 w-1 rounded-full bg-cyan-400" />}
            labelClassName="text-white"
            descriptionClassName="text-white/70"
            checkboxPaletteColor="#22d3ee"
          />
        </li>

        <li>
          <SelectableCheckboxRow
            checked={metricChecked}
            onCheckedChange={setMetricChecked}
            label="Kitchen humidity"
            description="45% RH"
            trailing={<span className="text-sm font-semibold text-white">Live</span>}
            labelClassName="text-white"
            descriptionClassName="text-white/70"
            checkboxPaletteColor="#34d399"
          />
        </li>

        <li>
          <SelectableCheckboxRow
            checked={actionChecked}
            onCheckedChange={setActionChecked}
            label="BBC World"
            description="https://feeds.bbci.co.uk/news/world/rss.xml"
            labelClassName="text-white"
            descriptionClassName="truncate text-white/70"
            checkboxPaletteColor="#38bdf8"
            action={
              <Button
                variant="subtle"
                size="compact"
                iconOnly
                label="Remove RSS provider"
                aria-label="Remove RSS provider"
                className="border-sky-400/25 bg-sky-400/10 text-white/80 hover:bg-sky-400/16"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </li>

        <li>
          <SelectableCheckboxRow
            checked={longChecked}
            onCheckedChange={setLongChecked}
            label="Hall thermostat battery with a very long name that should truncate cleanly"
            description="sensor.hall_thermostat_battery_super_long_entity_id_that_needs_to_wrap"
            trailing={<span className="text-sm font-semibold tabular-nums text-white">91%</span>}
            labelClassName="truncate text-white"
            descriptionClassName="whitespace-normal break-all text-white/70"
            checkboxPaletteColor="#fb923c"
          />
        </li>
      </SelectableCheckboxList>
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Selectable Checkbox Row',
  component: SelectableCheckboxRowStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Grouped dialog selection list using the same compact rows, dividers, and rounded container as Add Entity.',
      },
    },
  },
} satisfies Meta<typeof SelectableCheckboxRowStory>;

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

export const Preview: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
