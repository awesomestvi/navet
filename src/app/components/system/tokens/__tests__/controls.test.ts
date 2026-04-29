import { describe, expect, it } from 'vitest';
import {
  getBaseCardGapClassName,
  getBaseCardRadiusClassName,
  getButtonSizeTokens,
  getDialogHeightClassName,
  getDialogMaxWidthClassName,
  getInputSizeTokens,
  getNavetMotionProfile,
  getNavetMotionProfileName,
  navetAccessibilityTokens,
  navetDensityTokens,
} from '@/app/components/system/tokens';

describe('system tokens', () => {
  it('exposes density tiers aligned with touch-target guidance', () => {
    expect(navetDensityTokens.compact.controlHeightPx).toBe(36);
    expect(navetDensityTokens.comfortable.controlHeightPx).toBe(44);
    expect(navetDensityTokens.touch.controlHeightPx).toBe(48);
    expect(navetAccessibilityTokens.preferredTouchTargetPx).toBe(48);
  });

  it('resolves semantic button and input sizes from the shared token layer', () => {
    expect(getButtonSizeTokens('default').heightPx).toBe(40);
    expect(getButtonSizeTokens('small').iconOnlyClassName).toBe('h-9 w-9');
    expect(getInputSizeTokens('default').heightPx).toBe(44);
    expect(getInputSizeTokens('small').leadingPaddingClassName).toBe('pl-10');
  });

  it('maps dialog helper options to shared class names', () => {
    expect(getDialogMaxWidthClassName('sm')).toBe('max-w-sm');
    expect(getDialogMaxWidthClassName('lg')).toBe('max-w-lg');
    expect(getDialogHeightClassName('tall')).toBe('h-[85vh]');
    expect(getDialogHeightClassName(undefined)).toBe('');
  });

  it('keeps base-card shape decisions centralized', () => {
    expect(getBaseCardRadiusClassName('tiny')).toBe('rounded-[24px]');
    expect(getBaseCardRadiusClassName('large')).toBe('rounded-[24px]');
    expect(getBaseCardGapClassName('extra-small')).toBe('gap-2.5');
    expect(getBaseCardGapClassName('medium')).toBe('gap-3');
  });

  it('maps effects quality to motion profiles', () => {
    expect(getNavetMotionProfileName('low')).toBe('lowPower');
    expect(getNavetMotionProfileName('medium')).toBe('balanced');
    expect(getNavetMotionProfileName('high')).toBe('premium');
    expect(getNavetMotionProfile('medium').blur).toBe(true);
    expect(getNavetMotionProfile('low').heavyShadow).toBe(false);
  });
});
