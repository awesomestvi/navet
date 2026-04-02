import type { Preview } from '@storybook/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { themes } from 'storybook/theming';
import { Toaster } from '../src/app/components/ui/sonner';
import { I18nProvider } from '../src/app/i18n';
import { defaultSettings, useSettingsStore } from '../src/app/stores/settings-store';
import type { PrimaryColor, ThemeMode } from '../src/app/stores/theme-store';
import { useThemeStore } from '../src/app/stores/theme-store';
// @ts-ignore - side-effect stylesheet import for Storybook runtime.
import '../src/styles/index.css';

const PRIMARY_COLOR_VALUES: Record<Exclude<PrimaryColor, 'custom'>, string> = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444',
  yellow: '#eab308',
  teal: '#14b8a6',
};

const CANVAS_BACKGROUNDS: Record<ThemeMode, string> = {
  dark: 'radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 35%), #09090b',
  glass:
    'radial-gradient(circle at top left, rgba(249,115,22,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(255,255,255,0.1), transparent 26%), linear-gradient(180deg, #050816 0%, #0f172a 100%)',
  light:
    'radial-gradient(circle at top left, rgba(249,115,22,0.08), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
  black: 'linear-gradient(180deg, #000000 0%, #080808 100%)',
};

const TOOLBAR_CANVAS_BACKGROUNDS = {
  'canvas-dark': CANVAS_BACKGROUNDS.dark,
  'canvas-glass': CANVAS_BACKGROUNDS.glass,
  'canvas-light': CANVAS_BACKGROUNDS.light,
  'canvas-black': CANVAS_BACKGROUNDS.black,
} as const;

interface StorybookEnvironmentProps {
  children: ReactNode;
  canvasBackgroundName?: keyof typeof TOOLBAR_CANVAS_BACKGROUNDS;
  theme: ThemeMode;
  primaryColor: Exclude<PrimaryColor, 'custom'>;
}

function StorybookEnvironment({
  children,
  canvasBackgroundName,
  theme,
  primaryColor,
}: StorybookEnvironmentProps) {
  useEffect(() => {
    const accentColor = PRIMARY_COLOR_VALUES[primaryColor];
    const previousThemeState = useThemeStore.getState();
    const previousSettingsState = useSettingsStore.getState();
    const previousAccent = document.documentElement.style.getPropertyValue('--navet-accent');
    const previousNoAnimation = document.documentElement.dataset.noAnimation;
    const previousLowPower = document.documentElement.dataset.lowPower;
    const previousEffectsQuality = document.documentElement.dataset.effectsQuality;
    const previousZoom = document.documentElement.style.zoom;

    useThemeStore.setState({
      ...previousThemeState,
      theme,
      followSystemTheme: false,
      primaryColor,
      customPrimaryColor: null,
      wallpaper: null,
    });

    useSettingsStore.setState({
      ...previousSettingsState,
      ...defaultSettings,
      language: 'en',
      use24HourTime: true,
      temperatureUnit: 'celsius',
      effectsQuality: 'high',
      pageZoom: 100,
    });

    document.documentElement.style.setProperty('--navet-accent', accentColor);
    document.documentElement.dataset.noAnimation = 'false';
    document.documentElement.dataset.lowPower = 'false';
    document.documentElement.dataset.effectsQuality = 'high';
    document.documentElement.style.zoom = '1';

    return () => {
      useThemeStore.setState(previousThemeState);
      useSettingsStore.setState(previousSettingsState);

      if (previousAccent) {
        document.documentElement.style.setProperty('--navet-accent', previousAccent);
      } else {
        document.documentElement.style.removeProperty('--navet-accent');
      }

      if (previousNoAnimation) {
        document.documentElement.dataset.noAnimation = previousNoAnimation;
      } else {
        delete document.documentElement.dataset.noAnimation;
      }

      if (previousLowPower) {
        document.documentElement.dataset.lowPower = previousLowPower;
      } else {
        delete document.documentElement.dataset.lowPower;
      }

      if (previousEffectsQuality) {
        document.documentElement.dataset.effectsQuality = previousEffectsQuality;
      } else {
        delete document.documentElement.dataset.effectsQuality;
      }

      if (previousZoom) {
        document.documentElement.style.zoom = previousZoom;
      } else {
        document.documentElement.style.zoom = '';
      }
    };
  }, [primaryColor, theme]);

  return (
    <I18nProvider>
      <div
        className="min-h-screen p-6 md:p-10"
        style={{
          background:
            (canvasBackgroundName ? TOOLBAR_CANVAS_BACKGROUNDS[canvasBackgroundName] : null) ??
            CANVAS_BACKGROUNDS[theme],
        }}
      >
        {children}
      </div>
      <Toaster />
    </I18nProvider>
  );
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    options: {
      storySort: {
        order: [
          'Concepts',
          'Theme',
          'Components',
          'App Shell',
          'Cards',
          'Dashboard',
          'Energy',
          'Settings',
        ],
        method: 'alphabetical',
      },
    },
    controls: {
      expanded: true,
    },
    docs: {
      theme: themes.dark,
    },
    backgrounds: {
      default: 'canvas-dark',
      values: [
        { name: 'canvas-dark', value: '#09090b' },
        { name: 'canvas-glass', value: '#050816' },
        { name: 'canvas-light', value: '#f8fafc' },
        { name: 'canvas-black', value: '#000000' },
      ],
      grid: {
        disable: true,
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global Navet theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'glass', title: 'Glass' },
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
          { value: 'black', title: 'Black' },
        ],
      },
    },
    primaryColor: {
      name: 'Accent',
      description: 'Global Navet accent color',
      defaultValue: 'orange',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'orange', title: 'Orange' },
          { value: 'blue', title: 'Blue' },
          { value: 'green', title: 'Green' },
          { value: 'purple', title: 'Purple' },
          { value: 'pink', title: 'Pink' },
          { value: 'red', title: 'Red' },
          { value: 'yellow', title: 'Yellow' },
          { value: 'teal', title: 'Teal' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => (
      <StorybookEnvironment
        canvasBackgroundName={context.globals.backgrounds?.name}
        theme={context.globals.theme as ThemeMode}
        primaryColor={context.globals.primaryColor as Exclude<PrimaryColor, 'custom'>}
      >
        <Story />
      </StorybookEnvironment>
    ),
  ],
};

export default preview;
