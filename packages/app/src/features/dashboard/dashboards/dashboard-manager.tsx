import { Button, Input, ModalSurface } from '@navet/app/components/primitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import type { SettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { useI18n } from '@navet/app/hooks';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  UserRoundCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DashboardId } from './dashboard-collection';
import { useDashboardCollectionStore } from './dashboard-collection-store';
import { DashboardCreateDialog } from './dashboard-create-dialog';
import { openDashboardPreview } from './dashboard-switcher';

interface DashboardManagerProps {
  styles: SettingsSectionStyles;
}

export function DashboardManager({ styles }: DashboardManagerProps) {
  const { t } = useI18n();
  const collection = useDashboardCollectionStore((state) => state.collection);
  const renameDashboard = useDashboardCollectionStore((state) => state.renameDashboard);
  const duplicateDashboard = useDashboardCollectionStore((state) => state.duplicateDashboard);
  const deleteDashboard = useDashboardCollectionStore((state) => state.deleteDashboard);
  const reorderDashboards = useDashboardCollectionStore((state) => state.reorderDashboards);
  const setDefaultDashboard = useDashboardCollectionStore((state) => state.setDefaultDashboard);
  const assignDashboard = useDashboardCollectionStore((state) => state.assignDashboard);
  const clearDashboardAssignment = useDashboardCollectionStore(
    (state) => state.clearDashboardAssignment
  );
  const profileClients = useDashboardProfileRuntimeStore((state) => state.clients);
  const currentClient = useMemo(() => getDashboardClientIdentity(), []);
  const clients = useMemo(
    () =>
      profileClients.some((client) => client.id === currentClient.id)
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
          ],
    [currentClient, profileClients]
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState<DashboardId | null>(null);
  const [editingName, setEditingName] = useState('');
  const [assigningDashboardId, setAssigningDashboardId] = useState<DashboardId | null>(null);
  const [deletingDashboardId, setDeletingDashboardId] = useState<DashboardId | null>(null);
  const assigningDashboard = assigningDashboardId
    ? collection.dashboardsById[assigningDashboardId]
    : null;
  const deletingDashboard = deletingDashboardId
    ? collection.dashboardsById[deletingDashboardId]
    : null;
  const assignmentTitle = t('dashboard.multiple.assign.title', {
    name: assigningDashboard?.name ?? '',
  });
  const assignmentDescription = t('dashboard.multiple.assign.description');

  const moveDashboard = (dashboardId: string, direction: -1 | 1) => {
    const currentIndex = collection.order.indexOf(dashboardId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= collection.order.length) {
      return;
    }
    const order = [...collection.order];
    const currentDashboardId = order[currentIndex];
    const targetDashboardId = order[targetIndex];
    if (!currentDashboardId || !targetDashboardId) {
      return;
    }
    order[currentIndex] = targetDashboardId;
    order[targetIndex] = currentDashboardId;
    reorderDashboards(order);
  };

  return (
    <>
      <div
        className={`overflow-hidden rounded-[22px] border ${styles.insetBorderColor} ${styles.insetBg}`}
      >
        <div className={`divide-y ${styles.dividerColor}`}>
          {collection.order.map((dashboardId, index) => {
            const dashboard = collection.dashboardsById[dashboardId];
            if (!dashboard) {
              return null;
            }
            const assignmentCount = Object.values(collection.dashboardIdByClientId).filter(
              (assignedId) => assignedId === dashboard.id
            ).length;
            const isEditing = editingDashboardId === dashboard.id;

            return (
              <div key={dashboard.id} className="p-3.5 md:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border ${styles.borderColor} ${styles.softBg}`}
                  >
                    <LayoutDashboard className={`h-4.5 w-4.5 ${styles.mutedColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        className="flex min-w-0 items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          renameDashboard(dashboard.id, editingName);
                          setEditingDashboardId(null);
                        }}
                      >
                        <Input
                          autoFocus
                          size="small"
                          value={editingName}
                          maxLength={64}
                          onChange={(event) => setEditingName(event.currentTarget.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              setEditingDashboardId(null);
                            }
                          }}
                          containerClassName="min-w-0 flex-1"
                        />
                        <Button type="submit" size="small" disabled={!editingName.trim()}>
                          {t('dashboard.multiple.manager.saveName')}
                        </Button>
                      </form>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className={`truncate text-sm font-medium ${styles.textColor}`}>
                            {dashboard.name}
                          </p>
                          {collection.defaultDashboardId === dashboard.id ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles.borderColor} ${styles.subtleColor}`}
                            >
                              {t('dashboard.multiple.manager.default')}
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-1 text-xs ${styles.subtleColor}`}>
                          {t(
                            dashboard.homeLayout.cardIds.length === 1
                              ? 'dashboard.multiple.manager.card'
                              : 'dashboard.multiple.manager.cards',
                            {
                              count: dashboard.homeLayout.cardIds.length,
                            }
                          )}
                          {' · '}
                          {assignmentCount > 0
                            ? t(
                                assignmentCount === 1
                                  ? 'dashboard.multiple.manager.assignedOne'
                                  : 'dashboard.multiple.manager.assigned',
                                {
                                  count: assignmentCount,
                                }
                              )
                            : t('dashboard.multiple.manager.unassigned')}
                        </p>
                      </>
                    )}
                  </div>

                  {!isEditing ? (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t('dashboard.multiple.manager.actions', {
                            name: dashboard.name,
                          })}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] transition-colors ${styles.hoverBg} ${styles.mutedColor}`}
                        >
                          <MoreHorizontal className="h-4.5 w-4.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onSelect={() => openDashboardPreview(dashboard.id)}>
                          <LayoutDashboard className="h-4 w-4" />
                          {t('common.open')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditingDashboardId(dashboard.id);
                            setEditingName(dashboard.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          {t('dashboard.multiple.manager.rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => duplicateDashboard(dashboard.id)}>
                          <Copy className="h-4 w-4" />
                          {t('dashboard.multiple.manager.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === 0}
                          onSelect={() => moveDashboard(dashboard.id, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                          {t('dashboard.multiple.manager.moveUp')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === collection.order.length - 1}
                          onSelect={() => moveDashboard(dashboard.id, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                          {t('dashboard.multiple.manager.moveDown')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={collection.defaultDashboardId === dashboard.id}
                          onSelect={() => setDefaultDashboard(dashboard.id)}
                        >
                          <Star className="h-4 w-4" />
                          {t('dashboard.multiple.manager.makeDefault')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAssigningDashboardId(dashboard.id)}>
                          <UserRoundCheck className="h-4 w-4" />
                          {t('dashboard.multiple.manager.assign')}
                        </DropdownMenuItem>
                        {collection.order.length > 1 ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setDeletingDashboardId(dashboard.id)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('dashboard.multiple.manager.delete')}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="p-3.5 md:p-4">
            <Button
              type="button"
              variant="secondary"
              size="small"
              leading={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
              className="rounded-full"
            >
              {t('dashboard.multiple.new')}
            </Button>
          </div>
        </div>
      </div>

      <DashboardCreateDialog isOpen={createOpen} onOpenChange={setCreateOpen} />

      <ModalSurface
        isOpen={Boolean(assigningDashboard)}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningDashboardId(null);
          }
        }}
        title={assignmentTitle}
        description={assignmentDescription}
        contentClassName="max-w-lg"
        bodyClassName="p-5"
      >
        <div aria-hidden="true" className="mb-4">
          <h2 className={`text-lg font-semibold ${styles.textColor}`}>{assignmentTitle}</h2>
          <p className={`mt-1 text-sm leading-relaxed ${styles.mutedColor}`}>
            {assignmentDescription}
          </p>
        </div>
        <div className="space-y-2">
          {clients.length > 0 && assigningDashboard ? (
            clients.map((client) => {
              const isAssigned =
                collection.dashboardIdByClientId[client.id] === assigningDashboard.id;
              return (
                <button
                  key={client.id}
                  type="button"
                  aria-pressed={isAssigned}
                  onClick={() => {
                    if (isAssigned) {
                      clearDashboardAssignment(client.id);
                    } else {
                      assignDashboard(client.id, assigningDashboard.id);
                    }
                  }}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-[16px] border px-3 py-2 text-left transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg}`}
                >
                  <span className={`min-w-0 flex-1 truncate text-sm ${styles.textColor}`}>
                    {client.id === currentClient.id
                      ? t('dashboard.multiple.create.thisDevice')
                      : client.name}
                  </span>
                  {isAssigned ? <Check className={`h-4 w-4 shrink-0 ${styles.textColor}`} /> : null}
                </button>
              );
            })
          ) : (
            <p className={`text-sm ${styles.subtleColor}`}>
              {t('dashboard.multiple.assign.noDevices')}
            </p>
          )}
        </div>
      </ModalSurface>

      <AlertDialog
        open={Boolean(deletingDashboard)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingDashboardId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard.multiple.manager.deleteTitle', {
                name: deletingDashboard?.name ?? '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.multiple.manager.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingDashboard) {
                  deleteDashboard(deletingDashboard.id);
                }
                setDeletingDashboardId(null);
              }}
            >
              {t('dashboard.multiple.manager.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
