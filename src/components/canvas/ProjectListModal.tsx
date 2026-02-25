import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FolderOpen, Plus, Trash2, Calendar, FileCode, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '@/stores/canvasStore';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
}

export const ProjectListModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { projectId, loadProject } = useCanvasStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedProjects = localStorage.getItem('canvas_projects');
      if (storedProjects) {
        const parsed = JSON.parse(storedProjects);
        setProjects(Object.entries(parsed).map(([id, data]: [string, any]) => ({
          id,
          name: data.name || `Project ${id.slice(0, 8)}`,
          description: data.description,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          nodeCount: data.nodes?.length || 0,
        })));
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newId = `project-${Date.now()}`;
    const newProject = {
      id: newId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],
      connections: [],
    };

    const storedProjects = JSON.parse(localStorage.getItem('canvas_projects') || '{}');
    storedProjects[newId] = newProject;
    localStorage.setItem('canvas_projects', JSON.stringify(storedProjects));

    setNewProjectName('');
    setNewProjectDesc('');
    setShowCreateForm(false);
    loadProjects();
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    const storedProjects = JSON.parse(localStorage.getItem('canvas_projects') || '{}');
    delete storedProjects[id];
    localStorage.setItem('canvas_projects', JSON.stringify(storedProjects));
    loadProjects();
  };

  const handleOpenProject = (id: string) => {
    loadProject(id);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="node-card p-8 w-[600px] max-h-[85vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase text-foreground">Projects</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {projects.length} Project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm font-bold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full py-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Create New Project</span>
              </button>
            )}

            {showCreateForm && (
              <motion.div
                className="p-6 rounded-2xl bg-secondary/50 border border-border space-y-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-sm font-black uppercase tracking-wide text-foreground">New Project</h3>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="brand-input w-full"
                  autoFocus
                />
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Description (optional)..."
                  className="brand-input w-full resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProjectName('');
                      setNewProjectDesc('');
                    }}
                    className="flex-1 py-3 rounded-xl border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-bold text-muted-foreground">No projects yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first project to get started</p>
                </div>
              ) : (
                projects.map((project) => (
                  <motion.div
                    key={project.id}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
                      project.id === projectId
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border hover:border-primary/50 hover:bg-card/80'
                    }`}
                    onClick={() => handleOpenProject(project.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-black text-foreground">{project.name}</h3>
                          {project.id === projectId && (
                            <span className="px-2 py-0.5 rounded-lg bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
                              Active
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileCode className="w-3 h-3" />
                            <span>{project.nodeCount} nodes</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>Updated {formatDate(project.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
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
