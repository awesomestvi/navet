import { describe, expect, it } from 'vitest';
import { classifyFiles, impactLabels, requiredApprovalGates } from './change-impact.mjs';

describe('change impact classification', () => {
  it('requires product approval for rendered UI changes', () => {
    const impact = classifyFiles([
      'packages/app/src/features/media/components/media-dashboard/media-dashboard.tsx',
    ]);

    expect(impact.ui).toBe(true);
    expect(requiredApprovalGates(impact)).toEqual({
      product: true,
      foundation: false,
      security: false,
    });
    expect(impactLabels(impact)).toContain('impact: ui');
  });

  it.each([
    'packages/app/src/main.tsx',
    'packages/app/src/App.tsx',
    'packages/app/src/authenticated-app.tsx',
  ])('requires product approval for the rendered app entrypoint %s', (file) => {
    const impact = classifyFiles([file]);

    expect(impact.ui).toBe(true);
    expect(requiredApprovalGates(impact).product).toBe(true);
  });

  it('requires explicit approval for product constitution changes', () => {
    const impact = classifyFiles(['docs/product/vision.md']);

    expect(impact.docs).toBe(true);
    expect(impact.foundation).toBe(true);
    expect(requiredApprovalGates(impact).foundation).toBe(true);
  });

  it.each(['AGENTS.md', '.github/AGENTS.md', 'packages/app/AGENTS.md'])(
    'requires foundation approval for agent authority changes in %s',
    (file) => {
      const impact = classifyFiles([file]);

      expect(impact.docs).toBe(true);
      expect(impact.foundation).toBe(true);
      expect(requiredApprovalGates(impact).foundation).toBe(true);
    }
  );

  it('allows a label to add a gate that path classification cannot infer', () => {
    const impact = classifyFiles(['packages/app/src/utils/format-temperature.ts']);

    expect(requiredApprovalGates(impact, ['gate: security']).security).toBe(true);
  });

  it('normalizes Windows paths before classification', () => {
    expect(classifyFiles(['packages\\ui\\src\\button.tsx']).ui).toBe(true);
  });
});
