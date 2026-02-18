import { useCallback, useState, useRef, useEffect, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Code, FileCode, Upload, Play, Trash2, Monitor, Star, Link,
  Edit3, Check, X, Copy, Tag, Palette, ChevronDown, ChevronUp,
  Maximize2, Minimize2, MoreHorizontal, Eye, EyeOff, Lock, Unlock
} from 'lucide-react';
import { useCanvasStore, type CanvasNode, type UIVariation } from '@/stores/canvasStore';
import { generateVariations } from './generateVariations';

const typeConfig: Record<CanvasNode['type'], { icon: typeof Sparkles; gradient: string; label: string }> = {
  idea: { icon: Sparkles, gradient: 'from-indigo-500/20 to-violet-500/20', label: 'Idea' },
  design: { icon: Code, gradient: 'from-emerald-500/20 to-teal-500/20', label: 'Design' },
  code: { icon: FileCode, gradient: 'from-amber-500/20 to-orange-500/20', label: 'Code' },
  import: { icon: Upload, gradient: 'from-sky-500/20 to-blue-500/20', label: 'Import' },
};

const statusColors: Record<CanvasNode['status'], string> = {
  idle: 'bg-muted-foreground/30',
  generating: 'bg-amber-500 animate-pulse',
  ready: 'bg-emerald-500',
  running: 'bg-indigo-500 animate-pulse',
};

