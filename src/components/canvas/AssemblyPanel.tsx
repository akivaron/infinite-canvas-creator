import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Download, GitBranch, Monitor,
  ArrowUp, ArrowDown, Trash2, Check, Package
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { buildAssembledHtml } from './assembleHtml';

export const AssemblyPanel = () => {
  const { assemblyPanelOpen, setAssemblyPanelOpen, nodes, togglePick } = useCanvasStore();
  const [showGithubInfo, setShowGithubInfo] = useState(false);

  const pickedNodes = useMemo(() => nodes.filter((n) => n.picked), [nodes]);

  const [order, setOrder] = useState<string[]>([]);

  const orderedPicked = useMemo(() => {
    const ordered: typeof pickedNodes = [];
    order.forEach((id) => {
      const n = pickedNodes.find((p) => p.id === id);
      if (n) ordered.push(n);
    });
    pickedNodes.forEach((n) => {
      if (!order.includes(n.id)) ordered.push(n);
    });
    return ordered;
  }, [pickedNodes, order]);

  const moveUp = (idx: number) => {
    const ids = orderedPicked.map((n) => n.id);
    if (idx <= 0) return;
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    setOrder(ids);
  };

  const moveDown = (idx: number) => {
    const ids = orderedPicked.map((n) => n.id);
    if (idx >= ids.length - 1) return;
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    setOrder(ids);
  };

  const assembledHtml = useMemo(() => buildAssembledHtml(orderedPicked), [orderedPicked]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([assembledHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assembled-app.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [assembledHtml]);

  if (!assemblyPanelOpen) return null;

  return (
    <AnimatePresence>
      {assemblyPanelOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex bg-background/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Left: Selected sections list */}
          <motion.div
            className="w-[380px] h-full bg-card border-r border-border flex flex-col"
            initial={{ x: -40 }}
            animate={{ x: 0 }}
          >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black tracking-tight uppercase text-foreground">Assembly</h2>
                <button onClick={() => setAssemblyPanelOpen(false)} className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="brand-description">
                Reorder your selected UI sections. They will be combined into a single page.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {pickedNodes.length} sections selected
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {orderedPicked.length === 0 && (
                <div className="text-center py-12">
                  <p className="brand-description">No sections picked yet.</p>
                  <p className="brand-description mt-2">Click the ★ button on design nodes to pick them.</p>
                </div>
              )}
              {orderedPicked.map((node, idx) => (
                <motion.div
                  key={node.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 border border-border group"
                  layout
                >
                  <span className="text-[10px] font-black text-muted-foreground w-5 text-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">{node.title}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{node.pageRole || node.type}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveUp(idx)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveDown(idx)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => togglePick(node.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  disabled={orderedPicked.length === 0}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download HTML
                </button>
                <button
                  onClick={() => setShowGithubInfo(!showGithubInfo)}
                  disabled={orderedPicked.length === 0}
                  className="flex-1 py-3 rounded-xl border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:border-primary/30 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  GitHub
                </button>
              </div>

              <AnimatePresence>
                {showGithubInfo && (
                  <motion.div
                    className="rounded-2xl bg-secondary/50 border border-border p-4"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Push to GitHub</span>
                    </div>
                    <p className="brand-description mb-3">
                      Connect your project to GitHub to push the assembled application. Go to Settings → GitHub → Connect to set up bidirectional sync.
                    </p>
                    <div className="flex items-center gap-2 text-primary">
                      <Check className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">HTML exported & ready to push</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: Live preview */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
              <Monitor className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Live Preview</span>
              <div className="flex gap-1 ml-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-destructive/50" />
              </div>
              <div className="ml-auto brand-label text-muted-foreground">
                {orderedPicked.length} sections assembled
              </div>
            </div>
            <div className="flex-1 bg-secondary/30">
              {orderedPicked.length > 0 ? (
                <iframe
                  srcDoc={assembledHtml}
                  title="Assembled Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-black tracking-tight uppercase text-muted-foreground/50">No Sections Selected</p>
                    <p className="brand-description mt-2">Pick design nodes from the canvas to assemble your app.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
