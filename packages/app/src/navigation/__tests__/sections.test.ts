import { afterEach, describe, expect, it } from 'vitest';
import {
  customSidebarActionToPath,
  dashboardToPath,
  pathToDashboardId,
  pathToDestination,
  pathToSection,
} from '../sections';

function installBase(href: string) {
  const base = document.createElement('base');
  base.href = href;
  document.head.append(base);
  return base;
}

afterEach(() => {
  document.querySelector('base')?.remove();
});

describe('pathToSection', () => {
  it('derives ingress sections directly from the URL before base href is available', () => {
    expect(pathToSection('/api/hassio_ingress/navet_dev/security')).toBe('security');
  });

  it('treats the ingress root as home', () => {
    expect(pathToSection('/api/hassio_ingress/navet_dev/')).toBe('home');
  });

  it('continues to treat unknown base-relative paths as home', () => {
    const base = installBase(`${window.location.origin}/dashboard/`);

    try {
      expect(pathToSection('/dashboard')).toBe('home');
    } finally {
      base.remove();
    }
  });

  it('derives embedded sidebar destinations from the current base path', () => {
    const base = installBase(`${window.location.origin}/dashboard/`);

    try {
      expect(pathToDestination('/dashboard/embedded/movie-status')).toEqual({
        kind: 'custom_sidebar',
        actionId: 'movie-status',
      });
      expect(customSidebarActionToPath('movie-status')).toBe('/dashboard/embedded/movie-status');
    } finally {
      base.remove();
    }
  });

  it('derives ingress embedded sidebar destinations directly from the URL', () => {
    expect(pathToDestination('/api/hassio_ingress/navet_dev/embedded/movie-status')).toEqual({
      kind: 'custom_sidebar',
      actionId: 'movie-status',
    });
  });
});

describe('dashboard paths', () => {
  it('round-trips a named dashboard on a standalone path', () => {
    expect(dashboardToPath('upstairs')).toBe('/dashboard/upstairs');
    expect(pathToDashboardId('/dashboard/upstairs')).toBe('upstairs');
    expect(pathToDestination('/dashboard/upstairs')).toEqual({ kind: 'section', section: 'home' });
  });

  it('round-trips a named dashboard below a configured base path', () => {
    const base = installBase(`${window.location.origin}/demo/`);

    try {
      expect(dashboardToPath('wall-panel')).toBe('/demo/dashboard/wall-panel');
      expect(pathToDashboardId('/demo/dashboard/wall-panel')).toBe('wall-panel');
    } finally {
      base.remove();
    }
  });

  it('recognizes a named dashboard through Home Assistant Ingress', () => {
    expect(pathToDashboardId('/api/hassio_ingress/navet_dev/dashboard/sonoff')).toBe('sonoff');
  });

  it('rejects nested paths that only happen to contain a dashboard segment', () => {
    expect(pathToDashboardId('/embedded/dashboard/upstairs/details')).toBeNull();
  });
});
