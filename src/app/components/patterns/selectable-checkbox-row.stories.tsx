import type { Meta, StoryObj } from '@storybook/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { SelectableCheckboxRow } from './selectable-checkbox-row';

function SelectableCheckboxRowStory() {
  const [basicChecked, setBasicChecked] = useState(true);
  const [leadingChecked, setLeadingChecked] = useState(true);
  const [metricChecked, setMetricChecked] = useState(false);
  const [actionChecked, setActionChecked] = useState(true);
  const [longChecked, setLongChecked] = useState(true);

  return (
    <div className="w-full max-w-xl space-y-4">
      <SelectableCheckboxRow
        checked={basicChecked}
        onCheckedChange={setBasicChecked}
        label="Front Door Sensor"
        rowClassName="border-white/10 bg-white/6"
        selectedClassName="border-white/18 bg-white/10"
        labelClassName="text-white"
        descriptionClassName="text-white/70"
      />

      <SelectableCheckboxRow
        checked={leadingChecked}
        onCheckedChange={setLeadingChecked}
        label="Family Calendar"
        description="Home"
        leading={<div className="h-5 w-1 rounded-full bg-cyan-400" />}
        rowClassName="border-white/10 bg-white/6"
        selectedClassName="border-cyan-400/40 bg-cyan-400/12"
        labelClassName="text-white"
        descriptionClassName="text-white/70"
        checkboxPaletteColor="#22d3ee"
      />

      <SelectableCheckboxRow
        checked={metricChecked}
        onCheckedChange={setMetricChecked}
        label="Kitchen humidity"
        description="45% RH"
        trailing={<span className="text-sm font-semibold text-white">Live</span>}
        rowClassName="border-white/10 bg-white/6"
        selectedClassName="border-emerald-400/40 bg-emerald-400/12"
        labelClassName="text-white"
        descriptionClassName="text-white/70"
        checkboxPaletteColor="#34d399"
      />

      <SelectableCheckboxRow
        checked={actionChecked}
        onCheckedChange={setActionChecked}
        label="BBC World"
        description="https://feeds.bbci.co.uk/news/world/rss.xml"
        rowClassName="border-white/10 bg-white/6"
        selectedClassName="border-sky-400/40 bg-sky-400/12"
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

      <SelectableCheckboxRow
        checked={longChecked}
        onCheckedChange={setLongChecked}
        label="Hall thermostat battery with a very long name that should truncate cleanly"
        description="sensor.hall_thermostat_battery_super_long_entity_id_that_needs_to_wrap"
        trailing={<span className="text-sm font-semibold tabular-nums text-white">91%</span>}
        rowClassName="border-white/10 bg-white/6"
        selectedClassName="border-orange-400/40 bg-orange-400/12"
        labelClassName="truncate text-white"
        descriptionClassName="whitespace-normal break-all text-white/70"
        checkboxPaletteColor="#fb923c"
      />
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
          'Standard dialog selection-row pattern built from the shared checkbox primitive.',
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
