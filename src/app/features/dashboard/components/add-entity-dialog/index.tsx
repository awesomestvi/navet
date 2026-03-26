import { Search, X } from 'lucide-react';
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { InlineEmptyState } from '@/app/components/shared/inline-empty-state';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { getDeviceTypeLabel } from '@/app/constants/device-type-labels';
import { useI18n, useTheme } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import { getDeviceRoomLabel } from '@/app/utils/device-location';
import { ENTITY_LIST_HEIGHT, ENTITY_LIST_OVERSCAN, ENTITY_ROW_HEIGHT } from './constants';
import type { AddEntityDialogProps } from './types';

interface PreparedDevice {
  device: DeviceWithType;
  id: string;
  name: string;
  room: string;
  typeLabel: string;
  searchText: string;
}

interface AddEntityRowProps {
  actionLabel: string;
  borderColor: string;
  cardBg: string;
  device: PreparedDevice;
  mutedColor: string;
  onAddEntity: (entityId: string) => void;
  primaryColor: string;
  textColor: string;
}

const AddEntityRow = memo(function AddEntityRow({
  actionLabel,
  borderColor,
  cardBg,
  device,
  mutedColor,
  onAddEntity,
  primaryColor,
  textColor,
}: AddEntityRowProps) {
  return (
    <div
      className={`flex h-19 items-center justify-between gap-4 rounded-xl border ${borderColor} ${cardBg} p-4`}
    >
      <div className="min-w-0">
        <p className={`truncate text-sm font-medium ${textColor}`}>{device.name}</p>
        <p className={`mt-1 truncate text-xs ${mutedColor}`}>
          {device.typeLabel} · {device.room}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`max-w-28 truncate rounded-full px-3 py-2 text-xs ${mutedColor}`}
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          title={device.room}
        >
          {device.room}
        </span>
        <button
          type="button"
          onClick={() => onAddEntity(device.id)}
          className="rounded-lg px-3 py-2 text-xs font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
});

