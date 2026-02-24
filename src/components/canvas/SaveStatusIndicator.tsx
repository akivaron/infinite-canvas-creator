import { useAutosave, SaveStatus } from '@/hooks/use-autosave';
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveStatusIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function SaveStatusIndicator({ className, showText = true }: SaveStatusIndicatorProps) {
  const { saveStatus, lastSaved, error } = useAutosave();

  const getStatusConfig = (status: SaveStatus) => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950/50',
          iconClass: 'animate-spin',
        };
      case 'saved':
        return {
          icon: CheckCircle2,
          text: lastSaved
            ? `Saved ${formatTimeAgo(lastSaved)}`
            : 'Saved',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/50',
          iconClass: '',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: error || 'Save failed',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/50',
          iconClass: '',
        };
      case 'idle':
      default:
        return {
          icon: Cloud,
          text: lastSaved
            ? `Last saved ${formatTimeAgo(lastSaved)}`
            : 'Autosave enabled',
          color: 'text-gray-500 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/50',
          iconClass: '',
        };
    }
  };

  const config = getStatusConfig(saveStatus);
  const Icon = config.icon;

  if (!showText) {
    return (
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
          config.bgColor,
          className
        )}
        title={config.text}
      >
        <Icon className={cn('w-4 h-4', config.color, config.iconClass)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className={cn('w-4 h-4', config.iconClass)} />
      <span>{config.text}</span>
    </div>
  );
}

export function SaveStatusBadge() {
  const { saveStatus, error } = useAutosave();

  if (saveStatus === 'idle') {
    return null;
  }

  const getStatusConfig = (status: SaveStatus) => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving',
          color: 'bg-blue-500',
          iconClass: 'animate-spin',
        };
      case 'saved':
        return {
          icon: CheckCircle2,
          text: 'Saved',
          color: 'bg-green-500',
          iconClass: '',
        };
      case 'error':
        return {
          icon: CloudOff,
          text: 'Error',
          color: 'bg-red-500',
          iconClass: '',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig(saveStatus);
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-sm font-medium z-50 transition-all',
        config.color
      )}
      title={error || undefined}
    >
      <Icon className={cn('w-4 h-4', config.iconClass)} />
      <span>{config.text}</span>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
