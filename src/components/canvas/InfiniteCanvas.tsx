import { useCallback, useRef, useState, type MouseEvent, type WheelEvent } from 'react';
import { motion } from 'framer-motion';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasNodeCard } from './CanvasNodeCard';
import { CanvasConnections } from './CanvasConnections';

export const InfiniteCanvas = () => {
  const { nodes, zoom, panX, panY, setZoom, setPan, isDragging, drag, endDrag, selectNode, connectingFromId, cancelConnecting } = useCanvasStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // If we're scrolling over a scrollable element (like a dropdown, code editor, or textarea),
      // let that element handle the scroll and don't pan the canvas.
      const target = e.target as HTMLElement;
      
      // Recursive check to see if we're inside a scrollable container
      const isScrollable = (el: HTMLElement | Element | null): boolean => {
        if (!el || el === canvasRef.current || el === document.body) return false;
        
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(el);
        const overflowY = style.getPropertyValue('overflow-y');
        const overflowX = style.getPropertyValue('overflow-x');
        
        // Basic overflow check
        const hasScrollStyle = (val: string) => val === 'auto' || val === 'scroll';
        const canScrollY = hasScrollStyle(overflowY) && htmlEl.scrollHeight > htmlEl.clientHeight;
        const canScrollX = hasScrollStyle(overflowX) && htmlEl.scrollWidth > htmlEl.clientWidth;
        
        // Special case for text areas and scrollable inputs
        const isTextControl = htmlEl.tagName === 'TEXTAREA' || (htmlEl.tagName === 'INPUT' && htmlEl.type === 'text');
        
        if (canScrollY || canScrollX || isTextControl) return true;
        
        return isScrollable(htmlEl.parentElement);
      };

      // Zoom should always work regardless of what's under the cursor
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        setZoom(zoom + delta);
        return;
      }

      // If it's a normal scroll and we're over a scrollable element, ignore it for canvas pan
      if (isScrollable(target)) {
        return;
      }

      e.preventDefault();
      setPan(panX - e.deltaX, panY - e.deltaY);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Cancel connecting on empty canvas click
      if (connectingFromId && e.target === canvasRef.current) {
        cancelConnecting();
        return;
      }
      // Middle-click or Alt+click or left-click on empty canvas => pan
      if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && e.target === canvasRef.current)) {
        if (e.target === canvasRef.current) {
          selectNode(null);
        }
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    [selectNode, connectingFromId, cancelConnecting]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Track mouse for connection line
      setMousePos({ x: e.clientX, y: e.clientY });

      if (isPanning.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        setPan(panX + dx, panY + dy);
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
      if (isDragging) {
        drag(e.clientX, e.clientY);
      }
    },
    [isPanning, isDragging, panX, panY, setPan, drag]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    endDrag();
  }, [endDrag]);

  const gridSize = 40 * zoom;
  const gridOffsetX = (panX % gridSize);
  const gridOffsetY = (panY % gridSize);

  // Calculate connection line from source node to cursor
  const connectingLine = (() => {
    if (!connectingFromId) return null;
    const sourceNode = nodes.find(n => n.id === connectingFromId);
    if (!sourceNode) return null;
    // Source point in canvas coords (right edge, vertical center)
    const sx = sourceNode.x + sourceNode.width;
    const sy = sourceNode.y + (sourceNode.height || 150) / 2;
    // Target point: convert screen coords to canvas coords
    const tx = (mousePos.x - panX) / zoom;
    const ty = (mousePos.y - panY) / zoom;
    return { sx, sy, tx, ty };
  })();

  return (
    <div
      ref={canvasRef}
      className={`absolute inset-0 overflow-hidden ${connectingFromId ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        backgroundColor: 'hsl(var(--canvas-bg))',
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundImage: `
          linear-gradient(to right, hsl(var(--canvas-grid)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--canvas-grid)) 1px, transparent 1px)
        `,
        backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <CanvasConnections />

        {/* Live connecting line */}
        {connectingLine && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible', zIndex: 50 }}>
            <defs>
              <linearGradient id="connecting-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(239 84% 67% / 0.8)" />
                <stop offset="100%" stopColor="hsl(239 84% 67% / 0.3)" />
              </linearGradient>
            </defs>
            {(() => {
              const { sx, sy, tx, ty } = connectingLine;
              const dx = tx - sx;
              const cp = Math.max(60, Math.abs(dx) * 0.4);
              const path = `M ${sx} ${sy} C ${sx + cp} ${sy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
              return (
                <g>
                  <path d={path} fill="none" stroke="hsl(239 84% 67% / 0.1)" strokeWidth={8} />
                  <path d={path} fill="none" stroke="url(#connecting-grad)" strokeWidth={2.5} strokeDasharray="8 4">
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.8s" repeatCount="indefinite" />
                  </path>
                  <circle cx={tx} cy={ty} r="6" fill="hsl(239 84% 67% / 0.2)" stroke="hsl(239 84% 67% / 0.6)" strokeWidth={2} />
                  <circle cx={tx} cy={ty} r="2.5" fill="hsl(239 84% 67% / 0.8)" />
                </g>
              );
            })()}
          </svg>
        )}

        {nodes.map((node) => (
          <CanvasNodeCard key={node.id} node={node} />
        ))}
      </div>

      {/* Zoom indicator */}
      <motion.div
        className="absolute bottom-20 right-6 px-4 py-2 rounded-2xl bg-card/90 backdrop-blur border border-border brand-label"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {Math.round(zoom * 100)}%
      </motion.div>
    </div>
  );
};
