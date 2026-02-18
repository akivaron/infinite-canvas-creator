import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, ZoomIn, ZoomOut, Maximize2,
  Search, X, Layers, Moon, Sun, Copy, Trash2,
  Code, FileCode, Grid3X3, Keyboard, Download, Eye, Package
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';

/* ── Minimap ────────────────────────────────── */
const Minimap = () => {
  const { nodes, panX, panY, zoom, setPan } = useCanvasStore();
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.x)) - 100;
  const minY = Math.min(...nodes.map((n) => n.y)) - 100;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + 100;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + 100;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min(160 / w, 100 / h);

  const vpW = window.innerWidth / zoom;
  const vpH = window.innerHeight / zoom;
  const vpX = (-panX / zoom - minX) * scale;
  const vpY = (-panY / zoom - minY) * scale;

  return (
    <motion.div
      className="fixed bottom-28 right-6 z-30 rounded-2xl bg-card/90 backdrop-blur border border-border p-2 overflow-hidden cursor-pointer"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = (e.clientX - rect.left - 8) / scale + minX;
        const cy = (e.clientY - rect.top - 8) / scale + minY;
        setPan(-cx * zoom + window.innerWidth / 2, -cy * zoom + window.innerHeight / 2);
      }}
      style={{ width: w * scale + 16, height: h * scale + 16 }}
    >
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute rounded-sm bg-primary/40"
          style={{
            left: (n.x - minX) * scale,
            top: (n.y - minY) * scale,
            width: n.width * scale,
            height: (n.height || 200) * scale,
          }}
        />
      ))}
      <div
        className="absolute border-2 border-primary/60 rounded-sm"
        style={{ left: vpX, top: vpY, width: vpW * scale, height: vpH * scale }}
      />
    </motion.div>
  );
};

