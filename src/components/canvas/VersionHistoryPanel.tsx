import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  History, X, RotateCcw, Tag, Clock, User, GitBranch,
  Plus, Minus, Edit, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVersionControl } from '@/hooks/use-version-control';
import { useCanvasStore } from '@/stores/canvasStore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface VersionHistoryPanelProps {
  projectId: string;
  onClose: () => void;
}

export function VersionHistoryPanel({ projectId, onClose }: VersionHistoryPanelProps) {
  const [tagInput, setTagInput] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newVersionSummary, setNewVersionSummary] = useState('');

  const { versions, isLoading, createVersion, restoreVersion, tagVersion, loadVersions } =
    useVersionControl(projectId);
  const nodes = useCanvasStore((state) => state.nodes);
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreateVersion = async () => {
    if (!newVersionSummary.trim()) {
      toast({
        title: 'Summary Required',
        description: 'Please enter a summary for this version',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    const result = await createVersion(nodes, newVersionSummary.trim());

    if (result.success) {
      toast({
        title: 'Version Created',
        description: 'New version saved successfully',
      });
      setNewVersionSummary('');
    } else {
      toast({
        title: 'Failed to Create Version',
        description: result.error || 'An error occurred',
        variant: 'destructive',
      });
    }

    setIsCreating(false);
  };

  const handleRestore = async (versionId: string) => {
    const result = await restoreVersion(versionId);

    if (result.success && result.nodes) {
      useCanvasStore.setState({ nodes: result.nodes });
      toast({
        title: 'Version Restored',
        description: 'Project restored to selected version',
      });
      onClose();
    } else {
      toast({
        title: 'Restore Failed',
        description: result.error || 'Failed to restore version',
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = async (versionId: string) => {
    if (!tagInput.trim()) return;

    const result = await tagVersion(versionId, tagInput.trim());

    if (result.success) {
      toast({
        title: 'Tag Added',
        description: 'Version tagged successfully',
      });
      setTagInput('');
      setSelectedVersion(null);
    } else {
      toast({
        title: 'Failed to Add Tag',
        description: result.error || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Version History</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Save className="w-4 h-4" />
            Create New Version
          </h3>

          <div className="space-y-2">
            <Input
              placeholder="What changed? (e.g., Added login page)"
              value={newVersionSummary}
              onChange={(e) => setNewVersionSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateVersion();
              }}
            />
            <Button
              onClick={handleCreateVersion}
              disabled={isCreating || !newVersionSummary.trim()}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Current State
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            History ({versions.length})
          </h3>

          {isLoading && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading versions...
            </div>
          )}

          <div className="space-y-2">
            {versions.map((version, index) => {
              const isLatest = index === 0;
              const isExpanded = selectedVersion === version.id;

              return (
                <div
                  key={version.id}
                  className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <div
                    className={`p-3 cursor-pointer ${
                      isExpanded ? 'bg-accent/50' : 'hover:bg-accent/30'
                    }`}
                    onClick={() =>
                      setSelectedVersion(isExpanded ? null : version.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-primary">
                            v{version.version_number}
                          </span>
                          {version.tag && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                              <Tag className="w-3 h-3" />
                              {version.tag}
                            </span>
                          )}
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-1 truncate">
                          {version.changes_summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(version.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.snapshot.nodes_data.length} nodes
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border p-3 space-y-3 bg-accent/20"
                    >
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag (e.g., stable, v1.0)"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag(version.id);
                          }}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddTag(version.id)}
                          disabled={!tagInput.trim()}
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleRestore(version.id)}
                        variant="outline"
                        className="w-full"
                        disabled={isLatest}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {isLatest ? 'Current Version' : 'Restore This Version'}
                      </Button>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          Created: {new Date(version.created_at).toLocaleString()}
                        </p>
                        <p>Nodes: {version.snapshot.nodes_data.length}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}

            {versions.length === 0 && !isLoading && (
              <div className="text-center py-8 space-y-2">
                <History className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No versions yet</p>
                <p className="text-xs text-muted-foreground">
                  Create your first version to track changes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
