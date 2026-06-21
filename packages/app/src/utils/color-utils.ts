import type { ThemeType } from '@navet/app/hooks/use-theme';

// Function to darken a color for gradient (subtractive — use only where hue shift is acceptable)
export const darkenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
  return `rgb(${r}, ${g}, ${b})`;
};

function hexToRgb(color: string) {
  const hex = color.replace('#', '');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    switch (max) {
      case red:
        hue = ((green - blue) / delta) % 6;
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  return { hue, saturation, lightness };
}

function hslToRgb({
  hue,
  saturation,
  lightness,
}: {
  hue: number;
  saturation: number;
  lightness: number;
}) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = lightness - chroma / 2;

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

export const darkenColorPreserveHue = (color: string, amount: number): string => {
  const { hue, saturation, lightness } = rgbToHsl(hexToRgb(color));
  const factor = Math.max(0, Math.min(1, 1 - amount / 255));
  const nextLightness = Math.max(0, Math.min(1, lightness * factor));
  const { r, g, b } = hslToRgb({ hue, saturation, lightness: nextLightness });
  return `rgb(${r}, ${g}, ${b})`;
};

interface GradientColors {
  from?: string;
  to?: string;
  border: string;
  glow: string;
  customGradient?: string;
}

// Get gradient colors based on selected color and state
export const getGradientColors = (
  isOn: boolean,
  selectedColor: string | null,
  theme: ThemeType = 'dark'
): GradientColors => {
  if (!isOn) {
    if (theme === 'light') {
      return {
        from: 'from-gray-100/60',
        to: 'to-gray-200/40',
        border: 'border-gray-200/50',
        glow: 'transparent',
      };
    }

    if (theme === 'glass') {
      return {
        from: 'from-white/12',
        to: 'to-white/04',
        border: 'border-white/18',
        glow: 'transparent',
        customGradient:
          'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 52%, rgba(255,255,255,0.04) 100%)',
      };
    }

    if (theme === 'black') {
      return {
        from: 'from-black',
        to: 'to-black',
        border: 'border-white/6',
        glow: 'transparent',
        customGradient: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%)',
      };
    }

    return {
      from: 'from-zinc-900',
      to: 'to-zinc-950',
      border: 'border-zinc-700/70',
      glow: 'transparent',
      customGradient: 'linear-gradient(135deg, rgb(24,24,27) 0%, rgb(9,9,11) 100%)',
    };
  }

  if (selectedColor) {
    if (theme === 'light') {
      return {
        from: '',
        to: '',
        border: 'border-orange-300/60',
        glow: selectedColor,
        customGradient: `linear-gradient(135deg, ${selectedColor}66 0%, ${selectedColor}8c 100%)`,
      };
    }
    if (theme === 'glass') {
      return {
        from: '',
        to: '',
        border: 'border-white/10',
        glow: selectedColor,
        customGradient: `linear-gradient(135deg, ${selectedColor} 0%, ${darkenColor(selectedColor, 92)} 100%)`,
      };
    }
    const darkColor = darkenColor(selectedColor, 100);
    const darkerColor = darkenColor(selectedColor, 130);
    return {
      from: '',
      to: '',
      border: theme === 'black' ? 'border-white/6' : 'border-white/10',
      glow: selectedColor,
      customGradient: `linear-gradient(135deg, ${darkColor}66 0%, ${darkerColor}66 100%)`,
    };
  }

  return theme === 'light'
    ? {
        from: 'from-amber-200',
        to: 'to-orange-200',
        border: 'border-amber-300/70',
        glow: '#ff8800',
      }
    : {
        from: 'from-orange-900/40',
        to: 'to-orange-950/40',
        border: 'border-orange-500/20',
        glow: '#ff8800',
      };
};
