import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import type { CSSProperties } from 'react';

export interface MediaTVViewSurfaceTokens {
  // TV View Colors
  tvBaseColor: string;
  tvActiveGradient: string;
  tvBackgroundColor: string;

  // Control Surfaces
  controlStyle: CSSProperties;
  panelStyle: CSSProperties;
  navShellStyle: CSSProperties;

  // Text & Icons
  iconClassName: string;
  separatorColor: string;

  // D-Pad Specific
  dpadBackground: string;
  dpadBorder: string;
  dpadButtonBg: string;
  dpadButtonBorder: string;
  dpadButtonShadow: string;
}

export function getMediaTVViewSurfaceTokens(
  theme: ThemeType,
  isOn: boolean,
  effectsQuality: EffectsQuality = 'high'
): MediaTVViewSurfaceTokens {
  const isHigh = effectsQuality === 'high';

  // Color scheme for TV display
  const tvBaseColor = isOn ? '#d946ef' : '#64748b';
  const tvActiveGradient = isOn
    ? theme === 'light'
      ? '#fdf4ff'
      : theme === 'glass'
        ? '#3b2448'
        : theme === 'black'
          ? '#14040f'
          : '#2a1038'
    : theme === 'light'
      ? '#f8fafc'
      : theme === 'glass'
        ? '#334155'
        : theme === 'black'
          ? '#000000'
          : '#18181b';

  const tvBackgroundColor = tvActiveGradient;

  // Icon styling
  const iconClassName = theme === 'light' ? '!text-slate-800' : '!text-white/90';

  // Separator color
  const separatorColor = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';

  // Control button surfaces
  const controlStyle: CSSProperties =
    theme === 'light'
      ? {
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderColor: 'rgba(15,23,42,0.08)',
          boxShadow: '0 10px 24px -18px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.86)',
        }
      : {
          backgroundColor: isOn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          borderColor: isOn ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        };

  // Panel surfaces
  const panelStyle: CSSProperties =
    theme === 'light'
      ? {
          backgroundColor: 'rgba(255,255,255,0.56)',
          borderColor: 'rgba(15,23,42,0.07)',
          boxShadow: '0 14px 36px -28px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.86)',
        }
      : {
          backgroundColor: isOn ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          borderColor: isOn ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        };

  // Navigation shell (D-Pad container)
  const navShellStyle: CSSProperties =
    theme === 'light'
      ? {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)',
          borderColor: 'rgba(15,23,42,0.08)',
          boxShadow: isHigh
            ? '0 18px 36px -28px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.92)'
            : '0 12px 24px -20px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.86)',
        }
      : {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        };

  // D-Pad specific surfaces
  const dpadBackground =
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)';

  const dpadBorder = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)';

  const dpadButtonBg =
    theme === 'light'
      ? 'rgba(255,255,255,0.7)'
      : isOn
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.05)';

  const dpadButtonBorder =
    theme === 'light'
      ? 'rgba(15,23,42,0.08)'
      : isOn
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(255,255,255,0.09)';

  const dpadButtonShadow =
    theme === 'light'
      ? '0 10px 24px -18px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.86)'
      : 'inset 0 1px 0 rgba(255,255,255,0.08)';

  return {
    tvBaseColor,
    tvActiveGradient,
    tvBackgroundColor,
    controlStyle,
    panelStyle,
    navShellStyle,
    iconClassName,
    separatorColor,
    dpadBackground,
    dpadBorder,
    dpadButtonBg,
    dpadButtonBorder,
    dpadButtonShadow,
  };
}
