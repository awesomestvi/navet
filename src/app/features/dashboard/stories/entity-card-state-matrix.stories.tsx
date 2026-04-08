import type { Meta, StoryObj } from '@storybook/react';
import { HVACCard } from '@/app/features/climate';
import { LightCard } from '@/app/features/lighting';
import { MediaCard } from '@/app/features/media';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';

function StateMatrixPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Light states</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <LightCard
            id="light.state.on"
            name="Desk Lamp"
            room="Office"
            initialState
            initialBrightness={70}
            initialTemp={3500}
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
          <LightCard
            id="light.state.off"
            name="Desk Lamp"
            room="Office"
            initialState={false}
            initialBrightness={0}
            initialTemp={3500}
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
          <LightCard
            id="light.state.edit"
            name="Desk Lamp"
            room="Office"
            initialState
            initialBrightness={70}
            initialTemp={3500}
            size="medium"
            onSizeChange={() => {}}
            isEditMode
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">HVAC states</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <HVACCard
            id="climate.state.cool"
            name="Main Floor HVAC"
            room="Hallway"
            initialTemp={22}
            initialCurrentTemp={21}
            initialMode="cool"
            initialAction="cooling"
            initialState
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
          <HVACCard
            id="climate.state.heat"
            name="Main Floor HVAC"
            room="Hallway"
            initialTemp={22}
            initialCurrentTemp={19}
            initialMode="heat"
            initialAction="heating"
            initialState
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
          <HVACCard
            id="climate.state.off"
            name="Main Floor HVAC"
            room="Hallway"
            initialTemp={22}
            initialCurrentTemp={22}
            initialMode="off"
            initialAction={undefined}
            initialState={false}
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Media states</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MediaCard
            id="media.state.playing"
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
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
          <MediaCard
            id="media.state.paused"
            name="Living Room TV"
            room="Living Room"
            title="Aerial"
            artist="Navet Studio"
            entityType="TV"
            state="paused"
            volume={42}
            isMuted={false}
            elapsedSeconds={86}
            durationSeconds={243}
            positionUpdatedAt={new Date().toISOString()}
            supportsGrouping
            groupMembers={['Kitchen Speaker']}
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
          <MediaCard
            id="media.state.off"
            name="Living Room TV"
            room="Living Room"
            title="Aerial"
            artist="Navet Studio"
            entityType="TV"
            state="off"
            volume={0}
            isMuted={false}
            elapsedSeconds={0}
            durationSeconds={243}
            positionUpdatedAt={new Date().toISOString()}
            supportsGrouping
            groupMembers={[]}
            size="medium"
            onSizeChange={() => {}}
            isEditMode={false}
          />
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Cards/Overview/Core State Matrix',
  component: StateMatrixPage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'State-focused matrix for core cards to validate on/off/mode/playback and edit-mode rendering without navigating many separate stories.',
      },
    },
  },
} satisfies Meta<typeof StateMatrixPage>;

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
