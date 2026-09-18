import { describe, expect, it } from 'vitest';
import { verifyPrivatePreviewSource } from './run-private-preview.mjs';

describe('private preview source verification', () => {
  it('accepts an exact clean commit', () => {
    expect(() =>
      verifyPrivatePreviewSource({
        configuredSha: 'abc123',
        headSha: 'abc123',
        worktreeStatus: '',
      })
    ).not.toThrow();
  });

  it('rejects uncommitted source changes', () => {
    expect(() =>
      verifyPrivatePreviewSource({
        configuredSha: 'abc123',
        headSha: 'abc123',
        worktreeStatus: ' M packages/app/src/App.tsx',
      })
    ).toThrow(/must be clean/);
  });

  it('rejects metadata that does not match HEAD', () => {
    expect(() =>
      verifyPrivatePreviewSource({
        configuredSha: 'reviewed-sha',
        headSha: 'different-sha',
        worktreeStatus: '',
      })
    ).toThrow(/does not match checked-out HEAD/);
  });
});
