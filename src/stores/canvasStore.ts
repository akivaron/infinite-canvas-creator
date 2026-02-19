import { create } from 'zustand';

export interface ElementLink {
  /** CSS selector or data attribute identifying the element */
  selector: string;
  /** Label shown in the editor */
  label: string;
  /** Target node ID */
  targetNodeId: string;
  /** Element type (e.g., 'form', 'button', 'input') */
  elementType?: string;
}

export interface CanvasNode {
  id: string;
  type: 'idea' | 'design' | 'code' | 'import' | 'api' | 'cli' | 'database';
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
  /** page role when assembled: header, hero, features, footer, etc. */
  pageRole?: string;
  /** color tag for visual grouping */
  tag?: string;
  /** platform target */
  platform?: 'web' | 'mobile' | 'api' | 'desktop' | 'cli' | 'database';
  /** element-to-node links within the visual editor */
  elementLinks?: ElementLink[];
  /** programming language for API/CLI nodes */
  language?: string;
}

export interface UIVariation {
  id: string;
  label: string;
  description: string;
  previewHtml: string;
  code: string;
  category: 'header' | 'hero' | 'features' | 'pricing' | 'footer' | 'dashboard' | 'mobile';
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

  // Preview selection
  previewPanelOpen: boolean;
  previewVariations: UIVariation[];
  previewSourceNodeId: string | null;

  // Assembly
  assemblyPanelOpen: boolean;

  // Connecting mode
  connectingFromId: string | null;

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
  togglePick: (id: string) => void;
  getPickedNodes: () => CanvasNode[];
  openPreviewPanel: (sourceNodeId: string, variations: UIVariation[]) => void;
  closePreviewPanel: () => void;
  setAssemblyPanelOpen: (open: boolean) => void;
  startConnecting: (fromId: string) => void;
  finishConnecting: (toId: string) => void;
  cancelConnecting: () => void;
  disconnectNodes: (fromId: string, toId: string) => void;
}

let nodeCounter = 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedNodeId: null,
  isDragging: false,
  dragNodeId: null,
  dragOffset: { x: 0, y: 0 },
  darkMode: false,
  previewPanelOpen: false,
  previewVariations: [],
  previewSourceNodeId: null,
  assemblyPanelOpen: false,
  connectingFromId: null,

  addNode: (node) => {
    const id = `node-${++nodeCounter}-${Date.now()}`;
    set((state) => ({
      nodes: [...state.nodes, { ...node, id, connectedTo: [] }],
    }));
    return id;
  },

  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id).map((n) => ({
        ...n,
        connectedTo: n.connectedTo.filter((c) => c !== id),
      })),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

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

  endDrag: () => set({ isDragging: false, dragNodeId: null }),

  connectNodes: (fromId, toId) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === fromId && !n.connectedTo.includes(toId)
          ? { ...n, connectedTo: [...n.connectedTo, toId] }
          : n
      ),
    })),

  disconnectNodes: (fromId, toId) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === fromId
          ? { ...n, connectedTo: n.connectedTo.filter((c) => c !== toId) }
          : n
      ),
    })),

  duplicateNode: (id) => {
    const { nodes } = get();
    const source = nodes.find((n) => n.id === id);
    if (!source) return;
    const newId = `node-${++nodeCounter}-${Date.now()}`;
    set((state) => ({
      nodes: [...state.nodes, { ...source, id: newId, x: source.x + 40, y: source.y + 40, connectedTo: [], picked: false }],
    }));
  },

  clearAll: () => set({ nodes: [], selectedNodeId: null }),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

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
}));
