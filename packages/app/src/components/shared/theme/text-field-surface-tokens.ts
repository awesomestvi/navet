import type { ThemeType } from '@navet/app/hooks';

export interface TextFieldSurfaceTokens {
  fieldClassName: string;
  adornmentClassName: string;
  invalidBorderColor?: string;
}

export function getTextFieldSurfaceTokens(
  theme: ThemeType,
  invalid = false
): TextFieldSurfaceTokens {
  const fieldClassName =
    theme === 'light'
      ? 'border-gray-200 bg-gray-100 text-gray-900 placeholder-slate-500'
      : theme === 'black'
        ? 'border-white/16 bg-black text-white placeholder-zinc-300'
        : theme === 'glass'
          ? 'border-white/16 bg-white/8 text-white placeholder-white/72'
          : 'border-zinc-800 bg-zinc-900 text-white placeholder-zinc-400';

  const adornmentClassName =
    theme === 'light'
      ? 'text-slate-500'
      : theme === 'black'
        ? 'text-zinc-300'
        : theme === 'glass'
          ? 'text-white/72'
          : 'text-zinc-400';

  return {
    fieldClassName,
    adornmentClassName,
    invalidBorderColor: invalid ? (theme === 'light' ? '#dc2626' : '#f87171') : undefined,
  };
}
