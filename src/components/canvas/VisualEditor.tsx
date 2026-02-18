import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MousePointer2, Type, Move, ZoomIn, ZoomOut, Undo2, Redo2, Save, Layers, Link2, Search, Plus } from 'lucide-react';
import { useCanvasStore, type CanvasNode, type ElementLink } from '@/stores/canvasStore';
import { PropertiesPanel, type ElementStyles } from './PropertiesPanel';

type Tool = 'select' | 'text' | 'move' | 'link';

interface Props {
  node: CanvasNode;
  onClose: () => void;
}

export const VisualEditor = ({ node, onClose }: Props) => {
  const { updateNode, nodes } = useCanvasStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElementSelector, setSelectedElementSelector] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<Partial<ElementStyles> | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([node.content || node.generatedCode || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [elementLinks, setElementLinks] = useState<ElementLink[]>(node.elementLinks || []);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodeSearch, setNodeSearch] = useState('');

  const currentContent = history[historyIndex];
  const linkableNodes = nodes.filter(n => n.id !== node.id);
  const filteredNodes = linkableNodes.filter(n =>
    n.title.toLowerCase().includes(nodeSearch.toLowerCase()) ||
    n.type.toLowerCase().includes(nodeSearch.toLowerCase())
  );

  // Inject editor styles and interaction scripts into the iframe
  const editorHtml = useCallback((html: string) => {
    const linkHighlightCSS = elementLinks.map(link =>
      `[data-ve-linked="${link.targetNodeId}"] { outline: 2px dashed hsl(150 60% 50% / 0.6) !important; outline-offset: 2px; }`
    ).join('\n');

    return html.replace('</head>', `
      <style>
        .ve-hover { outline: 2px solid hsl(239 84% 67% / 0.5) !important; outline-offset: 2px; cursor: pointer; }
        .ve-selected { outline: 2px solid hsl(239 84% 67%) !important; outline-offset: 2px; }
        .ve-link-mode .ve-hover { outline-color: hsl(150 60% 50% / 0.5) !important; cursor: crosshair; }
        .ve-link-mode .ve-selected { outline-color: hsl(150 60% 50%) !important; }
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
          z-index: 99999;
        }
        .ve-link-mode .ve-selected::after { background: hsl(150 60% 50%); content: '🔗 ' attr(data-ve-tag); }
        ${linkHighlightCSS}
        * { position: relative; }
      </style>
    </head>`).replace('</body>', `
      <script>
        let selected = null;
        let tool = 'select';

        function getFullStyles(el) {
          const cs = getComputedStyle(el);
          return {
            color: cs.color,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            fontStyle: cs.fontStyle,
            textDecoration: cs.textDecoration,
            textAlign: cs.textAlign,
            backgroundColor: cs.backgroundColor,
            padding: cs.padding,
            paddingTop: cs.paddingTop,
            paddingRight: cs.paddingRight,
            paddingBottom: cs.paddingBottom,
            paddingLeft: cs.paddingLeft,
            margin: cs.margin,
            marginTop: cs.marginTop,
            marginRight: cs.marginRight,
            marginBottom: cs.marginBottom,
            marginLeft: cs.marginLeft,
            borderRadius: cs.borderRadius,
            borderWidth: cs.borderWidth,
            borderColor: cs.borderColor,
            borderStyle: cs.borderStyle,
            width: cs.width,
            height: cs.height,
            display: cs.display,
            opacity: cs.opacity,
            letterSpacing: cs.letterSpacing,
            lineHeight: cs.lineHeight,
            textTransform: cs.textTransform,
          };
        }

        function buildSelector(el) {
          if (el.id) return '#' + el.id;
          const tag = el.tagName.toLowerCase();
          const parent = el.parentElement;
          if (!parent) return tag;
          const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
          if (siblings.length === 1) return buildSelector(parent) + ' > ' + tag;
          const idx = siblings.indexOf(el) + 1;
          return buildSelector(parent) + ' > ' + tag + ':nth-child(' + idx + ')';
        }

        window.addEventListener('message', (e) => {
          if (e.data.type === 'setTool') {
            tool = e.data.tool;
            if (tool === 'link') document.body.classList.add('ve-link-mode');
            else document.body.classList.remove('ve-link-mode');
          }
          if (e.data.type === 'getContent') {
            // Clean up editor classes before returning
            if (selected) { selected.classList.remove('ve-selected'); selected.removeAttribute('data-ve-tag'); }
            document.querySelectorAll('.ve-hover').forEach(el => el.classList.remove('ve-hover'));
            window.parent.postMessage({ type: 'content', html: document.documentElement.outerHTML }, '*');
          }
          if (e.data.type === 'setStyle') {
            if (selected) {
              selected.style[e.data.prop] = e.data.value;
              window.parent.postMessage({ type: 'stylesUpdated', styles: getFullStyles(selected) }, '*');
              window.parent.postMessage({ type: 'contentChanged' }, '*');
            }
          }
          if (e.data.type === 'setText') {
            if (selected) {
              selected.textContent = e.data.value;
              window.parent.postMessage({ type: 'contentChanged' }, '*');
            }
          }
          if (e.data.type === 'deleteElement') {
            if (selected && selected !== document.body && selected !== document.documentElement) {
              selected.remove();
              selected = null;
              window.parent.postMessage({ type: 'elementDeselected' }, '*');
              window.parent.postMessage({ type: 'contentChanged' }, '*');
            }
          }
          if (e.data.type === 'duplicateElement') {
            if (selected && selected.parentElement) {
              const clone = selected.cloneNode(true);
              clone.classList.remove('ve-selected');
              clone.removeAttribute('data-ve-tag');
              selected.parentElement.insertBefore(clone, selected.nextSibling);
              window.parent.postMessage({ type: 'contentChanged' }, '*');
            }
          }
          if (e.data.type === 'insertElement') {
            const tag = e.data.tag;
            const el = document.createElement(tag);
            const defaults = {
              p: () => { el.textContent = 'New text paragraph'; el.style.cssText = 'margin:16px 0; font-size:16px;'; },
              h2: () => { el.textContent = 'New Heading'; el.style.cssText = 'margin:16px 0; font-size:24px; font-weight:700;'; },
              button: () => { el.textContent = 'Button'; el.style.cssText = 'padding:12px 24px; background:#6366f1; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;'; },
              a: () => { el.textContent = 'Link text'; el.href = '#'; el.style.cssText = 'color:#6366f1; text-decoration:underline;'; },
              img: () => { el.src = 'https://placehold.co/400x200/1a1a2e/fff?text=Image'; el.alt = 'Placeholder'; el.style.cssText = 'max-width:100%; border-radius:8px; margin:16px 0;'; },
              div: () => { el.textContent = 'New container'; el.style.cssText = 'padding:24px; margin:16px 0; background:rgba(99,102,241,0.08); border-radius:12px;'; },
              hr: () => { el.style.cssText = 'border:none; border-top:1px solid #e2e8f0; margin:24px 0;'; },
            };
            (defaults[tag] || defaults.div)();
            const target = selected && selected !== document.body ? selected.parentElement || document.body : document.body;
            if (selected && selected !== document.body) target.insertBefore(el, selected.nextSibling);
            else target.appendChild(el);
            window.parent.postMessage({ type: 'contentChanged' }, '*');
          }
        });

        document.addEventListener('mouseover', (e) => {
          if (tool !== 'select' && tool !== 'text' && tool !== 'link') return;
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

          const selector = buildSelector(el);

          window.parent.postMessage({
            type: 'elementSelected',
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.slice(0, 200),
            selector: selector,
            styles: getFullStyles(el),
          }, '*');
        }, true);

        document.addEventListener('input', (e) => {
          window.parent.postMessage({ type: 'contentChanged' }, '*');
        });
      </script>
    </body>`);
  }, [elementLinks]);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'elementSelected') {
        setSelectedElement(`<${e.data.tag}> ${e.data.text || ''}`);
        setSelectedElementSelector(e.data.selector);
        setSelectedTag(e.data.tag);
        setSelectedText(e.data.text || null);
        setSelectedStyles(e.data.styles);
        if (activeTool === 'link') {
          setShowNodePicker(true);
        }
      }
      if (e.data.type === 'elementDeselected') {
        setSelectedElement(null);
        setSelectedElementSelector(null);
        setSelectedTag(null);
        setSelectedText(null);
        setSelectedStyles(null);
      }
      if (e.data.type === 'stylesUpdated') {
        setSelectedStyles(e.data.styles);
      }
      if (e.data.type === 'contentChanged') {
        setIsDirty(true);
      }
      if (e.data.type === 'content') {
        const newContent = e.data.html;
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newContent]);
        setHistoryIndex(prev => prev + 1);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [historyIndex, activeTool]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'setTool', tool: activeTool }, '*');
  }, [activeTool]);

  const handleStyleChange = useCallback((prop: string, value: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'setStyle', prop, value }, '*');
  }, []);

  const handleAction = useCallback((action: string, payload?: string) => {
    if (action === 'setText') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'setText', value: payload }, '*');
      setSelectedText(payload || null);
    } else if (action === 'delete') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'deleteElement' }, '*');
    } else if (action === 'duplicate') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'duplicateElement' }, '*');
    } else if (action === 'insert') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag: payload }, '*');
    }
  }, []);

  const handleLinkToNode = useCallback((targetNodeId: string) => {
    if (!selectedElementSelector) return;
    const newLink: ElementLink = {
      selector: selectedElementSelector,
      label: selectedElement || 'Element',
      targetNodeId,
    };
    setElementLinks(prev => {
      const filtered = prev.filter(l => l.selector !== selectedElementSelector);
      return [...filtered, newLink];
    });
    setIsDirty(true);
    setShowNodePicker(false);
    setNodeSearch('');
    useCanvasStore.getState().connectNodes(node.id, targetNodeId);
  }, [selectedElementSelector, selectedElement, node.id]);

  const handleSave = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'getContent' }, '*');
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'content') {
        updateNode(node.id, {
          content: e.data.html,
          generatedCode: e.data.html,
          elementLinks,
        });
        setIsDirty(false);
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);
  }, [node.id, updateNode, elementLinks]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1);
  }, [historyIndex, history.length]);

  const tools: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'text', icon: Type, label: 'Edit Text' },
    { id: 'link', icon: Link2, label: 'Link to Node' },
    { id: 'move', icon: Move, label: 'Move' },
  ];

  const typeIcons: Record<string, string> = { idea: '✦', design: '◆', code: '⟨/⟩', import: '↑' };

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Builder</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[160px]">{node.title}</span>
        </div>

        <div className="flex items-center gap-0.5">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                activeTool === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
              title={t.label}
            >
              <t.icon className="w-3.5 h-3.5" />
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-1.5" />

          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] font-black text-muted-foreground w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1.5" />

          <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-30">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-30">
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1.5" />

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              isDirty
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main area: canvas + properties panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-secondary/20 flex items-center justify-center">
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden transition-transform"
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

        {/* Right panel: Properties */}
        <div className="w-72 border-l border-border bg-card/90 backdrop-blur flex flex-col shrink-0 overflow-hidden">
          <PropertiesPanel
            selectedTag={selectedTag}
            selectedText={selectedText}
            styles={selectedStyles}
            onStyleChange={handleStyleChange}
            onAction={handleAction}
          />
        </div>
      </div>

      {/* Node picker modal for Link tool */}
      <AnimatePresence>
        {showNodePicker && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowNodePicker(false); setNodeSearch(''); }}
          >
            <motion.div
              className="w-96 max-h-[60vh] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Link to Node</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Link <span className="text-primary font-bold">{selectedElement}</span> to:
                </p>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={nodeSearch}
                    onChange={(e) => setNodeSearch(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {filteredNodes.length === 0 && (
                  <p className="text-center py-6 text-[10px] text-muted-foreground">No matching nodes</p>
                )}
                {filteredNodes.map((n) => {
                  const existingLink = elementLinks.find(l => l.selector === selectedElementSelector && l.targetNodeId === n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleLinkToNode(n.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        existingLink ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/80 border border-transparent'
                      }`}
                    >
                      <span className="text-sm">{typeIcons[n.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{n.title}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                          {n.type}{n.pageRole ? ` • ${n.pageRole}` : ''}
                        </div>
                      </div>
                      {existingLink && <span className="text-[8px] font-black text-primary uppercase">Linked</span>}
                    </button>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => { setShowNodePicker(false); setNodeSearch(''); }}
                  className="w-full py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-card/90 backdrop-blur text-[9px] font-bold text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span>
            {activeTool === 'select' ? 'Click to select' :
             activeTool === 'text' ? 'Click to edit text' :
             activeTool === 'link' ? 'Click to link' :
             'Drag to move'}
          </span>
          {selectedElement && (
            <>
              <div className="h-3 w-px bg-border" />
              <span className="text-primary truncate max-w-[200px]">{selectedElement}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {elementLinks.length > 0 && <span className="text-primary">{elementLinks.length} link{elementLinks.length > 1 ? 's' : ''}</span>}
          <span>{node.platform === 'mobile' ? '390×844' : '1280×800'}</span>
          {isDirty && <span className="text-amber-500">• Unsaved</span>}
        </div>
      </div>
    </motion.div>
  );
};
