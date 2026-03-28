import { Home, MapPin, Users } from 'lucide-react';
import { useMemo } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { useAuth } from '@/app/contexts/auth-context';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface PresencePerson {
  id: string;
  name: string;
  state: 'home' | 'away';
  location: string;
  entityPicture?: string;
}

interface PresenceOverviewWidgetProps {
  size?: CardSize;
}

export function PresenceOverviewWidget({ size = 'large' }: PresenceOverviewWidgetProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { config } = useAuth();
  const surface = getDashboardWidgetSurfaceTokens(theme);
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const isCompact = isCompactCardSize(size);

  const persons = useMemo<PresencePerson[]>(() => {
    if (!entities) return [];

    return Object.entries(entities)
      .filter(([entityId]) => entityId.startsWith('person.'))
      .map(([id, entity]) => {
        const attributes = entity.attributes as Record<string, unknown>;
        const rawPicture =
          typeof attributes.entity_picture === 'string' ? attributes.entity_picture : undefined;

        return {
          id,
          name:
            (typeof attributes.friendly_name === 'string' && attributes.friendly_name) ||
            id.replace('person.', '').replace(/_/g, ' '),
          state: (entity.state === 'home' ? 'home' : 'away') as 'home' | 'away',
          location:
            entity.state === 'home'
              ? t('person.home')
              : entity.state === 'not_home'
                ? t('person.away')
                : entity.state,
          entityPicture: rawPicture?.startsWith('/')
            ? `${config?.url ?? ''}${rawPicture}`
            : rawPicture,
        };
      })
      .sort((left, right) => {
        if (left.state !== right.state) return left.state === 'home' ? -1 : 1;
        return left.name.localeCompare(right.name);
      });
  }, [config?.url, entities, t]);

  const homeCount = persons.filter((person) => person.state === 'home').length;

  return (
    <div className={`${surface.panelClassName} flex h-full flex-col`}>
      <EntityCardHeader
        title={t('widgets.presence.title')}
        subtitle={t('widgets.presence.summary', {
          home: homeCount,
          away: Math.max(0, persons.length - homeCount),
        })}
        layout="eyebrow-first"
        size={isCompact ? 'small' : 'medium'}
        titleClassName={surface.textPrimary}
        subtitleClassName={surface.textMuted}
        className="mb-3"
        leading={<EntityCardHeaderIcon IconComponent={Users} isActive={true} size="medium" />}
      />

      {persons.length === 0 ? (
        <div className={`flex flex-1 items-center justify-center text-sm ${surface.textMuted}`}>
          {t('widgets.presence.empty')}
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {persons.map((person) => (
            <li key={person.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                {person.entityPicture ? (
                  <ImageWithFallback
                    src={person.entityPicture}
                    alt={person.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Users className={`h-4 w-4 ${surface.textMuted}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                  {person.name}
                </div>
                <div className={`truncate text-[10px] ${surface.textMuted}`}>{person.location}</div>
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${
                  person.state === 'home'
                    ? theme === 'light'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-500/20 text-green-300'
                    : theme === 'light'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-white/10 text-white/70'
                }`}
              >
                {person.state === 'home' ? (
                  <Home className="h-3 w-3" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                <span>{person.state === 'home' ? t('person.home') : t('person.away')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