export function AddEntityDialog({
  open,
  onClose,
  onAddEntity,
  currentRoom,
  deviceMap,
  addedEntityIds,
  visibleEntityIds,
  title = 'Add Entity',
  description,
  actionLabel = 'Add',
}: AddEntityDialogProps) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [query, setQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const deferredQuery = useDeferredValue(query);

  const bgColor = theme === 'light' ? 'bg-white' : surface.panel;
  const textColor = surface.textPrimary;
  const mutedColor = surface.textSecondary;
  const borderColor = surface.border;
  const cardBg = surface.panelMuted;
  const hoverBg = surface.hoverBg;
  const inputBg = surface.inputBg;
  const accentColor = getThemeColorValue(primaryColor);

  const visibleIdSet = useMemo(
    () => (visibleEntityIds ? new Set(visibleEntityIds) : null),
    [visibleEntityIds]
  );
  const addedEntityIdSet = useMemo(() => new Set(addedEntityIds), [addedEntityIds]);

  const preparedDevices = useMemo(() => {
    const devices: PreparedDevice[] = [];

    for (const device of deviceMap.values()) {
      if (visibleIdSet && !visibleIdSet.has(device.id)) {
        continue;
      }

      if (addedEntityIdSet.has(device.id)) {
        continue;
      }

      const room = getDeviceRoomLabel(device);
      if (currentRoom !== 'All' && room !== currentRoom) {
        continue;
      }

      const name = typeof device.name === 'string' ? device.name : device.id;
      const typeLabel =
        ('entityType' in device && typeof device.entityType === 'string' && device.entityType) ||
        getDeviceTypeLabel(device.type, t);

      devices.push({
        device,
        id: device.id,
        name,
        room,
        typeLabel,
        searchText: `${name} ${room} ${typeLabel} ${device.id}`.toLowerCase(),
      });
    }

    devices.sort((left, right) => {
      const roomComparison = left.room.localeCompare(right.room);
      if (roomComparison !== 0) {
        return roomComparison;
      }

      return left.name.localeCompare(right.name);
    });

    return devices;
  }, [addedEntityIdSet, currentRoom, deviceMap, t, visibleIdSet]);

  const availableDevices = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return preparedDevices;
    }

    return preparedDevices.filter((device) => device.searchText.includes(normalizedQuery));
  }, [deferredQuery, preparedDevices]);

  const listResetKey = `${open}:${currentRoom}:${query}:${visibleEntityIds?.join(',') ?? ''}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: this effect intentionally resets virtualization state when the list identity changes
  useEffect(() => {
    setScrollTop(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [listResetKey]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const visibleCount = Math.ceil(ENTITY_LIST_HEIGHT / ENTITY_ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ENTITY_ROW_HEIGHT) - ENTITY_LIST_OVERSCAN);
  const endIndex = Math.min(
    availableDevices.length,
    startIndex + visibleCount + ENTITY_LIST_OVERSCAN * 2
  );
  const virtualDevices = availableDevices.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * ENTITY_ROW_HEIGHT;
  const totalHeight = availableDevices.length * ENTITY_ROW_HEIGHT;

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${surface.dialogBackdrop}`}
    >
      <div
        className={`${bgColor} rounded-2xl border ${borderColor} w-full max-w-2xl max-h-[80vh] overflow-hidden`}
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className={`text-xl font-semibold ${textColor}`}>{title}</h2>
            <p className={`text-sm ${mutedColor} mt-1`}>
              {description ??
                (currentRoom === 'All'
                  ? t('dashboard.addEntity.defaultDescriptionAll')
                  : t('dashboard.addEntity.defaultDescriptionRoom', { room: currentRoom }))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full ${cardBg} ${hoverBg} flex items-center justify-center transition-colors`}
          >
            <X className={`w-4 h-4 ${mutedColor}`} />
          </button>
        </div>

        <div className="p-6 border-b border-white/10">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedColor}`} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('dashboard.addEntity.searchPlaceholder')}
              className={`w-full rounded-[22px] border ${borderColor} ${inputBg} pl-10 pr-4 py-3 text-sm ${textColor} focus:outline-none`}
              style={{ caretColor: accentColor }}
            />
          </div>
        </div>

        <div
          ref={listRef}
          className="overflow-y-auto p-6 pt-4"
          style={{ maxHeight: `${ENTITY_LIST_HEIGHT}px` }}
          onScroll={(event) => {
            const nextScrollTop = event.currentTarget.scrollTop;
            if (scrollRafRef.current !== null) {
              return;
            }

            scrollRafRef.current = window.requestAnimationFrame(() => {
              scrollRafRef.current = null;
              setScrollTop(nextScrollTop);
            });
          }}
        >
          {availableDevices.length > 0 ? (
            <div className="relative" style={{ height: totalHeight || ENTITY_LIST_HEIGHT }}>
              <div
                className="absolute inset-x-0 top-0 space-y-3"
                style={{ transform: `translateY(${topSpacerHeight}px)` }}
              >
                {virtualDevices.map((device) => (
                  <AddEntityRow
                    key={device.id}
                    actionLabel={actionLabel}
                    borderColor={borderColor}
                    cardBg={cardBg}
                    device={device}
                    mutedColor={mutedColor}
                    onAddEntity={onAddEntity}
                    primaryColor={accentColor}
                    textColor={textColor}
                  />
                ))}
              </div>
            </div>
          ) : (
            <InlineEmptyState
              title={t('dashboard.addEntity.emptyTitle')}
              description={
                visibleEntityIds
                  ? t('dashboard.addEntity.emptyHidden')
                  : t('dashboard.addEntity.emptyDefault')
              }
              surface={surface}
              accentColor={accentColor}
            />
          )}
        </div>
      </div>
    </div>
  );
}
