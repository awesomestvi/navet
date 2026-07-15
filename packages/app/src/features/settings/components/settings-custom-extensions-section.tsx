import { Button, Input, Select } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import {
  ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
  ADVANCED_CUSTOM_SUMMARY_PILL_LIMIT,
  type CustomSidebarAction,
  type CustomSummaryPill,
  createCustomExtensionId,
} from '@navet/app/utils/custom-extensions';
import { sanitizeExternalUrl } from '@navet/app/utils/url-security';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { OnOffPillToggle } from './settings-pill-toggle';
import { SettingsItem } from './settings-section-shell';

interface SettingsCustomExtensionsSectionProps {
  controller: SettingsSectionController;
  mode?: 'all' | 'sidebar' | 'summary';
  showActivation?: boolean;
}

const ICON_OPTIONS = [
  ['home', 'sidebar.home'],
  ['energy', 'sidebar.energy'],
  ['climate', 'sidebar.climate'],
  ['security', 'sidebar.security'],
  ['lights', 'sidebar.lights'],
  ['media', 'sidebar.media'],
  ['tasks', 'sidebar.tasks'],
  ['settings', 'sidebar.settings'],
  ['link', 'settings.customExtensions.icon.link'],
  ['sparkles', 'settings.customExtensions.icon.sparkles'],
  ['bell', 'settings.customExtensions.icon.bell'],
] as const satisfies ReadonlyArray<readonly [string, TranslationKey]>;

const SECTION_OPTIONS = [
  ['home', 'sidebar.home'],
  ['energy', 'sidebar.energy'],
  ['climate', 'sidebar.climate'],
  ['security', 'sidebar.security'],
  ['lights', 'sidebar.lights'],
  ['media', 'sidebar.media'],
  ['tasks', 'sidebar.tasks'],
  ['settings', 'sidebar.settings'],
] as const satisfies ReadonlyArray<readonly [string, TranslationKey]>;

function isValidSidebarDraft(action: CustomSidebarAction): boolean {
  if (!action.label.trim()) {
    return false;
  }

  if (action.targetType === 'section') {
    return Boolean(action.targetSection);
  }

  return Boolean(
    sanitizeExternalUrl(
      action.targetUrl ?? '',
      typeof window !== 'undefined' ? window.location.href : undefined
    )
  );
}

function isValidSummaryDraft(item: CustomSummaryPill): boolean {
  if (!item.label.trim()) {
    return false;
  }

  const hasValue =
    item.valueSourceType === 'static'
      ? Boolean(item.staticValue?.trim())
      : Boolean(item.entityId?.trim());

  if (!hasValue) {
    return false;
  }

  if (item.actionType === 'section') {
    return Boolean(item.actionSection);
  }

  if (item.actionType === 'url') {
    return Boolean(
      sanitizeExternalUrl(
        item.actionUrl ?? '',
        typeof window !== 'undefined' ? window.location.href : undefined
      )
    );
  }

  return true;
}

