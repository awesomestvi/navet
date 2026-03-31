import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size';
import { HVACCard } from '@/app/features/climate';
import { LightCard } from '@/app/features/lighting';
import { MediaCard } from '@/app/features/media';

const SIZES: CardSize[] = [
  'tiny',
  'extra-small',
  'small',
  'medium',
  'medium-vertical',
  'large',
  'extra-large',
];

function AllSizesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Light</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SIZES.map((size) => (
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
        <h2 className="text-base font-semibold">HVAC</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SIZES.map((size) => (
            <div key={`hvac-${size}`} className="space-y-1">
              <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
              <HVACCard
                id={`climate.story.${size}`}
                name="Main Floor HVAC"
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

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {};
