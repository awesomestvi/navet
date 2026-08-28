import {
  CardDialogSection,
  NavigationWorkspace,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  Input,
  SheetSurfaceHeader,
} from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { getDeviceTypeLabel } from '@navet/app/constants/device-type-labels';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel, UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import {
  ChevronDown,
  ChevronUp,
  Gauge,
  GripVertical,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SecurityOverviewPreference } from '../utils/security-overview-preferences';

type SecurityOverviewEditorSection = 'automatic' | 'selection' | 'order';

interface SecurityOverviewCustomizationDialogProps {
  automaticEntityIds: string[];
  entities: DeviceWithType[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preference: SecurityOverviewPreference) => void;
  preference: SecurityOverviewPreference;
}

function getDeviceClass(device: DeviceWithType): string | undefined {
  return 'deviceClass' in device && typeof device.deviceClass === 'string'
    ? device.deviceClass
    : undefined;
}

function getEntityDescription(device: DeviceWithType, t: ReturnType<typeof useI18n>['t']) {
  const typeLabel = getDeviceTypeLabel(device.type, t);
  const room = getDeviceRoomLabel(device);
  return room === UNKNOWN_ROOM_LABEL ? typeLabel : `${typeLabel} · ${room}`;
}

function EntitySummaryRow({ device }: { device: DeviceWithType }) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = getDeviceTypeIcon(device.type, getDeviceClass(device));

  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-2xl border p-2.5',
        surface.border,
        surface.subtleBg
      )}
    >
      <EntityCardHeaderIcon
        IconComponent={Icon}
        isActive={false}
        size="small"
        baseColor={accentColor}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${surface.textPrimary}`}>
          {device.name}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${surface.textSecondary}`}>
          {getEntityDescription(device, t)}
        </span>
      </span>
    </div>
  );
}

function EntityOrderRow({
  canMoveDown,
  canMoveUp,
  device,
  onMoveDown,
  onMoveUp,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  device: DeviceWithType;
  onMoveDown: () => void;
  onMoveUp: () => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = getDeviceTypeIcon(device.type, getDeviceClass(device));

  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-2xl border p-2.5',
        surface.border,
        surface.subtleBg
      )}
    >
      <EntityCardHeaderIcon
        IconComponent={Icon}
        isActive={false}
        size="small"
        baseColor={accentColor}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${surface.textPrimary}`}>
          {device.name}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${surface.textSecondary}`}>
          {getEntityDescription(device, t)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={t('security.overview.customize.moveEarlier', { name: device.name })}
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-35',
            surface.hoverBg,
            surface.textMuted
          )}
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={t('security.overview.customize.moveLater', { name: device.name })}
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-35',
            surface.hoverBg,
            surface.textMuted
          )}
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

