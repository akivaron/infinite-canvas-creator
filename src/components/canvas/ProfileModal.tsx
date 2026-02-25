import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Mail, Calendar, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const joinDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="node-card p-8 w-[440px]"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase text-foreground">Profile</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Account Information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</span>
              </div>
              <p className="text-sm font-bold text-foreground ml-7">{user?.email || 'Not available'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">User ID</span>
              </div>
              <p className="text-sm font-bold text-foreground ml-7 font-mono">{user?.id || 'Not available'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Member Since</span>
              </div>
              <p className="text-sm font-bold text-foreground ml-7">{joinDate}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border space-y-3">
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full py-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-secondary text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
