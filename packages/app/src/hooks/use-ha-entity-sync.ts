import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { useEffect, useRef } from 'react';
import { useProviderEntitySnapshot } from './use-provider-entity';

export interface UseHaEntitySyncOptions<TLocal, THA> {
  /** Entity ID to watch */
  entityId: string;
  /** Current local state */
  localState: TLocal;
  /** Transform HA entity state to local state shape */
  transformer: (haState: THA) => TLocal;
  /** Compare local states to determine if update is needed */
  comparator: (local: TLocal, ha: TLocal) => boolean;
  /** Optional callback when entity state changes */
  onEntityChange?: (newState: TLocal) => void;
  /** Whether to sync changes (default: true) */
  enabled?: boolean;
}

/**
 * Reusable hook for syncing local component state with Home Assistant entity updates.
 * Prevents unnecessary re-renders by only updating when state actually changes.
 *
 * @param options - Sync configuration
 *
 * @example
 * ```ts
 * // Light card example
 * useHaEntitySync({
 *   entityId: 'light.living_room',
 *   localState: { isOn, brightness, colorTemp },
 *   transformer: (entity) => ({
 *     isOn: entity.state === 'on',
 *     brightness: entity.attributes.brightness,
 *     colorTemp: entity.attributes.color_temp_kelvin,
 *   }),
 *   comparator: (local, ha) =>
 *     local.isOn === ha.isOn &&
 *     local.brightness === ha.brightness &&
 *     local.colorTemp === ha.colorTemp,
 *   onEntityChange: (newState) => {
 *     setIsOn(newState.isOn);
 *     setBrightness(newState.brightness);
 *     setColorTemp(newState.colorTemp);
 *   },
 * });
 * ```
 */
export function useHaEntitySync<TLocal, THA>({
  entityId,
  localState,
  transformer,
  comparator,
  onEntityChange,
  enabled = true,
}: UseHaEntitySyncOptions<TLocal, THA>) {
  const previousLocalStateRef = useRef<TLocal>(localState);
  const transformerRef = useRef(transformer);
  const comparatorRef = useRef(comparator);
  const onEntityChangeRef = useRef(onEntityChange);

  // Keep refs updated without triggering effects
  transformerRef.current = transformer;
  comparatorRef.current = comparator;
  onEntityChangeRef.current = onEntityChange;

  const entity = useProviderEntitySnapshot(entityId) as THA | undefined;

  useEffect(() => {
    if (!enabled || !entity) {
      return;
    }

    const haState = transformerRef.current(entity);

    // Only update if state actually changed
    if (!comparatorRef.current(previousLocalStateRef.current, haState)) {
      previousLocalStateRef.current = haState;
      onEntityChangeRef.current?.(haState);
    }
  }, [entity, enabled]);
}

/**
 * Simplified version for basic on/off state syncing
 */
export function useHaBinaryStateSync(
  entityId: string,
  isOn: boolean,
  onStateChange: (isOn: boolean) => void,
  enabled = true
) {
  useHaEntitySync({
    entityId,
    localState: { isOn },
    transformer: (entity: PlatformEntitySnapshot) => ({ isOn: entity.state === 'on' }),
    comparator: (local, ha) => local.isOn === ha.isOn,
    onEntityChange: (newState) => onStateChange(newState.isOn),
    enabled,
  });
}
