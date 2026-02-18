import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MousePointer2, Type, Square, Palette, Move, ZoomIn, ZoomOut, Undo2, Redo2, Save, Layers } from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';

type Tool = 'select' | 'text' | 'move';

interface Props {
  node: CanvasNode;
  onClose: () => void;
}

export const VisualEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([node.content || node.generatedCode || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const currentContent = history[historyIndex];

  // Inject editor styles and interaction scripts into the iframe
  const editorHtml = useCallback((html: string) => {
    return html.replace('</head>', `
      <style>
        .ve-hover { outline: 2px solid hsl(239 84% 67% / 0.5) !important; outline-offset: 2px; cursor: pointer; }
        .ve-selected { outline: 2px solid hsl(239 84% 67%) !important; outline-offset: 2px; }
        .ve-selected::after {
          content: attr(data-ve-tag);
          position: absolute;
          top: -22px; left: -2px;
          background: hsl(239 84% 67%);
          color: white;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 2px 8px;
          border-radius: 4px;
          pointer-events: none;
        }
        * { position: relative; }
      </style>
    </head>`).replace('</body>', `
      <script>
        let selected = null;
        let tool = 'select';

        window.addEventListener('message', (e) => {
          if (e.data.type === 'setTool') tool = e.data.tool;
          if (e.data.type === 'getContent') {
            window.parent.postMessage({ type: 'content', html: document.documentElement.outerHTML }, '*');
          }
        });

        document.addEventListener('mouseover', (e) => {
          if (tool !== 'select' && tool !== 'text') return;
          const el = e.target;
          if (el === document.body || el === document.documentElement) return;
          el.classList.add('ve-hover');
        });

        document.addEventListener('mouseout', (e) => {
          e.target.classList.remove('ve-hover');
        });

        document.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = e.target;
          if (el === document.body || el === document.documentElement) return;

          if (selected) {
            selected.classList.remove('ve-selected');
            selected.contentEditable = 'false';
          }

          selected = el;
          el.classList.add('ve-selected');
          el.setAttribute('data-ve-tag', el.tagName.toLowerCase());

          if (tool === 'text') {
            el.contentEditable = 'true';
            el.focus();
          }

          window.parent.postMessage({
            type: 'elementSelected',
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.slice(0, 100),
            styles: {
              color: getComputedStyle(el).color,
              fontSize: getComputedStyle(el).fontSize,
              fontWeight: getComputedStyle(el).fontWeight,
              backgroundColor: getComputedStyle(el).backgroundColor,
            }
          }, '*');
        }, true);

        document.addEventListener('input', (e) => {
          window.parent.postMessage({ type: 'contentChanged' }, '*');
        });
      </script>
    </body>`);
  }, []);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'elementSelected') {
        setSelectedElement(`<${e.data.tag}> ${e.data.text || ''}`);
      }
      if (e.data.type === 'contentChanged') {
        setIsDirty(true);
      }
      if (e.data.type === 'content') {
        // Save content from iframe
        const newContent = e.data.html;
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newContent]);
        setHistoryIndex(prev => prev + 1);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [historyIndex]);

  // Send tool changes to iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'setTool', tool: activeTool }, '*');
  }, [activeTool]);

  const handleSave = useCallback(() => {
    // Request content from iframe
    iframeRef.current?.contentWindow?.postMessage({ type: 'getContent' }, '*');
    // Wait for response then save
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'content') {
        updateNode(node.id, {
          content: e.data.html,
          generatedCode: e.data.html,
        });
        setIsDirty(false);
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);
  }, [node.id, updateNode]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1);
  }, [historyIndex, history.length]);

  const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'text', icon: Type, label: 'Edit Text' },
    { id: 'move', icon: Move, label: 'Move' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Visual Editor</span>
          </div>
          <div className="h-5 w-px bg-border" />
          <span className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{node.title}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Tools */}
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                activeTool === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}

          <div className="h-5 w-px bg-border mx-2" />

          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black text-muted-foreground w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-border mx-2" />

          {/* Undo/Redo */}
          <button onClick={handleUndo} disabled={historyIndex === 0} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-30">
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-border mx-2" />

          {/* Save & Close */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isDirty
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all ml-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-secondary/30 flex items-center justify-center p-8">
        <div
          className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden transition-transform"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            width: node.platform === 'mobile' ? 390 : 1280,
            height: node.platform === 'mobile' ? 844 : 800,
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={editorHtml(currentContent)}
            title="Visual Editor"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-border bg-card/80 backdrop-blur text-[10px] font-bold text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{activeTool === 'select' ? 'Click to select elements' : activeTool === 'text' ? 'Click element to edit text' : 'Drag to reposition'}</span>
          {selectedElement && (
            <>
              <div className="h-3 w-px bg-border" />
              <span className="text-primary truncate max-w-[300px]">{selectedElement}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>{node.platform === 'mobile' ? '390 × 844' : '1280 × 800'}</span>
          {isDirty && <span className="text-amber-500">• Unsaved changes</span>}
        </div>
      </div>
    </motion.div>
  );
};
