import { describe, expect, it } from 'vitest';
import { approvalsFromStatuses } from './approval-status.mjs';

describe('approval status contract', () => {
  it('derives approval only from successful SHA-bound status contexts', () => {
    expect(
      approvalsFromStatuses([
        { context: 'navet/foundation-approval', state: 'pending' },
        { context: 'navet/security-approval', state: 'success' },
        { context: 'unrelated-check', state: 'success' },
      ])
    ).toEqual({
      foundation: false,
      security: true,
    });
  });

  it('does not infer approval when the current head has no statuses', () => {
    expect(approvalsFromStatuses()).toEqual({
      foundation: false,
      security: false,
    });
  });

  it('uses the newest status when a context has multiple entries', () => {
    expect(
      approvalsFromStatuses([
        { context: 'navet/foundation-approval', state: 'pending' },
        { context: 'navet/foundation-approval', state: 'success' },
      ]).foundation
    ).toBe(false);
  });
});
