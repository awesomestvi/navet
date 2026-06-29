import { describe, expect, it } from 'vitest';
import {
  ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
  normalizeCustomSidebarActions,
} from '../custom-extensions';

describe('custom extensions', () => {
  it('allows up to five custom sidebar actions', () => {
    const actions = Array.from({ length: 6 }, (_, index) => ({
      id: `custom-${index + 1}`,
      label: `Custom ${index + 1}`,
      icon: 'link',
      targetType: 'url',
      targetUrl: `https://example.com/${index + 1}`,
      visibility: 'always',
    }));

    expect(ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT).toBe(5);
    expect(normalizeCustomSidebarActions(actions)).toHaveLength(5);
    expect(normalizeCustomSidebarActions(actions).map((action) => action.id)).toEqual([
      'custom-1',
      'custom-2',
      'custom-3',
      'custom-4',
      'custom-5',
    ]);
  });
});
