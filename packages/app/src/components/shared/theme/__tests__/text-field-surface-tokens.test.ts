import { describe, expect, it } from 'vitest';
import { getTextFieldSurfaceTokens } from '../text-field-surface-tokens';

describe('getTextFieldSurfaceTokens', () => {
  it('returns the expected field classes for each supported theme', () => {
    expect(getTextFieldSurfaceTokens('light').fieldClassName).toContain('bg-gray-100');
    expect(getTextFieldSurfaceTokens('glass').fieldClassName).toContain('bg-white/8');
    expect(getTextFieldSurfaceTokens('black').fieldClassName).toContain('bg-black');
    expect(getTextFieldSurfaceTokens('dark').fieldClassName).toContain('bg-zinc-900');
  });

  it('returns the expected adornment classes for each supported theme', () => {
    expect(getTextFieldSurfaceTokens('light').adornmentClassName).toBe('text-slate-500');
    expect(getTextFieldSurfaceTokens('glass').adornmentClassName).toBe('text-white/72');
    expect(getTextFieldSurfaceTokens('black').adornmentClassName).toBe('text-zinc-300');
    expect(getTextFieldSurfaceTokens('dark').adornmentClassName).toBe('text-zinc-400');
  });

  it('only sets an invalid border override when invalid is true', () => {
    expect(getTextFieldSurfaceTokens('light').invalidBorderColor).toBeUndefined();
    expect(getTextFieldSurfaceTokens('light', true).invalidBorderColor).toBe('#dc2626');
    expect(getTextFieldSurfaceTokens('glass', true).invalidBorderColor).toBe('#f87171');
  });
});
