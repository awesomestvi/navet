import { describe, expect, it } from 'vitest';
import { approvalsFromStatuses } from './approval-status.mjs';

describe('approval status contract', () => {
  it('derives approval only from successful SHA-bound status contexts', () => {
    expect(
      approvalsFromStatuses([
        { context: 'navet/product-approval', state: 'success' },
        { context: 'navet/foundation-approval', state: 'pending' },
        { context: 'unrelated-check', state: 'success' },
      ])
    ).toEqual({
      product: true,
      foundation: false,
      security: false,
    });
  });

  it('does not infer approval when the current head has no statuses', () => {
    expect(approvalsFromStatuses()).toEqual({
      product: false,
      foundation: false,
      security: false,
    });
  });
});
