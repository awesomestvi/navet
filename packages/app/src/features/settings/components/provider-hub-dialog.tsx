import { CardDialogHeader } from '@navet/app/components/patterns/card-dialog';
import { Button, Input, ModalSurface, Select, Switch } from '@navet/app/components/primitives';
import { useI18n, useTheme } from '@navet/app/hooks';
import type {
  ProviderHubControl,
  ProviderHubFeatureService,
  ProviderHubResource,
  ProviderHubSection,
  ProviderHubSnapshot,
} from '@navet/core/provider-hub';
import { ChevronDown, ChevronUp, Play, RefreshCw, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SettingsSectionStyles } from '../hooks/settings-section-styles';

const sections: ProviderHubSection[] = [
  'devices',
  'rooms',
  'automations',
  'scenes',
  'people',
  'notifications',
  'apps',
  'installations',
  'history',
];
type History = Awaited<ReturnType<ProviderHubFeatureService['getHistory']>>;

/** Provider-neutral view. Provider clients own resource interpretation and mutation. */
export function ProviderHubDialog({
  name,
  service,
  styles,
  onClose,
}: {
  name: string;
  service: ProviderHubFeatureService;
  styles: SettingsSectionStyles;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [snapshot, setSnapshot] = useState<ProviderHubSnapshot | null>(null);
  const [section, setSection] = useState<ProviderHubSection>('devices');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const alive = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; points: History } | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    const read = () => {
      void service
        .getSnapshot()
        .then((value) => {
          if (!cancelled) setSnapshot(value);
        })
        .catch((reason) => {
          if (!cancelled)
            setError(reason instanceof Error ? reason.message : t('providerDetails.failed'));
        });
    };
    read();
    const unsubscribe = service.subscribe(read);
    return () => {
      cancelled = true;
      alive.current = false;
      unsubscribe();
    };
  }, [service, t]);

  async function act(id: string, operation: () => Promise<void>, success?: string) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(id);
    setError(null);
    setFeedback(null);
    try {
      await operation();
      const next = await service.getSnapshot();
      if (alive.current) {
        setSnapshot(next);
        if (success) setFeedback(success);
      }
    } catch (reason) {
      if (alive.current)
        setError(reason instanceof Error ? reason.message : t('providerDetails.failed'));
    } finally {
      pendingRef.current = false;
      if (alive.current) setPending(null);
    }
  }

  const items =
    snapshot?.sections[section].filter((item) =>
      `${item.name} ${item.description ?? ''}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase())
    ) ?? [];
  return (
    <ModalSurface
      isOpen
      titleInContent
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('providerDetails.title', { provider: name })}
      contentClassName="max-w-2xl"
      bodyClassName="p-5"
    >
      <CardDialogHeader
        title={t('providerDetails.title', { provider: name })}
        theme={theme}
        editableTitle={false}
        showRoomSelector={false}
        className="mb-4 max-sm:pr-0"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={t('providerDetails.section')}
          value={section}
          onChange={(event) => {
            setSection(event.target.value as ProviderHubSection);
            setExpanded(null);
            setQuery('');
            setHistory(null);
            setError(null);
            setFeedback(null);
          }}
          containerClassName="min-w-40 flex-1"
        >
          {sections.map((id) => (
            <option key={id} value={id}>
              {t(`providerDetails.sections.${id}`)} ({snapshot?.sections[id].length ?? 0})
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="small"
          leading={<RefreshCw className="h-4 w-4" />}
          disabled={pending !== null}
          loading={pending === 'refresh'}
          onClick={() =>
            void act(
              'refresh',
              async () => {
                const next = await service.refresh();
                if (alive.current) setSnapshot(next);
              },
              t('providerDetails.refreshed')
            )
          }
        >
          {t('providerDetails.refresh')}
        </Button>
      </div>
      {snapshot?.profile?.name ? (
        <p className={`mt-3 text-xs ${styles.subtleColor}`}>
          {snapshot.profile.name}
          {snapshot.profile.email ? ` · ${snapshot.profile.email}` : ''}
        </p>
      ) : null}
      <Input
        className="mt-3"
        aria-label={t('providerDetails.search')}
        placeholder={t('providerDetails.search')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {error || snapshot?.errors[section] ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error || snapshot?.errors[section]}
        </p>
      ) : null}
      {feedback ? (
        <p role="status" className={`mt-3 text-sm ${styles.textColor}`}>
          {feedback}
        </p>
      ) : null}
      {!snapshot ? (
        <p role="status" className={`mt-4 text-sm ${styles.subtleColor}`}>
          {t('providerDetails.loading')}
        </p>
      ) : null}
      {snapshot && items.length === 0 ? (
        <p className={`py-6 text-center text-sm ${styles.subtleColor}`}>
          {t('providerDetails.empty')}
        </p>
      ) : null}
      <div className="mt-3 max-h-[55vh] overflow-y-auto divide-y divide-current/10">
        {items.map((item) => (
          <div key={item.id} className="py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${styles.textColor}`}>{item.name}</p>
                {item.description ? (
                  <p className={`mt-1 break-words text-xs ${styles.subtleColor}`}>
                    {item.description}
                  </p>
                ) : null}
                {item.current ? (
                  <p className={`text-xs ${styles.subtleColor}`}>{t('providerDetails.current')}</p>
                ) : null}
                {!item.available ? (
                  <p className={`text-xs ${styles.subtleColor}`}>
                    {t('providerDetails.unavailable')}
                  </p>
                ) : null}
              </div>
              {item.favorite !== undefined ? (
                <Button
                  iconOnly
                  variant="ghost"
                  size="small"
                  label={t(
                    item.favorite
                      ? 'providerDetails.removeFavorite'
                      : 'providerDetails.addFavorite',
                    { name: item.name }
                  )}
                  aria-pressed={item.favorite}
                  disabled={pending !== null}
                  loading={pending === `favorite/${item.id}`}
                  onClick={() =>
                    void act(
                      `favorite/${item.id}`,
                      () => service.setFavorite(item.id, !item.favorite),
                      t('providerDetails.saved')
                    )
                  }
                >
                  <Star className="h-4 w-4" fill={item.favorite ? 'currentColor' : 'none'} />
                </Button>
              ) : null}
              {item.runnable !== undefined ? (
                <Button
                  size="small"
                  variant="secondary"
                  leading={<Play className="h-4 w-4" />}
                  disabled={pending !== null || !item.runnable || !item.available}
                  loading={pending === item.id}
                  onClick={() =>
                    void act(
                      item.id,
                      () => service.run(item.id),
                      t('providerDetails.started', { name: item.name })
                    )
                  }
                >
                  {t('providerDetails.run')}
                </Button>
              ) : null}
              {item.controls?.length || section === 'history' ? (
                <Button
                  iconOnly
                  variant="ghost"
                  size="small"
                  label={t('providerDetails.controls', { name: item.name })}
                  aria-expanded={expanded === item.id}
                  onClick={() => {
                    setExpanded(expanded === item.id ? null : item.id);
                    setHistory(null);
                  }}
                >
                  {expanded === item.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
            {expanded === item.id ? (
              <div className="mt-3 space-y-3">
                {item.controls?.map((control) => (
                  <HubControl
                    key={control.id}
                    resource={item}
                    control={control}
                    disabled={pending !== null || !item.available}
                    styles={styles}
                    onSave={(value) =>
                      void act(
                        `${item.id}/${control.id}`,
                        () => service.setControl(item.id, control.id, value),
                        t('providerDetails.saved')
                      )
                    }
                  />
                ))}
                {section === 'history' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Select
                        aria-label={t('providerDetails.period')}
                        value={period}
                        onChange={(event) => {
                          setPeriod(event.target.value as typeof period);
                          setHistory(null);
                        }}
                        disabled={pending !== null}
                        containerClassName="flex-1"
                      >
                        {(['day', 'week', 'month'] as const).map((id) => (
                          <option key={id} value={id}>
                            {t(`providerDetails.periods.${id}`)}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={pending !== null}
                        loading={pending === item.id}
                        onClick={() =>
                          void act(item.id, async () => {
                            const points = await service.getHistory(item.id, period);
                            if (alive.current) setHistory({ id: item.id, points });
                          })
                        }
                      >
                        {t('providerDetails.loadHistory')}
                      </Button>
                    </div>
                    {history?.id === item.id ? (
                      history.points.length ? (
                        <div className="max-h-56 overflow-y-auto">
                          <table className={`w-full text-left text-xs ${styles.textColor}`}>
                            <thead>
                              <tr>
                                <th className="py-2">{t('providerDetails.time')}</th>
                                <th>{t('providerDetails.value')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.points.map((point, index) => (
                                <tr key={`${point.time}/${index}`}>
                                  <td className="py-1">{new Date(point.time).toLocaleString()}</td>
                                  <td>
                                    {typeof point.value === 'boolean'
                                      ? t(point.value ? 'common.on' : 'common.off')
                                      : point.value.toLocaleString(undefined, {
                                          maximumFractionDigits: 3,
                                        })}
                                    {item.unit ? ` ${item.unit}` : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={`text-xs ${styles.subtleColor}`}>
                          {t('providerDetails.emptyHistory')}
                        </p>
                      )
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ModalSurface>
  );
}

function HubControl({
  resource,
  control,
  disabled,
  styles,
  onSave,
}: {
  resource: ProviderHubResource;
  control: ProviderHubControl;
  disabled: boolean;
  styles: SettingsSectionStyles;
  onSave: (value: boolean | number | string) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(String(control.value ?? ''));
  useEffect(() => setDraft(String(control.value ?? '')), [control.value]);
  const label =
    control.id === 'present'
      ? t('providerDetails.present')
      : control.id === 'asleep'
        ? t('providerDetails.asleep')
        : control.name;
  const accessibleLabel = `${resource.name}: ${label}`;
  const invalid =
    control.type === 'number' &&
    (draft.trim() === '' ||
      !Number.isFinite(Number(draft)) ||
      (control.min !== undefined && Number(draft) < control.min) ||
      (control.max !== undefined && Number(draft) > control.max));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`min-w-24 flex-1 text-xs ${styles.subtleColor}`}>
        {label}
        {control.unit ? ` (${control.unit})` : ''}
      </span>
      {!control.writable ? (
        <span className={`text-xs ${styles.textColor}`}>
          {control.value === null
            ? t('providerDetails.unknown')
            : typeof control.value === 'boolean'
              ? t(control.value ? 'common.on' : 'common.off')
              : control.value}
        </span>
      ) : control.type === 'boolean' ? (
        <Switch
          aria-label={accessibleLabel}
          checked={control.value === true}
          disabled={disabled}
          onCheckedChange={onSave}
        />
      ) : control.type === 'enum' ? (
        <Select
          aria-label={accessibleLabel}
          value={typeof control.value === 'string' ? control.value : ''}
          disabled={disabled}
          onChange={(event) => onSave(event.target.value)}
          containerClassName="min-w-36"
        >
          <option value="" disabled>
            {t('providerDetails.choose')}
          </option>
          {control.options?.map((option) => (
            <option value={option.id} key={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      ) : (
        <form
          className="flex min-w-40 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid && !disabled) onSave(control.type === 'number' ? Number(draft) : draft);
          }}
        >
          <Input
            aria-label={accessibleLabel}
            type={control.type === 'number' ? 'number' : 'text'}
            min={control.min}
            max={control.max}
            step={control.step ?? 'any'}
            value={draft}
            disabled={disabled}
            invalid={invalid}
            onChange={(event) => setDraft(event.target.value)}
            className="max-w-28"
          />
          <Button
            variant="secondary"
            size="small"
            type="submit"
            disabled={disabled || invalid || draft === String(control.value ?? '')}
          >
            {t('common.save')}
          </Button>
        </form>
      )}
    </div>
  );
}
