import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight, Layers3 } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/system/tokens';
import { DASHBOARD_CARD_TYPES } from '@/app/features/dashboard/utils/card-renderer';
import { useTheme } from '@/app/hooks';

const CUSTOM_CARD_TYPES = new Set(['helpers', 'grouped-sensors', 'weather', 'calendars']);
const PATTERN_STORY_TYPES = new Set(['sensors']);
const CUSTOM_WIDGET_TYPES = [
  'rss feed',
  'photo',
  'quick note',
  'battery overview',
  'action',
] as const;

function toTitleCase(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function EntityCardCatalogPage() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const customTypes = DASHBOARD_CARD_TYPES.filter((type) => CUSTOM_CARD_TYPES.has(type));
  const patternTypes = DASHBOARD_CARD_TYPES.filter((type) => PATTERN_STORY_TYPES.has(type));
  const normalTypes = DASHBOARD_CARD_TYPES.filter(
    (type) => !CUSTOM_CARD_TYPES.has(type) && !PATTERN_STORY_TYPES.has(type)
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className={`rounded-3xl border p-6 ${surface.panel} ${surface.border}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${surface.textMuted}`}>
          Feature scope
        </p>
        <h1 className={`mt-2 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
          Entity card catalog
        </h1>
        <p className={`mt-2 text-sm ${surface.textSecondary}`}>
          These are the dashboard entity card types registered in the card renderer. This catalog is
          for runtime registry coverage, separate from shared pattern stories such as the generic
          info card.
        </p>
      </header>

      <section className={`rounded-3xl border p-4 ${surface.panelMuted} ${surface.border}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className={`text-sm font-semibold uppercase tracking-[0.16em] ${surface.textSecondary}`}
          >
            Normal cards
          </h2>
          <p className={`text-xs ${surface.textMuted}`}>{normalTypes.length} types</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {normalTypes.map((type) => (
            <article
              key={type}
              className={`rounded-2xl border px-3 py-2.5 ${surface.border} ${surface.subtleBg}`}
            >
              <div className="inline-flex items-center gap-2">
                <Layers3 className={`h-3.5 w-3.5 ${surface.textSubtle}`} />
                <p className={`text-sm font-medium ${surface.textPrimary}`}>{toTitleCase(type)}</p>
              </div>
              <p className={`mt-1 text-xs ${surface.textMuted}`}>type key: {type}</p>
              <p className={`mt-1 inline-flex items-center gap-1 text-xs ${surface.textSecondary}`}>
                <ArrowRight className="h-3 w-3" />
                feature story coverage recommended
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border p-4 ${surface.panelMuted} ${surface.border}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className={`text-sm font-semibold uppercase tracking-[0.16em] ${surface.textSecondary}`}
          >
            Pattern-backed cards
          </h2>
          <p className={`text-xs ${surface.textMuted}`}>{patternTypes.length} types</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {patternTypes.map((type) => (
            <article
              key={type}
              className={`rounded-2xl border px-3 py-2.5 ${surface.border} ${surface.subtleBg}`}
            >
              <div className="inline-flex items-center gap-2">
                <Layers3 className={`h-3.5 w-3.5 ${surface.textSubtle}`} />
                <p className={`text-sm font-medium ${surface.textPrimary}`}>{toTitleCase(type)}</p>
              </div>
              <p className={`mt-1 text-xs ${surface.textMuted}`}>type key: {type}</p>
              <p className={`mt-1 inline-flex items-center gap-1 text-xs ${surface.textSecondary}`}>
                <ArrowRight className="h-3 w-3" />
                documented as a reusable pattern, not an entity story
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border p-4 ${surface.panelMuted} ${surface.border}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className={`text-sm font-semibold uppercase tracking-[0.16em] ${surface.textSecondary}`}
          >
            Custom cards
          </h2>
          <p className={`text-xs ${surface.textMuted}`}>{customTypes.length} types</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {customTypes.map((type) => (
            <article
              key={type}
              className={`rounded-2xl border px-3 py-2.5 ${surface.border} ${surface.subtleBg}`}
            >
              <div className="inline-flex items-center gap-2">
                <Layers3 className={`h-3.5 w-3.5 ${surface.textSubtle}`} />
                <p className={`text-sm font-medium ${surface.textPrimary}`}>{toTitleCase(type)}</p>
              </div>
              <p className={`mt-1 text-xs ${surface.textMuted}`}>type key: {type}</p>
              <p className={`mt-1 inline-flex items-center gap-1 text-xs ${surface.textSecondary}`}>
                <ArrowRight className="h-3 w-3" />
                feature story coverage recommended
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border p-4 ${surface.panelMuted} ${surface.border}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className={`text-sm font-semibold uppercase tracking-[0.16em] ${surface.textSecondary}`}
          >
            Custom widgets
          </h2>
          <p className={`text-xs ${surface.textMuted}`}>{CUSTOM_WIDGET_TYPES.length} types</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CUSTOM_WIDGET_TYPES.map((type) => (
            <span
              key={type}
              className={`rounded-full border px-3 py-1.5 text-xs ${surface.border} ${surface.textSecondary}`}
            >
              {toTitleCase(type)}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Cards/Overview/Catalog',
  component: EntityCardCatalogPage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Runtime inventory of dashboard card types. Use this to track which cards are runtime registered, while allowing shared read-only surfaces like the info card to live under pattern stories instead of entity-card stories.',
      },
    },
  },
} satisfies Meta<typeof EntityCardCatalogPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Catalog: Story = {};
