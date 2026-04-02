import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb } from 'lucide-react';
import { getEntityIconPillStyles } from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

function EntityIconPillStylesShowcase() {
  return (
    <div className="space-y-4">
      {THEMES.map((theme) => (
        <section key={theme} className="rounded-2xl border border-white/14 bg-white/6 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">{theme}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {[
              { isActive: true, size: 'small' as const },
              { isActive: false, size: 'small' as const },
              { isActive: true, size: 'large' as const },
              { isActive: false, size: 'large' as const },
            ].map((item) => {
              const icon = getEntityIconPillStyles({
                isActive: item.isActive,
                isInteractive: false,
                primaryColor: 'orange',
                size: item.size,
                theme,
                tone: item.isActive ? 'primary' : 'neutral',
              });

              return (
                <div
                  key={`${theme}-${item.size}-${item.isActive ? 'active' : 'idle'}`}
                  className="inline-flex flex-col items-center gap-1"
                >
                  <span className={icon.badgeClassName} style={icon.badgeStyle}>
                    <Lightbulb className={icon.iconClassName} style={icon.iconStyle} />
                  </span>
                  <span className="text-[10px] text-white/70">
                    {item.size} {item.isActive ? 'active' : 'idle'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: 'Theme/Entity Icon Pill Styles',
  component: EntityIconPillStylesShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Computed-style preview for `getEntityIconPillStyles`, used by entity card header icons to derive badge and glyph classes by theme, size, and active state.',
      },
    },
  },
} satisfies Meta<typeof EntityIconPillStylesShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {};
