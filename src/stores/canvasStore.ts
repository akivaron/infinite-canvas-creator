import { create } from 'zustand';
import { findFreePosition } from '@/lib/layout';

export interface ElementLink {
  selector: string;
  label: string;
  targetNodeId: string;
  elementType?: string;
}

export interface GeneratedFileEntry {
  path: string;
  content: string;
  language: string;
}

export interface CanvasNode {
  id: string;
  type: 'idea' | 'design' | 'code' | 'import' | 'api' | 'cli' | 'database' | 'payment' | 'env';
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'idle' | 'generating' | 'ready' | 'running';
  content?: string;
  fileName?: string;
  generatedCode?: string;
  connectedTo: string[];
  picked?: boolean;
  parentId?: string;
  pageRole?: string;
  tag?: string;
  platform?: 'web' | 'mobile' | 'api' | 'desktop' | 'cli' | 'database' | 'env';
  elementLinks?: ElementLink[];
  language?: string;
  envVars?: Record<string, string>;
  aiModel?: string;
  generatedFiles?: GeneratedFileEntry[];
  isLocked?: boolean;
  isCollapsed?: boolean;
}

export interface UIVariation {
  id: string;
  label: string;
  description: string;
  previewHtml: string;
  code: string;
  category: 'header' | 'hero' | 'features' | 'pricing' | 'footer' | 'dashboard' | 'mobile';
  files?: GeneratedFileEntry[];
}

interface CanvasState {
  nodes: CanvasNode[];
  zoom: number;
  panX: number;
  panY: number;
  selectedNodeId: string | null;
  isDragging: boolean;
  dragNodeId: string | null;
  dragOffset: { x: number; y: number };
  darkMode: boolean;
  aiModel: string;
  openRouterKey: string | null;
  availableModels: { id: string; name: string; free: boolean }[];
  projectId: string | null;

  previewPanelOpen: boolean;
  previewVariations: UIVariation[];
  previewSourceNodeId: string | null;

  assemblyPanelOpen: boolean;
  connectingFromId: string | null;
  showClearConfirm: boolean;

  addNode: (node: Omit<CanvasNode, 'id' | 'connectedTo'>) => string;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  clearAll: () => void;
  selectNode: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  startDrag: (nodeId: string, offsetX: number, offsetY: number) => void;
  drag: (x: number, y: number) => void;
  endDrag: () => void;
  connectNodes: (fromId: string, toId: string) => void;
  toggleDarkMode: () => void;
  setAiModel: (model: string) => void;
  setOpenRouterKey: (key: string | null) => void;
  setAvailableModels: (models: { id: string; name: string; free: boolean }[]) => void;
  togglePick: (id: string) => void;
  getPickedNodes: () => CanvasNode[];
  openPreviewPanel: (sourceNodeId: string, variations: UIVariation[]) => void;
  closePreviewPanel: () => void;
  setAssemblyPanelOpen: (open: boolean) => void;
  startConnecting: (fromId: string) => void;
  finishConnecting: (toId: string) => void;
  cancelConnecting: () => void;
  disconnectNodes: (fromId: string, toId: string) => void;
  disconnectElementLink: (sourceNodeId: string, targetNodeId: string) => void;
  setShowClearConfirm: (show: boolean) => void;
  setProjectId: (id: string | null) => void;
}

