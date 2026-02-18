import { useCallback, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code, FileCode, Upload, Play, Trash2, Monitor } from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';

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
  const { selectedNodeId, selectNode, startDrag, updateNode, removeNode } = useCanvasStore();
  const isSelected = selectedNodeId === node.id;
  const { icon: Icon, gradient } = typeConfig[node.type];

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      selectNode(node.id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      startDrag(node.id, e.clientX - rect.left, e.clientY - rect.top);
    },
    [node.id, selectNode, startDrag]
  );

  const handleGenerate = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      updateNode(node.id, { status: 'generating' });

      const variations = [
        {
          label: 'Web – Dashboard',
          desc: 'Desktop dashboard with sidebar nav, analytics cards, and chart widgets.',
          code: `// Web Dashboard – Generated from "${node.title}"
import React from 'react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#0c0c0e] border-r border-slate-200 dark:border-[#1c1c1f] p-6 flex flex-col gap-4">
        <h1 className="text-[10px] font-black uppercase tracking-widest">Dashboard</h1>
        {['Overview','Analytics','Users','Settings'].map(i => (
          <button key={i} className="text-left px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#18181b] transition">{i}</button>
        ))}
      </aside>
      {/* Main */}
      <main className="flex-1 p-8">
        <h2 className="text-4xl font-black tracking-tight uppercase mb-8">${node.title}</h2>
        <div className="grid grid-cols-3 gap-6">
          {['Revenue','Users','Orders'].map(m => (
            <div key={m} className="p-6 rounded-[2.5rem] bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-[#1c1c1f]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m}</p>
              <p className="text-3xl font-black mt-2">{Math.floor(Math.random()*9000+1000)}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}`,
        },
        {
          label: 'Mobile – App Screen',
          desc: 'Mobile-first app screen with bottom tab bar, header, and content cards.',
          code: `// Mobile App – Generated from "${node.title}"
import React from 'react';

export default function MobileApp() {
  return (
    <div className="w-[390px] h-[844px] mx-auto bg-slate-50 dark:bg-[#050505] rounded-[2.5rem] border border-slate-200 dark:border-[#1c1c1f] overflow-hidden flex flex-col">
      {/* Status bar */}
      <div className="px-6 pt-4 pb-2 flex justify-between items-center">
        <span className="text-[10px] font-black">9:41</span>
        <span className="text-[10px] font-black uppercase tracking-widest">${node.title}</span>
        <span className="text-[10px]">●●●</span>
      </div>
      {/* Content */}
      <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
        {['Welcome back','Recent activity','Quick actions'].map(s => (
          <div key={s} className="p-5 rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-[#1c1c1f]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{s}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium leading-relaxed">Tap to explore more details and insights.</p>
          </div>
        ))}
      </div>
      {/* Tab bar */}
      <div className="flex justify-around py-4 border-t border-slate-200 dark:border-[#1c1c1f] bg-white dark:bg-[#0c0c0e]">
        {['Home','Search','Profile'].map(t => (
          <button key={t} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition">{t}</button>
        ))}
      </div>
    </div>
  );
}`,
        },
        {
          label: 'Web – Landing Page',
          desc: 'Marketing landing page with hero section, features grid, and CTA.',
          code: `// Landing Page – Generated from "${node.title}"
import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center py-24 px-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4">Introducing</p>
        <h1 className="text-4xl font-black tracking-tight uppercase mb-6">${node.title}</h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium leading-relaxed max-w-xl mx-auto mb-8">${node.description}</p>
        <button className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all">Get Started</button>
      </section>
      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-3 gap-6">
        {['Fast','Secure','Scalable'].map(f => (
          <div key={f} className="p-6 rounded-[2.5rem] bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-[#1c1c1f] hover:border-indigo-500/30 transition">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <span className="text-indigo-500 font-black">✦</span>
            </div>
            <h3 className="text-lg font-black tracking-tight uppercase mb-2">{f}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium leading-relaxed">Built with modern best practices for optimal performance.</p>
          </div>
        ))}
      </section>
    </div>
  );
}`,
        },
      ];

      // Shuffle and pick 2-3 variations
      const shuffled = variations.sort(() => Math.random() - 0.5);
      const count = Math.random() > 0.5 ? 3 : 2;
      const picked = shuffled.slice(0, count);

      setTimeout(() => {
        updateNode(node.id, { status: 'ready' });

        const { addNode, connectNodes } = useCanvasStore.getState();
        picked.forEach((v, i) => {
          const newId = addNode({
            type: 'design',
            title: v.label,
            description: v.desc,
            x: node.x + node.width + 80,
            y: node.y + i * 320,
            width: 360,
            height: 300,
            status: 'ready',
            generatedCode: v.code,
          });
          connectNodes(node.id, newId);
        });
      }, 2000);
    },
    [node.id, node.title, node.description, updateNode]
  );

  const handleRun = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      updateNode(node.id, { status: 'running' });
      setTimeout(() => {
        updateNode(node.id, { status: 'ready' });

        const { addNode, connectNodes } = useCanvasStore.getState();
        const previewHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${node.title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, sans-serif; background:#f8fafc; color:#0f172a; }
  @media (prefers-color-scheme:dark) { body { background:#050505; color:#fff; } }
  .header { padding:24px 32px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:12px; }
  @media (prefers-color-scheme:dark) { .header { border-color:#1c1c1f; } }
  .logo { width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:14px; }
  .brand { font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; }
  .hero { max-width:640px; margin:80px auto; text-align:center; padding:0 24px; }
  .hero h1 { font-size:32px; font-weight:900; text-transform:uppercase; letter-spacing:-0.02em; margin-bottom:16px; }
  .hero p { font-size:12px; color:#64748b; font-weight:500; line-height:1.8; margin-bottom:32px; }
  .btn { display:inline-block; padding:14px 32px; background:#0f172a; color:#fff; border:none; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }
  @media (prefers-color-scheme:dark) { .btn { background:#fff; color:#000; } }
  .cards { max-width:900px; margin:48px auto; display:grid; grid-template-columns:repeat(3,1fr); gap:20px; padding:0 24px; }
  .card { padding:24px; border-radius:20px; background:#fff; border:1px solid #e2e8f0; }
  @media (prefers-color-scheme:dark) { .card { background:#0c0c0e; border-color:#1c1c1f; } }
  .card-icon { width:48px; height:48px; border-radius:14px; background:#6366f110; display:flex; align-items:center; justify-content:center; margin-bottom:16px; color:#6366f1; font-size:20px; }
  .card h3 { font-size:14px; font-weight:900; text-transform:uppercase; margin-bottom:8px; }
  .card p { font-size:11px; color:#64748b; line-height:1.7; }
  .footer { text-align:center; padding:48px; font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">✦</div>
    <span class="brand">${node.title}</span>
  </div>
  <div class="hero">
    <h1>${node.title}</h1>
    <p>${node.description || 'A beautifully crafted application built with modern design principles and clean architecture.'}</p>
    <button class="btn">Get Started</button>
  </div>
  <div class="cards">
    <div class="card"><div class="card-icon">⚡</div><h3>Fast</h3><p>Optimized for speed with instant loading and smooth interactions.</p></div>
    <div class="card"><div class="card-icon">🔒</div><h3>Secure</h3><p>Enterprise-grade security with end-to-end encryption.</p></div>
    <div class="card"><div class="card-icon">📱</div><h3>Responsive</h3><p>Perfect experience across all devices and screen sizes.</p></div>
  </div>
  <div class="footer">Built with ✦ Infinite Canvas IDE</div>
</body>
</html>`;

        const newId = addNode({
          type: 'code',
          title: `▶ ${node.title}`,
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

  return (
    <motion.div
      className={`absolute cursor-grab active:cursor-grabbing select-none`}
      style={{ left: node.x, top: node.y, width: node.width }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`node-card p-6 ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
      >
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
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
            </div>
            <iframe
              srcDoc={node.content}
              title={node.title}
              className="w-full h-full border-0 bg-white"
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
          {node.status === 'ready' && (
            <button onClick={handleRun} className="brand-button flex-1 flex items-center justify-center gap-2">
              <Play className="w-3 h-3" />
              Run
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
