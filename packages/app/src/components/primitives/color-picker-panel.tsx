import { useI18n } from '@navet/app/hooks';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Slider } from './slider';

function fromHex(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  );
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  const hue =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

function toHex(h: number, s: number, v: number) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

export function ColorPickerPanel({
  value,
  onChange,
  onCommit,
  compact = false,
  showDetailedColor = true,
  presets = [],
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (color: string) => void;
  compact?: boolean;
  showDetailedColor?: boolean;
  presets?: readonly string[];
}) {
  const { t } = useI18n();
  const safeValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#f97316';
  const [color, setColor] = useState(() => fromHex(safeValue));
  const [hex, setHex] = useState(safeValue);
  const emitted = useRef(safeValue);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    if (safeValue !== emitted.current) {
      setColor(fromHex(safeValue));
      setHex(safeValue);
      emitted.current = safeValue;
    }
  }, [safeValue]);
  const update = (next: typeof color) => {
    setColor(next);
    const nextHex = toHex(next.h, next.s, next.v);
    emitted.current = nextHex;
    setHex(nextHex);
    onChange(nextHex);
  };
  const selectPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    update({
      ...color,
      s: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      v: 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    });
  };
  const saturationControl = (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t('lighting.colorSaturation')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(color.s * 100)}
      aria-valuetext={`${t('lighting.colorSaturation')}: ${Math.round(color.s * 100)}%, ${t('lighting.brightness')}: ${Math.round(color.v * 100)}%`}
      className="relative h-36 w-full touch-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-current"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${color.h}, 100%, 50%)`,
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        selectPosition(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) selectPosition(event);
      }}
      onPointerUp={() => onCommit?.(toHex(color.h, color.s, color.v))}
      onPointerCancel={() => onCommit?.(toHex(color.h, color.s, color.v))}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.01;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        update({
          ...color,
          s: Math.max(
            0,
            Math.min(
              1,
              color.s + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)
            )
          ),
          v: Math.max(
            0,
            Math.min(
              1,
              color.v + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0)
            )
          ),
        });
      }}
      onKeyUp={() => onCommit?.(toHex(color.h, color.s, color.v))}
      onBlur={() => onCommit?.(toHex(color.h, color.s, color.v))}
    >
      <span
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#0008]"
        style={{
          left: `${color.s * 100}%`,
          top: `${(1 - color.v) * 100}%`,
          background: toHex(color.h, color.s, color.v),
        }}
      />
    </div>
  );
  const hueControl = (
    <Slider
      value={color.h}
      min={0}
      max={360}
      ariaLabel={t('lighting.colorHue')}
      onValueChange={(h) =>
        update({ ...color, h, ...(compact ? { s: color.s || 0.75, v: 1 } : {}) })
      }
      onValueCommit={(h) =>
        onCommit?.(toHex(h, compact ? color.s || 0.75 : color.s, compact ? 1 : color.v))
      }
      rootClassName="relative flex h-9 w-full touch-none select-none items-center"
      trackClassName="relative h-3 grow rounded-full"
      rangeStyle={{ background: 'transparent' }}
      trackStyle={{
        background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
      }}
      thumbClassName={`block ${compact ? 'h-6 w-6' : 'h-5 w-5'} rounded-full border-2 border-white shadow-[0_2px_6px_#0003] outline-none focus-visible:ring-2 focus-visible:ring-current`}
      thumbStyle={{ background: `hsl(${color.h}, 100%, 50%)` }}
    />
  );
  const hexControl = (
    <label className="flex items-center gap-3 text-xs">
      <span
        className="h-9 w-9 shrink-0 rounded-full border border-current/20"
        style={{ background: toHex(color.h, color.s, color.v) }}
      />
      <span>{t('lighting.colorHex')}</span>
      <input
        type="text"
        aria-label={t('lighting.colorHex')}
        value={hex}
        maxLength={7}
        spellCheck={false}
        className="h-9 min-w-0 flex-1 rounded-lg border border-current/20 bg-transparent px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-current"
        onChange={(event) => {
          const next = event.target.value;
          setHex(next);
          if (/^#[0-9a-f]{6}$/i.test(next)) {
            emitted.current = next;
            setColor(fromHex(next));
            onChange(next);
          }
        }}
        onBlur={() => {
          setHex(emitted.current);
          onCommit?.(emitted.current);
        }}
      />
    </label>
  );
  return (
    <div className="space-y-3">
      {compact ? (
        <>
          <div className="flex items-center gap-3">
            <span
              className="h-9 w-9 shrink-0 rounded-full border border-current/20"
              style={{ background: toHex(color.h, color.s, color.v) }}
            />
            <span className="text-sm font-medium">{t('lighting.lightColor')}</span>
          </div>
          {hueControl}
          <div className="space-y-2">
            <span className="block text-xs opacity-70">{t('lighting.colorPresets')}</span>
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={t('lighting.colorPreset', { color: preset })}
                  aria-pressed={preset.toLowerCase() === toHex(color.h, color.s, color.v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-current"
                  onClick={() => {
                    setColor(fromHex(preset));
                    setHex(preset);
                    emitted.current = preset;
                    onChange(preset);
                    onCommit?.(emitted.current);
                  }}
                >
                  <span
                    className={`h-7 w-7 rounded-full border border-current/20 ${preset.toLowerCase() === toHex(color.h, color.s, color.v) ? 'ring-2 ring-current ring-offset-2 ring-offset-transparent' : ''}`}
                    style={{ background: preset }}
                  />
                </button>
              ))}
            </div>
          </div>
          {showDetailedColor && (
            <div>
              <button
                type="button"
                aria-expanded={showDetails}
                className="flex h-9 w-full items-center justify-between text-xs opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-current"
                onClick={() => setShowDetails(!showDetails)}
              >
                {t('lighting.colorDetails')}
                <ChevronDown
                  className={`h-4 w-4 ${showDetails ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {showDetails && (
                <div className="space-y-3 pt-2">
                  {saturationControl}
                  {hexControl}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {saturationControl}
          {hueControl}
          {hexControl}
        </>
      )}
    </div>
  );
}
