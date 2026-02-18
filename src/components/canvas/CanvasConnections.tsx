import { useCanvasStore } from '@/stores/canvasStore';

export const CanvasConnections = () => {
  const nodes = useCanvasStore((s) => s.nodes);

  const connections: { x1: number; y1: number; x2: number; y2: number; key: string; fromType: string; toType: string }[] = [];

  nodes.forEach((node) => {
    node.connectedTo.forEach((targetId) => {
      const target = nodes.find((n) => n.id === targetId);
      if (!target) return;
      connections.push({
        x1: node.x + node.width,
        y1: node.y + (node.height || 150) / 2,
        x2: target.x,
        y2: target.y + (target.height || 150) / 2,
        key: `${node.id}-${targetId}`,
        fromType: node.type,
        toType: target.type,
      });
    });
  });

  if (connections.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="conn-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(239 84% 67% / 0.7)" />
          <stop offset="100%" stopColor="hsl(160 84% 50% / 0.5)" />
        </linearGradient>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(239 84% 67% / 0.6)" />
        </marker>
        <filter id="conn-glow">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {connections.map((c) => {
        const dx = c.x2 - c.x1;
        const cp = Math.max(80, Math.abs(dx) * 0.4);
        const path = `M ${c.x1} ${c.y1} C ${c.x1 + cp} ${c.y1}, ${c.x2 - cp} ${c.y2}, ${c.x2} ${c.y2}`;
        return (
          <g key={c.key}>
            {/* Glow */}
            <path d={path} fill="none" stroke="hsl(239 84% 67% / 0.15)" strokeWidth={6} filter="url(#conn-glow)" />
            {/* Main line */}
            <path d={path} fill="none" stroke="url(#conn-gradient)" strokeWidth={2} markerEnd="url(#arrowhead)" />
            {/* Animated dot */}
            <circle r="3" fill="hsl(239 84% 67% / 0.8)">
              <animateMotion dur="3s" repeatCount="indefinite" path={path} />
            </circle>
          </g>
        );
      })}
    </svg>
  );
};
