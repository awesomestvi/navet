import type { ThemeType } from '@/app/hooks/use-theme';

// Function to darken a color for gradient (subtractive — use only where hue shift is acceptable)
export const darkenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
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
        border: 'border-white/16',
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
    const darkColor = darkenColor(selectedColor, 100);
    const darkerColor = darkenColor(selectedColor, 130);
    return {
      from: '',
      to: '',
      border: 'border-white/10',
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
