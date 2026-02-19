import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MousePointer2, Type, Move, ZoomIn, ZoomOut, Undo2, Redo2, Save, Layers, Link2, Search, Plus, PanelLeft, Monitor, Tablet, Smartphone, Server } from 'lucide-react';
import { useCanvasStore, type CanvasNode, type ElementLink } from '@/stores/canvasStore';
import { PropertiesPanel, type ElementStyles } from './PropertiesPanel';
import { ElementsTemplatesPanel } from './ElementsTemplatesPanel';

type Tool = 'select' | 'text' | 'move' | 'link';

type ViewportPreset = 'desktop' | 'tablet' | 'mobile';
const viewportPresets: Record<ViewportPreset, { width: number; height: number; label: string; icon: typeof Monitor }> = {
  desktop: { width: 1280, height: 800, label: 'Desktop', icon: Monitor },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: Tablet },
  mobile: { width: 390, height: 844, label: 'Mobile', icon: Smartphone },
};

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
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [viewport, setViewport] = useState<ViewportPreset>(node.platform === 'mobile' ? 'mobile' : 'desktop');

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
        .ve-drop-indicator { outline: 3px dashed hsl(239 84% 67% / 0.7) !important; outline-offset: 4px; background: hsl(239 84% 67% / 0.04) !important; }
        .ve-resize-handle {
          position: absolute; width: 10px; height: 10px; background: hsl(239 84% 67%);
          border: 2px solid white; border-radius: 2px; z-index: 100000; cursor: nwse-resize;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .ve-resize-handle-br { bottom: -5px; right: -5px; cursor: nwse-resize; }
        .ve-resize-handle-r { top: 50%; right: -5px; transform: translateY(-50%); cursor: ew-resize; width: 8px; height: 20px; border-radius: 3px; }
        .ve-resize-handle-b { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; height: 8px; width: 20px; border-radius: 3px; }
        .ve-moving { cursor: move !important; opacity: 0.85; }
      </style>
    </head>`).replace('</body>', `
      <script>
        let selected = null;
        let tool = 'select';
        let resizeHandles = [];
        let isDragging = false;
        let dragStartX = 0, dragStartY = 0;
        let elStartLeft = 0, elStartTop = 0;

        function getFullStyles(el) {
          const cs = getComputedStyle(el);
          return {
            color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
            fontStyle: cs.fontStyle, textDecoration: cs.textDecoration, textAlign: cs.textAlign,
            backgroundColor: cs.backgroundColor, padding: cs.padding,
            paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
            paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
            margin: cs.margin, marginTop: cs.marginTop, marginRight: cs.marginRight,
            marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
            borderRadius: cs.borderRadius, borderWidth: cs.borderWidth,
            borderColor: cs.borderColor, borderStyle: cs.borderStyle,
            width: cs.width, height: cs.height, display: cs.display,
            opacity: cs.opacity, letterSpacing: cs.letterSpacing,
            lineHeight: cs.lineHeight, textTransform: cs.textTransform,
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

        function removeResizeHandles() {
          resizeHandles.forEach(h => h.remove());
          resizeHandles = [];
        }

        function addResizeHandles(el) {
          removeResizeHandles();
          if (el === document.body || el === document.documentElement) return;
          const types = [
            { cls: 've-resize-handle-br', cursor: 'nwse-resize', resizeW: true, resizeH: true },
            { cls: 've-resize-handle-r', cursor: 'ew-resize', resizeW: true, resizeH: false },
            { cls: 've-resize-handle-b', cursor: 'ns-resize', resizeW: false, resizeH: true },
          ];
          types.forEach(t => {
            const h = document.createElement('div');
            h.className = 've-resize-handle ' + t.cls;
            h.addEventListener('mousedown', (e) => {
              e.stopPropagation(); e.preventDefault();
              const startX = e.clientX, startY = e.clientY;
              const startW = el.offsetWidth, startH = el.offsetHeight;
              const onMove = (ev) => {
                if (t.resizeW) el.style.width = Math.max(20, startW + ev.clientX - startX) + 'px';
                if (t.resizeH) el.style.height = Math.max(20, startH + ev.clientY - startY) + 'px';
                window.parent.postMessage({ type: 'stylesUpdated', styles: getFullStyles(el) }, '*');
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                addResizeHandles(el);
                window.parent.postMessage({ type: 'contentChanged' }, '*');
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            });
            el.appendChild(h);
            resizeHandles.push(h);
          });
        }

        // Drag & Drop from panel
        document.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          const el = document.elementFromPoint(e.clientX, e.clientY);
          document.querySelectorAll('.ve-drop-indicator').forEach(d => d.classList.remove('ve-drop-indicator'));
          if (el && el !== document.documentElement) {
            (el === document.body ? el : el).classList.add('ve-drop-indicator');
          }
        });
        document.addEventListener('dragleave', (e) => {
          e.target?.classList?.remove('ve-drop-indicator');
        });
        document.addEventListener('drop', (e) => {
          e.preventDefault();
          document.querySelectorAll('.ve-drop-indicator').forEach(d => d.classList.remove('ve-drop-indicator'));
          const raw = e.dataTransfer.getData('application/ve-element');
          if (!raw) return;
          try {
            const data = JSON.parse(raw);
            const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
            const parent = (dropTarget && dropTarget !== document.body && dropTarget !== document.documentElement) ? dropTarget : document.body;
            if (data.customHtml) {
              const wrapper = document.createElement('div');
              wrapper.innerHTML = data.customHtml;
              while (wrapper.firstChild) {
                if (parent === dropTarget && parent !== document.body) parent.parentElement.insertBefore(wrapper.firstChild, parent.nextSibling);
                else parent.appendChild(wrapper.firstChild);
              }
            } else {
              window.parent.postMessage({ type: 'requestInsert', tag: data.tag }, '*');
              return;
            }
            window.parent.postMessage({ type: 'contentChanged' }, '*');
          } catch(err) {}
        });

        window.addEventListener('message', (e) => {
          if (e.data.type === 'setTool') {
            tool = e.data.tool;
            if (tool === 'link') document.body.classList.add('ve-link-mode');
            else document.body.classList.remove('ve-link-mode');
          }
          if (e.data.type === 'getContent') {
            removeResizeHandles();
            if (selected) { selected.classList.remove('ve-selected'); selected.removeAttribute('data-ve-tag'); selected.classList.remove('ve-moving'); }
            document.querySelectorAll('.ve-hover,.ve-drop-indicator').forEach(el => { el.classList.remove('ve-hover'); el.classList.remove('ve-drop-indicator'); });
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
            if (selected) { selected.textContent = e.data.value; window.parent.postMessage({ type: 'contentChanged' }, '*'); }
          }
          if (e.data.type === 'deleteElement') {
            if (selected && selected !== document.body && selected !== document.documentElement) {
              removeResizeHandles(); selected.remove(); selected = null;
              window.parent.postMessage({ type: 'elementDeselected' }, '*');
              window.parent.postMessage({ type: 'contentChanged' }, '*');
            }
          }
          if (e.data.type === 'duplicateElement') {
            if (selected && selected.parentElement) {
              const clone = selected.cloneNode(true);
              clone.classList.remove('ve-selected'); clone.removeAttribute('data-ve-tag');
              clone.querySelectorAll('.ve-resize-handle').forEach(h => h.remove());
              selected.parentElement.insertBefore(clone, selected.nextSibling);
              window.parent.postMessage({ type: 'contentChanged' }, '*');
            }
          }
          if (e.data.type === 'insertElement') {
            const tag = e.data.tag;
            const customHtml = e.data.customHtml;
            const target = selected && selected !== document.body ? selected.parentElement || document.body : document.body;
            if (customHtml) {
              const wrapper = document.createElement('div');
              wrapper.innerHTML = customHtml;
              const fragment = document.createDocumentFragment();
              while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
              if (selected && selected !== document.body) target.insertBefore(fragment, selected.nextSibling);
              else target.appendChild(fragment);
            } else {
              const el = document.createElement(tag);
              const defaults = {
                h1: () => { el.textContent = 'Main Heading'; el.style.cssText = 'margin:16px 0;font-size:36px;font-weight:900;'; },
                h2: () => { el.textContent = 'New Heading'; el.style.cssText = 'margin:16px 0;font-size:24px;font-weight:700;'; },
                h3: () => { el.textContent = 'Sub Heading'; el.style.cssText = 'margin:12px 0;font-size:20px;font-weight:600;'; },
                p: () => { el.textContent = 'New text paragraph'; el.style.cssText = 'margin:16px 0;font-size:16px;'; },
                button: () => { el.textContent = 'Button'; el.style.cssText = 'padding:12px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;'; },
                a: () => { el.textContent = 'Link text'; el.href = '#'; el.style.cssText = 'color:#6366f1;text-decoration:underline;'; },
                img: () => { el.src = 'https://placehold.co/400x200/1a1a2e/fff?text=Image'; el.alt = 'Placeholder'; el.style.cssText = 'max-width:100%;border-radius:8px;margin:16px 0;'; },
                div: () => { el.textContent = 'New container'; el.style.cssText = 'padding:24px;margin:16px 0;background:rgba(99,102,241,0.08);border-radius:12px;'; },
                hr: () => { el.style.cssText = 'border:none;border-top:1px solid #e2e8f0;margin:24px 0;'; },
              };
              (defaults[tag] || defaults.div)();
              if (selected && selected !== document.body) target.insertBefore(el, selected.nextSibling);
              else target.appendChild(el);
            }
            window.parent.postMessage({ type: 'contentChanged' }, '*');
          }
        });

        document.addEventListener('mouseover', (e) => {
          if (tool !== 'select' && tool !== 'text' && tool !== 'link') return;
          const el = e.target;
          if (el === document.body || el === document.documentElement || el.classList.contains('ve-resize-handle')) return;
          el.classList.add('ve-hover');
        });
        document.addEventListener('mouseout', (e) => { e.target.classList.remove('ve-hover'); });

        document.addEventListener('mousedown', (e) => {
          if (e.target.classList.contains('ve-resize-handle')) return;
          if (tool !== 'move' && tool !== 'select') return;
          const el = e.target;
          if (el === document.body || el === document.documentElement) return;
          if (tool === 'move') {
            e.preventDefault();
            isDragging = true;
            dragStartX = e.clientX; dragStartY = e.clientY;
            const cs = getComputedStyle(el);
            el.style.position = el.style.position === 'absolute' ? 'absolute' : 'relative';
            elStartLeft = parseInt(cs.left) || 0;
            elStartTop = parseInt(cs.top) || 0;
            el.classList.add('ve-moving');
          }
        });
        document.addEventListener('mousemove', (e) => {
          if (!isDragging || !selected) return;
          selected.style.left = (elStartLeft + e.clientX - dragStartX) + 'px';
          selected.style.top = (elStartTop + e.clientY - dragStartY) + 'px';
        });
        document.addEventListener('mouseup', (e) => {
          if (isDragging && selected) {
            selected.classList.remove('ve-moving');
            isDragging = false;
            addResizeHandles(selected);
            window.parent.postMessage({ type: 'stylesUpdated', styles: getFullStyles(selected) }, '*');
            window.parent.postMessage({ type: 'contentChanged' }, '*');
          }
        });

        document.addEventListener('click', (e) => {
          if (e.target.classList.contains('ve-resize-handle')) return;
          e.preventDefault(); e.stopPropagation();
          const el = e.target;
          if (el === document.body || el === document.documentElement) return;

          if (selected) { selected.classList.remove('ve-selected'); selected.contentEditable = 'false'; }
          removeResizeHandles();

          selected = el;
          el.classList.add('ve-selected');
          el.setAttribute('data-ve-tag', el.tagName.toLowerCase());
          addResizeHandles(el);

          if (tool === 'text') { el.contentEditable = 'true'; el.focus(); }

          window.parent.postMessage({
            type: 'elementSelected', tag: el.tagName.toLowerCase(),
            text: el.textContent?.slice(0, 200), selector: buildSelector(el),
            styles: getFullStyles(el),
          }, '*');
        }, true);

        // Keyboard: Arrow keys to move, Shift+Arrow to resize, Delete to remove
        document.addEventListener('keydown', (e) => {
          if (!selected || selected === document.body || selected === document.documentElement) return;
          if (selected.contentEditable === 'true' && tool === 'text') return;
          const step = e.ctrlKey ? 10 : 1;
          const cs = getComputedStyle(selected);

          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (tool !== 'text') {
              e.preventDefault();
              removeResizeHandles(); selected.remove(); selected = null;
              window.parent.postMessage({ type: 'elementDeselected' }, '*');
              window.parent.postMessage({ type: 'contentChanged' }, '*');
              return;
            }
          }

          if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            e.preventDefault();
            if (e.shiftKey) {
              // Resize
              let w = parseInt(cs.width) || selected.offsetWidth;
              let h = parseInt(cs.height) || selected.offsetHeight;
              if (e.key === 'ArrowRight') w += step;
              if (e.key === 'ArrowLeft') w = Math.max(20, w - step);
              if (e.key === 'ArrowDown') h += step;
              if (e.key === 'ArrowUp') h = Math.max(20, h - step);
              selected.style.width = w + 'px';
              selected.style.height = h + 'px';
            } else {
              // Move
              selected.style.position = selected.style.position === 'absolute' ? 'absolute' : 'relative';
              let left = parseInt(cs.left) || 0;
              let top = parseInt(cs.top) || 0;
              if (e.key === 'ArrowLeft') left -= step;
              if (e.key === 'ArrowRight') left += step;
              if (e.key === 'ArrowUp') top -= step;
              if (e.key === 'ArrowDown') top += step;
              selected.style.left = left + 'px';
              selected.style.top = top + 'px';
            }
            removeResizeHandles();
            addResizeHandles(selected);
            window.parent.postMessage({ type: 'stylesUpdated', styles: getFullStyles(selected) }, '*');
            window.parent.postMessage({ type: 'contentChanged' }, '*');
          }
        });

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
      if (e.data.type === 'requestInsert') {
        iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag: e.data.tag }, '*');
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
    } else if (action === 'insertCustom') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag: 'custom', customHtml: payload }, '*');
    }
  }, []);

  const handleInsertFromPanel = useCallback((tag: string, customHtml?: string) => {
    if (customHtml || tag === 'template') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag: 'custom', customHtml: customHtml || '' }, '*');
    } else {
      iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag }, '*');
    }
  }, []);

  const handleLinkToNode = useCallback((targetNodeId: string) => {
    if (!selectedElementSelector) return;
    const newLink: ElementLink = {
      selector: selectedElementSelector,
      label: selectedElement || 'Element',
      targetNodeId,
      elementType: selectedTag || undefined,
    };
    setElementLinks(prev => {
      const filtered = prev.filter(l => l.selector !== selectedElementSelector);
      return [...filtered, newLink];
    });
    setIsDirty(true);
    setShowNodePicker(false);
    setNodeSearch('');
    useCanvasStore.getState().connectNodes(node.id, targetNodeId);
  }, [selectedElementSelector, selectedElement, selectedTag, node.id]);

  const saveToNode = useCallback(() => {
    return new Promise<void>((resolve) => {
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
          resolve();
        }
      };
      window.addEventListener('message', handler);
    });
  }, [node.id, updateNode, elementLinks]);

  const handleSave = useCallback(() => {
    saveToNode();
  }, [saveToNode]);

  // Auto-save: debounce save on every content change
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveToNode();
    }, 1500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [isDirty, saveToNode]);

  // Auto-save on close
  const handleClose = useCallback(() => {
    if (isDirty) {
      saveToNode().then(() => onClose());
    } else {
      onClose();
    }
  }, [isDirty, saveToNode, onClose]);

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

  const typeIcons: Record<string, string> = { idea: '✦', design: '◆', code: '⟨/⟩', import: '↑', api: '⚡', cli: '▸', database: '⬡' };

  // Separate API nodes for priority display
  const apiNodes = filteredNodes.filter(n => n.type === 'api');
  const otherNodes = filteredNodes.filter(n => n.type !== 'api');

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
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`p-1.5 rounded-lg transition-all ${showLeftPanel ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
            title="Elements & Templates"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
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

          {/* Responsive viewport switcher */}
          {Object.entries(viewportPresets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setViewport(key as ViewportPreset)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                viewport === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
              title={`${preset.label} (${preset.width}×${preset.height})`}
            >
              <preset.icon className="w-3.5 h-3.5" />
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
          <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main area: left panel + canvas + properties panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left panel: Elements & Templates */}
        {showLeftPanel && (
          <div className="w-60 border-r border-border bg-card/90 backdrop-blur flex flex-col shrink-0 overflow-hidden" onWheel={(e) => e.stopPropagation()}>
            <ElementsTemplatesPanel onInsertElement={handleInsertFromPanel} />
          </div>
        )}
        {/* Canvas */}
        <div
          className="flex-1 overflow-hidden bg-secondary/20 flex items-center justify-center"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={(e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('application/ve-element');
            if (!data) return;
            try {
              const { tag, customHtml } = JSON.parse(data);
              if (customHtml) {
                iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag: 'custom', customHtml }, '*');
              } else {
                iframeRef.current?.contentWindow?.postMessage({ type: 'insertElement', tag }, '*');
              }
            } catch {}
          }}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${viewport !== 'desktop' ? 'border-[8px] border-[hsl(var(--border))]' : ''}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              width: viewportPresets[viewport].width,
              height: viewportPresets[viewport].height,
              borderRadius: viewport === 'mobile' ? 32 : viewport === 'tablet' ? 20 : 12,
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
                {apiNodes.length > 0 && (
                  <>
                    <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                      <Server className="w-3 h-3" /> API Endpoints
                    </p>
                    {apiNodes.map((n) => {
                      const existingLink = elementLinks.find(l => l.selector === selectedElementSelector && l.targetNodeId === n.id);
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleLinkToNode(n.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                            existingLink ? 'bg-rose-500/10 border border-rose-500/20' : 'hover:bg-rose-500/5 border border-transparent hover:border-rose-500/20'
                          }`}
                        >
                          <span className="text-sm">⚡</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{n.title}</div>
                            <div className="text-[9px] text-rose-400 uppercase font-black tracking-widest">
                              API{n.language ? ` • ${n.language}` : ''}{n.pageRole ? ` • ${n.pageRole}` : ''}
                            </div>
                          </div>
                          {existingLink && <span className="text-[8px] font-black text-rose-400 uppercase">Linked</span>}
                        </button>
                      );
                    })}
                    {otherNodes.length > 0 && <div className="h-px bg-border my-2" />}
                  </>
                )}
                {otherNodes.length > 0 && apiNodes.length > 0 && (
                  <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Other Nodes</p>
                )}
                {filteredNodes.length === 0 && (
                  <p className="text-center py-6 text-[10px] text-muted-foreground">No matching nodes</p>
                )}
                {otherNodes.map((n) => {
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
              <div className="h-3 w-px bg-border" />
              <span className="text-muted-foreground/50">↑↓←→ Move · Shift+↑↓←→ Resize · Ctrl=10px · Del Remove</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {elementLinks.length > 0 && <span className="text-primary">{elementLinks.length} link{elementLinks.length > 1 ? 's' : ''}</span>}
          <span>{viewportPresets[viewport].width}×{viewportPresets[viewport].height} · {viewportPresets[viewport].label}</span>
          {isDirty && <span className="text-amber-500">• Unsaved</span>}
        </div>
      </div>
    </motion.div>
  );
};
