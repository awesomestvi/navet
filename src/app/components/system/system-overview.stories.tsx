import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight, Layers3, Paintbrush, Sparkles } from 'lucide-react';
import { InteractivePill } from '@/app/components/system/primitives';
import { getThemeSurfaceTokens } from '@/app/components/system/tokens';
import { useTheme } from '@/app/hooks';

function toDocsPath(storyName: string) {
  const id = storyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `?path=/docs/${id}--docs`;
}

function SystemOverviewPage() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const sections = [
    {
      title: 'Primitives',
      count: 10,
      description:
        'Low-level reusable UI elements such as pills, icon headers, dialog shells, and compact card parts.',
      stories: [
        'Primitives/Interactive Pill',
        'Primitives/Round Control Button',
        'Primitives/Entity Card Header',
      ],
      icon: Layers3,
    },
    {
      title: 'Patterns',
      count: 4,
      description:
        'Composed sections for dashboard and settings surfaces, including hero, preview, and empty-state layouts.',
      stories: [
        'Patterns/Dashboard Hero Section',
        'Patterns/Interaction Preview Card',
        'Patterns/Dashboard Empty State',
      ],
      icon: Sparkles,
    },
    {
      title: 'Tokens',
      count: 6,
      description:
        'Visual decision helpers that output classes/styles for shell surfaces, states, accents, and icon treatments.',
      stories: [
        'Tokens/Theme Surface Tokens',
        'Tokens/Style Calculators',
        'Tokens/Card State Surface Tokens',
      ],
      icon: Paintbrush,
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
              <p className={`mt-1 text-xs ${surface.textMuted}`}>{section.count} story entries</p>
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
  title: 'Foundation/Overview',
  component: SystemOverviewPage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'High-level navigation page for the internal system layer. Use this as an index into primitive, pattern, and token story groups.',
      },
    },
  },
} satisfies Meta<typeof SystemOverviewPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
