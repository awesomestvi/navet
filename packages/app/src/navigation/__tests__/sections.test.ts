import { afterEach, describe, expect, it } from 'vitest';
import { customSidebarActionToPath, pathToDestination, pathToSection } from '../sections';

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
