import { describe, expect, it } from 'vitest';
import { classifyFiles, impactLabels } from './change-impact.mjs';

describe('change impact classification', () => {
  it('classifies rendered UI changes', () => {
    const impact = classifyFiles([
      'packages/app/src/features/media/components/media-dashboard/media-dashboard.tsx',
    ]);

    expect(impact.ui).toBe(true);
    expect(impactLabels(impact)).toContain('impact: ui');
  });

  it.each([
    'packages/app/src/main.tsx',
    'packages/app/src/App.tsx',
    'packages/app/src/authenticated-app.tsx',
  ])('classifies the rendered app entrypoint %s', (file) => {
    const impact = classifyFiles([file]);

    expect(impact.ui).toBe(true);
  });

  it('normalizes Windows paths before classification', () => {
    expect(classifyFiles(['packages\\ui\\src\\button.tsx']).ui).toBe(true);
  });
});
