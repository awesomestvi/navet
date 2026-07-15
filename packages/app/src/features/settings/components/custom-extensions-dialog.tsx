import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
} from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  Input,
  InteractivePill,
  Select,
} from '@navet/app/components/primitives';
import { IconPicker } from '@navet/app/components/shared/device-editor';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { TranslateFn, TranslationKey } from '@navet/app/i18n';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import {
  ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
  type CustomSidebarAction,
  createCustomExtensionId,
  normalizeCustomExtensionLabel,
} from '@navet/app/utils/custom-extensions';
import { sanitizeExternalUrl } from '@navet/app/utils/url-security';
import { useEffect, useMemo, useState } from 'react';

interface CustomExtensionsDialogProps {
  editingActionId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'sidebar';
}

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

function createEmptySidebarActionDraft(): CustomSidebarAction {
  return {
    id: createCustomExtensionId('sidebar'),
    label: '',
    icon: 'link',
    targetType: 'url',
    targetUrl: '',
    visibility: 'always',
  };
}

function coerceSidebarDraftForDialog(action: CustomSidebarAction): CustomSidebarAction {
  return { ...action };
}

function normalizeSidebarDraft(action: CustomSidebarAction): CustomSidebarAction | null {
  const label = normalizeCustomExtensionLabel(action.label);
  if (!label) {
    return null;
  }

  if (action.targetType === 'section') {
    if (!action.targetSection) {
      return null;
    }

    return {
      ...action,
      label,
      visibility: 'always',
      targetSection: action.targetSection,
      targetUrl: undefined,
    };
  }

  const targetUrl = sanitizeExternalUrl(
    action.targetUrl ?? '',
    typeof window !== 'undefined' ? window.location.href : undefined
  );

  if (!targetUrl) {
    return null;
  }

  return {
    ...action,
    label,
    visibility: 'always',
    targetUrl,
    targetSection: undefined,
  };
}

function getSidebarValidationMessage(action: CustomSidebarAction, t: TranslateFn): string | null {
  if (!action.label.trim()) {
    return null;
  }

  if (action.targetType === 'url' || action.targetType === 'iframe') {
    const safeUrl = sanitizeExternalUrl(
      action.targetUrl ?? '',
      typeof window !== 'undefined' ? window.location.href : undefined
    );

    if (!safeUrl) {
      return t('settings.customExtensions.dialog.validLink');
    }
  }

  return null;
}

