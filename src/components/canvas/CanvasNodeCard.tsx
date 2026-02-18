import { useCallback, useState, useRef, useEffect, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Code, FileCode, Upload, Play, Trash2, Monitor, Star, Link,
  Edit3, Check, X, Copy, Tag, RefreshCw,
  MoreHorizontal, Lock, Unlock, Minimize2, Maximize2, ChevronDown,
  Smartphone, Globe
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { generateFullPageVariations, getRandomVariation } from './generateVariations';

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
];

interface Props {
  node: CanvasNode;
}

export const CanvasNodeCard = ({ node }: Props) => {
  const {
    selectedNodeId, selectNode, startDrag, updateNode, removeNode, duplicateNode,
    togglePick, connectingFromId, startConnecting, finishConnecting,
    addNode, connectNodes,
  } = useCanvasStore();

  const isSelected = selectedNodeId === node.id;
  const { icon: Icon, gradient, label: typeLabel } = typeConfig[node.type];
  const isConnecting = connectingFromId !== null;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editDesc, setEditDesc] = useState(node.description);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

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
      if (isConnecting) { finishConnecting(node.id); return; }
      if (isLocked) { selectNode(node.id); return; }
      selectNode(node.id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      startDrag(node.id, e.clientX - rect.left, e.clientY - rect.top);
    },
    [node.id, selectNode, startDrag, isConnecting, finishConnecting, isLocked]
  );

  /* ── Generate: create full-page variation nodes ── */
  const handleGenerate = useCallback(
    (platform: 'web' | 'mobile') => {
      setShowPlatformPicker(false);
      updateNode(node.id, { status: 'generating', platform });

      setTimeout(() => {
        updateNode(node.id, { status: 'ready' });
        const variations = generateFullPageVariations(node.title, node.description, platform);
        
        const count = variations.length;
        const totalHeight = count * 340 + (count - 1) * 40;
        const startY = node.y + (node.height || 150) / 2 - totalHeight / 2;

        variations.forEach((variation, idx) => {
          const newId = addNode({
            type: 'design',
            title: variation.label,
            description: variation.description,
            x: node.x + node.width + 200,
            y: startY + idx * 380,
            width: 420,
            height: 340,
            status: 'ready',
            generatedCode: variation.code,
            content: variation.previewHtml,
            parentId: node.id,
            pageRole: variation.category,
            platform,
          });
          connectNodes(node.id, newId);
        });
      }, 1800);
    },
    [node.id, node.title, node.description, node.x, node.y, node.width, updateNode, addNode, connectNodes]
  );

  /* ── Regenerate: swap content with a different full-page variation ── */
  const handleRegenerate = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!node.platform) return;
      updateNode(node.id, { status: 'generating' });

      setTimeout(() => {
        // Find parent idea node to get original title
        const parentNode = node.parentId
          ? useCanvasStore.getState().nodes.find(n => n.id === node.parentId)
          : null;
        const ideaTitle = parentNode?.title || node.title;
        const ideaDesc = parentNode?.description || node.description;

        const variation = getRandomVariation(ideaTitle, ideaDesc, node.platform!, node.generatedCode);
        
        updateNode(node.id, {
          status: 'ready',
          title: variation.label,
          description: variation.description,
          content: variation.previewHtml,
          generatedCode: variation.code,
        });
      }, 1200);
    },
    [node.id, node.title, node.description, node.parentId, node.platform, node.generatedCode, updateNode]
  );

  const handleRun = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      updateNode(node.id, { status: 'running' });
      setTimeout(() => {
        updateNode(node.id, { status: 'ready' });
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
    [node.id, node.title, node.description, node.x, node.y, node.width, updateNode, addNode, connectNodes]
  );

  const handleDelete = useCallback((e: MouseEvent) => { e.stopPropagation(); removeNode(node.id); }, [node.id, removeNode]);
  const handlePick = useCallback((e: MouseEvent) => { e.stopPropagation(); togglePick(node.id); }, [node.id, togglePick]);
  const handleConnect = useCallback((e: MouseEvent) => { e.stopPropagation(); startConnecting(node.id); }, [node.id, startConnecting]);
  const handleDuplicate = useCallback((e: MouseEvent) => { e.stopPropagation(); duplicateNode(node.id); setShowMoreMenu(false); }, [node.id, duplicateNode]);

  const handleSaveEdit = useCallback(() => {
    updateNode(node.id, { title: editTitle.trim() || node.title, description: editDesc.trim() || node.description });
    setIsEditing(false);
  }, [node.id, editTitle, editDesc, node.title, node.description, updateNode]);

  const handleCancelEdit = useCallback(() => {
    setEditTitle(node.title); setEditDesc(node.description); setIsEditing(false);
  }, [node.title, node.description]);

  const handleSetTag = useCallback((tagName: string) => {
    updateNode(node.id, { tag: node.tag === tagName ? undefined : tagName });
    setShowTagPicker(false); setShowMoreMenu(false);
  }, [node.id, node.tag, updateNode]);

  const activeTag = tagColors.find(t => t.name === node.tag);

  return (
    <motion.div
      className={`absolute select-none ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${isConnecting && connectingFromId !== node.id ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-[2.5rem]' : ''}`}
      style={{ left: node.x, top: node.y, width: node.width }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onMouseDown={handleMouseDown}
    >
      <div className={`node-card p-5 relative ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${node.picked ? 'ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-background' : ''}`}>
        
        {/* Badges */}
        {node.picked && (
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-10">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        )}
        {isLocked && (
          <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg z-10">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {activeTag && <div className={`absolute top-0 left-8 right-8 h-1 rounded-b-full ${activeTag.class.split(' ')[0]}`} />}

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{typeLabel}</span>
                {node.platform && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                    {node.platform === 'web' ? <Globe className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                    {node.platform}
                  </span>
                )}
                {activeTag && (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${activeTag.class}`}>{activeTag.name}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${statusColors[node.status]}`} />
                <span className="text-[9px] font-bold text-muted-foreground capitalize">{node.status}</span>
                {node.pageRole && <span className="text-[8px] font-bold text-primary/60 ml-1">• {node.pageRole}</span>}
              </div>
            </div>
          </div>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div className="absolute right-0 top-full mt-1 w-48 rounded-2xl bg-card border border-border p-1.5 shadow-xl z-50" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setIsEditing(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={handleDuplicate} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button onClick={() => setShowTagPicker(!showTagPicker)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    <Tag className="w-3.5 h-3.5" /> Tag
                  </button>
                  <AnimatePresence>
                    {showTagPicker && (
                      <motion.div className="flex flex-wrap gap-1.5 px-3 py-2" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        {tagColors.map((t) => (
                          <button key={t.name} onClick={() => handleSetTag(t.name)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${t.class} ${node.tag === t.name ? 'ring-1 ring-foreground/20' : ''}`}>{t.name}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={() => { setIsLocked(!isLocked); setShowMoreMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {isLocked ? 'Unlock' : 'Lock'}
                  </button>
                  <button onClick={() => { setIsCollapsed(!isCollapsed); setShowMoreMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-xs font-bold text-foreground">
                    {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />} {isCollapsed ? 'Expand' : 'Collapse'}
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

        {/* Collapsible body */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              
              {/* Editing mode */}
              {isEditing ? (
                <div className="mb-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input ref={titleInputRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="brand-input !py-2 !rounded-xl !text-sm font-bold" placeholder="Title..." />
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') handleCancelEdit(); }} className="brand-input !py-2 !rounded-xl !text-xs resize-none" rows={3} placeholder="Description..." />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"><Check className="w-3 h-3" /> Save</button>
                    <button onClick={handleCancelEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all"><X className="w-3 h-3" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-base font-black tracking-tight uppercase text-foreground mb-1.5 line-clamp-2 cursor-text" onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>{node.title}</h3>
                  <p className="brand-description mb-3 line-clamp-3 cursor-text" onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>{node.description}</p>
                </>
              )}

              {/* Live preview for design/code nodes with content */}
              {node.content && node.type !== 'idea' && (
                <div className="mb-3 rounded-xl border border-border overflow-hidden" style={{ height: node.type === 'code' ? Math.max((node.height || 300) - 200, 150) : 180 }}>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border-b border-border">
                    <Monitor className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Preview</span>
                    <div className="flex gap-1 ml-auto">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                      <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                      <div className="w-2 h-2 rounded-full bg-destructive/50" />
                    </div>
                  </div>
                  <iframe
                    srcDoc={node.content}
                    title={node.title}
                    className="w-full border-0 bg-card"
                    sandbox="allow-scripts"
                    style={{ height: 'calc(100% - 28px)', pointerEvents: 'auto' }}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Code preview for non-content nodes */}
              {node.generatedCode && !node.content && (
                <div className="mb-3 rounded-xl bg-secondary/50 border border-border p-3 max-h-24 overflow-hidden">
                  <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">{node.generatedCode.slice(0, 200)}...</pre>
                </div>
              )}

              {/* File name */}
              {node.fileName && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground truncate">{node.fileName}</span>
                </div>
              )}

              {/* Connection count */}
              {node.connectedTo.length > 0 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
                  <Link className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary">{node.connectedTo.length} connection{node.connectedTo.length > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1.5 flex-wrap">
                {/* IDEA node: Generate with platform picker */}
                {node.type === 'idea' && node.status === 'idle' && !showPlatformPicker && (
                  <button onClick={(e) => { e.stopPropagation(); setShowPlatformPicker(true); }} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Sparkles className="w-3 h-3" /> Generate
                  </button>
                )}
                {node.type === 'idea' && node.status === 'ready' && !showPlatformPicker && (
                  <button onClick={(e) => { e.stopPropagation(); setShowPlatformPicker(true); }} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Sparkles className="w-3 h-3" /> Re-Generate
                  </button>
                )}

                {/* Platform picker */}
                <AnimatePresence>
                  {showPlatformPicker && (
                    <motion.div className="w-full flex gap-2" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleGenerate('web')} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <Globe className="w-3.5 h-3.5" /> Web
                      </button>
                      <button onClick={() => handleGenerate('mobile')} className="flex-1 py-3 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <Smartphone className="w-3.5 h-3.5" /> Mobile
                      </button>
                      <button onClick={() => setShowPlatformPicker(false)} className="p-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* DESIGN node: Regenerate */}
                {node.type === 'design' && node.status === 'ready' && node.platform && (
                  <button onClick={handleRegenerate} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:border-primary/30 transition-all">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                )}
                {node.type === 'design' && node.status === 'ready' && !node.pageRole && (
                  <button onClick={handleRun} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Play className="w-3 h-3" /> Run
                  </button>
                )}

                {/* CODE node: Run */}
                {node.type === 'code' && node.status === 'ready' && (
                  <button onClick={handleRun} className="brand-button flex-1 flex items-center justify-center gap-2 !py-3">
                    <Play className="w-3 h-3" /> Run
                  </button>
                )}

                {/* Loading states */}
                {node.status === 'generating' && (
                  <div className="brand-button flex-1 flex items-center justify-center gap-2 !py-3 opacity-60 pointer-events-none">
                    <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" /> Generating...
                  </div>
                )}
                {node.status === 'running' && (
                  <div className="brand-button flex-1 flex items-center justify-center gap-2 !py-3 animate-pulse">
                    <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" /> Running
                  </div>
                )}

                {/* Pick for compile */}
                {node.type === 'design' && node.status === 'ready' && (
                  <button
                    onClick={handlePick}
                    className={`p-3 rounded-xl border transition-all ${node.picked ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}
                    title={node.picked ? 'Unpick' : 'Pick for compile'}
                  >
                    <Star className={`w-4 h-4 ${node.picked ? 'fill-current' : ''}`} />
                  </button>
                )}
                {node.type === 'import' && node.status === 'ready' && (
                  <button
                    onClick={handlePick}
                    className={`p-3 rounded-xl border transition-all ${node.picked ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}
                    title={node.picked ? 'Unpick' : 'Pick for compile'}
                  >
                    <Star className={`w-4 h-4 ${node.picked ? 'fill-current' : ''}`} />
                  </button>
                )}

                {/* Connect */}
                <button onClick={handleConnect} className="p-3 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all" title="Connect">
                  <Link className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button onClick={handleDelete} className="p-3 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed state */}
        {isCollapsed && (
          <div className="flex items-center justify-between mt-1">
            <h3 className="text-sm font-black tracking-tight uppercase text-foreground truncate">{node.title}</h3>
            <button onClick={(e) => { e.stopPropagation(); setIsCollapsed(false); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function buildRunPreview(title: string, description: string): string {
  const desc = description || 'A beautifully crafted application.';
  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>' + title + '</title>',
    '<style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: system-ui, sans-serif; background:#f8fafc; color:#0f172a; }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#fff; } }',
    '.header { padding:24px 32px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:12px; }',
    '.logo { width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:14px; }',
    '.hero { max-width:640px; margin:80px auto; text-align:center; padding:0 24px; }',
    '.hero h1 { font-size:32px; font-weight:900; text-transform:uppercase; margin-bottom:16px; }',
    '.hero p { font-size:12px; color:#64748b; line-height:1.8; margin-bottom:32px; }',
    '.btn { padding:14px 32px; background:#0f172a; color:#fff; border:none; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }',
    '</style></head><body>',
    '<div class="header"><div class="logo">&#10022;</div><span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span></div>',
    '<div class="hero"><h1>' + title + '</h1><p>' + desc + '</p><button class="btn">Get Started</button></div>',
    '</body></html>',
  ].join('\n');
}
