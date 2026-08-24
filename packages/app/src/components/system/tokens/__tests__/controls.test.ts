import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
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
} from '@navet/app/components/system/tokens';
import { describe, expect, it } from 'vitest';

describe('system tokens', () => {
  it('exposes density tiers aligned with touch-target guidance', () => {
    expect(navetDensityTokens.compact.controlHeightPx).toBe(36);
    expect(navetDensityTokens.comfortable.controlHeightPx).toBe(40);
    expect(navetDensityTokens.touch.controlHeightPx).toBe(42);
    expect(navetAccessibilityTokens.minimumControlSizePx).toBe(36);
    expect(navetAccessibilityTokens.standardControlSizePx).toBe(40);
    expect(navetAccessibilityTokens.exceptionalControlSizePx).toBe(42);
  });

  it('resolves semantic button and input sizes from the shared token layer', () => {
    expect(getButtonSizeTokens('default').heightPx).toBe(40);
    expect(getButtonSizeTokens('compact').heightPx).toBe(36);
    expect(getButtonSizeTokens('touch').heightPx).toBe(42);
    expect(getButtonSizeTokens('small').iconOnlyClassName).toBe('h-9 w-9');
    expect(getInputSizeTokens('default').heightPx).toBe(40);
    expect(getInputSizeTokens('small').leadingPaddingClassName).toBe('pl-10');
    expect(getInputSizeTokens('touch').heightPx).toBe(42);
    expect(getCardActionControlSizes('tiny').button).toBe('navet-card-action-control');
    expect(getCardActionControlSizes('large').button).toBe('navet-card-action-control');
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
