import { describe, expect, it } from 'vitest';
import { readViteDynamicPreloadAssetPaths } from './vite-preload-graph.mjs';

const GENERATED_SOURCE =
  'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./authenticated-app-a.js","./shared-b.js","./other-c.js"])))=>i.map(i=>d[i]);' +
  'const Other=()=>import(`./other-c.js`);' +
  'const App=()=>load(()=>import(`./authenticated-app-a.js`),__vite__mapDeps([0,1]),import.meta.url);';

describe('readViteDynamicPreloadAssetPaths', () => {
  it('reads the dependency graph for the requested dynamic import', () => {
    expect(readViteDynamicPreloadAssetPaths(GENERATED_SOURCE, 'authenticated-app-')).toEqual({
      assetPaths: ['authenticated-app-a.js', 'shared-b.js'],
      targetAssetPath: 'authenticated-app-a.js',
    });
  });

  it('fails closed when the requested transition has no preload graph', () => {
    expect(() => readViteDynamicPreloadAssetPaths(GENERATED_SOURCE, 'dashboard-')).toThrow(
      'Unable to find the dashboard- dynamic import'
    );
  });
});
