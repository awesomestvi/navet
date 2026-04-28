import { memo, useMemo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { ENERGY_SOURCE_ACCENTS } from '../../data/energy-constants';
import type { EnergyConsumer, EnergyDashboardNode, EnergyFlow } from '../../types/energy.types';
import { EnergyBeam } from './energy-beam';
import { EnergyNode } from './energy-node';

interface EnergyFlowMapProps {
  nodes: EnergyDashboardNode[];
  flows: EnergyFlow[];
  consumers: EnergyConsumer[];
  selectedNodeId?: EnergyDashboardNode['id'] | null;
  onNodeSelect?: (nodeId: EnergyDashboardNode['id']) => void;
  staticBeams?: boolean;
}

function toViewBoxCoordinate(value: number, axis: 'x' | 'y') {
  return axis === 'x' ? value : value;
}

function buildFlowPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const controlX = from.x + dx * 0.5 + (Math.abs(dy) > Math.abs(dx) ? (dx > 0 ? 10 : -10) : 0);
  const controlY = from.y + dy * 0.5 - (dx > 0 ? 10 : -10);
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function buildVerticalStack<T extends { id: string }>(
  items: T[],
  x: number,
  startY: number,
  endY: number
) {
  return items.map((item, index) => {
    const step = items.length > 1 ? (endY - startY) / (items.length - 1) : 0;
    return {
      ...item,
      point: { x, y: startY + step * index },
    };
  });
}

export const EnergyFlowMap = memo(function EnergyFlowMap({
  nodes,
  flows,
  consumers,
  selectedNodeId,
  onNodeSelect,
  staticBeams = false,
}: EnergyFlowMapProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const railColor =
    theme === 'light'
      ? 'rgba(148, 163, 184, 0.34)'
      : theme === 'black'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(255, 255, 255, 0.18)';

  const visibleNodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const homePoint = useMemo(() => ({ x: 50, y: 50 }), []);
  const homeNode = visibleNodeMap.get('home') ?? null;

  const resolvedFlows = useMemo(
    () =>
      flows
        .filter(
          (flow) => flow.active && visibleNodeMap.has(flow.from) && visibleNodeMap.has(flow.to)
        )
        .map((flow) => ({ ...flow })),
    [flows, visibleNodeMap]
  );

  const leftSourceNodes = useMemo(() => {
    const sourceIds = Array.from(
      new Set(resolvedFlows.filter((flow) => flow.to === 'home').map((flow) => flow.from))
    );

    return buildVerticalStack(
      sourceIds
        .map((id) => visibleNodeMap.get(id))
        .filter((node): node is EnergyDashboardNode => Boolean(node)),
      16,
      18,
      82
    );
  }, [resolvedFlows, visibleNodeMap]);

  const consumerNodes = useMemo(
    () =>
      buildVerticalStack(
        consumers
          .filter((consumer) => consumer.powerW > 0)
          .sort((left, right) => right.powerW - left.powerW)
          .slice(0, 4)
          .map((consumer) => {
            return {
              id: consumer.id,
              label: consumer.name,
              powerKw: consumer.powerW / 1000,
              shareLabel: `${Math.round(consumer.shareOfLoad * 100)}%`,
            };
          }),
        84,
        20,
        80
      ),
    [consumers]
  );

  const exportNode = useMemo(() => {
    const exportFlow = resolvedFlows.find((flow) => flow.from === 'home' && flow.to === 'grid');
    const gridNode = visibleNodeMap.get('grid');
    if (!exportFlow || !gridNode) {
      return null;
    }

    return {
      ...gridNode,
      point: { x: 84, y: 14 },
      valueKw: exportFlow.valueKw,
    };
  }, [resolvedFlows, visibleNodeMap]);

  const railFlows = useMemo(
    () =>
      resolvedFlows
        .map((flow) => {
          const leftSource = leftSourceNodes.find((node) => node.id === flow.from);
          const toConsumer = consumerNodes.find((consumer) => consumer.id === flow.to);
          const toExport = exportNode?.id === flow.to ? exportNode : null;

          const fromPoint =
            flow.from === 'home'
              ? homePoint
              : (leftSource?.point ??
                (flow.from === 'grid' && exportNode ? exportNode.point : null));
          const toPoint =
            flow.to === 'home' ? homePoint : (toConsumer?.point ?? toExport?.point ?? null);

          if (!fromPoint || !toPoint) {
            return null;
          }

          return { ...flow, fromPoint, toPoint };
        })
        .filter(
          (
            flow
          ): flow is EnergyFlow & {
            fromPoint: { x: number; y: number };
            toPoint: { x: number; y: number };
          } => flow !== null
        ),
    [consumerNodes, exportNode, leftSourceNodes, resolvedFlows, homePoint]
  );

  return (
    <div className={`rounded-[32px] border p-4 md:p-6 ${surface.border} ${surface.panel}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
          >
            Energy Flow
          </div>
          <div className={`mt-2 text-xl font-semibold tracking-tight ${surface.textPrimary}`}>
            Supply, storage, and export in one view
          </div>
        </div>
        <Text tone="muted" className="max-w-xs text-right text-sm leading-6">
          Inactive paths stay quiet. Motion falls back to static beams for reduced-motion and
          low-power modes.
        </Text>
      </div>

      <div className="relative aspect-[1.28/1] min-h-[22rem] w-full overflow-hidden rounded-[28px] border border-white/6 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_58%)]">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Energy flow map"
        >
          {railFlows.map((flow) => (
            <EnergyBeam
              key={flow.id}
              id={flow.id}
              path={buildFlowPath(flow.fromPoint, flow.toPoint)}
              color={ENERGY_SOURCE_ACCENTS[flow.sourceType]}
              railColor={railColor}
              valueKw={flow.valueKw}
              animated={!staticBeams}
            />
          ))}

          {consumerNodes.map((consumer) => (
            <EnergyBeam
              key={`consumer-beam-${consumer.id}`}
              id={`consumer-${consumer.id}`}
              path={buildFlowPath(homePoint, consumer.point)}
              color={ENERGY_SOURCE_ACCENTS.home}
              railColor={railColor}
              valueKw={consumer.powerKw}
              animated={!staticBeams}
            />
          ))}
        </svg>

        {leftSourceNodes.map((node) => (
          <div
            key={`source-node-${node.id}`}
            className={`absolute rounded-[30px] border px-5 py-4 text-left ${surface.border} ${surface.panel}`}
            style={{
              left: `${toViewBoxCoordinate(node.point.x, 'x')}%`,
              top: `${toViewBoxCoordinate(node.point.y, 'y')}%`,
              width: 132,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border"
              style={{
                borderColor: `${ENERGY_SOURCE_ACCENTS[node.id]}33`,
                backgroundColor: `${ENERGY_SOURCE_ACCENTS[node.id]}14`,
              }}
            >
              <div
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: ENERGY_SOURCE_ACCENTS[node.id] }}
              />
            </div>
            <div className={`text-base font-semibold ${surface.textPrimary}`}>{node.label}</div>
            <div className={`mt-2 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
              {node.value.toFixed(node.unit === '%' ? 0 : 1)}
              <span className="ml-1 text-base font-medium">{node.unit}</span>
            </div>
            {node.todayValue !== undefined ? (
              <div className={`mt-1 text-sm ${surface.textMuted}`}>
                Today {node.todayValue.toFixed(node.todayUnit === '%' ? 0 : 1)} {node.todayUnit}
              </div>
            ) : null}
          </div>
        ))}

        {homeNode ? (
          <EnergyNode
            key="home-node"
            node={homeNode}
            accentColor={ENERGY_SOURCE_ACCENTS.home}
            active={selectedNodeId === 'home'}
            onSelect={onNodeSelect}
            style={{
              left: `${homePoint.x}%`,
              top: `${homePoint.y}%`,
              boxShadow:
                theme === 'black'
                  ? '0 0 0 1px rgba(168,85,247,0.42), 0 0 40px -22px rgba(168,85,247,0.72)'
                  : '0 0 0 1px rgba(168,85,247,0.38), 0 0 34px -18px rgba(168,85,247,0.58)',
            }}
          />
        ) : null}

        {consumerNodes.map((consumer) => (
          <div
            key={`consumer-node-${consumer.id}`}
            className={`absolute -translate-y-1/2 rounded-[20px] border px-3 py-2 text-left ${surface.border} ${surface.panel}`}
            style={{
              left: `${consumer.point.x}%`,
              top: `${consumer.point.y}%`,
              width: 124,
              transform: 'translate(-100%, -50%)',
            }}
          >
            <div className={`truncate text-sm font-semibold ${surface.textPrimary}`}>
              {consumer.label}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className={`text-sm ${surface.textSecondary}`}>
                {consumer.powerKw.toFixed(1)} kW
              </div>
              <div className={`text-xs ${surface.textMuted}`}>{consumer.shareLabel}</div>
            </div>
          </div>
        ))}

        {exportNode ? (
          <div
            className={`absolute -translate-y-1/2 rounded-[20px] border px-3 py-2 text-left ${surface.border} ${surface.panel}`}
            style={{
              left: `${exportNode.point.x}%`,
              top: `${exportNode.point.y}%`,
              width: 124,
              transform: 'translate(-100%, -50%)',
            }}
          >
            <div className={`truncate text-sm font-semibold ${surface.textPrimary}`}>
              {exportNode.label}
            </div>
            <div className={`mt-1 text-sm ${surface.textSecondary}`}>
              {exportNode.valueKw.toFixed(1)} kW export
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});