/* ── Shortcuts modal ───────────────────────── */
const ShortcutsModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="node-card p-8 w-[420px]"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.9 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black tracking-tight uppercase text-foreground">Shortcuts</h2>
        <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {[
          ['Scroll', 'Pan canvas'],
          ['Ctrl/⌘ + Scroll', 'Zoom in/out'],
          ['Alt + Drag', 'Pan canvas'],
          ['N', 'New idea node'],
          ['D', 'Toggle dark mode'],
          ['Delete / Backspace', 'Delete selected'],
          ['Ctrl/⌘ + D', 'Duplicate selected'],
          ['Escape', 'Deselect'],
          ['E', 'Edit selected node'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="brand-description">{desc}</span>
            <kbd className="px-2.5 py-1 rounded-lg bg-secondary border border-border text-[10px] font-black tracking-wider text-muted-foreground">{key}</kbd>
          </div>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

/* ── Main Toolbar ──────────────────────────── */
export const CanvasToolbar = () => {
  const {
    addNode, zoom, setZoom, setPan, nodes,
    selectedNodeId, duplicateNode, removeNode, clearAll,
    darkMode, toggleDarkMode, setAssemblyPanelOpen, cancelConnecting, connectingFromId,
  } = useCanvasStore();
  const pickedCount = nodes.filter((n) => n.picked).length;

  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const [ideaText, setIdeaText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNodeTypes, setShowNodeTypes] = useState(false); // kept for state but menu removed
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply dark mode to html
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'n' || e.key === 'N') { setShowIdeaInput(true); e.preventDefault(); }
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) { toggleDarkMode(); }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey) && selectedNodeId) { e.preventDefault(); duplicateNode(selectedNodeId); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) { removeNode(selectedNodeId); }
      if (e.key === 'Escape') { useCanvasStore.getState().selectNode(null); setShowSearch(false); setShowIdeaInput(false); cancelConnecting(); }
      if (e.key === '/' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); setShowSearch(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, duplicateNode, removeNode, toggleDarkMode, cancelConnecting]);

  const handleAddIdea = useCallback(() => {
    if (!ideaText.trim()) return;
    const nodeCount = nodes.length;
    const col = nodeCount % 3;
    const row = Math.floor(nodeCount / 3);
    addNode({
      type: 'idea',
      title: ideaText.trim(),
      description: 'Click "Generate" to create a design from this idea. The AI will produce multiple design variations you can run and preview.',
      x: 100 + col * 420,
      y: 100 + row * 400,
      width: 360,
      height: 300,
      status: 'idle',
    });
    setIdeaText('');
    setShowIdeaInput(false);
  }, [ideaText, nodes.length, addNode]);

  const handleAddTypedNode = useCallback((type: 'design' | 'code') => {
    const nodeCount = nodes.length;
    const col = nodeCount % 3;
    const row = Math.floor(nodeCount / 3);
    addNode({
      type,
      title: type === 'design' ? 'New Design' : 'New Code Block',
      description: type === 'design' ? 'An empty design node. Connect it to ideas or write your own.' : 'An empty code node for custom scripts and components.',
      x: 100 + col * 420,
      y: 100 + row * 400,
      width: 360,
      height: 300,
      status: 'idle',
    });
    setShowNodeTypes(false);
  }, [nodes.length, addNode]);

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          const nodeCount = nodes.length + i;
          const col = nodeCount % 3;
          const row = Math.floor(nodeCount / 3);
          addNode({
            type: 'import',
            title: file.name.replace(/\.(tsx?|css)$/, ''),
            description: `Imported ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
            x: 100 + col * 420,
            y: 100 + row * 400,
            width: 360,
            height: 300,
            status: 'ready',
            content,
            fileName: file.name,
            generatedCode: content,
          });
        };
        reader.readAsText(file);
      });
      e.target.value = '';
    },
    [nodes.length, addNode]
  );

  const handleExport = useCallback(() => {
    const data = JSON.stringify(nodes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-nodes.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes]);

  const filteredNodes = searchQuery
    ? nodes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const ToolButton = ({ icon: I, label, onClick, active, accent, disabled }: {
    icon: typeof Sparkles; label: string; onClick: () => void; active?: boolean; accent?: boolean; disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all
        ${accent ? 'bg-primary text-primary-foreground hover:opacity-90' : ''}
        ${active ? 'bg-secondary text-foreground' : ''}
        ${!accent && !active ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/80' : ''}
        ${disabled ? 'opacity-30 pointer-events-none' : ''}
      `}
      title={label}
    >
      <I className="w-4 h-4" />
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-foreground text-background text-[9px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {label}
      </span>
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-border" />;

  return (
    <>
      {/* ─── Top center: title + search ─── */}
      <motion.div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-sm">
          <Layers className="w-5 h-5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            Infinite Canvas
          </span>
          <span className="brand-label text-muted-foreground">
            {nodes.length} nodes
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-3 rounded-2xl bg-card/90 backdrop-blur-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all shadow-sm"
          >
            <Search className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showSearch && (
              <motion.div
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes... (press / )"
                  className="brand-input"
                />
                {filteredNodes.length > 0 && (
                  <div className="mt-2 rounded-2xl bg-card border border-border p-2 max-h-48 overflow-y-auto">
                    {filteredNodes.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          useCanvasStore.getState().selectNode(n.id);
                          useCanvasStore.getState().setPan(-n.x + window.innerWidth / 2 - n.width / 2, -n.y + window.innerHeight / 2 - 150);
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
                      >
                        <span className="text-xs font-bold text-foreground">{n.title}</span>
                        <span className="brand-label ml-2">{n.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── Bottom center: main action dock ─── */}
      <motion.div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-2xl shadow-primary/5">
          {/* Idea input or button */}
          <AnimatePresence mode="wait">
            {showIdeaInput ? (
              <motion.div
                key="input"
                className="flex items-start gap-2"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
              >
                <textarea
                  autoFocus
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddIdea(); }
                    if (e.key === 'Escape') { setShowIdeaInput(false); setIdeaText(''); }
                  }}
                  placeholder="Describe your idea... (Shift+Enter for new line)"
                  className="brand-input w-[420px] !py-2.5 !rounded-xl resize-none"
                  rows={3}
                />
                <button onClick={handleAddIdea} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all whitespace-nowrap">
                  Create
                </button>
                <button
                  onClick={() => { setShowIdeaInput(false); setIdeaText(''); }}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <Divider />
              </motion.div>
            ) : (
              <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ToolButton icon={Sparkles} label="New Idea (N)" onClick={() => setShowIdeaInput(true)} accent />
              </motion.div>
            )}
          </AnimatePresence>

          <ToolButton icon={Upload} label="Import Files" onClick={() => fileInputRef.current?.click()} />

          <Divider />

          {/* Selection-dependent actions */}
          <ToolButton
            icon={Copy}
            label="Duplicate (⌘D)"
            onClick={() => selectedNodeId && duplicateNode(selectedNodeId)}
            disabled={!selectedNodeId}
          />
          <ToolButton
            icon={Trash2}
            label="Delete (Del)"
            onClick={() => selectedNodeId && removeNode(selectedNodeId)}
            disabled={!selectedNodeId}
          />

          <Divider />

          {/* Zoom */}
          <ToolButton icon={ZoomOut} label="Zoom Out" onClick={() => setZoom(zoom - 0.15)} />
          <span className="text-[10px] font-black text-muted-foreground w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <ToolButton icon={ZoomIn} label="Zoom In" onClick={() => setZoom(zoom + 0.15)} />
          <ToolButton icon={Maximize2} label="Reset View" onClick={() => { setZoom(1); setPan(0, 0); }} />

          <Divider />

          {/* Utilities */}
          <ToolButton icon={Eye} label="Minimap" onClick={() => setShowMinimap(!showMinimap)} active={showMinimap} />
          <ToolButton icon={darkMode ? Sun : Moon} label="Theme (D)" onClick={toggleDarkMode} />
          <ToolButton icon={Download} label="Export JSON" onClick={handleExport} />
          <ToolButton icon={Keyboard} label="Shortcuts" onClick={() => setShowShortcuts(true)} />

          {pickedCount > 0 && (
            <>
              <Divider />
              <button
                onClick={() => setAssemblyPanelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
              >
                <Package className="w-3.5 h-3.5" />
                Assemble ({pickedCount})
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Minimap */}
      {showMinimap && <Minimap />}

      {/* Shortcuts modal */}
      <AnimatePresence>
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>

      {/* Clear all */}
      {nodes.length > 0 && (
        <motion.button
          className="fixed top-6 right-6 z-20 px-4 py-2.5 rounded-2xl bg-card/90 backdrop-blur-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={clearAll}
        >
          Clear All
        </motion.button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".ts,.tsx,.css,.json,.html"
        multiple
        className="hidden"
        onChange={handleFileImport}
      />
    </>
  );
};
