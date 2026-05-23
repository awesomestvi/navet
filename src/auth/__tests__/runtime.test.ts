import { describe, expect, it } from 'vitest';
import { detectAuthRuntime } from '../runtime';

describe('detectAuthRuntime', () => {
  it('detects panel runtime from embedded flag', () => {
    (window as { __NAVET_PANEL__?: boolean }).__NAVET_PANEL__ = true;
    expect(detectAuthRuntime()).toBe('ha-panel');
    (window as { __NAVET_PANEL__?: boolean }).__NAVET_PANEL__ = false;
  });

  it('detects ingress runtime', () => {
    window.history.replaceState({}, '', '/api/hassio_ingress/navet/dashboard');
    expect(detectAuthRuntime()).toBe('ha-ingress');
  });

  it('detects standalone runtime', () => {
    window.history.replaceState({}, '', '/');
    expect(detectAuthRuntime()).toBe('standalone-oauth');
  });
});
