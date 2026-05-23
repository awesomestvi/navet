import { describe, expect, it } from 'vitest';
import { detectAuthRuntime } from '../runtime';

describe('detectAuthRuntime', () => {
  it('detects ingress runtime', () => {
    window.history.replaceState({}, '', '/api/hassio_ingress/navet/dashboard');
    expect(detectAuthRuntime()).toBe('ha-ingress');
  });

  it('detects standalone runtime', () => {
    window.history.replaceState({}, '', '/');
    expect(detectAuthRuntime()).toBe('standalone-oauth');
  });
});
