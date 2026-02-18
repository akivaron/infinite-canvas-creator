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
          <stop offset="0%" stopColor="hsl(239 84% 67% / 0.8)" />
          <stop offset="50%" stopColor="hsl(270 80% 65% / 0.6)" />
          <stop offset="100%" stopColor="hsl(160 84% 50% / 0.7)" />
        </linearGradient>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <path d="M 0 0 L 10 3.5 L 0 7 L 2.5 3.5 Z" fill="hsl(160 84% 50% / 0.8)" />
        </marker>
        <filter id="conn-glow">
          <feGaussianBlur stdDeviation="6" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dot-glow">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {connections.map((c) => {
        const dx = c.x2 - c.x1;
        const dy = c.y2 - c.y1;
        const cp = Math.max(100, Math.abs(dx) * 0.45);
        const path = `M ${c.x1} ${c.y1} C ${c.x1 + cp} ${c.y1}, ${c.x2 - cp} ${c.y2}, ${c.x2} ${c.y2}`;
        const pathLen = Math.sqrt(dx * dx + dy * dy) * 1.4;
        const dur = `${Math.max(1.8, pathLen / 180)}s`;
        return (
          <g key={c.key}>
            {/* Outer glow */}
            <path d={path} fill="none" stroke="hsl(239 84% 67% / 0.06)" strokeWidth={16} filter="url(#conn-glow)" />
            {/* Mid glow */}
            <path d={path} fill="none" stroke="hsl(239 84% 67% / 0.12)" strokeWidth={6} />
            {/* Main bezier */}
            <path d={path} fill="none" stroke="url(#conn-gradient)" strokeWidth={2.5} markerEnd="url(#arrowhead)" strokeLinecap="round" />

            {/* Animated bright dot */}
            <circle r="4" fill="hsl(239 84% 67%)" filter="url(#dot-glow)">
              <animateMotion dur={dur} repeatCount="indefinite" path={path} />
            </circle>
            {/* Animated halo around dot */}
            <circle r="8" fill="hsl(239 84% 67% / 0.12)">
              <animateMotion dur={dur} repeatCount="indefinite" path={path} />
            </circle>
            {/* Second trailing dot (offset) */}
            <circle r="2.5" fill="hsl(270 80% 65% / 0.7)">
              <animateMotion dur={dur} repeatCount="indefinite" path={path} begin={`-${parseFloat(dur) * 0.5}s`} />
            </circle>

            {/* Source port */}
            <circle cx={c.x1} cy={c.y1} r="5" fill="hsl(239 84% 67% / 0.15)" stroke="hsl(239 84% 67% / 0.6)" strokeWidth={2}>
              <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={c.x1} cy={c.y1} r="2" fill="hsl(239 84% 67% / 0.9)" />
            {/* Target port */}
            <circle cx={c.x2} cy={c.y2} r="5" fill="hsl(160 84% 50% / 0.15)" stroke="hsl(160 84% 50% / 0.6)" strokeWidth={2}>
              <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={c.x2} cy={c.y2} r="2" fill="hsl(160 84% 50% / 0.9)" />
          </g>
        );
      })}
    </svg>
  );
};
