import type { Meta, StoryObj } from '@storybook/react';
import { getNavetMotionProfile, navetMotionTokens } from './index';
import { ThemeTokenShowcase } from './theme-token-showcase';

function MotionStory() {
  return (
    <ThemeTokenShowcase
      intro="Motion tokens map the existing `effectsQuality` setting to semantic profiles. This keeps reduced-cost behavior explicit without replacing the current theme surface logic."
      tokens={navetMotionTokens}
      previewTitle="Effects quality mapping"
      preview={
        <div className="grid gap-4 md:grid-cols-3">
          {(['low', 'medium', 'high'] as const).map((effectsQuality) => {
            const profile = getNavetMotionProfile(effectsQuality);

            return (
              <article
                key={effectsQuality}
                className="rounded-[24px] border border-white/12 bg-white/6 p-4 backdrop-blur-xl"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-white/58">
                  effectsQuality.{effectsQuality}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-white">
                  {profile.blur ? 'Blur enabled' : 'Blur reduced'}
                </h3>
                <div className="mt-3 space-y-1 text-sm text-white/72">
                  <div>Fast: {profile.durationFastMs}ms</div>
                  <div>Normal: {profile.durationNormalMs}ms</div>
                  <div>Slow: {profile.durationSlowMs}ms</div>
                </div>
              </article>
            );
          })}
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Motion',
  component: MotionStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Shared motion profile tokens aligned to Navet’s existing effects-quality model.',
          '',
          'What this page covers:',
          '- Canonical duration steps.',
          '- Low-power, balanced, and premium motion profiles.',
          '- Explicit mapping from `effectsQuality` to motion behavior.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof MotionStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
