import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
} from '@navet/app/components/patterns';
import { BaseCardDialog, Button, Input, InteractivePill } from '@navet/app/components/primitives';
import { IconPicker } from '@navet/app/components/shared/device-editor';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
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
  if (action.targetType === 'url') {
    return { ...action };
  }

  return {
    ...action,
    targetType: 'url',
    targetSection: undefined,
    targetUrl: '',
  };
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

function getSidebarValidationMessage(action: CustomSidebarAction): string | null {
  if (!action.label.trim()) {
    return null;
  }

  if (action.targetType === 'url') {
    const safeUrl = sanitizeExternalUrl(
      action.targetUrl ?? '',
      typeof window !== 'undefined' ? window.location.href : undefined
    );

    if (!safeUrl) {
      return 'Enter a valid link.';
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
  const validationMessage = getSidebarValidationMessage(draft);
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
      title={draftExistingAction ? 'Edit sidebar action' : 'Add sidebar action'}
      description={
        draftExistingAction ? 'Change this sidebar shortcut.' : 'Create a new sidebar shortcut.'
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
            title={draftExistingAction ? 'Edit sidebar action' : 'Add sidebar action'}
            description={
              draftExistingAction
                ? 'Change this sidebar shortcut.'
                : 'Create a new sidebar shortcut.'
            }
            showRoomSelector={false}
          />

          <div className="mt-5 space-y-4">
            <CardDialogSection
              label="Name"
              helperText="Choose the label shown in the sidebar."
              helperTextClassName={surface.textMuted}
              labelClassName={surface.textPrimary}
            >
              <Input
                value={draft.label}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, label: event.currentTarget.value }))
                }
                placeholder="Movie time"
                aria-label="Sidebar action label"
                maxLength={28}
              />
            </CardDialogSection>

            <CardDialogSection
              label="Destination"
              helperText="Paste the link this shortcut should open."
              helperTextClassName={surface.textMuted}
              labelClassName={surface.textPrimary}
            >
              <div className="space-y-3">
                <Input
                  value={draft.targetUrl ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      targetType: 'url',
                      targetSection: undefined,
                      targetUrl: event.currentTarget.value,
                    }))
                  }
                  placeholder="https://navet.app/"
                  aria-label="Sidebar action URL"
                />

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
                label="Sidebar icon"
                inputVariant="default"
              />
            </CardDialogSection>

            {hasReachedLimit ? (
              <div
                className={`rounded-[20px] border px-4 py-3 text-sm text-red-300 ${surface.border} ${surface.panelMuted}`}
              >
                You already have {ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT} custom sidebar actions. Edit
                or remove one before adding another.
              </div>
            ) : null}
          </div>

          <CardDialogFooter className="justify-between">
            <div className="flex items-center gap-2">
              {draftExistingAction ? (
                <InteractivePill active size="small" accentColor="#e11d48" onClick={handleDelete}>
                  Delete
                </InteractivePill>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="small" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" size="small" onClick={handleSave} disabled={!canSave}>
                {draftExistingAction ? 'Save changes' : 'Add sidebar action'}
              </Button>
            </div>
          </CardDialogFooter>
        </CardDialogBody>
      </div>
    </BaseCardDialog>
  );
}
