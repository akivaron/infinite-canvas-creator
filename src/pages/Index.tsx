import { InfiniteCanvas } from '@/components/canvas/InfiniteCanvas';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { PreviewSelectionPanel } from '@/components/canvas/PreviewSelectionPanel';
import { AssemblyPanel } from '@/components/canvas/AssemblyPanel';
import { useCanvasStore } from '@/stores/canvasStore';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Settings, User, HelpCircle, FileText } from 'lucide-react';

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
  const { user, signOut } = useAuth();

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <InfiniteCanvas />
      <CanvasToolbar />
      <PreviewSelectionPanel />
      <AssemblyPanel />
      <AnimatePresence>
        <ConnectingOverlay />
      </AnimatePresence>

      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 hover:bg-accent transition-colors"
            >
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">My Account</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              <span>Projects</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help & Support</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Index;
