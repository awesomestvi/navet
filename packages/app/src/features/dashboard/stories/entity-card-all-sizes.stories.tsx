import type { CardSize } from '@navet/app/components/shared/card-size';
import { ClimateCard } from '@navet/app/features/climate';
import { FanCard, LightCard } from '@navet/app/features/lighting';
import { MediaCard } from '@navet/app/features/media';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';

const SIZES: CardSize[] = [
  'tiny',
  'extra-small',
  'small',
  'medium',
  'medium-vertical',
  'large',
  'extra-large',
];
const LIGHT_SIZES: CardSize[] = ['extra-small', 'small', 'medium'];
const FAN_SIZES: CardSize[] = ['small', 'medium'];
const Climate_SIZES: CardSize[] = ['small', 'medium'];

function AllSizesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Light</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {LIGHT_SIZES.map((size) => (
            <div key={`light-${size}`} className="space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
              <LightCard
                id={`light.story.${size}`}
                name="Living Room"
                room="Living Room"
                initialState
                initialBrightness={64}
                initialTemp={3900}
                size={size}
                onSizeChange={() => {}}
                isEditMode={false}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Fan</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FAN_SIZES.map((size) => (
            <div key={`fan-${size}`} className="space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
              <FanCard
                id={`fan.story.${size}`}
                name="Ceiling Fan"
                room="Bedroom"
                initialState
                initialPercentage={66}
                size={size}
                onSizeChange={() => {}}
                isEditMode={false}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Climate</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Climate_SIZES.map((size) => (
            <div key={`climate-${size}`} className="space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
              <ClimateCard
                id={`climate.story.${size}`}
                name="Main Floor Climate"
                room="Hallway"
                initialTemp={22}
                initialCurrentTemp={21}
                initialMode="cool"
                initialAction="cooling"
                initialState
                size={size}
                onSizeChange={() => {}}
                isEditMode={false}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Media</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SIZES.map((size) => (
            <div key={`media-${size}`} className="space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
              <MediaCard
                id={`media.story.${size}`}
                name="Living Room TV"
                room="Living Room"
                title="Aerial"
                artist="Navet Studio"
                entityType="TV"
                state="playing"
                volume={42}
                isMuted={false}
                elapsedSeconds={86}
                durationSeconds={243}
                positionUpdatedAt={new Date().toISOString()}
                supportsGrouping
                groupMembers={['Kitchen Speaker']}
                size={size}
                onSizeChange={() => {}}
                isEditMode={false}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Cards/Overview/All Sizes',
  component: AllSizesPage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-card size matrix for the full CardSize union. Useful for layout QA and visual regression baselines.',
      },
    },
  },
} satisfies Meta<typeof AllSizesPage>;

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

export const Matrix: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
