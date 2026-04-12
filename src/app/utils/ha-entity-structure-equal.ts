import type { HassEntities } from 'home-assistant-js-websocket';

/**
 * Structural equality for HassEntities: true when the set of entity IDs is unchanged.
 * State-only updates keep the same keys — subscriptions using this avoid downstream
 * rebuilds that only care about add/remove/rename of entities.
 */
export function haEntityStructureEqual(
  prev: HassEntities | null,
  next: HassEntities | null
): boolean {
  if (prev === next) {
    return true;
  }

  if (!prev || !next) {
    return false;
  }

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (!(key in next)) {
      return false;
    }
  }

  return true;
}