export function SettingsCustomExtensionsSection({
  controller,
  mode = 'all',
  showActivation = true,
}: SettingsCustomExtensionsSectionProps) {
  const { t } = useI18n();
  const {
    advancedCustomizationEnabled,
    customSidebarActions,
    customSummaryPills,
    styles,
    updateSettings,
  } = controller;
  const [sidebarDrafts, setSidebarDrafts] = useState<CustomSidebarAction[]>(customSidebarActions);
  const [summaryDrafts, setSummaryDrafts] = useState<CustomSummaryPill[]>(customSummaryPills);

  useEffect(() => {
    setSidebarDrafts(customSidebarActions);
  }, [customSidebarActions]);

  useEffect(() => {
    setSummaryDrafts(customSummaryPills);
  }, [customSummaryPills]);

  const sidebarHasErrors = useMemo(
    () => sidebarDrafts.some((item) => !isValidSidebarDraft(item)),
    [sidebarDrafts]
  );
  const summaryHasErrors = useMemo(
    () => summaryDrafts.some((item) => !isValidSummaryDraft(item)),
    [summaryDrafts]
  );
  const editorEnabled = showActivation ? advancedCustomizationEnabled : true;
  const showSidebarEditor = mode === 'all' || mode === 'sidebar';
  const showSummaryEditor = mode === 'all' || mode === 'summary';

  return (
    <>
      {showActivation ? (
        <SettingsItem
          title={t('settings.customExtensions.title')}
          description={t('settings.customExtensions.description')}
          styles={styles}
        >
          <div className="space-y-3">
            <OnOffPillToggle
              value={advancedCustomizationEnabled}
              onChange={(checked) => updateSettings({ advancedCustomizationEnabled: checked })}
              ariaLabel={t('settings.customExtensions.advancedAria')}
            />
            <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
              {t('settings.customExtensions.warning')}
            </p>
          </div>
        </SettingsItem>
      ) : null}

      {editorEnabled ? (
        <>
          {showSidebarEditor ? (
            <SettingsItem
              title={t('settings.customExtensions.sidebar.title')}
              description={t('settings.customExtensions.sidebar.description', {
                count: ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
              })}
              styles={styles}
            >
              <div className="space-y-3">
                {sidebarDrafts.length === 0 ? (
                  <p className={`text-sm leading-relaxed ${styles.subtleColor}`}>
                    {t('settings.customExtensions.sidebar.empty')}
                  </p>
                ) : null}

                {sidebarDrafts.map((item) => {
                  const isValid = isValidSidebarDraft(item);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-[20px] border p-3 md:p-4 ${styles.borderColor} ${styles.softBg}`}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          value={item.label}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setSidebarDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id ? { ...entry, label: nextValue } : entry
                              )
                            );
                          }}
                          placeholder={t('settings.customExtensions.labelPlaceholder')}
                          aria-label={t('settings.customExtensions.sidebar.labelAria')}
                        />
                        <Select
                          aria-label={t('settings.customExtensions.sidebar.iconAria')}
                          value={item.icon}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSidebarAction['icon'];
                            setSidebarDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      icon: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          {ICON_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {t(label)}
                            </option>
                          ))}
                        </Select>
                        <Select
                          aria-label={t('settings.customExtensions.sidebar.targetAria')}
                          value={item.targetType}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSidebarAction['targetType'];
                            setSidebarDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      targetType: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          <option value="section">
                            {t('settings.customExtensions.target.section')}
                          </option>
                          <option value="url">{t('settings.customExtensions.target.url')}</option>
                          <option value="iframe">
                            {t('settings.customExtensions.target.iframe')}
                          </option>
                        </Select>
                        <Select
                          aria-label={t('settings.customExtensions.sidebar.visibilityAria')}
                          value={item.visibility ?? 'always'}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSidebarAction['visibility'];
                            setSidebarDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      visibility: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          <option value="always">
                            {t('settings.customExtensions.visibility.all')}
                          </option>
                          <option value="desktop_only">
                            {t('settings.customExtensions.visibility.desktop')}
                          </option>
                          <option value="mobile_only">
                            {t('settings.customExtensions.visibility.mobile')}
                          </option>
                        </Select>
                        {item.targetType === 'section' ? (
                          <Select
                            aria-label={t('settings.customExtensions.sidebar.sectionAria')}
                            value={item.targetSection ?? 'home'}
                            onChange={(event) => {
                              const nextValue = event.currentTarget
                                .value as CustomSidebarAction['targetSection'];
                              setSidebarDrafts((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        targetSection: nextValue,
                                      }
                                    : entry
                                )
                              );
                            }}
                            containerClassName="md:col-span-2"
                          >
                            {SECTION_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {t(label)}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            value={item.targetUrl ?? ''}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSidebarDrafts((current) =>
                                current.map((entry) =>
                                  entry.id === item.id ? { ...entry, targetUrl: nextValue } : entry
                                )
                              );
                            }}
                            placeholder="https://example.com"
                            aria-label={t('settings.customExtensions.sidebar.urlAria')}
                            containerClassName="md:col-span-2"
                          />
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p
                          className={`text-sm leading-relaxed ${isValid ? styles.subtleColor : 'text-amber-300'}`}
                        >
                          {isValid
                            ? item.targetType === 'iframe'
                              ? t('settings.customExtensions.sidebar.validEmbedded')
                              : t('settings.customExtensions.sidebar.valid')
                            : t('settings.customExtensions.sidebar.invalid')}
                        </p>
                        <Button
                          variant="ghost"
                          size="small"
                          leading={<Trash2 className="h-4 w-4" />}
                          onClick={() =>
                            setSidebarDrafts((current) =>
                              current.filter((entry) => entry.id !== item.id)
                            )
                          }
                        >
                          {t('settings.customExtensions.remove')}
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    leading={<Plus className="h-4 w-4" />}
                    disabled={sidebarDrafts.length >= ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT}
                    onClick={() =>
                      setSidebarDrafts((current) => [
                        ...current,
                        {
                          id: createCustomExtensionId('sidebar'),
                          label: '',
                          icon: 'link',
                          targetType: 'section',
                          targetSection: 'home',
                          visibility: 'always',
                        },
                      ])
                    }
                  >
                    {t('settings.customExtensions.sidebar.add')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={sidebarHasErrors}
                    onClick={() =>
                      updateSettings({
                        advancedCustomizationEnabled: true,
                        customSidebarActions: sidebarDrafts,
                      })
                    }
                  >
                    {t('settings.customExtensions.sidebar.save')}
                  </Button>
                </div>
              </div>
            </SettingsItem>
          ) : null}

          {showSummaryEditor ? (
            <SettingsItem
              title={t('settings.customExtensions.summary.title')}
              description={t('settings.customExtensions.summary.description', {
                count: ADVANCED_CUSTOM_SUMMARY_PILL_LIMIT,
              })}
              styles={styles}
            >
              <div className="space-y-3">
                {summaryDrafts.length === 0 ? (
                  <p className={`text-sm leading-relaxed ${styles.subtleColor}`}>
                    {t('settings.customExtensions.summary.empty')}
                  </p>
                ) : null}

                {summaryDrafts.map((item) => {
                  const isValid = isValidSummaryDraft(item);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-[20px] border p-3 md:p-4 ${styles.borderColor} ${styles.softBg}`}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          value={item.label}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setSummaryDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id ? { ...entry, label: nextValue } : entry
                              )
                            );
                          }}
                          placeholder={t('settings.customExtensions.labelPlaceholder')}
                          aria-label={t('settings.customExtensions.summary.labelAria')}
                        />
                        <Select
                          aria-label={t('settings.customExtensions.summary.iconAria')}
                          value={item.icon}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSummaryPill['icon'];
                            setSummaryDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      icon: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          {ICON_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {t(label)}
                            </option>
                          ))}
                        </Select>
                        <Select
                          aria-label={t('settings.customExtensions.summary.sourceAria')}
                          value={item.valueSourceType}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSummaryPill['valueSourceType'];
                            setSummaryDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      valueSourceType: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          <option value="static">
                            {t('settings.customExtensions.source.static')}
                          </option>
                          <option value="entity">
                            {t('settings.customExtensions.source.entity')}
                          </option>
                        </Select>
                        <Select
                          aria-label={t('settings.customExtensions.summary.visibilityAria')}
                          value={item.visibility ?? 'always'}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSummaryPill['visibility'];
                            setSummaryDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      visibility: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          <option value="always">
                            {t('settings.customExtensions.visibility.always')}
                          </option>
                          <option value="when_value_available">
                            {t('settings.customExtensions.visibility.available')}
                          </option>
                        </Select>
                        {item.valueSourceType === 'static' ? (
                          <Input
                            value={item.staticValue ?? ''}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSummaryDrafts((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? { ...entry, staticValue: nextValue }
                                    : entry
                                )
                              );
                            }}
                            placeholder={t('settings.customExtensions.summary.valuePlaceholder')}
                            aria-label={t('settings.customExtensions.summary.valueAria')}
                            containerClassName="md:col-span-2"
                          />
                        ) : (
                          <Input
                            value={item.entityId ?? ''}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSummaryDrafts((current) =>
                                current.map((entry) =>
                                  entry.id === item.id ? { ...entry, entityId: nextValue } : entry
                                )
                              );
                            }}
                            placeholder="sensor.entryway_temperature"
                            aria-label={t('settings.customExtensions.summary.entityAria')}
                            containerClassName="md:col-span-2"
                          />
                        )}
                        <Select
                          aria-label={t('settings.customExtensions.summary.actionAria')}
                          value={item.actionType ?? 'none'}
                          onChange={(event) => {
                            const nextValue = event.currentTarget
                              .value as CustomSummaryPill['actionType'];
                            setSummaryDrafts((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      actionType: nextValue,
                                    }
                                  : entry
                              )
                            );
                          }}
                        >
                          <option value="none">{t('settings.customExtensions.action.none')}</option>
                          <option value="section">
                            {t('settings.customExtensions.target.section')}
                          </option>
                          <option value="url">{t('settings.customExtensions.target.url')}</option>
                        </Select>
                        {(item.actionType ?? 'none') === 'section' ? (
                          <Select
                            aria-label={t('settings.customExtensions.summary.sectionAria')}
                            value={item.actionSection ?? 'home'}
                            onChange={(event) => {
                              const nextValue = event.currentTarget
                                .value as CustomSummaryPill['actionSection'];
                              setSummaryDrafts((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        actionSection: nextValue,
                                      }
                                    : entry
                                )
                              );
                            }}
                          >
                            {SECTION_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>
                                {t(label)}
                              </option>
                            ))}
                          </Select>
                        ) : (item.actionType ?? 'none') === 'url' ? (
                          <Input
                            value={item.actionUrl ?? ''}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSummaryDrafts((current) =>
                                current.map((entry) =>
                                  entry.id === item.id ? { ...entry, actionUrl: nextValue } : entry
                                )
                              );
                            }}
                            placeholder="https://example.com/status"
                            aria-label={t('settings.customExtensions.summary.actionUrlAria')}
                          />
                        ) : (
                          <div />
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p
                          className={`text-sm leading-relaxed ${isValid ? styles.subtleColor : 'text-amber-300'}`}
                        >
                          {isValid
                            ? t('settings.customExtensions.summary.valid')
                            : t('settings.customExtensions.summary.invalid')}
                        </p>
                        <Button
                          variant="ghost"
                          size="small"
                          leading={<Trash2 className="h-4 w-4" />}
                          onClick={() =>
                            setSummaryDrafts((current) =>
                              current.filter((entry) => entry.id !== item.id)
                            )
                          }
                        >
                          {t('settings.customExtensions.remove')}
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    leading={<Plus className="h-4 w-4" />}
                    disabled={summaryDrafts.length >= ADVANCED_CUSTOM_SUMMARY_PILL_LIMIT}
                    onClick={() =>
                      setSummaryDrafts((current) => [
                        ...current,
                        {
                          id: createCustomExtensionId('summary'),
                          label: '',
                          icon: 'sparkles',
                          valueSourceType: 'static',
                          staticValue: '',
                          actionType: 'none',
                          visibility: 'always',
                        },
                      ])
                    }
                  >
                    {t('settings.customExtensions.summary.add')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={summaryHasErrors}
                    onClick={() =>
                      updateSettings({
                        advancedCustomizationEnabled: true,
                        customSummaryPills: summaryDrafts,
                      })
                    }
                  >
                    {t('settings.customExtensions.summary.save')}
                  </Button>
                </div>
              </div>
            </SettingsItem>
          ) : null}
        </>
      ) : null}
    </>
  );
}