const tagColors = [
  { name: 'Red', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'Blue', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Green', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { name: 'Yellow', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { name: 'Purple', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Pink', class: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

interface Props {
  node: CanvasNode;
}

export const CanvasNodeCard = ({ node }: Props) => {
  const {
    selectedNodeId, selectNode, startDrag, updateNode, removeNode, duplicateNode,
    togglePick, connectingFromId, startConnecting, finishConnecting,
    openPreviewPanel,
  } = useCanvasStore();

  const isSelected = selectedNodeId === node.id;
  const { icon: Icon, gradient, label: typeLabel } = typeConfig[node.type];
  const isConnecting = connectingFromId !== null;

  // Local states for editing & menus
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editDesc, setEditDesc] = useState(node.description);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-focus title on edit
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (isConnecting) {
        finishConnecting(node.id);
        return;
      }
      if (isLocked) {
        selectNode(node.id);
        return;
      }
      selectNode(node.id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      startDrag(node.id, e.clientX - rect.left, e.clientY - rect.top);
    },
    [node.id, selectNode, startDrag, isConnecting, finishConnecting, isLocked]
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
          title: '▶ ' + node.title,
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

  const handleDuplicate = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      duplicateNode(node.id);
      setShowMoreMenu(false);
    },
    [node.id, duplicateNode]
  );

  const handleSaveEdit = useCallback(() => {
    updateNode(node.id, { title: editTitle.trim() || node.title, description: editDesc.trim() || node.description });
    setIsEditing(false);
    setShowMoreMenu(false);
  }, [node.id, editTitle, editDesc, node.title, node.description, updateNode]);

  const handleCancelEdit = useCallback(() => {
    setEditTitle(node.title);
    setEditDesc(node.description);
    setIsEditing(false);
  }, [node.title, node.description]);

  const handleSetTag = useCallback((tagName: string) => {
    updateNode(node.id, { tag: node.tag === tagName ? undefined : tagName });
    setShowTagPicker(false);
    setShowMoreMenu(false);
  }, [node.id, node.tag, updateNode]);

  const activeTag = tagColors.find(t => t.name === node.tag);

  return (
    <motion.div
      className={`absolute cursor-grab active:cursor-grabbing select-none ${isConnecting && connectingFromId !== node.id ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-[2.5rem]' : ''} ${isLocked ? 'cursor-default' : ''}`}
      style={{ left: node.x, top: node.y, width: node.width }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`node-card p-5 relative ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${node.picked ? 'ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-background' : ''}`}
      >
        {/* Picked badge */}
        {node.picked && (
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-10">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        )}

        {/* Lock badge */}
        {isLocked && (
          <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg z-10">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Tag stripe */}
        {activeTag && (
          <div className={`absolute top-0 left-8 right-8 h-1 rounded-b-full ${activeTag.class.split(' ')[0]}`} />
        )}

        {/* Header: icon + status + more menu */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{typeLabel}</span>
                {activeTag && (
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${activeTag.class}`}>
                    {activeTag.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${statusColors[node.status]}`} />
                <span className="text-[9px] font-bold text-muted-foreground capitalize">{node.status}</span>
              </div>
            </div>
          </div>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  className="absolute right-0 top-full mt-1 w-48 rounded-2xl bg-card border border-border p-1.5 shadow-xl z-50"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Node
                  </button>
                  <button onClick={handleDuplicate} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowTagPicker(!showTagPicker); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    <Tag className="w-3.5 h-3.5" /> Set Tag
                  </button>
                  <AnimatePresence>
                    {showTagPicker && (
                      <motion.div
                        className="flex flex-wrap gap-1.5 px-3 py-2"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {tagColors.map((t) => (
                          <button
                            key={t.name}
                            onClick={(e) => { e.stopPropagation(); handleSetTag(t.name); }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${t.class} ${node.tag === t.name ? 'ring-1 ring-offset-1 ring-foreground/20' : ''}`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={(e) => { e.stopPropagation(); setIsLocked(!isLocked); setShowMoreMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {isLocked ? 'Unlock' : 'Lock Position'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); setShowMoreMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                    {isCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-destructive/10 transition-colors text-xs font-bold text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapsible content */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Inline editing */}
              {isEditing ? (
                <div className="mb-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={titleInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                    className="brand-input !py-2 !rounded-xl !text-sm font-bold"
                    placeholder="Node title..."
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') handleCancelEdit(); }}
                    className="brand-input !py-2 !rounded-xl !text-xs resize-none"
                    rows={3}
                    placeholder="Description..."
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button onClick={handleCancelEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Title */}
                  <h3
                    className="text-base font-black tracking-tight uppercase text-foreground mb-1.5 line-clamp-2 cursor-text"
                    onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  >
                    {node.title}
                  </h3>
                  <p
                    className="brand-description mb-3 line-clamp-3 cursor-text"
                    onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  >
                    {node.description}
                  </p>
                </>
              )}

              {/* Live web preview for running code nodes */}
              {node.type === 'code' && node.content && (
                <div className="mb-3 rounded-xl border border-border overflow-hidden" style={{ height: node.height ? node.height - 200 : 200 }}>
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
                <div className="mb-3 rounded-xl bg-secondary/50 border border-border p-3 max-h-28 overflow-hidden">
                  <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">
                    {node.generatedCode.slice(0, 200)}...
                  </pre>
                </div>
              )}

              {/* File name for imports */}
              {node.fileName && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground truncate">{node.fileName}</span>
                </div>
              )}

              {/* Connected nodes count */}
              {node.connectedTo.length > 0 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
                  <Link className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary">{node.connectedTo.length} connection{node.connectedTo.length > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1.5">
                {node.status === 'idle' && node.type === 'idea' && (
                  <button onClick={handleGenerate} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </button>
                )}
                {node.status === 'ready' && node.type !== 'idea' && (
                  <button onClick={handleRun} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                )}
                {node.status === 'ready' && node.type === 'idea' && (
                  <button onClick={handleGenerate} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Sparkles className="w-3 h-3" />
                    Re-Generate
                  </button>
                )}
                {node.status === 'generating' && (
                  <div className="brand-button flex-1 flex items-center justify-center gap-2 !py-3 opacity-60 pointer-events-none">
                    <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    Generating
                  </div>
                )}
                {node.status === 'running' && (
                  <div className="brand-button flex-1 flex items-center justify-center gap-2 !py-3 animate-pulse">
                    <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    Running
                  </div>
                )}

                {/* Pick button for design/code/import nodes */}
                {(node.type === 'design' || node.type === 'import') && node.status === 'ready' && (
                  <button
                    onClick={handlePick}
                    className={`p-3 rounded-xl border transition-all ${node.picked ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}
                    title={node.picked ? 'Unpick' : 'Pick for assembly'}
                  >
                    <Star className={`w-4 h-4 ${node.picked ? 'fill-current' : ''}`} />
                  </button>
                )}

                {/* Connect button */}
                <button
                  onClick={handleConnect}
                  className="p-3 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                  title="Connect to another node"
                >
                  <Link className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDelete}
                  className="p-3 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                  title="Delete node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed indicator */}
        {isCollapsed && (
          <div className="flex items-center justify-between mt-1">
            <h3 className="text-sm font-black tracking-tight uppercase text-foreground truncate">{node.title}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(false); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
