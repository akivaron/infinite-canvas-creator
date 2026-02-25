import { motion, AnimatePresence } from 'framer-motion';
import { useCollaboration } from '@/hooks/use-collaboration';
import { useEffect, useState } from 'react';

interface PresenceCursorsProps {
  projectId: string;
  zoom: number;
  panX: number;
  panY: number;
}

export function PresenceCursors({ projectId, zoom, panX, panY }: PresenceCursorsProps) {
  const { activeUsers } = useCollaboration(projectId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    setCurrentUserId(userId);
  }, []);

  const otherUsers = activeUsers.filter((user) => user.user_id !== currentUserId);

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {otherUsers.map((user) => {
          if (!user || !user.user_id) return null;

          const cursorX = user.cursor_x ?? 0;
          const cursorY = user.cursor_y ?? 0;
          const screenX = cursorX * zoom + panX;
          const screenY = cursorY * zoom + panY;

          if (screenX < -100 || screenY < -100 || screenX > window.innerWidth + 100 || screenY > window.innerHeight + 100) {
            return null;
          }

          const userColor = user.color || '#6366f1';

          return (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                transform: 'translate(-2px, -2px)',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  filter: `drop-shadow(0 2px 4px ${userColor}40)`,
                }}
              >
                <path
                  d="M5.65376 12.3673L8.68375 19.9668C8.91677 20.6067 9.69374 20.7135 10.0696 20.1732L12.3337 17.0987L16.2675 20.1705C16.7156 20.5298 17.3716 20.2842 17.483 19.7162L19.9668 6.3326C20.0845 5.73257 19.4335 5.26228 18.8752 5.56071L5.26546 12.0411C4.67554 12.3534 4.73534 13.2142 5.36309 13.4424L5.65376 12.3673Z"
                  fill={userColor}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-6 top-0 whitespace-nowrap px-2 py-1 rounded-md text-xs font-medium text-white pointer-events-auto"
                style={{
                  backgroundColor: userColor,
                  boxShadow: `0 2px 8px ${userColor}40`,
                }}
              >
                {user.user_email?.split('@')[0] || 'Anonymous'}
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function PresenceAvatars({ projectId }: { projectId: string }) {
  const { activeUsers } = useCollaboration(projectId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    setCurrentUserId(userId);
  }, []);

  const otherUsers = activeUsers.filter((user) => user.user_id !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 right-6 z-30 flex items-center gap-2 px-4 py-2 rounded-2xl bg-card/90 backdrop-blur border border-border shadow-sm"
    >
      <div className="flex items-center -space-x-2">
        {otherUsers.slice(0, 5).map((user) => {
          if (!user || !user.user_id) return null;

          return (
            <div
              key={user.user_id}
              className="relative w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: user.color || '#6366f1' }}
              title={user.user_email || 'Anonymous'}
            >
              {(user.user_email?.[0] || '?').toUpperCase()}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                style={{ backgroundColor: '#10b981' }}
              />
            </div>
          );
        })}
        {otherUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground">
            +{otherUsers.length - 5}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {otherUsers.length} {otherUsers.length === 1 ? 'user' : 'users'} online
      </span>
    </motion.div>
  );
}
