import type { Meta, StoryObj } from '@storybook/react';
import { Moon, Sparkles, SunMedium, Trash2 } from 'lucide-react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { getBrightnessPresetSelectedStyle } from '@/app/components/shared/device-editor/brightness-preset-styles';
import { getRoundControlStyles } from '@/app/components/shared/theme/round-control-styles';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { CardActionRow } from './card-action-row';

function CardActionRowStory({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const controlSizes = getCardActionControlSizes(size);
  const roundControl = getRoundControlStyles(theme);
  const selectedStyle = getBrightnessPresetSelectedStyle(theme, '#f97316', true);

  return (
    <div
      className={`mx-auto w-full max-w-md rounded-3xl border p-4 backdrop-blur-xl ${surface.panelMuted} ${surface.border}`}
    >
      <CardActionRow
        theme={theme}
        size={size}
        leftContent={
          <div className={`flex min-w-0 items-center ${size === 'small' ? 'gap-1' : 'gap-2'}`}>
            {[
              { icon: SunMedium, selected: false },
              { icon: Moon, selected: true },
              { icon: Sparkles, selected: false },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={`${size}-${index}`}
                  className={`${controlSizes.button} flex items-center justify-center rounded-full border transition-all duration-300 ${
                    item.selected ? roundControl.selectedText : roundControl.softButton
                  }`}
                  style={item.selected ? selectedStyle : undefined}
                >
                  <Icon className={controlSizes.icon} />
                </div>
              );
            })}
          </div>
        }
        rightContent={<CardSettingsActionButton theme={theme} size={size} variant="soft" />}
        overflowItems={[
          { key: 'rename', label: 'Rename', onSelect: () => {} },
          { key: 'duplicate', label: 'Duplicate', onSelect: () => {} },
          { key: 'delete', label: 'Delete', onSelect: () => {}, icon: Trash2 },
        ]}
      />
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Card Action Row',
  component: CardActionRowStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Composed card action row pattern for left-aligned controls, optional right-side actions, and overflow menus. Used by HVAC, vacuum, cover, and lighting card layouts.',
      },
    },
  },
} satisfies Meta<typeof CardActionRowStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