let nodeCounter = parseInt(localStorage.getItem('node_counter') || '0', 10);

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem('dark_mode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadPersistedNodes(): CanvasNode[] {
  try {
    const raw = localStorage.getItem('canvas_nodes');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function persistNodes(nodes: CanvasNode[]) {
  try {
    const lite = nodes.map(n => {
      const { generatedFiles, ...rest } = n;
      return rest;
    });
    localStorage.setItem('canvas_nodes', JSON.stringify(lite));
    localStorage.setItem('node_counter', String(nodeCounter));
  } catch { /* storage full - ignore */ }
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: loadPersistedNodes(),
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedNodeId: null,
  isDragging: false,
  dragNodeId: null,
  dragOffset: { x: 0, y: 0 },
  darkMode: getInitialDarkMode(),
  aiModel: localStorage.getItem('ai_model') || 'auto',
  openRouterKey: localStorage.getItem('openrouter_key'),
  availableModels: JSON.parse(localStorage.getItem('available_models') || '[]'),
  projectId: localStorage.getItem('current_project_id'),
  previewPanelOpen: false,
  previewVariations: [],
  previewSourceNodeId: null,
  assemblyPanelOpen: false,
  connectingFromId: null,
  showClearConfirm: false,

  addNode: (node) => {
    const id = `node-${++nodeCounter}-${Date.now()}`;
    set((state) => {
      const newNodes = [...state.nodes, { ...node, id, connectedTo: [] }];
      persistNodes(newNodes);
      return { nodes: newNodes };
    });
    return id;
  },

  updateNode: (id, updates) =>
    set((state) => {
      const newNodes = state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
      persistNodes(newNodes);
      return { nodes: newNodes };
    }),

  removeNode: (id) =>
    set((state) => {
      const newNodes = state.nodes.filter((n) => n.id !== id).map((n) => ({
        ...n,
        connectedTo: n.connectedTo.filter((c) => c !== id),
      }));
      persistNodes(newNodes);
      return {
        nodes: newNodes,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    }),

  selectNode: (id) => set({ selectedNodeId: id }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  startDrag: (nodeId, offsetX, offsetY) =>
    set({ isDragging: true, dragNodeId: nodeId, dragOffset: { x: offsetX, y: offsetY } }),

  drag: (x, y) => {
    const { dragNodeId, dragOffset, zoom } = get();
    if (!dragNodeId) return;
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === dragNodeId
          ? { ...n, x: (x - dragOffset.x) / zoom - state.panX / zoom, y: (y - dragOffset.y) / zoom - state.panY / zoom }
          : n
      ),
    }));
  },

  endDrag: () => {
    set({ isDragging: false, dragNodeId: null });
    persistNodes(get().nodes);
  },

  connectNodes: (fromId, toId) =>
    set((state) => {
      const newNodes = state.nodes.map((n) =>
        n.id === fromId && !n.connectedTo.includes(toId)
          ? { ...n, connectedTo: [...n.connectedTo, toId] }
          : n
      );
      persistNodes(newNodes);
      return { nodes: newNodes };
    }),

  disconnectNodes: (fromId, toId) =>
    set((state) => {
      const newNodes = state.nodes.map((n) =>
        n.id === fromId
          ? { ...n, connectedTo: n.connectedTo.filter((c) => c !== toId) }
          : n
      );
      persistNodes(newNodes);
      return { nodes: newNodes };
    }),

  disconnectElementLink: (sourceId, targetId) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === sourceId
          ? { ...n, elementLinks: n.elementLinks?.filter((l) => l.targetNodeId !== targetId) }
          : n
      ),
    })),

  duplicateNode: (id) => {
    const { nodes } = get();
    const source = nodes.find((n) => n.id === id);
    if (!source) return;
    const newId = `node-${++nodeCounter}-${Date.now()}`;

    const { x, y } = findFreePosition(
      nodes,
      source.width,
      source.height,
      source.x + 40,
      source.y + 40,
      40
    );

    set((state) => {
      const newNodes = [...state.nodes, { ...source, id: newId, x, y, connectedTo: [], picked: false }];
      persistNodes(newNodes);
      return { nodes: newNodes };
    });
  },

  clearAll: () => {
    set({ nodes: [], selectedNodeId: null, showClearConfirm: false });
    localStorage.removeItem('canvas_nodes');
    localStorage.removeItem('node_counter');
    nodeCounter = 0;
  },

  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem('dark_mode', String(next));
      return { darkMode: next };
    }),

  setAiModel: (model: string) => {
    localStorage.setItem('ai_model', model);
    set({ aiModel: model });
  },

  setOpenRouterKey: (key: string | null) => {
    if (key) localStorage.setItem('openrouter_key', key);
    else localStorage.removeItem('openrouter_key');
    set({ openRouterKey: key });
  },

  setAvailableModels: (models) => {
    localStorage.setItem('available_models', JSON.stringify(models));
    set({ availableModels: models });
  },

  togglePick: (id) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, picked: !n.picked } : n
      ),
    })),

  getPickedNodes: () => get().nodes.filter((n) => n.picked),

  openPreviewPanel: (sourceNodeId, variations) =>
    set({ previewPanelOpen: true, previewSourceNodeId: sourceNodeId, previewVariations: variations }),

  closePreviewPanel: () =>
    set({ previewPanelOpen: false, previewVariations: [], previewSourceNodeId: null }),

  setAssemblyPanelOpen: (open) => set({ assemblyPanelOpen: open }),

  startConnecting: (fromId) => set({ connectingFromId: fromId }),

  finishConnecting: (toId) => {
    const { connectingFromId } = get();
    if (connectingFromId && connectingFromId !== toId) {
      get().connectNodes(connectingFromId, toId);
    }
    set({ connectingFromId: null });
  },

  cancelConnecting: () => set({ connectingFromId: null }),

  setShowClearConfirm: (show) => set({ showClearConfirm: show }),

  setProjectId: (id) => {
    if (id) localStorage.setItem('current_project_id', id);
    else localStorage.removeItem('current_project_id');
    set({ projectId: id });
  },
}));
