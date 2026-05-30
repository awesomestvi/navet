import type { ReactNode } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { ThemeType } from '@/app/hooks';
import { FogOverlaySvg } from './fog-overlay';
import { PassageWaveOverlaySvg } from './passage-wave-overlay';
import { RainOverlaySvg } from './rain-overlay';
import { SnowflakeOverlaySvg } from './snowflake-overlay';
import { StormLightningOverlaySvg } from './storm-lightning-overlay';
import { getWeatherBackgroundVariant } from './weather-card-utils';
import type { WeatherCondition } from './weather-icon';
import { WindOverlaySvg } from './wind-overlay';

// ─── Theme surface helpers ───────────────────────────────────────────────────

function pickThemeValue<T>(theme: ThemeType, values: { light: T; glass: T; dark: T; black: T }): T {
  if (theme === 'glass') {
    return values.glass;
  }

  if (theme === 'black') {
    return values.black;
  }

  if (theme === 'dark') {
    return values.dark;
  }

  return values.light;
}

interface WeatherThemeSurface {
  baseGradient: string;
  themeSurfaceClassName: string | null;
  darkThemeScrim: React.ReactNode;
}

function getWeatherThemeSurface(theme: ThemeType, variant: string): WeatherThemeSurface {
  // Base gradient
  const baseGradient = pickThemeValue(theme, {
    light: getLightGradient(variant),
    glass: getGlassGradient(variant),
    dark: getDarkGradient(variant),
    black: getBlackGradient(variant),
  });

  // Theme surface className
  const themeSurfaceClassName = getThemeSurfaceClassName(theme, variant);

  // Dark theme scrim
  const darkThemeScrim = getDarkThemeScrim(theme);

  return { baseGradient, themeSurfaceClassName, darkThemeScrim };
}

function getLightGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny: 'bg-[linear-gradient(120deg,#ea6d61_0%,#ef8758_48%,#f4a54d_100%)]',
    'clear-night': 'bg-[linear-gradient(120deg,#223f83_0%,#284786_46%,#263e73_100%)]',
    cloudy: 'bg-[linear-gradient(120deg,#4b95e4_0%,#4288d4_52%,#3474bc_100%)]',
    rain: 'bg-[linear-gradient(120deg,#34396d_0%,#2f3463_46%,#262d56_100%)]',
    storm: 'bg-[linear-gradient(120deg,#2d315d_0%,#282d53_52%,#1f2648_100%)]',
    windy: 'bg-[linear-gradient(120deg,#4ca0e8_0%,#3f8fd7_50%,#2f79be_100%)]',
    fog: 'bg-[linear-gradient(120deg,#7ea2be_0%,#6f96b4_52%,#628aa8_100%)]',
    'snow-night': 'bg-[linear-gradient(120deg,#1f2d57_0%,#223764_48%,#1c2f58_100%)]',
    'snow-day': 'bg-[linear-gradient(120deg,#66779c_0%,#566582_50%,#44506b_100%)]',
  };
  return gradients[variant] || 'bg-[linear-gradient(120deg,#438ddf_0%,#4289dc_52%,#3d85d9_100%)]';
}

function getGlassGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny:
      'bg-[linear-gradient(120deg,rgba(234,109,97,0.42)_0%,rgba(239,135,88,0.34)_48%,rgba(244,165,77,0.28)_100%)]',
    'clear-night':
      'bg-[linear-gradient(120deg,rgba(34,63,131,0.34)_0%,rgba(40,71,134,0.26)_46%,rgba(38,62,115,0.22)_100%)]',
    cloudy:
      'bg-[linear-gradient(120deg,rgba(75,149,228,0.28)_0%,rgba(66,136,212,0.22)_52%,rgba(52,116,188,0.18)_100%)]',
    rain: 'bg-[linear-gradient(120deg,rgba(52,57,109,0.30)_0%,rgba(47,52,99,0.24)_46%,rgba(38,45,86,0.20)_100%)]',
    storm:
      'bg-[linear-gradient(120deg,rgba(45,49,93,0.30)_0%,rgba(40,45,83,0.24)_52%,rgba(31,38,72,0.20)_100%)]',
    windy:
      'bg-[linear-gradient(120deg,rgba(76,160,232,0.28)_0%,rgba(63,143,215,0.22)_50%,rgba(47,121,190,0.18)_100%)]',
    fog: 'bg-[linear-gradient(120deg,rgba(126,162,190,0.24)_0%,rgba(111,150,180,0.20)_52%,rgba(98,138,168,0.16)_100%)]',
    'snow-night':
      'bg-[linear-gradient(120deg,rgba(31,45,87,0.30)_0%,rgba(34,55,100,0.24)_48%,rgba(28,47,88,0.20)_100%)]',
    'snow-day':
      'bg-[linear-gradient(120deg,rgba(102,119,156,0.24)_0%,rgba(86,101,130,0.20)_50%,rgba(68,80,107,0.16)_100%)]',
  };
  return (
    gradients[variant] ||
    'bg-[linear-gradient(120deg,rgba(67,141,223,0.28)_0%,rgba(66,137,220,0.22)_52%,rgba(61,133,217,0.18)_100%)]'
  );
}

function getDarkGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny: 'bg-[linear-gradient(120deg,#9f462e_0%,#bc6429_48%,#dd8f27_100%)]',
    'clear-night': 'bg-[linear-gradient(120deg,#182a57_0%,#1c3363_46%,#1a2b52_100%)]',
    cloudy: 'bg-[linear-gradient(120deg,#25496f_0%,#214261_52%,#1b3650_100%)]',
    rain: 'bg-[linear-gradient(120deg,#1f2348_0%,#1c2140_46%,#171c36_100%)]',
    storm: 'bg-[linear-gradient(120deg,#1a1d39_0%,#161a31_52%,#12172a_100%)]',
    windy: 'bg-[linear-gradient(120deg,#285479_0%,#224a6a_50%,#1b3d58_100%)]',
    fog: 'bg-[linear-gradient(120deg,#485f72_0%,#3f5668_52%,#37495a_100%)]',
    'snow-night': 'bg-[linear-gradient(120deg,#15213f_0%,#19294d_48%,#142241_100%)]',
    'snow-day': 'bg-[linear-gradient(120deg,#3b4459_0%,#343d4f_50%,#2a3140_100%)]',
  };
  return gradients[variant] || 'bg-[linear-gradient(120deg,#24496f_0%,#224466_52%,#1d3d5c_100%)]';
}

function getBlackGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny: 'bg-[linear-gradient(120deg,#532116_0%,#723115_48%,#a35218_100%)]',
    'clear-night': 'bg-[linear-gradient(120deg,#081122_0%,#0b1630_46%,#0b1227_100%)]',
    cloudy: 'bg-[linear-gradient(120deg,#0d1b2a_0%,#102033_52%,#0d1725_100%)]',
    rain: 'bg-[linear-gradient(120deg,#090b17_0%,#0b1020_46%,#090d18_100%)]',
    storm: 'bg-[linear-gradient(120deg,#060913_0%,#090d18_52%,#070a13_100%)]',
    windy: 'bg-[linear-gradient(120deg,#0e2030_0%,#102536_50%,#0c1a28_100%)]',
    fog: 'bg-[linear-gradient(120deg,#171e25_0%,#1a232c_52%,#151d24_100%)]',
    'snow-night': 'bg-[linear-gradient(120deg,#060c16_0%,#09111f_48%,#070d17_100%)]',
    'snow-day': 'bg-[linear-gradient(120deg,#131820_0%,#151a24_50%,#11161d_100%)]',
  };
  return gradients[variant] || 'bg-[linear-gradient(120deg,#0d1c2d_0%,#102033_52%,#0c1827_100%)]';
}

function getThemeSurfaceClassName(theme: ThemeType, variant: string): string | null {
  if (variant === 'sunny') {
    if (theme === 'glass') {
      return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,transparent_72%)]';
    }
    if (theme === 'black') {
      return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012)_28%,rgba(0,0,0,0.08)_100%)]';
    }
    if (theme === 'dark') {
      return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015)_28%,rgba(2,6,23,0.04)_100%)]';
    }
  }

  if (theme === 'glass') {
    return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,transparent_72%)]';
  }

  if (theme === 'black') {
    return 'bg-[linear-gradient(180deg,rgba(0,0,0,0.24),rgba(0,0,0,0.44)_100%)]';
  }

  if (theme === 'dark') {
    return 'bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.28)_100%)]';
  }

  return null;
}

