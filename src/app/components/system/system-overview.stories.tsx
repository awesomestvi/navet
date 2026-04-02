import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight, Layers3, Paintbrush, Sparkles } from 'lucide-react';
import { toId } from 'storybook/internal/csf';
import { InteractivePill } from '@/app/components/system/primitives';
import { getThemeSurfaceTokens } from '@/app/components/system/tokens';
import { useTheme } from '@/app/hooks';

function toDocsPath(storyName: string) {
  // Use an absolute manager URL so links work from iframe-rendered stories.
  return `/?path=/docs/${toId(storyName, 'docs')}`;
}

function SystemOverviewPage() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const sections = [
    {
      title: 'Theme',
      description:
        'Design tokens and visual decision helpers — typography, surface treatments, state colors, accent shells, and style calculators.',
      stories: [
        'Theme/Border Radii',
        'Theme/Colors',
        'Theme/Fonts',
        'Theme/Spacing',
        'Theme/Stroke Widths',
        'Theme/Typography',
        'Theme/Accent Card Shell',
        'Theme/Surface Tokens',
        'Theme/Style Calculators',
      ],
      icon: Paintbrush,
    },
    {
      title: 'Primitives',
      description:
        'Low-level reusable UI elements such as buttons, fields, typography, pills, dialog shells, and compact action controls.',
      stories: [
        'Components/Primitives/Button',
        'Components/Primitives/Text',
        'Components/Primitives/Input',
        'Components/Primitives/Textarea',
        'Components/Primitives/Select',
        'Components/Primitives/Combobox',
        'Components/Primitives/Checkbox',
        'Components/Primitives/Radio',
        'Components/Primitives/Switch',
        'Components/Primitives/Tooltip',
        'Components/Primitives/Tag',
        'Components/Primitives/Panel',
        'Components/Primitives/Color Picker',
        'Components/Primitives/Loading Spinner',
        'Components/Primitives/Interactive Pill',
        'Components/Primitives/Cards/Entity Card Header',
      ],
      icon: Layers3,
    },
    {
      title: 'Patterns',
      description:
        'Composed sections for dashboard and settings surfaces, including field wrappers, empty states, feedback blocks, and compact action compositions.',
      stories: [
        'Components/Patterns/Field',
        'Components/Patterns/Messagebar',
        'Components/Patterns/Table Cell Content',
        'Components/Patterns/Card Action Row',
        'Components/Patterns/Empty State',
        'Components/Patterns/Preview Cards',
        'Components/Patterns/Tiny Action Card',
      ],
      icon: Sparkles,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header
        className={`rounded-3xl border p-6 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
          Navet UI system
        </p>
        <h1 className={`mt-2 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
          Storybook overview
        </h1>
        <p className={`mt-2 max-w-2xl text-sm ${surface.textSecondary}`}>
          Start here to navigate the internal system layer and review shared building blocks before
          touching feature-level UI.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <InteractivePill active intent="navigation">
            System first
          </InteractivePill>
          <InteractivePill intent="action">Theme-aware</InteractivePill>
          <InteractivePill intent="navigation">Composable</InteractivePill>
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <article
              key={section.title}
              className={`rounded-3xl border p-4 backdrop-blur-xl ${surface.panelMuted} ${surface.border}`}
            >
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: `${accentColor}55`,
                  background: `linear-gradient(180deg, ${accentColor}22, transparent 140%)`,
                }}
              >
                <Icon className={`h-4 w-4 ${surface.textPrimary}`} />
              </div>
              <h2 className={`mt-3 text-lg font-semibold ${surface.textPrimary}`}>
                {section.title}
              </h2>
              <p className={`mt-1 text-xs ${surface.textMuted}`}>
                {section.stories.length} story entries
              </p>
              <p className={`mt-2 text-sm leading-6 ${surface.textSecondary}`}>
                {section.description}
              </p>

              <ul className="mt-3 space-y-1.5">
                {section.stories.map((name) => (
                  <li
                    key={name}
                    className={`inline-flex items-center gap-1.5 text-xs ${surface.textSubtle}`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <a
                      href={toDocsPath(name)}
                      target="_top"
                      rel="noreferrer"
                      className={`underline-offset-2 transition-colors hover:underline ${surface.textPrimary}`}
                    >
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>
    </div>
  );
}

const meta = {
  title: 'Concepts/Overview',
  component: SystemOverviewPage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          "High-level navigation page for Navet's internal UI system. Use this story as the entry point into the shared token, primitive, and pattern layers before working in feature-level UI.",
          '',
          'How the system is organized:',
          '- `Theme` covers visual decision helpers and documentation stories for shared tokens such as surface treatments, readable text behavior, typography, and accent shells.',
          '- `Primitives` covers low-level reusable building blocks such as pills, buttons, shells, and header parts.',
          '- `Patterns` covers composed UI sections such as hero layouts, empty states, and interactive previews.',
          '',
          'How to use this page:',
          '- Start here when you want to understand what already exists before creating new UI.',
          '- Jump into the linked docs pages for the specific token, primitive, or pattern you want to inspect.',
          '- Prefer evolving shared stories and shared exports before adding one-off feature styling.',
          '',
          'Review expectations:',
          '- Check components across all four Navet themes using the Storybook toolbar.',
          '- Use the Storybook toolbar to review glass, dark, light, and black theme behavior.',
          '- Token stories should verify light-theme readability and tinted-surface text contrast.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof SystemOverviewPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
