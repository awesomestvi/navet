import type { Preview } from '@storybook/react-vite';
import {
  Controls,
  Description,
  Markdown,
  Primary,
  Subtitle,
  Title,
  useOf,
} from '@storybook/addon-docs/blocks';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Toaster } from '@navet/app/components/ui/sonner';
import { I18nProvider } from '@navet/app/i18n';
import {
  getPreviewRuntimeScenario,
  installPreviewRuntime,
  resetPreviewRuntime,
  type PreviewRuntimeScenario,
} from '@navet/app/preview/runtime';
import { defaultSettings, useSettingsStore } from '@navet/app/stores/settings-store';
import type { PrimaryColor, ThemeMode } from '@navet/app/stores/theme-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { navetStorybookTheme } from './navet-theme';
// @ts-ignore - side-effect stylesheet import for Storybook runtime.
import '@website/website.css';
import './storybook-preview.css';

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

const PLAYGROUND_WALLPAPER = '/wallpapers/generated/nocturne-06.avif';

const CANVAS_BACKGROUNDS: Record<ThemeMode, string> = {
  dark:
    `linear-gradient(180deg, rgba(4, 8, 15, 0.3), rgba(4, 8, 15, 0.64)), url("${PLAYGROUND_WALLPAPER}") center / cover`,
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

const CARD_SIZE_TOOLBAR_ITEMS = [
  { value: 'tiny', title: 'Tiny (64×64)' },
  { value: 'extraSmall', title: 'Extra Small (96×96)' },
  { value: 'small', title: 'Small (128×128)' },
  { value: 'medium', title: 'Medium (192×192)' },
  { value: 'large', title: 'Large (256×256)' },
  { value: 'extraLarge', title: 'Extra Large (320×320)' },
];

interface StorybookEnvironmentProps {
  children: ReactNode;
  canvasBackgroundName?: keyof typeof TOOLBAR_CANVAS_BACKGROUNDS;
  isDocs?: boolean;
  theme: ThemeMode;
  primaryColor: Exclude<PrimaryColor, 'custom'>;
  cardSize?: string;
  effectsQuality?: 'high' | 'reduced';
  motion?: 'full' | 'reduced';
  previewRuntimeScenario?: PreviewRuntimeScenario | null;
}

function PreviewRuntimeBoundary({
  children,
  scenario,
}: {
  children: ReactNode;
  scenario: PreviewRuntimeScenario;
}) {
  const [installedScenario, setInstalledScenario] = useState<PreviewRuntimeScenario | null>(null);

  useEffect(() => {
    installPreviewRuntime(scenario);
    setInstalledScenario(scenario);

    return () => {
      resetPreviewRuntime();
    };
  }, [scenario]);

  return installedScenario === scenario ? children : null;
}

function StorybookEnvironment({
  children,
  canvasBackgroundName,
  isDocs = false,
  theme,
  primaryColor,
  cardSize,
  effectsQuality = 'high',
  motion = 'full',
  previewRuntimeScenario,
}: StorybookEnvironmentProps) {
  const [defaultPreviewRuntimeScenario] = useState(() => getPreviewRuntimeScenario('default'));
  const resolvedPreviewRuntimeScenario = previewRuntimeScenario ?? defaultPreviewRuntimeScenario;

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
      effectsQuality,
      pageZoom: 100,
    });

    document.documentElement.style.setProperty('--navet-accent', accentColor);
    document.documentElement.dataset.navetStorybook = 'true';
    document.documentElement.dataset.navetPreviewRuntime = 'storybook';
    document.documentElement.dataset.noAnimation = motion === 'reduced' ? 'true' : 'false';
    document.documentElement.dataset.lowPower = effectsQuality === 'reduced' ? 'true' : 'false';
    document.documentElement.dataset.effectsQuality = effectsQuality;
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

      delete document.documentElement.dataset.navetStorybook;
      delete document.documentElement.dataset.navetPreviewRuntime;

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
  }, [primaryColor, theme, cardSize, effectsQuality, motion]);

  return (
    <I18nProvider>
      <div
        className={isDocs ? 'navet-story-document w-full p-4 md:p-6' : 'navet-story-canvas min-h-screen p-5 md:p-8 lg:p-10'}
        style={{
          background:
            (canvasBackgroundName ? TOOLBAR_CANVAS_BACKGROUNDS[canvasBackgroundName] : null) ??
            CANVAS_BACKGROUNDS[theme],
        }}
      >
        <PreviewRuntimeBoundary scenario={resolvedPreviewRuntimeScenario}>
          {children}
        </PreviewRuntimeBoundary>
      </div>
      <Toaster />
    </I18nProvider>
  );
}

function StoryGuide() {
  const { preparedMeta } = useOf('meta', ['meta']);
  const authoredDescription = preparedMeta.parameters.docs?.description?.component;
  const sharedDescription = getStoryDocsDescription(preparedMeta.title);

  if (authoredDescription) {
    return <Description />;
  }

  if (sharedDescription) {
    return <Markdown>{sharedDescription}</Markdown>;
  }

  const subject = preparedMeta.title.split('/').at(-1) ?? preparedMeta.title;

  return (
    <Markdown>{[
      `${subject} reference for building and reviewing this Navet surface in isolation.`,
      '',
      'What this story proves:',
      `- The supported composition and default hierarchy for ${subject.toLowerCase()}.`,
      '- The real component behavior inside Navet’s shared theme and preview runtime.',
      '',
      'Use this story when:',
      '- Changing layout, copy, states, or interaction details on this surface.',
      '- Comparing a proposed feature implementation with the existing Navet UI language.',
      '',
      'Review before merging:',
      '- Check all relevant themes, keyboard focus, touch targets, and reduced-effects mode.',
      '- Use realistic household data and confirm the result remains understandable at dashboard distance.',
    ].join('\n')}</Markdown>
  );
}