function getDarkThemeScrim(theme: ThemeType): React.ReactNode {
  if (theme === 'black') {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.26),rgba(0,0,0,0.42)_100%)]" />
    );
  }

  if (theme === 'dark') {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.14),rgba(2,6,23,0.28)_100%)]" />
    );
  }

  return null;
}

function getSunnyThemeSurface(theme: ThemeType): {
  themeSurfaceClassName: string | null;
  darkThemeScrim: ReactNode;
} {
  if (theme === 'glass') {
    return {
      themeSurfaceClassName:
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,transparent_72%)]',
      darkThemeScrim: null,
    };
  }

  if (theme === 'black') {
    return {
      themeSurfaceClassName:
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012)_28%,rgba(0,0,0,0.08)_100%)]',
      darkThemeScrim: (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.18)_100%)]" />
      ),
    };
  }

  if (theme === 'dark') {
    return {
      themeSurfaceClassName:
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015)_28%,rgba(2,6,23,0.04)_100%)]',
      darkThemeScrim: (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05),rgba(2,6,23,0.14)_100%)]" />
      ),
    };
  }

  return {
    themeSurfaceClassName:
      'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,transparent_72%)]',
    darkThemeScrim: null,
  };
}

// ─── Weather background compositor ───────────────────────────────────────────

