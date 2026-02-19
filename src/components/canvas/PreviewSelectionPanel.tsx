import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Monitor, Smartphone, Layout, CreditCard, Star } from 'lucide-react';
import { useCanvasStore, type UIVariation } from '@/stores/canvasStore';
import { findFreePosition } from '@/lib/layout';

const categoryIcons: Record<UIVariation['category'], typeof Monitor> = {
  header: Layout,
  hero: Star,
  features: Layout,
  pricing: CreditCard,
  footer: Layout,
  dashboard: Monitor,
  mobile: Smartphone,
};

export const PreviewSelectionPanel = () => {
  const {
    previewPanelOpen, previewVariations, previewSourceNodeId,
    closePreviewPanel, addNode, connectNodes, togglePick, nodes
  } = useCanvasStore();

  if (!previewPanelOpen) return null;

  const handleSelect = (variation: UIVariation) => {
    if (!previewSourceNodeId) return;
    const currentNodes = useCanvasStore.getState().nodes;
    const sourceNode = currentNodes.find((n) => n.id === previewSourceNodeId);
    if (!sourceNode) return;

    const nodeWidth = 380;
    const nodeHeight = 320;
    const padding = 80;

    const { x, y } = findFreePosition(
      currentNodes,
      nodeWidth,
      nodeHeight,
      sourceNode.x + sourceNode.width + padding,
      sourceNode.y,
      padding
    );

    const newId = addNode({
      type: 'design',
      title: variation.label,
      description: variation.description,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      status: 'ready',
      generatedCode: variation.code,
      content: variation.previewHtml,
      picked: true,
      parentId: previewSourceNodeId,
      pageRole: variation.category,
    });
    connectNodes(previewSourceNodeId, newId);
    togglePick(newId);
    return newId;
  };

  const handleSelectAll = () => {
    // When selecting all, we want to place them in a more organized way
    // We'll add them one by one, which findFreePosition will handle 
    // because it uses the latest 'nodes' state (if we handle the state correctly)
    
    // However, since addNode is async-ish (zustand state update), 
    // let's do it with a local copy of nodes to ensure no overlap between the new ones
    const nodesFromStore = useCanvasStore.getState().nodes;
    const currentNodes = [...nodesFromStore];
    const sourceNode = nodesFromStore.find((n) => n.id === previewSourceNodeId);
    if (!sourceNode) return;

    const nodeWidth = 380;
    const nodeHeight = 320;
    const padding = 80;

    previewVariations.forEach((variation) => {
      const { x, y } = findFreePosition(
        currentNodes,
        nodeWidth,
        nodeHeight,
        sourceNode.x + sourceNode.width + padding,
        sourceNode.y,
        padding
      );

      const newId = addNode({
        type: 'design',
        title: variation.label,
        description: variation.description,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        status: 'ready',
        generatedCode: variation.code,
        content: variation.previewHtml,
        picked: true,
        parentId: previewSourceNodeId,
        pageRole: variation.category,
      });

      // Update local copy for next iteration
      currentNodes.push({
        id: newId,
        type: 'design',
        title: variation.label,
        description: variation.description,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        status: 'ready',
        connectedTo: [previewSourceNodeId],
        parentId: previewSourceNodeId
      } as any);

      connectNodes(previewSourceNodeId, newId);
      togglePick(newId);
    });

    closePreviewPanel();
  };

  return (
    <AnimatePresence>
      {previewPanelOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-[90vw] max-w-[1400px] max-h-[85vh] rounded-[2.5rem] bg-card border border-border overflow-hidden flex flex-col"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase text-foreground">
                  Choose Your Design
                </h2>
                <p className="brand-description mt-1">
                  Preview and select the UI sections you want. Each selection becomes a node on your canvas.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Select All
                </button>
                <button
                  onClick={closePreviewPanel}
                  className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of previews */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewVariations.map((variation) => {
                  const Icon = categoryIcons[variation.category] || Monitor;
                  return (
                    <motion.div
                      key={variation.id}
                      className="group rounded-2xl border border-border overflow-hidden bg-secondary/30 hover:border-primary/40 transition-all cursor-pointer"
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        handleSelect(variation);
                        closePreviewPanel();
                      }}
                    >
                      {/* Preview iframe */}
                      <div className="relative h-52 border-b border-border overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/80 border-b border-border">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-destructive/50" />
                            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-2">Preview</span>
                        </div>
                        <iframe
                          srcDoc={variation.previewHtml}
                          title={variation.label}
                          className="w-[200%] h-[200%] border-0 origin-top-left"
                          style={{ transform: 'scale(0.5)', pointerEvents: 'none' }}
                          sandbox=""
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-2xl bg-primary/90 flex items-center justify-center">
                              <Check className="w-6 h-6 text-primary-foreground" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black tracking-tight uppercase text-foreground">{variation.label}</h3>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{variation.category}</span>
                          </div>
                        </div>
                        <p className="brand-description line-clamp-2">{variation.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};