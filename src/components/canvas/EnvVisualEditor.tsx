import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Undo2, Redo2, Plus, Trash2, Key, Search, PanelLeft, 
  Database, Shield, Globe, Lock, Server, Zap, CreditCard, 
  MessageSquare, Mail, Cloud, Code, User, Settings
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EnvTemplate {
  id: string;
  key: string;
  defaultValue: string;
  description: string;
  category: string;
  icon: typeof Key;
}

const envTemplates: EnvTemplate[] = [
  // Database
  { id: 'db-url', key: 'DATABASE_URL', defaultValue: 'postgresql://user:password@localhost:5432/dbname', description: 'Main database connection string', category: 'Database', icon: Database },
  { id: 'db-host', key: 'DB_HOST', defaultValue: 'localhost', description: 'Database host address', category: 'Database', icon: Database },
  { id: 'db-port', key: 'DB_PORT', defaultValue: '5432', description: 'Database port', category: 'Database', icon: Database },
  { id: 'db-user', key: 'DB_USER', defaultValue: 'postgres', description: 'Database username', category: 'Database', icon: Database },
  
  // Auth
  { id: 'auth-secret', key: 'AUTH_SECRET', defaultValue: 'generate_a_long_random_string_here', description: 'Secret key for JWT/Session signing', category: 'Authentication', icon: Lock },
  { id: 'nextauth-url', key: 'NEXTAUTH_URL', defaultValue: 'http://localhost:3000', description: 'Base URL for NextAuth', category: 'Authentication', icon: Lock },
  { id: 'google-id', key: 'GOOGLE_CLIENT_ID', defaultValue: '', description: 'Google OAuth Client ID', category: 'Authentication', icon: Shield },
  { id: 'google-secret', key: 'GOOGLE_CLIENT_SECRET', defaultValue: '', description: 'Google OAuth Client Secret', category: 'Authentication', icon: Shield },
  
  // API Keys
  { id: 'stripe-pk', key: 'STRIPE_PUBLISHABLE_KEY', defaultValue: 'pk_test_...', description: 'Stripe public key', category: 'API Keys', icon: CreditCard },
  { id: 'stripe-sk', key: 'STRIPE_SECRET_KEY', defaultValue: 'sk_test_...', description: 'Stripe secret key', category: 'API Keys', icon: CreditCard },
  { id: 'openai-key', key: 'OPENAI_API_KEY', defaultValue: 'sk-...', description: 'OpenAI API key', category: 'API Keys', icon: Zap },
  { id: 'resend-key', key: 'RESEND_API_KEY', defaultValue: 're_...', description: 'Resend email API key', category: 'API Keys', icon: Mail },
  
  // App Config
  { id: 'port', key: 'PORT', defaultValue: '3000', description: 'Server port', category: 'App Config', icon: Server },
  { id: 'node-env', key: 'NODE_ENV', defaultValue: 'development', description: 'Node environment', category: 'App Config', icon: Code },
  { id: 'base-url', key: 'BASE_URL', defaultValue: 'http://localhost:3000', description: 'Application base URL', category: 'App Config', icon: Globe },
  
  // Storage
  { id: 's3-bucket', key: 'S3_BUCKET', defaultValue: 'my-bucket', description: 'S3 bucket name', category: 'Storage', icon: Cloud },
  { id: 'aws-region', key: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS region', category: 'Storage', icon: Cloud },
];

const categories = [...new Set(envTemplates.map(t => t.category))];

interface Props {
  node: CanvasNode;
  onClose: () => void;
}

export const EnvVisualEditor: React.FC<Props> = ({ node, onClose }) => {
  const { updateNode } = useCanvasStore();
  
  const [envVars, setEnvVars] = useState<Record<string, string>>(() => {
    return node.envVars || {};
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<Record<string, string>[]>([envVars]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback((newVars: Record<string, string>) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newVars]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updateVars = useCallback((newVars: Record<string, string>) => {
    setEnvVars(newVars);
    pushHistory(newVars);
    setIsDirty(true);
  }, [pushHistory]);

  const saveToNode = useCallback(() => {
    updateNode(node.id, { envVars });
    setIsDirty(false);
  }, [envVars, node.id, updateNode]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(saveToNode, 1500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [isDirty, saveToNode]);

  const handleClose = useCallback(() => {
    if (isDirty) saveToNode();
    onClose();
  }, [isDirty, saveToNode, onClose]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEnvVars(history[newIndex]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEnvVars(history[newIndex]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  const handleAdd = useCallback(() => {
    if (!newKey.trim()) return;
    const newVars = { ...envVars, [newKey.trim().toUpperCase()]: newValue.trim() };
    updateVars(newVars);
    setNewKey('');
    setNewValue('');
  }, [newKey, newValue, envVars, updateVars]);

  const handleRemove = useCallback((key: string) => {
    const newVars = { ...envVars };
    delete newVars[key];
    updateVars(newVars);
  }, [envVars, updateVars]);

  const handleUpdateValue = useCallback((key: string, value: string) => {
    const newVars = { ...envVars, [key]: value };
    updateVars(newVars);
  }, [envVars, updateVars]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/env-template');
    if (!raw) return;
    try {
      const template: EnvTemplate = JSON.parse(raw);
      if (!envVars[template.key]) {
        const newVars = { ...envVars, [template.key]: template.defaultValue };
        updateVars(newVars);
      }
    } catch (e) {
      console.error('Failed to parse dropped template:', e);
    }
  }, [envVars, updateVars]);

  const filteredTemplates = searchQuery
    ? envTemplates.filter(t => t.key.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : envTemplates;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`p-1.5 rounded-lg transition-all ${showLeftPanel ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Environment Config</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[160px]">{node.title}</span>
          <span className="text-[9px] font-bold text-muted-foreground/60">{Object.keys(envVars).length} variables</span>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-30">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all disabled:opacity-30">
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1.5" />

          <button
            onClick={saveToNode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              isDirty ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel: Templates */}
        {showLeftPanel && (
          <div className="w-64 border-r border-border bg-card/90 backdrop-blur flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="px-2 pb-4">
                {categories.map(category => {
                  const items = filteredTemplates.filter(t => t.category === category);
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={category} className="mb-4">
                      <h4 className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">{category}</h4>
                      <div className="space-y-0.5">
                        {items.map(template => (
                          <div
                            key={template.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/env-template', JSON.stringify(template));
                            }}
                            onClick={() => {
                              if (!envVars[template.key]) {
                                updateVars({ ...envVars, [template.key]: template.defaultValue });
                              }
                            }}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-secondary/80 group cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                              <template.icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-black text-foreground truncate uppercase">{template.key}</span>
                              <span className="text-[9px] text-muted-foreground truncate">{template.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Content Area */}
        <div 
          className="flex-1 bg-muted/20 relative overflow-hidden flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Key className="w-5 h-5" />
                </div>
                Environment Variables
              </h2>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                Manage your application secret keys and configuration variables.
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(envVars).length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 bg-card/50">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-500/30">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">No variables defined</p>
                    <p className="text-xs text-muted-foreground">Drag templates from the left panel or add manually below.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl hover:border-primary/30 transition-all group shadow-sm">
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500 ml-1">{key}</label>
                        <div className="relative">
                          <Input
                            value={value}
                            onChange={(e) => handleUpdateValue(key, e.target.value)}
                            className="h-9 text-xs font-mono bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 pr-8"
                            placeholder="Value"
                          />
                          <button 
                            onClick={() => handleRemove(key)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Add Form */}
            <div className="mt-8 border-t border-border pt-8">
              <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  Add Manual Variable
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Key</label>
                    <Input 
                      placeholder="e.g. API_ENDPOINT"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                      className="h-10 text-xs font-mono tracking-wider"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Value</label>
                    <Input 
                      placeholder="Value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAdd} 
                  disabled={!newKey.trim()}
                  className="w-full mt-4 h-10 gap-2 font-black uppercase tracking-widest text-[10px]"
                >
                  <Plus className="w-4 h-4" /> Add Variable
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
