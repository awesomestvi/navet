import cameraSampleImageAvif from '@assets/reference/media/camera-sample.avif';
import cameraSampleImageWebp from '@assets/reference/media/camera-sample.webp';
import type { CardSize } from '@navet/app/components/shared/card-size';
import { ClimateCard } from '@navet/app/features/climate';
import { FanCard, LightCard, SwitchCard } from '@navet/app/features/lighting';
import { MediaCard } from '@navet/app/features/media';
import { CameraCard } from '@navet/app/features/security';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';

const LIGHT_SIZES: CardSize[] = ['extra-small', 'small', 'medium'];
const SWITCH_SIZES: CardSize[] = ['tiny', 'extra-small', 'small'];
const FAN_SIZES: CardSize[] = ['small', 'medium'];
const CLIMATE_SIZES: CardSize[] = ['small', 'medium'];
const CAMERA_SIZES: CardSize[] = ['medium', 'large', 'extra-large'];
const MEDIA_SIZES: CardSize[] = ['small', 'medium', 'medium-vertical', 'large'];
const CAMERA_SOURCES = [
  { srcSet: cameraSampleImageAvif, type: 'image/avif' },
  { srcSet: cameraSampleImageWebp, type: 'image/webp' },
] as const;

function CardSizePreview({ children, size }: { children: ReactNode; size: CardSize }) {
  return (
    <div className="shrink-0 space-y-1">
      <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
      <EntityCardStoryFrame size={size}>{children}</EntityCardStoryFrame>
    </div>
  );
}

function AllSizesPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Light</h2>
        <div className="flex flex-wrap items-start gap-3">
          {LIGHT_SIZES.map((size) => (
            <CardSizePreview key={`light-${size}`} size={size}>
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
            </CardSizePreview>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Switch</h2>
        <div className="flex flex-wrap items-start gap-3">
          {SWITCH_SIZES.map((size) => (
            <CardSizePreview key={`switch-${size}`} size={size}>
              <SwitchCard
                id={`switch.story.${size}`}
                name="Espresso Machine"
                size={size}
                initialState
                entityType="switch"
                serviceDomain="switch"
                serviceAction="toggle"
                isEditMode={false}
                power={1140}
                voltage={230}
                energy={2.6}
              />
            </CardSizePreview>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Fan</h2>
        <div className="flex flex-wrap items-start gap-3">
          {FAN_SIZES.map((size) => (
            <CardSizePreview key={`fan-${size}`} size={size}>
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
            </CardSizePreview>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Climate</h2>
        <div className="flex flex-wrap items-start gap-3">
          {CLIMATE_SIZES.map((size) => (
            <CardSizePreview key={`climate-${size}`} size={size}>
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
            </CardSizePreview>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Camera</h2>
        <div className="flex flex-wrap items-start gap-3">
          {CAMERA_SIZES.map((size) => (
            <CardSizePreview key={`camera-${size}`} size={size}>
              <CameraCard
                id={`camera.story.${size}`}
                name="Front Door Cam"
                room="Entrance"
                entityPicture={cameraSampleImageWebp}
                entityPictureSources={CAMERA_SOURCES}
                supportedFeatures={2}
                isStreamCapable
                size={size}
                onSizeChange={() => {}}
                isEditMode={false}
              />
            </CardSizePreview>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Media</h2>
        <div className="flex flex-wrap items-start gap-3">
          {MEDIA_SIZES.map((size) => (
            <CardSizePreview key={`media-${size}`} size={size}>
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
            </CardSizePreview>
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
