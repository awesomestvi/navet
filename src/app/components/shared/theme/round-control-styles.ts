import type { ThemeType } from '@/app/hooks/use-theme';

interface RoundControlStyles {
  defaultButton: string;
  defaultIcon: string;
  disabledButton: string;
  softButton: string;
  softIcon: string;
  softDisabledButton: string;
  selectedText: string;
  emphasisButton: string;
  emphasisIcon: string;
}

export function getRoundControlStyles(theme: ThemeType): RoundControlStyles {
  if (theme === 'light') {
    return {
      defaultButton: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      defaultIcon: 'text-gray-900',
      disabledButton: 'bg-gray-100 text-gray-500 opacity-50 cursor-not-allowed',
      softButton:
        'border border-white/55 bg-white/55 text-slate-800 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.4)] backdrop-blur-xl hover:bg-white/72',
      softIcon: 'text-slate-800',
      softDisabledButton:
        'border border-white/45 bg-white/40 text-slate-500/80 opacity-55 cursor-not-allowed backdrop-blur-xl',
      selectedText: 'text-white',
      emphasisButton:
        'border border-gray-200 bg-white text-slate-900 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.5)]',
      emphasisIcon: 'text-slate-900',
    };
  }

  if (theme === 'glass') {
    return {
      defaultButton:
        'border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.07)_58%,rgba(255,255,255,0.03)_100%)] text-white shadow-[0_20px_44px_-26px_rgba(6,12,26,0.82),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-12px_22px_rgba(255,255,255,0.03)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09)_58%,rgba(255,255,255,0.04)_100%)]',
      defaultIcon: 'text-white',
      disabledButton:
        'border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] text-white/60 opacity-50 cursor-not-allowed backdrop-blur-xl',
      softButton:
        'border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.15),rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.04)_100%)] text-white shadow-[0_18px_40px_-24px_rgba(6,12,26,0.72),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl hover:border-white/22 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1)_58%,rgba(255,255,255,0.05)_100%)]',
      softIcon: 'text-white',
      softDisabledButton:
        'border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] text-white/55 opacity-50 cursor-not-allowed backdrop-blur-xl',
      selectedText: 'text-white',
      emphasisButton:
        'border border-white/20 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.04)_100%)] text-white shadow-[0_24px_54px_-26px_rgba(8,14,28,0.82),0_6px_18px_-14px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-12px_22px_rgba(255,255,255,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.07)_58%,rgba(255,255,255,0.04)_100%)]',
      emphasisIcon: 'text-white',
    };
  }

  if (theme === 'contrast') {
    return {
      defaultButton: 'bg-black text-white hover:bg-zinc-900 border border-zinc-700',
      defaultIcon: 'text-white',
      disabledButton: 'bg-black text-white/60 opacity-50 cursor-not-allowed border border-zinc-700',
      softButton: 'border border-zinc-700 bg-zinc-950/90 text-white hover:bg-zinc-900',
      softIcon: 'text-white',
      softDisabledButton:
        'border border-zinc-700 bg-zinc-950/90 text-white/60 opacity-50 cursor-not-allowed',
      selectedText: 'text-white',
      emphasisButton: 'border border-zinc-700 bg-black text-white',
      emphasisIcon: 'text-white',
    };
  }

  return {
    defaultButton: 'bg-zinc-800 text-white hover:bg-zinc-700',
    defaultIcon: 'text-white',
    disabledButton: 'bg-zinc-800 text-white/60 opacity-50 cursor-not-allowed',
    softButton:
      'border border-white/10 bg-white/10 text-white shadow-[0_14px_32px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl hover:bg-white/14',
    softIcon: 'text-white',
    softDisabledButton:
      'border border-white/8 bg-white/8 text-white/55 opacity-50 cursor-not-allowed backdrop-blur-xl',
    selectedText: 'text-white',
    emphasisButton: 'border border-zinc-700 bg-zinc-900 text-white',
    emphasisIcon: 'text-white',
  };
}
