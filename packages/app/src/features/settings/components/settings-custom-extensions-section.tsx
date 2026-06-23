import { Button, Input, Select } from '@navet/app/components/primitives';
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
  ['home', 'Home'],
  ['energy', 'Energy'],
  ['climate', 'Climate'],
  ['security', 'Security'],
  ['lights', 'Lights'],
  ['media', 'Media'],
  ['tasks', 'Tasks'],
  ['settings', 'Settings'],
  ['link', 'Link'],
  ['sparkles', 'Sparkles'],
  ['bell', 'Bell'],
] as const;

const SECTION_OPTIONS = [
  ['home', 'Home'],
  ['energy', 'Energy'],
  ['climate', 'Climate'],
  ['security', 'Security'],
  ['lights', 'Lights'],
  ['media', 'Media'],
  ['tasks', 'Tasks'],
  ['settings', 'Settings'],
] as const;

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
          title="Custom extensions"
          description="Opt into curated extension slots for extra sidebar actions and summary pills. These options stay bounded on purpose and may need manual setup."
          styles={styles}
        >
          <div className="space-y-3">
            <OnOffPillToggle
              value={advancedCustomizationEnabled}
              onChange={(checked) => updateSettings({ advancedCustomizationEnabled: checked })}
              ariaLabel="Advanced customization"
            />
            <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
              Advanced options can make Navet less consistent and may need manual setup.
            </p>
          </div>
        </SettingsItem>
      ) : null}

      {editorEnabled ? (
        <>
          {showSidebarEditor ? (
            <SettingsItem
              title="Sidebar actions"
              description={`Add up to ${ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT} curated actions that appear alongside Navet's built-in sidebar destinations.`}
              styles={styles}
            >
              <div className="space-y-3">
                {sidebarDrafts.length === 0 ? (
                  <p className={`text-sm leading-relaxed ${styles.subtleColor}`}>
                    No custom sidebar actions yet.
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
                          placeholder="Label"
                          aria-label="Sidebar action label"
                        />
                        <Select
                          aria-label="Sidebar action icon"
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
                              {label}
                            </option>
                          ))}
                        </Select>
                        <Select
                          aria-label="Sidebar action target"
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
                          <option value="section">Open section</option>
                          <option value="url">Open URL</option>
                          <option value="iframe">Open inside Navet</option>
                        </Select>
                        <Select
                          aria-label="Sidebar action visibility"
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
                          <option value="always">Desktop and mobile</option>
                          <option value="desktop_only">Desktop only</option>
                          <option value="mobile_only">Mobile only</option>
                        </Select>
                        {item.targetType === 'section' ? (
                          <Select
                            aria-label="Sidebar action section"
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
                                {label}
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
                            aria-label="Sidebar action URL"
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
                              ? 'Matches Navet’s embedded sidebar rules. Some sites may still block framing.'
                              : 'Matches Navet’s curated sidebar slot rules.'
                            : 'Add a label and a valid section or URL before saving.'}
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
                          Remove
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
                    Add sidebar action
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
                    Save sidebar actions
                  </Button>
                </div>
              </div>
            </SettingsItem>
          ) : null}

          {showSummaryEditor ? (
            <SettingsItem
              title="Summary pills"
              description={`Add up to ${ADVANCED_CUSTOM_SUMMARY_PILL_LIMIT} custom pills in the home summary bar using a fixed Navet-owned schema.`}
              styles={styles}
            >
              <div className="space-y-3">
                {summaryDrafts.length === 0 ? (
                  <p className={`text-sm leading-relaxed ${styles.subtleColor}`}>
                    No custom summary pills yet.
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
                          placeholder="Label"
                          aria-label="Summary pill label"
                        />
                        <Select
                          aria-label="Summary pill icon"
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
                              {label}
                            </option>
                          ))}
                        </Select>
                        <Select
                          aria-label="Summary value source"
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
                          <option value="static">Static text</option>
                          <option value="entity">Entity value</option>
                        </Select>
                        <Select
                          aria-label="Summary pill visibility"
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
                          <option value="always">Always show</option>
                          <option value="when_value_available">Only when value is available</option>
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
                            placeholder="Ready"
                            aria-label="Summary pill value"
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
                            aria-label="Summary pill entity ID"
                            containerClassName="md:col-span-2"
                          />
                        )}
                        <Select
                          aria-label="Summary pill action"
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
                          <option value="none">No tap action</option>
                          <option value="section">Open section</option>
                          <option value="url">Open URL</option>
                        </Select>
                        {(item.actionType ?? 'none') === 'section' ? (
                          <Select
                            aria-label="Summary pill section"
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
                                {label}
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
                            aria-label="Summary pill action URL"
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
                            ? 'Uses the bounded summary-pill model.'
                            : 'Add a label, a value source, and any required action target before saving.'}
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
                          Remove
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
                    Add summary pill
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
                    Save summary pills
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