export function CustomExtensionsDialog({
  editingActionId,
  isOpen,
  onOpenChange,
  mode,
}: CustomExtensionsDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const customSidebarActions = useSettingsStore(settingsSelectors.customSidebarActions);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);
  const [draft, setDraft] = useState<CustomSidebarAction>(createEmptySidebarActionDraft);

  const existingAction = useMemo(
    () => customSidebarActions.find((entry) => entry.id === editingActionId) ?? null,
    [customSidebarActions, editingActionId]
  );
  const draftExistingAction = useMemo(
    () => customSidebarActions.find((entry) => entry.id === draft.id) ?? null,
    [customSidebarActions, draft.id]
  );
  const hasReachedLimit =
    draftExistingAction === null &&
    customSidebarActions.length >= ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT;
  const validationMessage = getSidebarValidationMessage(draft, t);
  const normalizedDraft = normalizeSidebarDraft(draft);
  const canSave = !hasReachedLimit && normalizedDraft !== null;

  useEffect(() => {
    if (!isOpen || mode !== 'sidebar') {
      return;
    }

    if (existingAction) {
      setDraft(coerceSidebarDraftForDialog(existingAction));
      return;
    }

    setDraft(createEmptySidebarActionDraft());
  }, [existingAction, isOpen, mode]);

  const handleClose = () => onOpenChange(false);

  const handleDelete = () => {
    if (!draftExistingAction) {
      return;
    }

    updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: customSidebarActions.filter(
        (entry) => entry.id !== draftExistingAction.id
      ),
    });
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!normalizedDraft || hasReachedLimit) {
      return;
    }

    const nextActions = draftExistingAction
      ? customSidebarActions.map((entry) =>
          entry.id === normalizedDraft.id ? normalizedDraft : entry
        )
      : [...customSidebarActions, normalizedDraft].slice(0, ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT);

    updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: nextActions,
    });
    onOpenChange(false);
  };

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        draftExistingAction
          ? t('settings.customExtensions.dialog.editTitle')
          : t('settings.customExtensions.dialog.addTitle')
      }
      description={
        draftExistingAction
          ? t('settings.customExtensions.dialog.editDescription')
          : t('settings.customExtensions.dialog.addDescription')
      }
      theme={theme}
      disableOpenAutoFocus
      maxWidth="md"
      height="capped"
      bodyPadding={false}
    >
      <div className="max-h-[85vh] w-full min-w-0 overflow-y-auto">
        <CardDialogBody>
          <CardDialogHeader
            title={
              draftExistingAction
                ? t('settings.customExtensions.dialog.editTitle')
                : t('settings.customExtensions.dialog.addTitle')
            }
            description={
              draftExistingAction
                ? t('settings.customExtensions.dialog.editDescription')
                : t('settings.customExtensions.dialog.addDescription')
            }
            showRoomSelector={false}
          />

          <div className="mt-5 space-y-4">
            <CardDialogSection
              label={t('settings.customExtensions.dialog.name')}
              helperText={t('settings.customExtensions.dialog.nameHelp')}
              helperTextClassName={surface.textMuted}
              labelClassName={surface.textPrimary}
            >
              <Input
                value={draft.label}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, label: event.currentTarget.value }))
                }
                placeholder={t('settings.customExtensions.dialog.namePlaceholder')}
                aria-label={t('settings.customExtensions.sidebar.labelAria')}
                maxLength={28}
              />
            </CardDialogSection>

            <CardDialogSection
              label={t('settings.customExtensions.dialog.destinationType')}
              helperText={t('settings.customExtensions.dialog.destinationTypeHelp')}
              helperTextClassName={surface.textMuted}
              labelClassName={surface.textPrimary}
            >
              <Select
                value={draft.targetType}
                onChange={(event) =>
                  setDraft((current) => {
                    const nextType = event.currentTarget.value as CustomSidebarAction['targetType'];

                    return nextType === 'section'
                      ? {
                          ...current,
                          targetType: 'section',
                          targetSection: current.targetSection ?? 'home',
                          targetUrl: undefined,
                        }
                      : {
                          ...current,
                          targetType: nextType,
                          targetSection: undefined,
                          targetUrl: current.targetUrl ?? '',
                        };
                  })
                }
                aria-label={t('settings.customExtensions.sidebar.targetAria')}
              >
                <option value="section">{t('settings.customExtensions.target.section')}</option>
                <option value="url">{t('settings.customExtensions.target.url')}</option>
                <option value="iframe">{t('settings.customExtensions.target.iframe')}</option>
              </Select>
            </CardDialogSection>

            <CardDialogSection
              label={t('settings.customExtensions.dialog.destination')}
              helperText={
                draft.targetType === 'section'
                  ? t('settings.customExtensions.dialog.sectionHelp')
                  : draft.targetType === 'iframe'
                    ? t('settings.customExtensions.dialog.embedHelp')
                    : t('settings.customExtensions.dialog.urlHelp')
              }
              helperTextClassName={surface.textMuted}
              labelClassName={surface.textPrimary}
            >
              <div className="space-y-3">
                {draft.targetType === 'section' ? (
                  <Select
                    value={draft.targetSection ?? 'home'}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        targetType: 'section',
                        targetSection: event.currentTarget
                          .value as CustomSidebarAction['targetSection'],
                        targetUrl: undefined,
                      }))
                    }
                    aria-label={t('settings.customExtensions.sidebar.sectionAria')}
                  >
                    {SECTION_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={draft.targetUrl ?? ''}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        targetType: current.targetType === 'iframe' ? 'iframe' : 'url',
                        targetSection: undefined,
                        targetUrl: event.currentTarget.value,
                      }))
                    }
                    placeholder="https://navet.app/"
                    aria-label={t('settings.customExtensions.sidebar.urlAria')}
                  />
                )}

                {validationMessage ? (
                  <p className="text-sm text-red-300">{validationMessage}</p>
                ) : null}
              </div>
            </CardDialogSection>

            <CardDialogSection>
              <IconPicker
                selectedIcon={draft.icon}
                onIconChange={(iconName) =>
                  setDraft((current) => ({
                    ...current,
                    icon: iconName,
                  }))
                }
                isLightOn={theme !== 'light'}
                label={t('settings.customExtensions.dialog.icon')}
                inputVariant="default"
              />
            </CardDialogSection>

            {hasReachedLimit ? (
              <div
                className={`rounded-[20px] border px-4 py-3 text-sm text-red-300 ${surface.border} ${surface.panelMuted}`}
              >
                {t('settings.customExtensions.dialog.limit', {
                  count: ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
                })}
              </div>
            ) : null}
          </div>

          <CardDialogFooter className="justify-between">
            <div className="flex items-center gap-2">
              {draftExistingAction ? (
                <InteractivePill active size="small" accentColor="#e11d48" onClick={handleDelete}>
                  {t('settings.customExtensions.dialog.delete')}
                </InteractivePill>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="small" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" size="small" onClick={handleSave} disabled={!canSave}>
                {draftExistingAction
                  ? t('settings.customExtensions.dialog.saveChanges')
                  : t('settings.customExtensions.sidebar.add')}
              </Button>
            </div>
          </CardDialogFooter>
        </CardDialogBody>
      </div>
    </BaseCardDialog>
  );
}
