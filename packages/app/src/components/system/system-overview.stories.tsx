import { useTheme } from '@navet/app/hooks';
import { getThemeSurfaceTokens } from '@navet/app/ui-kit/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowUpRight, Layers3, Paintbrush, Sparkles } from 'lucide-react';
import { toId } from 'storybook/internal/csf';

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
        'Concepts/UI Kit Start Here',
        'Concepts/UI Kit Inventory',
        'Concepts/UI Kit Recipes',
        'Theme/Border Radii',
        'Theme/Colors',
        'Theme/Controls',
        'Theme/Fonts',
        'Theme/Active Card Surfaces',
        'Theme/Motion',
        'Theme/Spacing',
        'Theme/Stroke Widths',
        'Theme/Typography',
        'Cards/Theme/Entity Icon Pill Styles',
        'Cards/Theme/Card Shell Surface',
        'Cards/Theme/Card State Surface',
        'Cards/Theme/Accent Card Shell',
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
        'Components/Primitives/Badge',
        'Components/Primitives/Body Text',
        'Components/Primitives/Checkbox',
        'Components/Primitives/Radio',
        'Components/Primitives/Stepper',
        'Components/Primitives/Switch',
        'Components/Primitives/Tooltip',
        'Components/Primitives/Tag',
        'Components/Primitives/Panel',
        'Components/Primitives/Modal Surface',
        'Components/Primitives/Overlay Scroll Area',
        'Components/Primitives/Sheet Surface',
        'Components/Primitives/Surface Panel',
        'Components/Primitives/Color Input Swatch',
        'Components/Primitives/Loading Spinner',
        'Components/Primitives/Interactive Pill',
        'Components/Primitives/Cards/BaseCard',
        'Components/Primitives/Cards/BaseCardDialog',
        'Components/Primitives/Cards/Entity/Header',
      ],
      icon: Layers3,
    },
    {
      title: 'Patterns',
      description:
        'Composed sections for dashboard and settings surfaces, including field wrappers, empty states, feedback blocks, and preview compositions.',
      stories: [
        'Components/Patterns/Form Field',
        'Components/Primitives/MessageBar',
        'Components/Patterns/Table Cell Content',
        'Components/Patterns/Card Action Row',
        'Components/Patterns/CardDialog',
        'Components/Patterns/Dashboard Hero Section',
        'Components/Patterns/Empty State',
        'Components/Patterns/Portal Action Dock',
        'Components/Patterns/Preview Cards',
        'Components/Patterns/Selectable Checkbox Row',
        'Components/Patterns/Section Card',
      ],
      icon: Sparkles,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl py-2 md:py-4">
      <header className="relative overflow-hidden border-b border-white/10 pb-8 md:pb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full blur-3xl"
          style={{ background: `${accentColor}1c` }}
        />
        <p
          className={`relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 0 6px ${accentColor}14` }}
          />
          Developer workbench
        </p>
        <h1
          className={`relative mt-5 max-w-3xl text-3xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-4xl ${surface.textPrimary}`}
        >
          Navet UI system
        </h1>
        <p className={`relative mt-4 max-w-2xl text-sm leading-6 ${surface.textSecondary}`}>
          Find the shared tokens, primitives, and patterns used by the Navet applications. Review an
          existing implementation here before adding feature-level UI.
        </p>
        <nav
          aria-label="Developer references"
          className="relative mt-6 flex flex-wrap gap-x-6 gap-y-3"
        >
          {[
            { label: 'Start here', story: 'Concepts/UI Kit Start Here' },
            { label: 'Component inventory', story: 'Concepts/UI Kit Inventory' },
            { label: 'Composition recipes', story: 'Concepts/UI Kit Recipes' },
          ].map(({ label, story }) => (
            <a
              key={story}
              href={toDocsPath(story)}
              target="_top"
              rel="noreferrer"
              className={`group inline-flex items-center gap-1.5 border-b pb-1 text-sm font-medium transition-colors ${surface.textPrimary}`}
              style={{ borderColor: `${accentColor}80` }}
            >
              {label}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ))}
        </nav>
      </header>

      <section className="relative mt-7 md:mt-9">
        <div
          aria-hidden="true"
          className="absolute bottom-0 top-0 w-px bg-white/10"
          style={{ left: 'calc(1.25rem - 0.5px)' }}
        />
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <article
              key={section.title}
              className="relative grid gap-4 border-b border-white/10 py-6 last:border-b-0 md:grid-cols-[190px_1fr] md:gap-8 md:py-8"
              style={{ paddingInlineStart: '3.5rem' }}
            >
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}
                >
                  {String(section.stories.length).padStart(2, '0')} entries
                </p>
                <div className="relative mt-2">
                  <div
                    className="absolute inline-flex h-10 w-10 items-center justify-center rounded-xl border"
                    style={{
                      top: '50%',
                      left: '-3.5rem',
                      borderColor: `${accentColor}4d`,
                      background: `linear-gradient(145deg, ${accentColor}24, rgba(10, 15, 24, 0.96))`,
                      boxShadow: '0 0 0 5px rgba(7, 11, 18, 0.92)',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: accentColor }} />
                  </div>
                  <h2 className={`text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
                    {section.title}
                  </h2>
                </div>
              </div>

              <div>
                <p className={`max-w-2xl text-sm leading-7 ${surface.textSecondary}`}>
                  {section.description}
                </p>
                <details className="group mt-5">
                  <summary
                    className={`inline-flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden ${surface.textPrimary}`}
                  >
                    Browse {section.title.toLowerCase()}
                    <span
                      aria-hidden="true"
                      className="text-base transition-transform group-open:rotate-45"
                      style={{ color: accentColor }}
                    >
                      +
                    </span>
                  </summary>
                  <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {section.stories.map((name) => (
                      <li key={name}>
                        <a
                          href={toDocsPath(name)}
                          target="_top"
                          rel="noreferrer"
                          className={`group/link inline-flex items-start gap-2 text-xs leading-5 transition-colors ${surface.textSubtle}`}
                        >
                          <ArrowUpRight
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
                            style={{ color: accentColor }}
                          />
                          <span className="group-hover/link:underline">{name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
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
        component:
          "Reference Navet's shared tokens, primitives, and patterns before creating feature-level UI. Use the toolbar to review entries across supported themes, accent colors, and card sizes.",
      },
    },
  },
} satisfies Meta<typeof SystemOverviewPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