function DocsSectionKicker() {
  const { preparedMeta } = useOf('meta', ['meta']);
  const titleSegments = preparedMeta.title.split('/');
  const parentPath = titleSegments.slice(0, -1);
  const sectionTitle = (parentPath.length > 0 ? parentPath : titleSegments).join(' / ');

  return (
    <p className="navet-docs-kicker">
      <span aria-hidden="true" />
      {sectionTitle}
    </p>
  );
}

function NavetDocsPage() {
  return (
    <>
      <header className="navet-docs-masthead">
        <DocsSectionKicker />
        <Title />
        <Subtitle />
        <StoryGuide />
        <div className="navet-docs-review-strip" aria-label="Recommended review coverage">
          <strong>Review with</strong>
          <span>Four themes</span>
          <span>Touch input</span>
          <span>Reduced effects</span>
          <span>Real household data</span>
        </div>
      </header>
      <main className="navet-docs-reference">
        <Primary />
        <Controls />
      </main>
    </>
  );
}

const preview: Preview = {
  tags: ['autodocs', 'test'],

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
          'Pages',
        ],
        method: 'alphabetical',
      },
    },
    controls: {
      expanded: true,
    },
    docs: {
      theme: navetStorybookTheme,
      page: NavetDocsPage,
    },
    backgrounds: {
      grid: {
        disable: true,
      },

      options: {
        "canvas-dark": { name: 'canvas-dark', value: '#09090b' },
        "canvas-glass": { name: 'canvas-glass', value: '#050816' },
        "canvas-light": { name: 'canvas-light', value: '#f8fafc' },
        "canvas-black": { name: 'canvas-black', value: '#000000' }
      }
    },
    viewport: {
      options: {
        iphone14: {
          name: 'iPhone 14',
          styles: {
            width: '390px',
            height: '844px',
          },
        },
        iphone14plus: {
          name: 'iPhone 14 Plus',
          styles: {
            width: '428px',
            height: '926px',
          },
        },
        pixel7: {
          name: 'Pixel 7',
          styles: {
            width: '412px',
            height: '915px',
          },
        },
        ipadMini: {
          name: 'iPad Mini',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        ipadPro: {
          name: 'iPad Pro',
          styles: {
            width: '1024px',
            height: '1366px',
          },
        },
        raspberryPi7inch: {
          name: 'Raspberry Pi 7" Touch',
          styles: {
            width: '1024px',
            height: '600px',
          },
        },
        wallDisplay10inch: {
          name: 'Wall Display 10"',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
        desktop1080p: {
          name: 'Desktop 1080p',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
        desktop1440p: {
          name: 'Desktop 1440p',
          styles: {
            width: '2560px',
            height: '1440px',
          },
        },
      },
    },
    touchSimulator: {
      enabled: true,
      touchEnabled: true,
      mouseEnabled: false,
      showMultiTouch: true,
      enableTouchEvents: true,
    },
    // Per-story touch simulation override
    // Use in stories: MyStory.parameters = { touchSimulator: { enabled: false } }
  },

  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global Navet theme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme options',
        icon: 'mirror',
        dynamicTitle: true,
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
        title: 'Accent options',
        icon: 'paintbrush',
        dynamicTitle: true,
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
    cardSize: {
      name: 'Card Size',
      description: 'Dashboard card footprint preset',
      defaultValue: 'medium',
      toolbar: {
        title: 'Card size options',
        icon: 'crop',
        dynamicTitle: true,
        items: CARD_SIZE_TOOLBAR_ITEMS,
      },
    },
    effectsQuality: {
      name: 'Effects',
      description: 'Rendering quality for dashboard-grade and lower-power hardware',
      defaultValue: 'high',
      toolbar: {
        title: 'Effects quality',
        icon: 'lightning',
        dynamicTitle: true,
        items: [
          { value: 'high', title: 'High effects' },
          { value: 'reduced', title: 'Reduced effects' },
        ],
      },
    },
    motion: {
      name: 'Motion',
      description: 'Motion preference used by the Navet preview runtime',
      defaultValue: 'full',
      toolbar: {
        title: 'Motion preference',
        icon: 'time',
        dynamicTitle: true,
        items: [
          { value: 'full', title: 'Full motion' },
          { value: 'reduced', title: 'Reduced motion' },
        ],
      },
    },
  },

  decorators: [
    (Story, context) => {
      const touchEnabled = context.parameters.touchSimulator?.enabled !== false;
      
      useEffect(() => {
        if (!touchEnabled) {
          document.documentElement.dataset.touchSimulatorDisabled = 'true';
          return () => {
            delete document.documentElement.dataset.touchSimulatorDisabled;
          };
        }
      }, [touchEnabled]);

      return (
        <StorybookEnvironment
          canvasBackgroundName={context.globals.backgrounds?.name}
          isDocs={context.viewMode === 'docs'}
          theme={context.globals.theme as ThemeMode}
          primaryColor={context.globals.primaryColor as Exclude<PrimaryColor, 'custom'>}
          cardSize={context.globals.cardSize}
          effectsQuality={context.globals.effectsQuality as 'high' | 'reduced'}
          motion={context.globals.motion as 'full' | 'reduced'}
          previewRuntimeScenario={
            (context.parameters.previewRuntime?.scenario as PreviewRuntimeScenario | undefined) ??
            null
          }
        >
          <Story />
        </StorybookEnvironment>
      );
    },
  ],

  initialGlobals: {
    backgrounds: {
      value: 'canvas-dark'
    }
  }
};

export default preview;
