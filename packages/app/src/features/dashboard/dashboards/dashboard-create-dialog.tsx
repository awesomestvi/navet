import { CardDialogTabList } from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  IconButton,
  Input,
  InteractivePill,
  Stepper,
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

  const startModeLabel = t(
    startMode === 'rooms'
      ? 'dashboard.multiple.create.chooseRooms'
      : startMode === 'copy'
        ? 'dashboard.multiple.create.copyCurrent'
        : 'dashboard.multiple.create.blank'
  );
  const assignmentSummary =
    assignedClientIds.length === 0
      ? t('dashboard.multiple.create.notYet')
      : t(
          assignedClientIds.length === 1
            ? 'dashboard.multiple.manager.assignedOne'
            : 'dashboard.multiple.manager.assigned',
          { count: assignedClientIds.length }
        );
  const sections: Array<{
    id: CreateSection;
    label: string;
    summary: string;
  }> = [
    {
      id: 'details',
      label: t('dashboard.multiple.create.name'),
      summary: name.trim() || t('dashboard.multiple.create.notYet'),
    },
    {
      id: 'content',
      label: t('dashboard.multiple.create.startWith'),
      summary: startModeLabel,
    },
    {
      id: 'displays',
      label: t('dashboard.multiple.create.useOn'),
      summary: assignmentSummary,
    },
  ];
  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];
  const currentSectionIndex = sections.findIndex((section) => section.id === activeSection);
  const canOpenSection = (section: CreateSection) =>
    section === 'details' || (section === 'content' ? hasName : hasName && hasContentSelection);
  const stepperItems = sections.map((section) => ({
    id: section.id,
    label: section.label,
    summary: section.summary,
    disabled: !canOpenSection(section.id),
  }));
  const canContinue =
    activeSection === 'details'
      ? hasName
      : activeSection === 'content'
        ? hasName && hasContentSelection
        : canCreate;
  const goBack = () => {
    const previousSection = sections[currentSectionIndex - 1];
    if (previousSection) {
      setActiveSection(previousSection.id);
    }
  };
  const openSection = (step: number) => {
    const section = sections[step];
    if (section && canOpenSection(section.id)) {
      setActiveSection(section.id);
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
        <header className={cn('border-b px-3 py-3 md:px-5 md:py-4', surface.border)}>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
                {t('dashboard.multiple.create.title')}
              </h1>
              <p
                className={cn(
                  'mt-1 max-w-2xl max-sm:sr-only',
                  navetTypographyTokens.body,
                  surface.textSecondary
                )}
              >
                {t('dashboard.multiple.create.description')}
              </p>
            </div>
            <IconButton
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
          <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(15rem,0.64fr)_minmax(0,1.36fr)]">
            <aside
              className={cn('hidden min-h-0 overflow-y-auto p-3 md:block md:p-4', surface.subtleBg)}
            >
              <Stepper
                ariaLabel={t('dashboard.multiple.create.title')}
                controlsId="dashboard-create-active-panel"
                currentStep={currentSectionIndex}
                items={stepperItems}
                onStepChange={openSection}
                orientation="vertical"
              />
            </aside>

            <main className={cn('flex min-h-0 flex-col md:border-l', surface.border)}>
              <div className={cn('border-b p-3 md:hidden', surface.border)}>
                <Stepper
                  ariaLabel={t('dashboard.multiple.create.title')}
                  controlsId="dashboard-create-active-panel"
                  currentStep={currentSectionIndex}
                  items={stepperItems}
                  onStepChange={openSection}
                  size="compact"
                />
              </div>

              <div className={cn('border-b p-4 md:p-5', surface.border)}>
                <h2 className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}>
                  {currentSection.label}
                </h2>
                <p
                  aria-live="polite"
                  className={cn(
                    'mt-1',
                    navetTypographyTokens.compactMetadata,
                    surface.textSecondary
                  )}
                >
                  {currentSection.summary}
                </p>
              </div>

              <div
                id="dashboard-create-active-panel"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
              >
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

              <footer className={cn('border-t px-4 py-3 md:px-5 md:py-4', surface.border)}>
                {collection.order.length >= MAX_DASHBOARD_COUNT ? (
                  <p className="mb-3 text-sm text-red-400">
                    {t('dashboard.multiple.create.limit', { count: MAX_DASHBOARD_COUNT })}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="order-2 min-h-11 sm:order-1 sm:min-h-0"
                  >
                    {t('common.cancel')}
                  </Button>
                  <div className="order-1 flex gap-2 sm:order-2">
                    {currentSectionIndex > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={goBack}
                        leading={
                          <ArrowLeft className={navetIconSizeTokens.sm} aria-hidden="true" />
                        }
                        className="min-h-11 flex-[0.9] sm:min-h-0 sm:flex-none"
                      >
                        {t('dashboard.multiple.create.back')}
                      </Button>
                    ) : null}
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
                      className="min-h-11 flex-[1.1] whitespace-nowrap sm:min-h-0 sm:flex-none"
                    >
                      {activeSection === 'displays'
                        ? t('dashboard.multiple.create.action')
                        : t('dashboard.multiple.create.next')}
                    </Button>
                  </div>
                </div>
              </footer>
            </main>
          </div>
        </form>
      </section>
    </BaseCardDialog>
  );
}

export function DashboardCreateDialog(props: DashboardCreateDialogProps) {
  return <DashboardCreateForm {...props} />;
}