export function SecurityOverviewCustomizationDialog({
  automaticEntityIds,
  entities,
  isOpen,
  onOpenChange,
  onSave,
  preference,
}: SecurityOverviewCustomizationDialogProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [activeSection, setActiveSection] = useState<SecurityOverviewEditorSection>(
    preference.mode === 'custom' ? 'selection' : 'automatic'
  );
  const [draftMode, setDraftMode] = useState<SecurityOverviewPreference['mode']>(preference.mode);
  const [draftEntityIds, setDraftEntityIds] = useState<string[]>(preference.entityIds);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraftMode(preference.mode);
    setDraftEntityIds(preference.mode === 'custom' ? preference.entityIds : automaticEntityIds);
    setActiveSection(preference.mode === 'custom' ? 'selection' : 'automatic');
    setQuery('');
  }, [automaticEntityIds, isOpen, preference.entityIds, preference.mode]);

  const entityById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities]
  );
  const automaticEntities = automaticEntityIds.flatMap((id) => {
    const entity = entityById.get(id);
    return entity ? [entity] : [];
  });
  const selectedEntities = draftEntityIds.flatMap((id) => {
    const entity = entityById.get(id);
    return entity ? [entity] : [];
  });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntities = normalizedQuery
    ? entities.filter((entity) =>
        `${entity.name} ${getEntityDescription(entity, t)} ${entity.id}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : entities;
  const canApply = draftMode === 'auto' || selectedEntities.length > 0;
  const chooseManualMode = () => {
    setDraftMode('custom');
    setDraftEntityIds((current) => (current.length > 0 ? current : automaticEntityIds));
    setActiveSection('selection');
  };
  const moveEntity = (currentIndex: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= draftEntityIds.length) return;
    setDraftEntityIds((current) => {
      const next = [...current];
      const [entityId] = next.splice(currentIndex, 1);
      if (!entityId) return current;
      next.splice(nextIndex, 0, entityId);
      return next;
    });
  };

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('security.overview.customize.title')}
      description={t('security.overview.customize.description')}
      theme={theme}
      contentClassName={cn(
        'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2',
        surface.shellPanel,
        surface.border
      )}
      shellBodyClassName="h-full min-h-0"
    >
      <NavigationWorkspace.Frame className="h-full min-h-0 max-h-full rounded-none border-0 bg-transparent shadow-none">
        <NavigationWorkspace.Header>
          <SheetSurfaceHeader
            title={t('security.overview.customize.title')}
            description={t('security.overview.customize.description')}
            closeLabel={t('security.overview.customize.close')}
            onClose={() => onOpenChange(false)}
            className="md:px-6"
          />
        </NavigationWorkspace.Header>

        <NavigationWorkspace.Body className="grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[18rem_minmax(0,1fr)] md:grid-rows-1">
          <NavigationWorkspace.Sidebar className="border-r-0 border-b p-4 md:border-r md:border-b-0 md:p-5">
            <p className={`text-sm font-semibold ${surface.textPrimary}`}>
              {t('security.overview.customize.setup')}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${surface.textSecondary}`}>
              {t('security.overview.customize.setupDescription')}
            </p>
            <nav aria-label={t('security.overview.customize.setup')} className="mt-4 space-y-1">
              <NavigationWorkspace.Item
                active={activeSection === 'automatic'}
                accentColor={accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-pressed={activeSection === 'automatic'}
                  onClick={() => {
                    setDraftMode('auto');
                    setDraftEntityIds(automaticEntityIds);
                    setActiveSection('automatic');
                  }}
                  className="!items-start py-2.5"
                >
                  <NavigationWorkspace.ItemIcon>
                    <Gauge className="h-4 w-4" />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText
                    title={t('security.overview.customize.automatic')}
                    description={t('security.overview.customize.automaticDescription')}
                    descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                  />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
              <NavigationWorkspace.Item
                active={activeSection === 'selection'}
                accentColor={accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-pressed={activeSection === 'selection'}
                  onClick={chooseManualMode}
                  className="!items-start py-2.5"
                >
                  <NavigationWorkspace.ItemIcon>
                    <SlidersHorizontal className="h-4 w-4" />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText
                    title={t('security.overview.customize.manual')}
                    description={t('security.overview.customize.selected', {
                      count: selectedEntities.length,
                    })}
                    descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                  />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
              <NavigationWorkspace.Item
                active={activeSection === 'order'}
                accentColor={accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-pressed={activeSection === 'order'}
                  onClick={() => {
                    setDraftMode('custom');
                    setDraftEntityIds((current) =>
                      current.length > 0 ? current : automaticEntityIds
                    );
                    setActiveSection('order');
                  }}
                  className="!items-start py-2.5"
                >
                  <NavigationWorkspace.ItemIcon>
                    <GripVertical className="h-4 w-4" />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText
                    title={t('security.overview.customize.order')}
                    description={t('security.overview.customize.orderDescription')}
                    descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                  />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
            </nav>
          </NavigationWorkspace.Sidebar>

          <NavigationWorkspace.Content>
            <NavigationWorkspace.ScrollArea className="p-4 md:p-6">
              {activeSection === 'selection' ? (
                <div className="w-full">
                  <div className="mb-5">
                    <p className={`text-base font-semibold ${surface.textPrimary}`}>
                      {t('security.overview.customize.selectionTitle')}
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                      {t('security.overview.customize.selectionDescription')}
                    </p>
                  </div>
                  <Input
                    type="search"
                    size="small"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label={t('dashboard.addEntity.searchPlaceholder')}
                    placeholder={t('dashboard.addEntity.searchPlaceholder')}
                    leading={<Search className="h-4 w-4" aria-hidden="true" />}
                    className="mb-4"
                  />
                  <CardDialogSection>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {filteredEntities.map((device) => {
                        const checked = draftEntityIds.includes(device.id);
                        const Icon = getDeviceTypeIcon(device.type, getDeviceClass(device));
                        return (
                          <SelectableCheckboxRow
                            key={device.id}
                            id={`security-overview-entity-${device.id.replaceAll(/[^a-zA-Z0-9_-]/g, '-')}`}
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              setDraftMode('custom');
                              setDraftEntityIds((current) =>
                                nextChecked
                                  ? [...current.filter((id) => id !== device.id), device.id]
                                  : current.filter((id) => id !== device.id)
                              );
                            }}
                            leading={<Icon className="h-4 w-4" aria-hidden="true" />}
                            label={device.name}
                            description={getEntityDescription(device, t)}
                            rowClassName={`${surface.border} ${surface.hoverBg}`}
                            selectedClassName={surface.subtleBg}
                            labelClassName={surface.textPrimary}
                            descriptionClassName={surface.textMuted}
                          />
                        );
                      })}
                    </div>
                    {filteredEntities.length === 0 ? (
                      <p className={`py-8 text-center text-sm ${surface.textMuted}`}>
                        {t('security.overview.customize.noMatches')}
                      </p>
                    ) : null}
                  </CardDialogSection>
                </div>
              ) : activeSection === 'order' ? (
                <div className="w-full">
                  <div className="mb-5">
                    <p className={`text-base font-semibold ${surface.textPrimary}`}>
                      {t('security.overview.customize.orderTitle')}
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                      {t('security.overview.customize.orderHelp')}
                    </p>
                  </div>
                  <CardDialogSection>
                    <div className="grid gap-2">
                      {selectedEntities.map((device, index) => (
                        <EntityOrderRow
                          key={device.id}
                          device={device}
                          canMoveUp={index > 0}
                          canMoveDown={index < selectedEntities.length - 1}
                          onMoveUp={() => moveEntity(index, index - 1)}
                          onMoveDown={() => moveEntity(index, index + 1)}
                        />
                      ))}
                    </div>
                  </CardDialogSection>
                </div>
              ) : (
                <div className="w-full">
                  <p className={`text-base font-semibold ${surface.textPrimary}`}>
                    {t('security.overview.customize.automaticTitle')}
                  </p>
                  <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                    {t('security.overview.customize.automaticHelp')}
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {automaticEntities.map((device) => (
                      <EntitySummaryRow key={device.id} device={device} />
                    ))}
                  </div>
                </div>
              )}
            </NavigationWorkspace.ScrollArea>
          </NavigationWorkspace.Content>
        </NavigationWorkspace.Body>

        <div
          className={cn(
            'flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3 md:px-6',
            surface.panel,
            surface.border
          )}
        >
          <Button variant="soft" size="small" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={!canApply}
            onClick={() => {
              onSave({
                mode: draftMode,
                entityIds: draftMode === 'custom' ? draftEntityIds : [],
              });
              onOpenChange(false);
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </NavigationWorkspace.Frame>
    </BaseCardDialog>
  );
}
