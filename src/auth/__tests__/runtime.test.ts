import { beforeEach, describe, expect, it } from 'vitest';
import { resetRuntimeContextForTests } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import { ingressSessionFixture } from '@/test/fixtures/home-assistant/auth/ingress';
import { panelSessionFixture } from '@/test/fixtures/home-assistant/auth/panel';
import { detectAuthRuntime } from '../runtime';

describe('detectAuthRuntime', () => {
  beforeEach(() => {
    window.__NAVET_PANEL__ = false;
    window.__NAVET_CONFIG__ = undefined;
    resetRuntimeContextForTests();
  });

  it('detects panel runtime from embedded flag', () => {
    (window as { __NAVET_PANEL__?: boolean }).__NAVET_PANEL__ = panelSessionFixture.panelFlag;
    resetRuntimeContextForTests();
    expect(detectAuthRuntime()).toBe('ha-panel');
    (window as { __NAVET_PANEL__?: boolean }).__NAVET_PANEL__ = false;
  });

  it('detects ingress runtime', () => {
    window.history.replaceState({}, '', ingressSessionFixture.ingressPath);
    resetRuntimeContextForTests();
    expect(detectAuthRuntime()).toBe('ha-ingress');
  });

  it('detects standalone runtime', () => {
    window.history.replaceState({}, '', '/');
    resetRuntimeContextForTests();
    expect(detectAuthRuntime()).toBe('standalone-oauth');
  });
});
