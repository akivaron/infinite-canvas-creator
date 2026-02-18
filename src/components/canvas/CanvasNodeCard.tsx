import { useCallback, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code, FileCode, Upload, Play, Trash2, Monitor, Star, Link } from 'lucide-react';
import { useCanvasStore, type CanvasNode, type UIVariation } from '@/stores/canvasStore';
import { generateVariations } from './generateVariations';

const typeConfig: Record<CanvasNode['type'], { icon: typeof Sparkles; gradient: string }> = {
  idea: { icon: Sparkles, gradient: 'from-indigo-500/20 to-violet-500/20' },
  design: { icon: Code, gradient: 'from-emerald-500/20 to-teal-500/20' },
  code: { icon: FileCode, gradient: 'from-amber-500/20 to-orange-500/20' },
  import: { icon: Upload, gradient: 'from-sky-500/20 to-blue-500/20' },
};

const statusColors: Record<CanvasNode['status'], string> = {
  idle: 'bg-muted-foreground/30',
  generating: 'bg-amber-500 animate-pulse',
  ready: 'bg-emerald-500',
  running: 'bg-indigo-500 animate-pulse',
};

interface Props {
  node: CanvasNode;
}

export const CanvasNodeCard = ({ node }: Props) => {
  const {
    selectedNodeId, selectNode, startDrag, updateNode, removeNode,
    togglePick, connectingFromId, startConnecting, finishConnecting,
    openPreviewPanel,
  } = useCanvasStore();

  const isSelected = selectedNodeId === node.id;
  const { icon: Icon, gradient } = typeConfig[node.type];
  const isConnecting = connectingFromId !== null;

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      // If we're in connecting mode, finish the connection
      if (isConnecting) {
        finishConnecting(node.id);
        return;
      }
      selectNode(node.id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      startDrag(node.id, e.clientX - rect.left, e.clientY - rect.top);
    },
    [node.id, selectNode, startDrag, isConnecting, finishConnecting]
  );

  const handleGenerate = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      updateNode(node.id, { status: 'generating' });

      setTimeout(() => {
        updateNode(node.id, { status: 'ready' });
        const variations = generateVariations(node.title, node.description);
        openPreviewPanel(node.id, variations);
      }, 1500);
    },
    [node.id, node.title, node.description, updateNode, openPreviewPanel]
  );

  const handleRun = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      updateNode(node.id, { status: 'running' });
      setTimeout(() => {
        updateNode(node.id, { status: 'ready' });

        const { addNode, connectNodes } = useCanvasStore.getState();
        const previewHtml = buildRunPreview(node.title, node.description);
        const newId = addNode({
          type: 'code',
          title: '\u25B6 ' + node.title,
          description: 'Live preview of the running application.',
          x: node.x + node.width + 80,
          y: node.y,
          width: 520,
          height: 460,
          status: 'running',
          generatedCode: previewHtml,
          content: previewHtml,
        });
        connectNodes(node.id, newId);
      }, 2500);
    },
    [node.id, node.title, node.description, updateNode]
  );

  const handleDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      removeNode(node.id);
    },
    [node.id, removeNode]
  );

  const handlePick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      togglePick(node.id);
    },
    [node.id, togglePick]
  );

  const handleConnect = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      startConnecting(node.id);
    },
    [node.id, startConnecting]
  );

  return (
    <motion.div
      className={`absolute cursor-grab active:cursor-grabbing select-none ${isConnecting && connectingFromId !== node.id ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-[2.5rem]' : ''}`}
      style={{ left: node.x, top: node.y, width: node.width }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`node-card p-6 ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${node.picked ? 'ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-background' : ''}`}
      >
        {/* Picked badge */}
        {node.picked && (
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColors[node.status]}`} />
            <span className="brand-label">{node.status}</span>
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-black tracking-tight uppercase text-foreground mb-2 line-clamp-2">
          {node.title}
        </h3>
        <p className="brand-description mb-4 line-clamp-3">{node.description}</p>

        {/* Live web preview for running code nodes */}
        {node.type === 'code' && node.content && (
          <div className="mb-4 rounded-xl border border-border overflow-hidden" style={{ height: node.height ? node.height - 200 : 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border-b border-border">
              <Monitor className="w-3 h-3 text-muted-foreground" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Live Preview</span>
              <div className="flex gap-1 ml-auto">
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-destructive/50" />
              </div>
            </div>
            <iframe
              srcDoc={node.content}
              title={node.title}
              className="w-full h-full border-0 bg-card"
              sandbox="allow-scripts"
              style={{ height: 'calc(100% - 28px)', pointerEvents: 'auto' }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Generated code preview (non-running nodes) */}
        {node.generatedCode && !(node.type === 'code' && node.content) && (
          <div className="mb-4 rounded-xl bg-secondary/50 border border-border p-3 max-h-32 overflow-hidden">
            <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">
              {node.generatedCode.slice(0, 200)}...
            </pre>
          </div>
        )}

        {/* File name for imports */}
        {node.fileName && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border">
            <FileCode className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground truncate">{node.fileName}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {node.status === 'idle' && node.type === 'idea' && (
            <button onClick={handleGenerate} className="brand-button flex-1 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" />
              Generate
            </button>
          )}
          {node.status === 'ready' && node.type !== 'idea' && (
            <button onClick={handleRun} className="brand-button flex-1 flex items-center justify-center gap-2">
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          {node.status === 'ready' && node.type === 'idea' && (
            <button onClick={handleGenerate} className="brand-button flex-1 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" />
              Re-Generate
            </button>
          )}
          {node.status === 'generating' && (
            <div className="brand-button flex-1 flex items-center justify-center gap-2 opacity-60 pointer-events-none">
              <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Generating
            </div>
          )}
          {node.status === 'running' && (
            <div className="brand-button flex-1 flex items-center justify-center gap-2 animate-pulse-glow">
              <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Running
            </div>
          )}

          {/* Pick button for design/code/import nodes */}
          {(node.type === 'design' || node.type === 'import') && node.status === 'ready' && (
            <button
              onClick={handlePick}
              className={`p-3.5 rounded-xl border transition-all ${node.picked ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}
              title={node.picked ? 'Unpick' : 'Pick for assembly'}
            >
              <Star className={`w-4 h-4 ${node.picked ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Connect button */}
          <button
            onClick={handleConnect}
            className="p-3.5 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            title="Connect to another node"
          >
            <Link className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-3.5 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

function buildRunPreview(title: string, description: string): string {
  const desc = description || 'A beautifully crafted application built with modern design principles and clean architecture.';
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<title>' + title + '</title>',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, sans-serif; background:#f8fafc; color:#0f172a; }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#fff; } }',
    '.header { padding:24px 32px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:12px; }',
    '@media (prefers-color-scheme:dark) { .header { border-color:#1c1c1f; } }',
    '.logo { width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:14px; }',
    '.brand { font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; }',
    '.hero { max-width:640px; margin:80px auto; text-align:center; padding:0 24px; }',
    '.hero h1 { font-size:32px; font-weight:900; text-transform:uppercase; letter-spacing:-0.02em; margin-bottom:16px; }',
    '.hero p { font-size:12px; color:#64748b; font-weight:500; line-height:1.8; margin-bottom:32px; }',
    '.btn { display:inline-block; padding:14px 32px; background:#0f172a; color:#fff; border:none; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }',
    '@media (prefers-color-scheme:dark) { .btn { background:#fff; color:#000; } }',
    '.cards { max-width:900px; margin:48px auto; display:grid; grid-template-columns:repeat(3,1fr); gap:20px; padding:0 24px; }',
    '.card { padding:24px; border-radius:20px; background:#fff; border:1px solid #e2e8f0; }',
    '@media (prefers-color-scheme:dark) { .card { background:#0c0c0e; border-color:#1c1c1f; } }',
    '.card-icon { width:48px; height:48px; border-radius:14px; background:#6366f110; display:flex; align-items:center; justify-content:center; margin-bottom:16px; color:#6366f1; font-size:20px; }',
    '.card h3 { font-size:14px; font-weight:900; text-transform:uppercase; margin-bottom:8px; }',
    '.card p { font-size:11px; color:#64748b; line-height:1.7; }',
    '.footer { text-align:center; padding:48px; font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="header">',
    '<div class="logo">&#10022;</div>',
    '<span class="brand">' + title + '</span>',
    '</div>',
    '<div class="hero">',
    '<h1>' + title + '</h1>',
    '<p>' + desc + '</p>',
    '<button class="btn">Get Started</button>',
    '</div>',
    '<div class="cards">',
    '<div class="card"><div class="card-icon">&#9889;</div><h3>Fast</h3><p>Optimized for speed with instant loading and smooth interactions.</p></div>',
    '<div class="card"><div class="card-icon">&#128274;</div><h3>Secure</h3><p>Enterprise-grade security with end-to-end encryption.</p></div>',
    '<div class="card"><div class="card-icon">&#128241;</div><h3>Responsive</h3><p>Perfect experience across all devices and screen sizes.</p></div>',
    '</div>',
    '<div class="footer">Built with &#10022; Infinite Canvas IDE</div>',
    '</body>',
    '</html>',
  ].join('\n');
}
