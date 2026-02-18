import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Save, Undo2, Redo2, Plus, Trash2, Copy, ChevronDown, ChevronRight,
  Terminal, Play, ArrowRight, ArrowDown, PanelLeft, GripVertical, Search,
  Type, FileOutput, GitBranch, Repeat, Variable, Braces, FolderOpen,
  AlertCircle, CheckCircle, HelpCircle, Flag, Loader2, Settings,
  FileText, Database, Globe, Clock, Shield, Zap, Hash, List,
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Types ─── */
type StepKind =
  | 'input' | 'output' | 'if' | 'else' | 'loop' | 'variable'
  | 'function' | 'command' | 'flag' | 'arg' | 'file-read' | 'file-write'
  | 'env-var' | 'exit' | 'error' | 'spinner' | 'prompt-select'
  | 'prompt-confirm' | 'table-output' | 'progress' | 'pipe'
  | 'try-catch' | 'delay' | 'http-request' | 'db-query' | 'comment';

interface CliStep {
  id: string;
  kind: StepKind;
  label: string;
  config: Record<string, string>;
}

const kindColors: Record<StepKind, string> = {
  'input': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'output': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'if': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'else': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'loop': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'variable': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'function': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'command': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'flag': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'arg': 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  'file-read': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'file-write': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'env-var': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'exit': 'bg-red-500/15 text-red-400 border-red-500/30',
  'error': 'bg-red-500/15 text-red-400 border-red-500/30',
  'spinner': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'prompt-select': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'prompt-confirm': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'table-output': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'progress': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'pipe': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'try-catch': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'delay': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'http-request': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'db-query': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'comment': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const kindIcons: Record<StepKind, typeof Terminal> = {
  'input': Type,
  'output': FileOutput,
  'if': GitBranch,
  'else': GitBranch,
  'loop': Repeat,
  'variable': Variable,
  'function': Braces,
  'command': Terminal,
  'flag': Flag,
  'arg': Hash,
  'file-read': FolderOpen,
  'file-write': FileText,
  'env-var': Settings,
  'exit': X,
  'error': AlertCircle,
  'spinner': Loader2,
  'prompt-select': List,
  'prompt-confirm': HelpCircle,
  'table-output': Database,
  'progress': Zap,
  'pipe': ArrowRight,
  'try-catch': Shield,
  'delay': Clock,
  'http-request': Globe,
  'db-query': Database,
  'comment': FileText,
};

/* ─── Element Templates ─── */
interface CliElement {
  id: string;
  label: string;
  icon: typeof Terminal;
  category: string;
  kind: StepKind;
  defaultConfig: Record<string, string>;
}

const cliElements: CliElement[] = [
  // Input / Prompts
  { id: 'el-input-text', label: 'Text Input', icon: Type, category: 'Input / Prompts', kind: 'input', defaultConfig: { prompt: 'Enter value:', variable: 'userInput', default: '' } },
  { id: 'el-input-password', label: 'Password Input', icon: Shield, category: 'Input / Prompts', kind: 'input', defaultConfig: { prompt: 'Enter password:', variable: 'password', mask: '***' } },
  { id: 'el-prompt-select', label: 'Select Menu', icon: List, category: 'Input / Prompts', kind: 'prompt-select', defaultConfig: { prompt: 'Choose an option:', options: 'Option A, Option B, Option C', variable: 'selected' } },
  { id: 'el-prompt-confirm', label: 'Confirm (Y/N)', icon: HelpCircle, category: 'Input / Prompts', kind: 'prompt-confirm', defaultConfig: { prompt: 'Are you sure?', variable: 'confirmed', default: 'no' } },

  // Output / Display
  { id: 'el-output-log', label: 'Log Output', icon: FileOutput, category: 'Output / Display', kind: 'output', defaultConfig: { message: 'Hello, World!', color: 'green' } },
  { id: 'el-output-error', label: 'Error Output', icon: AlertCircle, category: 'Output / Display', kind: 'error', defaultConfig: { message: 'Something went wrong', exitCode: '1' } },
  { id: 'el-output-table', label: 'Table Output', icon: Database, category: 'Output / Display', kind: 'table-output', defaultConfig: { columns: 'Name, Status, Size', rows: '3' } },
  { id: 'el-output-spinner', label: 'Spinner / Loader', icon: Loader2, category: 'Output / Display', kind: 'spinner', defaultConfig: { text: 'Processing...', duration: '2000' } },
  { id: 'el-output-progress', label: 'Progress Bar', icon: Zap, category: 'Output / Display', kind: 'progress', defaultConfig: { label: 'Downloading', total: '100' } },
  { id: 'el-output-success', label: 'Success Message', icon: CheckCircle, category: 'Output / Display', kind: 'output', defaultConfig: { message: '✓ Done successfully', color: 'green' } },

  // Control Flow
  { id: 'el-if', label: 'If Condition', icon: GitBranch, category: 'Control Flow', kind: 'if', defaultConfig: { condition: 'value === true', then: '// do something' } },
  { id: 'el-else', label: 'Else Branch', icon: GitBranch, category: 'Control Flow', kind: 'else', defaultConfig: { action: '// else action' } },
  { id: 'el-loop', label: 'Loop / Repeat', icon: Repeat, category: 'Control Flow', kind: 'loop', defaultConfig: { iterable: 'items', variable: 'item', body: '// process item' } },
  { id: 'el-try-catch', label: 'Try / Catch', icon: Shield, category: 'Control Flow', kind: 'try-catch', defaultConfig: { try: '// risky operation', catch: '// handle error' } },
  { id: 'el-exit', label: 'Exit Process', icon: X, category: 'Control Flow', kind: 'exit', defaultConfig: { code: '0', message: 'Goodbye!' } },
  { id: 'el-delay', label: 'Delay / Sleep', icon: Clock, category: 'Control Flow', kind: 'delay', defaultConfig: { ms: '1000', reason: 'Wait for process' } },

  // Variables & Data
  { id: 'el-variable', label: 'Set Variable', icon: Variable, category: 'Variables & Data', kind: 'variable', defaultConfig: { name: 'myVar', value: 'hello', type: 'string' } },
  { id: 'el-env-var', label: 'Env Variable', icon: Settings, category: 'Variables & Data', kind: 'env-var', defaultConfig: { name: 'API_KEY', fallback: '', required: 'true' } },
  { id: 'el-flag', label: 'CLI Flag', icon: Flag, category: 'Variables & Data', kind: 'flag', defaultConfig: { name: '--verbose', short: '-v', type: 'boolean', description: 'Enable verbose output' } },
  { id: 'el-arg', label: 'Positional Arg', icon: Hash, category: 'Variables & Data', kind: 'arg', defaultConfig: { name: 'filename', required: 'true', description: 'Input file path' } },

  // Commands & Functions
  { id: 'el-command', label: 'Shell Command', icon: Terminal, category: 'Commands', kind: 'command', defaultConfig: { cmd: 'echo "hello"', cwd: '.', shell: 'bash' } },
  { id: 'el-function', label: 'Function Block', icon: Braces, category: 'Commands', kind: 'function', defaultConfig: { name: 'processData', params: 'input', body: '// function body\nreturn result;' } },
  { id: 'el-pipe', label: 'Pipe / Chain', icon: ArrowRight, category: 'Commands', kind: 'pipe', defaultConfig: { from: 'command1', to: 'command2' } },

  // File I/O
  { id: 'el-file-read', label: 'Read File', icon: FolderOpen, category: 'File I/O', kind: 'file-read', defaultConfig: { path: './input.txt', encoding: 'utf-8', variable: 'fileContent' } },
  { id: 'el-file-write', label: 'Write File', icon: FileText, category: 'File I/O', kind: 'file-write', defaultConfig: { path: './output.txt', content: 'data', append: 'false' } },

  // Network & Data
  { id: 'el-http', label: 'HTTP Request', icon: Globe, category: 'Network', kind: 'http-request', defaultConfig: { url: 'https://api.example.com', method: 'GET', headers: '{}', variable: 'response' } },
  { id: 'el-db', label: 'DB Query', icon: Database, category: 'Network', kind: 'db-query', defaultConfig: { query: 'SELECT * FROM table', connection: 'DATABASE_URL', variable: 'rows' } },

  // Meta
  { id: 'el-comment', label: 'Comment / Note', icon: FileText, category: 'Meta', kind: 'comment', defaultConfig: { text: '# This section handles...' } },
];

const categories = [...new Set(cliElements.map(e => e.category))];

let stepCounter = 0;
const newStepId = () => `step-${++stepCounter}-${Date.now()}`;

/* ─── Parse steps from node content ─── */
function parseSteps(content?: string): CliStep[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

/* ─── Generate preview HTML ─── */
function generateCliPreviewHtml(steps: CliStep[], title: string): string {
  const stepsHtml = steps.map((step, i) => {
    const Icon = kindIcons[step.kind];
    const kindLabel = step.kind.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const configHtml = Object.entries(step.config)
      .map(([k, v]) => `<div class="config-row"><span class="config-key">${k}</span><span class="config-val">${v}</span></div>`)
      .join('');

    return `<div class="step step-${step.kind}">
      <div class="step-num">${i + 1}</div>
      <div class="step-content">
        <div class="step-header">
          <span class="step-kind">${kindLabel}</span>
          <span class="step-label">${step.label}</span>
        </div>
        ${configHtml ? `<div class="config">${configHtml}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'SF Mono', 'Fira Code', monospace; background:#0a0a0f; color:#e2e8f0; padding:24px; }
    h1 { font-size:14px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:#f1f5f9; margin-bottom:4px; }
    .subtitle { font-size:10px; color:#64748b; margin-bottom:24px; }
    .step { display:flex; gap:12px; padding:12px 16px; border:1px solid #1e293b; border-radius:12px; margin-bottom:8px; }
    .step-num { width:24px; height:24px; border-radius:6px; background:#1e293b; color:#64748b; font-size:10px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .step-content { flex:1; min-width:0; }
    .step-header { display:flex; align-items:center; gap:8px; }
    .step-kind { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; padding:3px 8px; border-radius:6px; background:#1e293b; }
    .step-input .step-kind { background:#0c4a6e; color:#7dd3fc; }
    .step-output .step-kind { background:#064e3b; color:#6ee7b7; }
    .step-if .step-kind, .step-else .step-kind { background:#78350f; color:#fcd34d; }
    .step-loop .step-kind { background:#4c1d95; color:#c4b5fd; }
    .step-variable .step-kind { background:#1e3a5f; color:#93c5fd; }
    .step-command .step-kind { background:#4c0519; color:#fda4af; }
    .step-function .step-kind { background:#312e81; color:#a5b4fc; }
    .step-error .step-kind, .step-exit .step-kind { background:#7f1d1d; color:#fca5a5; }
    .step-label { font-size:12px; font-weight:600; color:#f1f5f9; }
    .config { margin-top:8px; padding:8px 10px; background:#0f172a; border-radius:8px; }
    .config-row { display:flex; gap:8px; font-size:10px; padding:2px 0; }
    .config-key { color:#a78bfa; font-weight:600; min-width:80px; }
    .config-key::after { content: ':'; }
    .config-val { color:#94a3b8; }
  </style></head><body>
    <h1>⬛ ${title}</h1>
    <div class="subtitle">${steps.length} step${steps.length !== 1 ? 's' : ''} defined</div>
    ${stepsHtml}
  </body></html>`;
}

/* ─── Config Field Labels ─── */
const configFieldLabels: Partial<Record<string, string>> = {
  prompt: 'Prompt Text',
  variable: 'Store In Variable',
  default: 'Default Value',
  mask: 'Mask Character',
  options: 'Options (comma-separated)',
  message: 'Message',
  color: 'Color',
  exitCode: 'Exit Code',
  columns: 'Column Headers',
  rows: 'Row Count',
  text: 'Display Text',
  duration: 'Duration (ms)',
  label: 'Label',
  total: 'Total',
  condition: 'Condition',
  then: 'Then',
  action: 'Action',
  iterable: 'Iterable',
  body: 'Body',
  try: 'Try Block',
  catch: 'Catch Block',
  code: 'Exit Code',
  ms: 'Delay (ms)',
  reason: 'Reason',
  name: 'Name',
  value: 'Value',
  type: 'Type',
  fallback: 'Fallback',
  required: 'Required',
  short: 'Short Flag',
  description: 'Description',
  cmd: 'Command',
  cwd: 'Working Dir',
  shell: 'Shell',
  params: 'Parameters',
  from: 'From',
  to: 'To',
  path: 'File Path',
  encoding: 'Encoding',
  content: 'Content',
  append: 'Append Mode',
  url: 'URL',
  method: 'Method',
  headers: 'Headers',
  query: 'Query',
  connection: 'Connection String',
};

/* ─── Main Component ─── */
interface Props { node: CanvasNode; onClose: () => void; }

export const CliVisualEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const [steps, setSteps] = useState<CliStep[]>(() => {
    const parsed = parseSteps(node.generatedCode);
    return parsed.length > 0 ? parsed : [];
  });
  const [selectedStepId, setSelectedStepId] = useState<string | null>(steps[0]?.id || null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map(c => [c, true]))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<CliStep[][]>([steps]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const selectedStep = steps.find(s => s.id === selectedStepId) || null;
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback((newSteps: CliStep[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newSteps]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updateSteps = useCallback((newSteps: CliStep[]) => {
    setSteps(newSteps);
    pushHistory(newSteps);
    setIsDirty(true);
  }, [pushHistory]);

  const updateSelectedStep = useCallback((updates: Partial<CliStep>) => {
    if (!selectedStepId) return;
    const newSteps = steps.map(s => s.id === selectedStepId ? { ...s, ...updates } : s);
    updateSteps(newSteps);
  }, [selectedStepId, steps, updateSteps]);

  // Save
  const saveToNode = useCallback(() => {
    const code = JSON.stringify(steps, null, 2);
    const preview = generateCliPreviewHtml(steps, node.title);
    updateNode(node.id, { generatedCode: code, content: preview });
    setIsDirty(false);
  }, [steps, node.id, node.title, updateNode]);

  // Auto-save
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
      const i = historyIndex - 1;
      setHistoryIndex(i);
      setSteps(history[i]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const i = historyIndex + 1;
      setHistoryIndex(i);
      setSteps(history[i]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  const addStep = useCallback((kind: StepKind, label: string, config: Record<string, string>) => {
    const step: CliStep = { id: newStepId(), kind, label, config };
    const newSteps = [...steps, step];
    updateSteps(newSteps);
    setSelectedStepId(step.id);
  }, [steps, updateSteps]);

  const removeStep = useCallback((id: string) => {
    const newSteps = steps.filter(s => s.id !== id);
    updateSteps(newSteps);
    if (selectedStepId === id) setSelectedStepId(newSteps[0]?.id || null);
  }, [steps, selectedStepId, updateSteps]);

  const duplicateStep = useCallback((id: string) => {
    const source = steps.find(s => s.id === id);
    if (!source) return;
    const dup: CliStep = { ...source, id: newStepId(), label: source.label + ' (copy)' };
    const idx = steps.findIndex(s => s.id === id);
    const newSteps = [...steps.slice(0, idx + 1), dup, ...steps.slice(idx + 1)];
    updateSteps(newSteps);
    setSelectedStepId(dup.id);
  }, [steps, updateSteps]);

  const moveStep = useCallback((id: string, dir: -1 | 1) => {
    const idx = steps.findIndex(s => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    updateSteps(newSteps);
  }, [steps, updateSteps]);

  // Drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/cli-element');
    if (!raw) return;
    try {
      const el: CliElement = JSON.parse(raw);
      addStep(el.kind, el.label, { ...el.defaultConfig });
    } catch {}
  }, [addStep]);

  const filteredElements = searchQuery
    ? cliElements.filter(el => el.label.toLowerCase().includes(searchQuery.toLowerCase()) || el.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : cliElements;

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
          <button onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`p-1.5 rounded-lg transition-all ${showLeftPanel ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}>
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">CLI Builder</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[160px]">{node.title}</span>
          <span className="text-[9px] font-bold text-muted-foreground/60">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => addStep('command', 'New Step', { cmd: '' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-secondary/80 text-foreground hover:bg-secondary transition-all">
            <Plus className="w-3 h-3" /> Step
          </button>
          <div className="h-4 w-px bg-border mx-1.5" />
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"><Redo2 className="w-3.5 h-3.5" /></button>
          <div className="h-4 w-px bg-border mx-1.5" />
          <button onClick={saveToNode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isDirty ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-secondary/60 text-muted-foreground'}`}>
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Elements */}
        {showLeftPanel && (
          <div className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search elements..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/80 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {categories.map(cat => {
                  const items = filteredElements.filter(el => el.category === cat);
                  if (items.length === 0) return null;
                  const expanded = expandedCategories[cat] !== false;
                  return (
                    <div key={cat}>
                      <button onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !expanded }))}
                        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {cat}
                        <span className="ml-auto text-[8px] text-muted-foreground/50">{items.length}</span>
                      </button>
                      {expanded && (
                        <div className="space-y-0.5 ml-1">
                          {items.map(el => {
                            const Icon = el.icon;
                            return (
                              <div key={el.id} draggable
                                onDragStart={e => { e.dataTransfer.setData('application/cli-element', JSON.stringify(el)); e.dataTransfer.effectAllowed = 'copy'; }}
                                onClick={() => addStep(el.kind, el.label, { ...el.defaultConfig })}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-grab hover:bg-secondary/80 transition-all group text-muted-foreground hover:text-foreground">
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[10px] font-semibold truncate">{el.label}</span>
                                <GripVertical className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-40 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center - Steps list */}
        <div className="flex-1 overflow-hidden flex flex-col"
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={handleDrop}>
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-2xl mx-auto space-y-2">
              {steps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Terminal className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm font-bold">No steps yet</p>
                  <p className="text-xs mt-1">Drag elements from the left panel or click to add</p>
                </div>
              )}
              {steps.map((step, idx) => {
                const Icon = kindIcons[step.kind];
                const isSelected = step.id === selectedStepId;
                return (
                  <div key={step.id}
                    onClick={() => setSelectedStepId(step.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-border/80 hover:bg-secondary/30'}`}>
                    {/* Step number */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-[10px] font-black text-muted-foreground">{idx + 1}</span>
                      {idx < steps.length - 1 && <div className="w-px h-4 bg-border" />}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${kindColors[step.kind]}`}>
                          <Icon className="w-3 h-3" />
                          {step.kind.replace(/-/g, ' ')}
                        </span>
                        <span className="text-xs font-bold text-foreground truncate">{step.label}</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-muted-foreground space-y-0.5">
                        {Object.entries(step.config).slice(0, 3).map(([k, v]) => (
                          <div key={k} className="flex gap-1">
                            <span className="text-muted-foreground/60">{k}:</span>
                            <span className="truncate">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); moveStep(step.id, -1); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-[10px]">↑</button>
                      <button onClick={e => { e.stopPropagation(); moveStep(step.id, 1); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-[10px]">↓</button>
                      <button onClick={e => { e.stopPropagation(); duplicateStep(step.id); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/80"><Copy className="w-3 h-3" /></button>
                      <button onClick={e => { e.stopPropagation(); removeStep(step.id); }}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Properties */}
        {selectedStep && (
          <div className="w-80 border-l border-border bg-card/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                {(() => { const Icon = kindIcons[selectedStep.kind]; return <Icon className="w-4 h-4 text-primary" />; })()}
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Step Properties</span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {/* Label */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Label</label>
                  <input value={selectedStep.label}
                    onChange={e => updateSelectedStep({ label: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-secondary/80 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                {/* Kind */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Type</label>
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${kindColors[selectedStep.kind]}`}>
                    {(() => { const Icon = kindIcons[selectedStep.kind]; return <Icon className="w-3 h-3" />; })()}
                    {selectedStep.kind.replace(/-/g, ' ')}
                  </div>
                </div>
                {/* Config fields */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Configuration</label>
                  {Object.entries(selectedStep.config).map(([key, val]) => {
                    const isMultiline = val.includes('\n') || val.length > 60 || ['body', 'try', 'catch', 'then', 'action', 'headers', 'query'].includes(key);
                    return (
                      <div key={key}>
                        <label className="text-[9px] font-semibold text-muted-foreground/80 block mb-0.5">{configFieldLabels[key] || key}</label>
                        {isMultiline ? (
                          <textarea value={val}
                            onChange={e => updateSelectedStep({ config: { ...selectedStep.config, [key]: e.target.value } })}
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg bg-secondary/80 border border-border text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y" />
                        ) : (
                          <input value={val}
                            onChange={e => updateSelectedStep({ config: { ...selectedStep.config, [key]: e.target.value } })}
                            className="w-full h-7 px-3 rounded-lg bg-secondary/80 border border-border text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </motion.div>
  );
};
