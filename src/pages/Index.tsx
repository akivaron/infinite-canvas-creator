import { InfiniteCanvas } from '@/components/canvas/InfiniteCanvas';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { PreviewSelectionPanel } from '@/components/canvas/PreviewSelectionPanel';
import { AssemblyPanel } from '@/components/canvas/AssemblyPanel';
import { useCanvasStore } from '@/stores/canvasStore';
import { AnimatePresence, motion } from 'framer-motion';

const ConnectingOverlay = () => {
  const { connectingFromId, cancelConnecting } = useCanvasStore();
  if (!connectingFromId) return null;

  return (
    <motion.div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
    >
      Click a target node to connect
      <button
        onClick={cancelConnecting}
        className="px-3 py-1 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
      >
        Cancel
      </button>
    </motion.div>
  );
};

const Index = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <InfiniteCanvas />
      <CanvasToolbar />
      <PreviewSelectionPanel />
      <AssemblyPanel />
      <AnimatePresence>
        <ConnectingOverlay />
      </AnimatePresence>
    </div>
  );
};

export default Index;
