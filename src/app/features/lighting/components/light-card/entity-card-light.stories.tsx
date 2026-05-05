import type { Decorator, Meta, StoryObj } from '@storybook/react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import { LightCard } from '@/app/features/lighting';
import type { PrimaryColor, ThemeMode } from '@/app/stores/theme-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';

function LightCardStory(args: Omit<ComponentProps<typeof LightCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <LightCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

function ThemeAccentDecorator({
  theme,
  primaryColor,
  customPrimaryColor,
  children,
}: {
  theme: ThemeMode;
  primaryColor: PrimaryColor;
  customPrimaryColor?: string | null;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousTheme = useThemeStore.getState();

    useThemeStore.setState({
      ...previousTheme,
      theme,
      followSystemTheme: false,
      primaryColor,
      customPrimaryColor: customPrimaryColor ?? null,
      wallpaper: null,
    });

    return () => {
      useThemeStore.setState(previousTheme);
    };
  }, [customPrimaryColor, primaryColor, theme]);

  return <>{children}</>;
}

function withThemeAccent(
  theme: ThemeMode,
  primaryColor: PrimaryColor,
  customPrimaryColor?: string | null
): Decorator {
  return (Story) => (
    <ThemeAccentDecorator
      theme={theme}
      primaryColor={primaryColor}
      customPrimaryColor={customPrimaryColor}
    >
      <Story />
    </ThemeAccentDecorator>
  );
}

const meta = {
  title: 'Cards/Entity/Light',
  component: LightCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
    },
  },
  args: {
    id: 'light.living_room',
    name: 'Living Room',
    room: 'Living Room',
    initialState: true,
    initialBrightness: 64,
    initialTemp: 3900,
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof LightCardStory>;

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

export const Playground: Story = {
  play: async ({ canvas, userEvent, step }) => {
    const lightCard = canvas.getByRole('button', { name: /^living room$/i });

    await step('shows the light as on initially', async () => {
      await expect(lightCard).toHaveAttribute('aria-pressed', 'true');
    });

    await step('toggles the light off when the card is clicked', async () => {
      await userEvent.click(lightCard);
      await expect(lightCard).toHaveAttribute('aria-pressed', 'false');
    });

    await step('toggles the light back on when clicked again', async () => {
      await userEvent.click(lightCard);
      await expect(lightCard).toHaveAttribute('aria-pressed', 'true');
    });
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const BlueGlassAccent: Story = {
  decorators: [withThemeAccent('glass', 'blue')],
};

export const PurpleDarkAccent: Story = {
  decorators: [withThemeAccent('dark', 'purple')],
};

export const TealLightAccent: Story = {
  decorators: [withThemeAccent('light', 'teal')],
};

export const OrangeBlackAccent: Story = {
  decorators: [withThemeAccent('black', 'orange')],
};

export const CustomAccent: Story = {
  decorators: [withThemeAccent('glass', 'custom', '#60a5fa')],
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
