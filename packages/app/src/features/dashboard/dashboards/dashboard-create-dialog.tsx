import { CardDialogTabList } from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  coverSheetHeaderClassName,
  IconButton,
  Input,
  InteractivePill,
} from '@navet/app/components/primitives';
import {
  getThemeSurfaceTokens,
  navetIconSizeTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import { getRoomWorkspaceSectionsV2 } from '@navet/app/features/dashboard/rooms';
import { useAggregatedDevices, useI18n, useTheme } from '@navet/app/hooks';
import { dashboardToPath } from '@navet/app/navigation/sections';
import { useEditModeStore, useNavigationStore } from '@navet/app/stores';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  LayoutDashboard,
  Lightbulb,
  Plus,
  SquareDashed,
  X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRoomWorkspaceStore } from '../rooms/room-workspace-store';
import { type DashboardSeedMode, MAX_DASHBOARD_COUNT } from './dashboard-collection';
import { useDashboardCollectionStore } from './dashboard-collection-store';

type StartMode = 'rooms' | 'copy' | 'blank';
type CreateSection = 'details' | 'content' | 'displays';

interface DashboardCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (dashboardId: string) => void;
}

function getDeviceSeedType(device: DeviceWithType) {
  return device.type;
}

function DashboardCreateForm({ isOpen, onOpenChange, onCreated }: DashboardCreateDialogProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const collection = useDashboardCollectionStore((state) => state.collection);
  const activeDashboardId = useDashboardCollectionStore((state) => state.activeDashboardId);
  const createDashboard = useDashboardCollectionStore((state) => state.createDashboard);
  const assignDashboard = useDashboardCollectionStore((state) => state.assignDashboard);
  const activateDashboard = useDashboardCollectionStore((state) => state.activateDashboard);
  const profileClients = useDashboardProfileRuntimeStore((state) => state.clients);
  const roomWorkspace = useRoomWorkspaceStore((state) => state.workspace);
  const devices = useAggregatedDevices({ enabled: isOpen });
  const currentClient = useMemo(() => getDashboardClientIdentity(), []);
  const registeredClients = useMemo(() => {
    const clients = profileClients.some((client) => client.id === currentClient.id)
      ? profileClients
      : [
          {
            id: currentClient.id,
            name: currentClient.name,
            kind: currentClient.kind,
            firstSeenAt: currentClient.createdAt,
            lastSeenAt: currentClient.updatedAt,
            lastRevision: null,
          },
          ...profileClients,
        ];
    return clients;
  }, [currentClient, profileClients]);
  const [name, setName] = useState('');
  const [startMode, setStartMode] = useState<StartMode>('rooms');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [includeMode, setIncludeMode] = useState<DashboardSeedMode>('common');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<CreateSection>('details');

  const allDevices = useMemo(() => Object.values(devices).flat(), [devices]);
  const roomNames = useMemo(
    () =>
      Array.from(
        new Set(
          allDevices
            .map(getDeviceRoomLabel)
            .filter((room): room is string => Boolean(room) && room !== ALL_ROOMS_ID)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [allDevices]
  );
  const roomGroups = useMemo(
    () =>
      getRoomWorkspaceSectionsV2(roomWorkspace).flatMap((section) =>
        section.group
          ? [
              {
                id: section.group.id,
                name: section.group.displayName,
                rooms: section.rooms
                  .map((room) => room.displayName)
                  .filter((room) => roomNames.includes(room)),
              },
            ]
          : []
      ),
    [roomNames, roomWorkspace]
  );
  const selectedRoomDevices = useMemo(
    () => allDevices.filter((device) => selectedRooms.includes(getDeviceRoomLabel(device) ?? '')),
    [allDevices, selectedRooms]
  );
  const hasName = name.trim().length > 0;
  const hasContentSelection = startMode !== 'rooms' || selectedRooms.length > 0;
  const canCreate = hasName && hasContentSelection && collection.order.length < MAX_DASHBOARD_COUNT;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName('');
    setStartMode('rooms');
    setSelectedRooms([]);
    setIncludeMode('common');
    setSelectedCardIds([]);
    setAssignedClientIds(currentClient.kind === 'wall_panel' ? [currentClient.id] : []);
    setActiveSection('details');
  }, [currentClient.id, currentClient.kind, isOpen]);

  const toggleRoom = (room: string) => {
    setSelectedRooms((current) =>
      current.includes(room) ? current.filter((value) => value !== room) : [...current, room]
    );
  };
  const toggleRoomGroup = (rooms: string[]) => {
    setSelectedRooms((current) => {
      const everySelected = rooms.every((room) => current.includes(room));
      return everySelected
        ? current.filter((room) => !rooms.includes(room))
        : [...new Set([...current, ...rooms])];
    });
  };
  const toggleClient = (clientId: string) => {
    setAssignedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((value) => value !== clientId)
        : [...current, clientId]
    );
  };
  const toggleCard = (cardId: string) => {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((value) => value !== cardId) : [...current, cardId]
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (activeSection === 'details') {
      if (hasName) {
        setActiveSection('content');
      }
      return;
    }
    if (activeSection === 'content') {
      if (hasName && hasContentSelection) {
        setActiveSection('displays');
      }
      return;
    }
    if (!canCreate) {
      return;
    }
    const activeDashboard = collection.dashboardsById[activeDashboardId];
    const source =
      startMode === 'copy' && activeDashboard
        ? ({ kind: 'copy', dashboard: activeDashboard } as const)
        : startMode === 'rooms'
          ? ({
              kind: 'rooms',
              roomNames: selectedRooms,
              include: includeMode,
              selectedCardIds,
              devices: allDevices.map((device) => ({
                id: device.id,
                room: getDeviceRoomLabel(device) ?? ALL_ROOMS_ID,
                size: device.size,
                type: getDeviceSeedType(device),
              })),
            } as const)
          : ({ kind: 'blank' } as const);
    const result = createDashboard({ name, source });
    if (!result.created) {
      return;
    }
    for (const clientId of assignedClientIds) {
      assignDashboard(clientId, result.dashboardId);
    }
    activateDashboard(result.dashboardId, 'preview', { rememberPreview: true });
    useNavigationStore.getState().applyNavigationState({
      activeSection: 'home',
      currentRoom: ALL_ROOMS_ID,
    });
    history.pushState({}, '', dashboardToPath(result.dashboardId));
    window.scrollTo(0, 0);
    useEditModeStore.getState().setEditMode(true);
    onOpenChange(false);
    onCreated?.(result.dashboardId);
  };

  const sections: CreateSection[] = ['details', 'content', 'displays'];
  const currentSectionIndex = sections.indexOf(activeSection);
  const activeSectionContent = {
    details: {
      title: t('dashboard.multiple.create.nameTitle'),
      description: t('dashboard.multiple.create.nameDescription'),
    },
    content: {
      title: t('dashboard.multiple.create.contentTitle'),
      description: t('dashboard.multiple.create.contentDescription'),
    },
    displays: {
      title: t('dashboard.multiple.create.displaysTitle'),
      description: t('dashboard.multiple.create.displaysDescription'),
    },
  }[activeSection];
  const canContinue =
    activeSection === 'details'
      ? hasName
      : activeSection === 'content'
        ? hasName && hasContentSelection
        : canCreate;
  const goBack = () => {
    const previousSection = sections[currentSectionIndex - 1];
    if (previousSection) {
      setActiveSection(previousSection);
    }
  };

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('dashboard.multiple.create.title')}
      description={t('dashboard.multiple.create.description')}
      theme={theme}
      contentClassName={cn(
        'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2',
        surface.shellPanel,
        surface.border
      )}
      shellBodyClassName="h-full min-h-0"
    >
      <section
        aria-label={t('dashboard.multiple.create.title')}
        className="flex h-full min-h-0 max-h-full w-full flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none"
        data-dashboard-create-workspace
      >
        <header className={cn(coverSheetHeaderClassName, 'border-b', surface.border)}>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
                {t('dashboard.multiple.create.title')}
              </h1>
              <p
                className={cn('mt-1 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}
              >
                {t('dashboard.multiple.create.description')}
              </p>
            </div>
            <IconButton
              data-cover-sheet-inline-dismiss
              variant="ghost"
              label={t('common.close')}
              icon={<X className={navetIconSizeTokens.sm} aria-hidden="true" />}
              onClick={() => onOpenChange(false)}
              className={cn(
                'min-h-11 min-w-11 motion-reduce:transition-none',
                surface.subtleBg,
                surface.hoverBg
              )}
            />
          </div>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col">
            <div
              id="dashboard-create-active-panel"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-7 sm:py-8 lg:px-10"
            >
              <p className={cn(navetTypographyTokens.eyebrow, surface.textMuted)}>
                {t('household.setup.stepCount', {
                  current: currentSectionIndex + 1,
                  total: sections.length,
                })}
              </p>
              <h2 className={cn('mt-2', navetTypographyTokens.pageHeading, surface.textPrimary)}>
                {activeSectionContent.title}
              </h2>
              <p
                className={cn('mt-2 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}
              >
                {activeSectionContent.description}
              </p>

              <div className="mt-7">
                {activeSection === 'details' ? (
                  <label htmlFor="dashboard-create-name" className="block max-w-xl space-y-2">
                    <span className={cn(navetTypographyTokens.label, surface.textPrimary)}>
                      {t('dashboard.multiple.create.name')}
                    </span>
                    <Input
                      id="dashboard-create-name"
                      autoFocus
                      value={name}
                      maxLength={64}
                      onChange={(event) => setName(event.currentTarget.value)}
                      placeholder={t('dashboard.multiple.create.namePlaceholder')}
                      inputClassName="min-h-11 motion-reduce:transition-none"
                    />
                  </label>
                ) : null}

                {activeSection === 'content' ? (
                  <div className="space-y-6">
                    <fieldset>
                      <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
                        {t('dashboard.multiple.create.startWith')}
                      </legend>
                      <CardDialogTabList className="mt-2 flex-wrap">
                        <InteractivePill
                          active={startMode === 'rooms'}
                          accentColor={accentColor}
                          aria-pressed={startMode === 'rooms'}
                          icon={LayoutDashboard}
                          size="compact"
                          onClick={() => setStartMode('rooms')}
                        >
                          {t('dashboard.multiple.create.chooseRooms')}
                        </InteractivePill>
                        <InteractivePill
                          active={startMode === 'copy'}
                          accentColor={accentColor}
                          aria-pressed={startMode === 'copy'}
                          icon={Copy}
                          size="compact"
                          onClick={() => setStartMode('copy')}
                        >
                          {t('dashboard.multiple.create.copyCurrent')}
                        </InteractivePill>
                        <InteractivePill
                          active={startMode === 'blank'}
                          accentColor={accentColor}
                          aria-pressed={startMode === 'blank'}
                          icon={SquareDashed}
                          size="compact"
                          onClick={() => setStartMode('blank')}
                        >
                          {t('dashboard.multiple.create.blank')}
                        </InteractivePill>
                      </CardDialogTabList>
                    </fieldset>

                    {startMode === 'rooms' ? (
                      <>
                        <fieldset className={cn('border-t pt-5', surface.border)}>
                          <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
                            {t('dashboard.multiple.create.rooms')}
                          </legend>
                          {roomNames.length > 0 ? (
                            <div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-y-auto py-1">
                              {roomGroups.map((group) => (
                                <InteractivePill
                                  key={`group-${group.id}`}
                                  active={
                                    group.rooms.length > 0 &&
                                    group.rooms.every((room) => selectedRooms.includes(room))
                                  }
                                  accentColor={accentColor}
                                  aria-pressed={
                                    group.rooms.length > 0 &&
                                    group.rooms.every((room) => selectedRooms.includes(room))
                                  }
                                  size="compact"
                                  onClick={() => toggleRoomGroup(group.rooms)}
                                >
                                  {group.name}
                                </InteractivePill>
                              ))}
                              {roomNames.map((room) => (
                                <InteractivePill
                                  key={room}
                                  active={selectedRooms.includes(room)}
                                  accentColor={accentColor}
                                  aria-pressed={selectedRooms.includes(room)}
                                  size="compact"
                                  onClick={() => toggleRoom(room)}
                                >
                                  {room}
                                </InteractivePill>
                              ))}
                            </div>
                          ) : (
                            <p className={cn('mt-3 text-sm', surface.textSecondary)}>
                              {t('dashboard.multiple.create.noRooms')}
                            </p>
                          )}
                        </fieldset>

                        <fieldset className={cn('border-t pt-5', surface.border)}>
                          <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
                            {t('dashboard.multiple.create.include')}
                          </legend>
                          <CardDialogTabList className="mt-2 flex-wrap">
                            <InteractivePill
                              active={includeMode === 'common'}
                              accentColor={accentColor}
                              aria-pressed={includeMode === 'common'}
                              icon={LayoutDashboard}
                              size="compact"
                              onClick={() => setIncludeMode('common')}
                            >
                              {t('dashboard.multiple.create.common')}
                            </InteractivePill>
                            <InteractivePill
                              active={includeMode === 'lights'}
                              accentColor={accentColor}
                              aria-pressed={includeMode === 'lights'}
                              icon={Lightbulb}
                              size="compact"
                              onClick={() => setIncludeMode('lights')}
                            >
                              {t('dashboard.multiple.create.lights')}
                            </InteractivePill>
                            <InteractivePill
                              active={includeMode === 'selected'}
                              accentColor={accentColor}
                              aria-pressed={includeMode === 'selected'}
                              icon={Check}
                              size="compact"
                              onClick={() => setIncludeMode('selected')}
                            >
                              {t('dashboard.multiple.create.selected')}
                            </InteractivePill>
                          </CardDialogTabList>
                          {includeMode === 'selected' && selectedRoomDevices.length > 0 ? (
                            <div
                              className={cn(
                                'grid max-h-64 gap-1 overflow-y-auto rounded-[24px] border p-2 sm:grid-cols-2',
                                surface.border,
                                surface.subtleBg
                              )}
                            >
                              {selectedRoomDevices.map((device) => (
                                <label
                                  key={device.id}
                                  className={cn(
                                    'flex min-h-11 items-center gap-2 rounded-[14px] px-3 py-2 text-sm',
                                    surface.hoverBg,
                                    surface.textPrimary
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCardIds.includes(device.id)}
                                    onChange={() => toggleCard(device.id)}
                                    style={{ accentColor }}
                                  />
                                  <span className="min-w-0 truncate">{device.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </fieldset>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {activeSection === 'displays' ? (
                  <fieldset>
                    <legend className={cn(navetTypographyTokens.label, surface.textPrimary)}>
                      {t('dashboard.multiple.create.useOn')}
                    </legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <InteractivePill
                        active={assignedClientIds.length === 0}
                        accentColor={accentColor}
                        aria-pressed={assignedClientIds.length === 0}
                        size="compact"
                        onClick={() => setAssignedClientIds([])}
                      >
                        {t('dashboard.multiple.create.notYet')}
                      </InteractivePill>
                      {registeredClients.map((client) => (
                        <InteractivePill
                          key={client.id}
                          active={assignedClientIds.includes(client.id)}
                          accentColor={accentColor}
                          aria-pressed={assignedClientIds.includes(client.id)}
                          size="compact"
                          onClick={() => toggleClient(client.id)}
                        >
                          {client.id === currentClient.id
                            ? t('dashboard.multiple.create.thisDevice')
                            : client.name}
                        </InteractivePill>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
              </div>
            </div>

            <footer className={cn('border-t px-4 py-3 md:px-5 md:py-4', surface.border)}>
              {collection.order.length >= MAX_DASHBOARD_COUNT ? (
                <p className="mb-3 text-sm text-red-400">
                  {t('dashboard.multiple.create.limit', { count: MAX_DASHBOARD_COUNT })}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                {currentSectionIndex > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={goBack}
                    leading={<ArrowLeft className={navetIconSizeTokens.sm} aria-hidden="true" />}
                    className="shrink-0"
                  >
                    {t('dashboard.multiple.create.back')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="shrink-0"
                  >
                    {t('common.cancel')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!canContinue}
                  leading={
                    activeSection === 'displays' ? (
                      <Plus className={navetIconSizeTokens.sm} aria-hidden="true" />
                    ) : undefined
                  }
                  trailing={
                    activeSection === 'displays' ? undefined : (
                      <ArrowRight className={navetIconSizeTokens.sm} aria-hidden="true" />
                    )
                  }
                  className="shrink-0 whitespace-nowrap"
                >
                  {activeSection === 'displays'
                    ? t('dashboard.multiple.create.action')
                    : t('dashboard.multiple.create.next')}
                </Button>
              </div>
            </footer>
          </main>
        </form>
      </section>
    </BaseCardDialog>
  );
}

export function DashboardCreateDialog(props: DashboardCreateDialogProps) {
  return <DashboardCreateForm {...props} />;
}
