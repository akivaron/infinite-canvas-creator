import { useCanvasStore } from '@/stores/canvasStore';

export const CanvasConnections = () => {
  const nodes = useCanvasStore((s) => s.nodes);

  const connections: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];

  // Check if any nodes are picked
  const hasPickedNodes = nodes.some((n) => n.picked);

  nodes.forEach((node) => {
    node.connectedTo.forEach((targetId) => {
      const target = nodes.find((n) => n.id === targetId);
      if (!target) return;

      // If any nodes are picked, only show lines to/from picked nodes
      if (hasPickedNodes && !node.picked && !target.picked) return;

      // From right edge center of source
      const x1 = node.x + node.width;
      const y1 = node.y + (node.height || 150) / 2;
      // To left edge center of target
      const x2 = target.x;
      const y2 = target.y + (target.height || 150) / 2;

      connections.push({ x1, y1, x2, y2, key: `${node.id}-${targetId}` });
    });
  });

  if (connections.length === 0) return null;

  return (
    <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: 9999, height: 9999, overflow: 'visible' }}>
      <defs>
        <linearGradient id="conn-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(239 84% 67% / 0.5)" />
          <stop offset="100%" stopColor="hsl(270 80% 65% / 0.4)" />
        </linearGradient>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 Z" fill="hsl(270 80% 65% / 0.5)" />
        </marker>
        <filter id="conn-glow">
          <feGaussianBlur stdDeviation="4" result="glow" />
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
        const pathLen = Math.sqrt(dx * dx + (c.y2 - c.y1) ** 2) * 1.3;
        const dur = `${Math.max(2.5, pathLen / 140)}s`;
        return (
          <g key={c.key}>
            {/* Subtle glow */}
            <path d={path} fill="none" stroke="hsl(239 84% 67% / 0.04)" strokeWidth={8} filter="url(#conn-glow)" />
            {/* Main line - 1px */}
            <path d={path} fill="none" stroke="url(#conn-gradient)" strokeWidth={1} markerEnd="url(#arrowhead)" strokeLinecap="round" />

            {/* Single elegant animated dot */}
            <circle r="2.5" fill="hsl(239 84% 67% / 0.7)">
              <animateMotion dur={dur} repeatCount="indefinite" path={path} />
            </circle>

            {/* Source port - minimal */}
            <circle cx={c.x1} cy={c.y1} r="3" fill="hsl(239 84% 67% / 0.1)" stroke="hsl(239 84% 67% / 0.3)" strokeWidth={1} />
            {/* Target port - minimal */}
            <circle cx={c.x2} cy={c.y2} r="3" fill="hsl(270 80% 65% / 0.1)" stroke="hsl(270 80% 65% / 0.3)" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
};
