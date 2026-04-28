import { Battery, Flame, Home, Leaf, SunMedium, TowerControl } from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { EnergyDashboardNode, EnergyFlowSourceType } from '../../types/energy.types';

interface EnergyNodeProps {
  node: EnergyDashboardNode;
  accentColor: string;
  active?: boolean;
  style: CSSProperties;
  onSelect?: (nodeId: EnergyDashboardNode['id']) => void;
}

function getNodeIcon(id: EnergyDashboardNode['icon']) {
  switch (id) {
    case 'solar':
      return SunMedium;
    case 'grid':
      return TowerControl;
    case 'battery':
      return Battery;
    case 'gas':
      return Flame;
    case 'renewable':
      return Leaf;
    default:
      return Home;
  }
}

export function getEnergyNodeTone(id: EnergyDashboardNode['id']): EnergyFlowSourceType {
  return id === 'home' ? 'home' : id;
}

export const EnergyNode = memo(function EnergyNode({
  node,
  accentColor,
  active = false,
  style,
  onSelect,
}: EnergyNodeProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = getNodeIcon(node.icon);
  const isHome = node.id === 'home';

  return (
    <button
      type="button"
      onClick={() => onSelect?.(node.id)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border text-left transition-[transform,border-color,box-shadow] ${surface.border} ${surface.panel}`}
      style={{
        width: isHome ? 166 : 132,
        minHeight: isHome ? 166 : 132,
        padding: isHome ? 22 : 18,
        boxShadow: active
          ? `0 0 0 1px ${accentColor}50, 0 18px 40px -24px ${accentColor}66`
          : undefined,
        borderColor: active ? `${accentColor}66` : undefined,
        ...style,
      }}
      aria-label={node.label}
    >
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div
          className={`flex items-center justify-center rounded-full border ${surface.border} ${surface.iconBg}`}
          style={{ width: isHome ? 54 : 46, height: isHome ? 54 : 46 }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className={`mt-3 text-sm font-semibold ${surface.textPrimary}`}>{node.label}</div>
        <div className={`mt-1 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
          {node.value.toFixed(node.unit === '%' ? 0 : 1)}
          <span className="ml-1 text-sm font-medium">{node.unit}</span>
        </div>
        {node.todayValue !== undefined ? (
          <Text tone="muted" className="mt-1 text-xs">
            Today {node.todayValue.toFixed(node.todayUnit === '%' ? 0 : 1)} {node.todayUnit}
          </Text>
        ) : null}
      </div>
    </button>
  );
});
