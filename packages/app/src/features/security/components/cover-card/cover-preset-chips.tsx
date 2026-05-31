import type { ThemeType } from '@navet/app/hooks';

const PRESET_POSITIONS = [0, 25, 50, 75, 100] as const;
const POSITION_TOLERANCE = 8;

interface CoverPresetChipsProps {
  position: number;
  theme: ThemeType;
  onSetPosition: (pos: number) => void;
  disabled?: boolean;
}

export function CoverPresetChips({
  position,
  theme,
  onSetPosition,
  disabled = false,
}: CoverPresetChipsProps) {
  const isLight = theme === 'light';

  return (
    <div className="flex gap-2">
      {PRESET_POSITIONS.map((preset) => {
        const isActive = Math.abs(position - preset) < POSITION_TOLERANCE;
        return (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) {
                return;
              }
              onSetPosition(preset);
            }}
            className={`flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              isActive
                ? isLight
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-indigo-500/28 text-indigo-300'
                : isLight
                  ? 'bg-white/60 text-slate-500 hover:bg-white/80 hover:text-slate-700'
                  : 'bg-white/8 text-white/72 hover:bg-white/12 hover:text-white/88'
            }`}
          >
            {preset}
          </button>
        );
      })}
    </div>
  );
}
