import { Button, Input, ModalSurface } from '@navet/app/components/primitives';
import {
  createDeviceDisplayProfileId,
  DEVICE_DISPLAY_PROFILE_LIMIT,
  getLinkedDeviceDisplayProfile,
  projectDeviceDisplaySettings,
} from '@navet/app/features/dashboard/clients/device-display-profile';
import { useDeviceDisplayProfileRuntimeStore } from '@navet/app/features/dashboard/clients/device-display-profile-runtime-store';
import type { SettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { useI18n } from '@navet/app/hooks';
import type { DashboardProfileClient } from '@navet/app/services/dashboard-profile.contract';
import { copyDashboardDisplaySettings } from '@navet/app/services/dashboard-profile.service';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { Check, Copy, Link2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

type DialogMode = 'copy' | 'create' | 'manage' | null;

function clientSelectionRow({
  checked,
  client,
  onChange,
  styles,
}: {
  checked: boolean;
  client: DashboardProfileClient;
  onChange: () => void;
  styles: SettingsSectionStyles;
}) {
  return (
    <button
      key={client.id}
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`flex min-h-12 w-full items-center gap-3 rounded-[16px] border px-3 py-2 text-left transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg}`}
    >
      <span className={`min-w-0 flex-1 truncate text-sm ${styles.textColor}`}>{client.name}</span>
      {checked ? <Check className={`h-4 w-4 shrink-0 ${styles.textColor}`} /> : null}
    </button>
  );
}

export function SettingsDeviceDisplaySync({
  clients,
  currentClient,
  styles,
}: {
  clients: DashboardProfileClient[];
  currentClient: DashboardProfileClient;
  styles: SettingsSectionStyles;
}) {
  const { t } = useI18n();
  const { error, loaded, policy, status, updatePolicy } = useDeviceDisplayProfileRuntimeStore(
    useShallow((state) => ({
      error: state.error,
      loaded: state.loaded,
      policy: state.policy,
      status: state.status,
      updatePolicy: state.updatePolicy,
    }))
  );
  const allClients = useMemo<DashboardProfileClient[]>(
    () => [
      currentClient,
      ...clients
        .filter((client) => client.id !== currentClient.id)
        .map(({ id, kind, name }) => ({ id, kind, name })),
    ],
    [clients, currentClient]
  );
  const profiles = Object.values(policy.profilesById).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const linkedProfile = getLinkedDeviceDisplayProfile(policy, currentClient.id);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('');
  const [managingProfileId, setManagingProfileId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const openCopy = () => {
    setSelectedClientIds(
      allClients.filter(({ id }) => id !== currentClient.id).map(({ id }) => id)
    );
    setActionError(false);
    setDialogMode('copy');
  };

  const openCreate = () => {
    setProfileName('');
    setSelectedClientIds([currentClient.id]);
    setActionError(false);
    setDialogMode('create');
  };

  const openManage = (profileId: string) => {
    setManagingProfileId(profileId);
    setSelectedClientIds(
      Object.entries(policy.profileIdByClientId).flatMap(([clientId, assignedProfileId]) =>
        assignedProfileId === profileId ? [clientId] : []
      )
    );
    setActionError(false);
    setDialogMode('manage');
  };

  const toggleClient = (clientId: string) => {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((candidate) => candidate !== clientId)
        : [...current, clientId]
    );
  };

  const copySettings = async () => {
    if (selectedClientIds.length === 0 || copying) {
      return;
    }
    setCopying(true);
    setActionError(false);
    try {
      const result = await copyDashboardDisplaySettings(
        projectDeviceDisplaySettings(useSettingsStore.getState()),
        selectedClientIds,
        currentClient
      );
      if (!result) {
        setActionError(true);
        return;
      }
      setDialogMode(null);
      setActionMessage(
        t('settings.system.clients.displaySync.copySuccess', {
          count: result.updatedClientIds.length,
        })
      );
    } catch {
      setActionError(true);
    } finally {
      setCopying(false);
    }
  };

  const createProfile = () => {
    const name = profileName.trim();
    if (
      !name ||
      selectedClientIds.length === 0 ||
      profiles.length >= DEVICE_DISPLAY_PROFILE_LIMIT
    ) {
      return;
    }
    const profileId = createDeviceDisplayProfileId();
    const timestamp = new Date().toISOString();
    updatePolicy((current) => ({
      ...current,
      profilesById: {
        ...current.profilesById,
        [profileId]: {
          id: profileId,
          name,
          settings: projectDeviceDisplaySettings(useSettingsStore.getState()),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      profileIdByClientId: {
        ...Object.fromEntries(
          Object.entries(current.profileIdByClientId).filter(
            ([clientId]) => !selectedClientIds.includes(clientId)
          )
        ),
        ...Object.fromEntries(selectedClientIds.map((clientId) => [clientId, profileId])),
      },
    }));
    setDialogMode(null);
    setActionMessage(t('settings.system.clients.displaySync.profileCreated', { name }));
  };

  const saveProfileAssignments = () => {
    const profileId = managingProfileId;
    if (!profileId || !policy.profilesById[profileId]) {
      return;
    }
    updatePolicy((current) => ({
      ...current,
      profileIdByClientId: {
        ...Object.fromEntries(
          Object.entries(current.profileIdByClientId).filter(
            ([clientId, assignedProfileId]) =>
              assignedProfileId !== profileId && !selectedClientIds.includes(clientId)
          )
        ),
        ...Object.fromEntries(selectedClientIds.map((clientId) => [clientId, profileId])),
      },
    }));
    setDialogMode(null);
    setActionMessage(t('settings.system.clients.displaySync.profileUpdated'));
  };

  const deleteProfile = () => {
    const profileId = managingProfileId;
    if (!profileId) {
      return;
    }
    updatePolicy((current) => {
      const profilesById = { ...current.profilesById };
      delete profilesById[profileId];
      return {
        ...current,
        profilesById,
        profileIdByClientId: Object.fromEntries(
          Object.entries(current.profileIdByClientId).filter(
            ([, assignedProfileId]) => assignedProfileId !== profileId
          )
        ),
      };
    });
    setDialogMode(null);
    setActionMessage(t('settings.system.clients.displaySync.profileDeleted'));
  };

  const dialogTitle =
    dialogMode === 'copy'
      ? t('settings.system.clients.displaySync.copyTitle')
      : dialogMode === 'create'
        ? t('settings.system.clients.displaySync.createTitle')
        : t('settings.system.clients.displaySync.manageTitle');

  return (
    <>
      <div
        className={`overflow-hidden rounded-[22px] border ${styles.insetBorderColor} ${styles.insetBg}`}
      >
        <div className="p-4 md:p-5">
          <div className="min-w-0">
            <p className={`text-sm font-medium ${styles.textColor}`}>
              {t('settings.system.clients.displaySync.title')}
            </p>
            <p className={`mt-1 text-sm leading-6 ${styles.subtleColor}`}>
              {t('settings.system.clients.displaySync.description')}
            </p>
            <div className={`mt-3 flex items-center gap-2 ${styles.mutedColor}`}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
              <p className="text-xs font-medium">
                {linkedProfile
                  ? t('settings.system.clients.displaySync.linkedTo', {
                      name: linkedProfile.name,
                    })
                  : t('settings.system.clients.displaySync.independent')}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                variant="secondary"
                size="small"
                leading={<Copy className="h-4 w-4" />}
                disabled={!loaded || status === 'disabled' || allClients.length < 2}
                onClick={openCopy}
              >
                {t('settings.system.clients.displaySync.copy')}
              </Button>
              <Button
                className="rounded-full"
                variant="secondary"
                size="small"
                leading={<Link2 className="h-4 w-4" />}
                disabled={
                  !loaded ||
                  status === 'disabled' ||
                  profiles.length >= DEVICE_DISPLAY_PROFILE_LIMIT
                }
                onClick={openCreate}
              >
                {t('settings.system.clients.displaySync.create')}
              </Button>
            </div>
          </div>
        </div>

        {profiles.length > 0 ? (
          <div className={`border-t ${styles.dividerBorderColor}`}>
            <div className={`divide-y ${styles.dividerColor}`}>
              {profiles.map((profile) => {
                const count = Object.values(policy.profileIdByClientId).filter(
                  (profileId) => profileId === profile.id
                ).length;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => openManage(profile.id)}
                    className={`flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors md:px-5 ${styles.hoverBg}`}
                  >
                    <Link2 className={`h-4 w-4 shrink-0 ${styles.mutedColor}`} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${styles.textColor}`}>
                      {profile.name}
                    </span>
                    <span className={`text-xs ${styles.subtleColor}`}>
                      {t(
                        count === 1
                          ? 'settings.system.clients.displaySync.deviceCountOne'
                          : 'settings.system.clients.displaySync.deviceCount',
                        { count }
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div aria-live="polite">
        {actionError || error ? (
          <p className="text-sm leading-6 text-red-400">
            {t('settings.system.clients.displaySync.actionFailed')}
          </p>
        ) : actionMessage ? (
          <p className={`text-sm leading-6 ${styles.subtleColor}`}>{actionMessage}</p>
        ) : null}
      </div>

      <ModalSurface
        isOpen={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
          }
        }}
        title={dialogTitle}
        description={t(
          dialogMode === 'copy'
            ? 'settings.system.clients.displaySync.copyDescription'
            : dialogMode === 'create'
              ? 'settings.system.clients.displaySync.createDescription'
              : 'settings.system.clients.displaySync.manageDescription'
        )}
        contentClassName="max-w-lg"
        bodyClassName="p-5"
      >
        <div aria-hidden="true" className="mb-4">
          <h2 className={`text-lg font-semibold ${styles.textColor}`}>{dialogTitle}</h2>
          <p className={`mt-1 text-sm leading-relaxed ${styles.mutedColor}`}>
            {t(
              dialogMode === 'copy'
                ? 'settings.system.clients.displaySync.copyDescription'
                : dialogMode === 'create'
                  ? 'settings.system.clients.displaySync.createDescription'
                  : 'settings.system.clients.displaySync.manageDescription'
            )}
          </p>
        </div>

        {dialogMode === 'create' ? (
          <Input
            autoFocus
            aria-label={t('settings.system.clients.displaySync.profileName')}
            value={profileName}
            maxLength={64}
            onChange={(event) => setProfileName(event.currentTarget.value)}
            containerClassName="mb-4"
            inputClassName={styles.textColor}
          />
        ) : null}

        <div className="space-y-2">
          {allClients
            .filter((client) => dialogMode !== 'copy' || client.id !== currentClient.id)
            .map((client) =>
              clientSelectionRow({
                checked: selectedClientIds.includes(client.id),
                client,
                onChange: () => toggleClient(client.id),
                styles,
              })
            )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {dialogMode === 'manage' ? (
            <Button
              variant="ghost"
              size="small"
              leading={<Trash2 className="h-4 w-4" />}
              onClick={deleteProfile}
            >
              {t('settings.system.clients.displaySync.delete')}
            </Button>
          ) : null}
          <Button variant="ghost" size="small" onClick={() => setDialogMode(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={
              copying ||
              ((dialogMode === 'copy' || dialogMode === 'create') &&
                selectedClientIds.length === 0) ||
              (dialogMode === 'create' && !profileName.trim())
            }
            onClick={() => {
              if (dialogMode === 'copy') {
                void copySettings();
              } else if (dialogMode === 'create') {
                createProfile();
              } else {
                saveProfileAssignments();
              }
            }}
          >
            {copying
              ? t('settings.system.clients.displaySync.copying')
              : dialogMode === 'copy'
                ? t('settings.system.clients.displaySync.copyConfirm')
                : t('settings.system.clients.displaySync.save')}
          </Button>
        </div>
      </ModalSurface>
    </>
  );
}