export function WeatherBackground({
  condition,
  hasCustomTint,
  size,
  theme,
}: {
  condition: WeatherCondition | string;
  hasCustomTint: boolean;
  size: CardSize;
  theme: ThemeType;
}) {
  const variant = getWeatherBackgroundVariant(condition);
  const isLarge = size === 'large';
  const isMedium = size === 'medium';

  if (hasCustomTint) {
    return null;
  }

  const surface = getWeatherThemeSurface(theme, variant);

  if (variant === 'sunny') {
    const sunClassName = pickThemeValue(theme, {
      light: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40'
          : 'right-[-18%] top-[-28%] h-40 w-40',
      glass: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-70'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-70'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-70',
      dark: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-84'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-84'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-84',
      black: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-72'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-72'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-72',
    });
    const sunnySurface = getSunnyThemeSurface(theme);
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <div className={`absolute rounded-full bg-[#ffd364]/95 ${sunClassName}`} />
        <div
          className={`absolute rounded-full border border-[#ffd975]/48 ${
            isLarge
              ? 'right-[-2%] top-[-4%] h-44 w-44'
              : isMedium
                ? 'right-[-8%] top-[-24%] h-32 w-32'
                : 'right-[-10%] top-[-18%] h-32 w-32'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#ffd975]/28 ${
            isLarge
              ? 'right-[-12%] top-[-14%] h-64 w-64'
              : isMedium
                ? 'right-[-20%] top-[-40%] h-48 w-48'
                : 'right-[-22%] top-[-34%] h-48 w-48'
          }`}
        />
        {sunnySurface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${sunnySurface.themeSurfaceClassName}`} />
        ) : null}
        {sunnySurface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'clear-night') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <div
          className={`absolute rounded-full bg-[#f6e39b]/92 ${
            isLarge ? 'right-[10%] top-[6%] h-20 w-20' : 'right-[10%] top-[0%] h-14 w-14'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#f2dda1]/18 ${
            isLarge ? 'right-[4%] top-[-2%] h-32 w-32' : 'right-[2%] top-[-12%] h-24 w-24'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#7386cc]/14 ${
            isLarge ? 'right-[-2%] top-[-8%] h-44 w-44' : 'right-[-8%] top-[-20%] h-32 w-32'
          }`}
        />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'cloudy') {
    const waveOpacity = pickThemeValue(theme, {
      light: 'opacity-95',
      glass: 'opacity-62',
      dark: 'opacity-72',
      black: 'opacity-58',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(207,231,255,0.28)"
          layerTwoColor="rgba(174,212,246,0.20)"
          layerThreeColor="rgba(140,190,235,0.18)"
          rimColor="rgba(224,241,255,0.12)"
          className={waveOpacity}
        />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'rain') {
    const waveOpacity = pickThemeValue(theme, {
      light: 'opacity-90',
      glass: 'opacity-58',
      dark: 'opacity-70',
      black: 'opacity-56',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(142,162,210,0.16)"
          layerTwoColor="rgba(102,122,176,0.16)"
          layerThreeColor="rgba(67,86,136,0.22)"
          rimColor="rgba(196,214,255,0.08)"
          className={waveOpacity}
        />
        <RainOverlaySvg size={size} intensity="rain" />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'storm') {
    const nearWaveOpacity = pickThemeValue(theme, {
      light: 'opacity-88',
      glass: 'opacity-56',
      dark: 'opacity-68',
      black: 'opacity-52',
    });
    const farWaveOpacity = pickThemeValue(theme, {
      light: 'opacity-92',
      glass: 'opacity-60',
      dark: 'opacity-72',
      black: 'opacity-56',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <StormLightningOverlaySvg size={size} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(130,145,196,0.16)"
          layerTwoColor="rgba(88,104,160,0.18)"
          layerThreeColor="rgba(50,66,118,0.24)"
          rimColor="rgba(188,204,255,0.06)"
          className={nearWaveOpacity}
        />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(89,104,154,0.16)"
          layerTwoColor="rgba(58,71,120,0.22)"
          layerThreeColor="rgba(30,40,82,0.28)"
          rimColor="rgba(128,146,208,0.05)"
          className={farWaveOpacity}
        />
        <RainOverlaySvg size={size} intensity="storm" />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'windy') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <WindOverlaySvg size={size} />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'fog') {
    const fogOpacity = pickThemeValue(theme, {
      light: 'opacity-80',
      glass: 'opacity-54',
      dark: 'opacity-66',
      black: 'opacity-50',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(235,243,252,0.18)"
          layerTwoColor="rgba(215,230,245,0.14)"
          layerThreeColor="rgba(182,205,228,0.12)"
          rimColor="rgba(255,255,255,0.08)"
          className={fogOpacity}
        />
        <FogOverlaySvg size={size} />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'snow-night') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(116,138,192,0.14)"
          layerTwoColor="rgba(79,104,160,0.14)"
          layerThreeColor="rgba(42,63,110,0.20)"
          rimColor="rgba(208,224,255,0.06)"
          className="opacity-85"
        />
        <div
          className={`absolute rounded-full bg-[#f7e8ae]/86 ${
            isLarge ? 'right-[10%] top-[4%] h-16 w-16' : 'right-[10%] top-[-2%] h-12 w-12'
          }`}
        />
        <SnowflakeOverlaySvg size={size} tone="night" />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'snow-day') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(220,230,245,0.16)"
          layerTwoColor="rgba(184,201,222,0.14)"
          layerThreeColor="rgba(129,149,179,0.18)"
          rimColor="rgba(238,244,255,0.08)"
          className="opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_34%,rgba(255,255,255,0.03)_66%,transparent)]" />
        <SnowflakeOverlaySvg size={size} tone="day" />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  // Fallback: default cloudy appearance
  const fallbackWaveOpacity = pickThemeValue(theme, {
    light: 'opacity-95',
    glass: 'opacity-62',
    dark: 'opacity-72',
    black: 'opacity-58',
  });
  return (
    <>
      <div className={`absolute inset-0 ${surface.baseGradient}`} />
      <PassageWaveOverlaySvg
        size={size}
        layerOneColor="rgba(207,231,255,0.28)"
        layerTwoColor="rgba(174,212,246,0.20)"
        layerThreeColor="rgba(140,190,235,0.18)"
        rimColor="rgba(224,241,255,0.12)"
        className={fallbackWaveOpacity}
      />
      {surface.themeSurfaceClassName ? (
        <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
      ) : null}
      {surface.darkThemeScrim}
    </>
  );
}
