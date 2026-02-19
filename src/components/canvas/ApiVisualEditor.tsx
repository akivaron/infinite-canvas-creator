import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Undo2, Redo2, Plus, Trash2, Copy, ChevronDown, ChevronRight,
  Server, Globe, Lock, Key, Send, ArrowRight, ArrowDown,
  FileJson, Code, Layers, PanelLeft, GripVertical, Search,
  Shield, Zap, Database, Clock, AlertCircle, CheckCircle, XCircle,
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Types ─── */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiParam {
  id: string;
  key: string;
  type: string;
  required: boolean;
  description: string;
}

interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  tag: string;
  headers: ApiParam[];
  queryParams: ApiParam[];
  pathParams: ApiParam[];
  requestBody: string;      // JSON schema string
  responseBody: string;     // JSON schema string
  statusCode: number;
  auth: 'none' | 'bearer' | 'api-key' | 'oauth2';
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const methodBg: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-orange-500',
  DELETE: 'bg-red-500',
};

/* ─── Element Templates for left panel ─── */
interface ApiElement {
  id: string;
  label: string;
  icon: typeof Server;
  category: string;
  createEndpoint?: Partial<ApiEndpoint>;
  createParam?: Partial<ApiParam> & { target: 'headers' | 'queryParams' | 'pathParams' };
}

const apiElements: ApiElement[] = [
  // Endpoints
  { id: 'get-endpoint', label: 'GET Endpoint', icon: Globe, category: 'Endpoints', createEndpoint: { method: 'GET', path: '/api/resource', summary: 'Get resource', tag: 'Resources' } },
  { id: 'post-endpoint', label: 'POST Endpoint', icon: Send, category: 'Endpoints', createEndpoint: { method: 'POST', path: '/api/resource', summary: 'Create resource', tag: 'Resources', requestBody: '{\n  "name": "string",\n  "email": "string"\n}' } },
  { id: 'put-endpoint', label: 'PUT Endpoint', icon: ArrowRight, category: 'Endpoints', createEndpoint: { method: 'PUT', path: '/api/resource/:id', summary: 'Update resource', tag: 'Resources', requestBody: '{\n  "name": "string"\n}' } },
  { id: 'patch-endpoint', label: 'PATCH Endpoint', icon: ArrowRight, category: 'Endpoints', createEndpoint: { method: 'PATCH', path: '/api/resource/:id', summary: 'Partial update', tag: 'Resources', requestBody: '{\n  "field": "value"\n}' } },
  { id: 'delete-endpoint', label: 'DELETE Endpoint', icon: Trash2, category: 'Endpoints', createEndpoint: { method: 'DELETE', path: '/api/resource/:id', summary: 'Delete resource', tag: 'Resources' } },

  // Payloads
  { id: 'json-body', label: 'JSON Body', icon: FileJson, category: 'Payloads' },
  { id: 'form-body', label: 'Form Data', icon: Layers, category: 'Payloads' },
  { id: 'file-upload', label: 'File Upload', icon: Database, category: 'Payloads' },

  // Response Templates
  { id: 'res-200', label: '200 Success', icon: CheckCircle, category: 'Responses' },
  { id: 'res-201', label: '201 Created', icon: CheckCircle, category: 'Responses' },
  { id: 'res-400', label: '400 Bad Request', icon: AlertCircle, category: 'Responses' },
  { id: 'res-401', label: '401 Unauthorized', icon: Lock, category: 'Responses' },
  { id: 'res-403', label: '403 Forbidden', icon: Shield, category: 'Responses' },
  { id: 'res-404', label: '404 Not Found', icon: XCircle, category: 'Responses' },
  { id: 'res-500', label: '500 Server Error', icon: AlertCircle, category: 'Responses' },

  // Parameters
  { id: 'header-auth', label: 'Authorization Header', icon: Key, category: 'Headers & Params', createParam: { key: 'Authorization', type: 'string', required: true, description: 'Bearer token', target: 'headers' } },
  { id: 'header-content', label: 'Content-Type', icon: FileJson, category: 'Headers & Params', createParam: { key: 'Content-Type', type: 'string', required: true, description: 'application/json', target: 'headers' } },
  { id: 'header-accept', label: 'Accept', icon: FileJson, category: 'Headers & Params', createParam: { key: 'Accept', type: 'string', required: false, description: 'application/json', target: 'headers' } },
  { id: 'query-page', label: 'Pagination Query', icon: Layers, category: 'Headers & Params', createParam: { key: 'page', type: 'integer', required: false, description: 'Page number', target: 'queryParams' } },
  { id: 'query-limit', label: 'Limit Query', icon: Layers, category: 'Headers & Params', createParam: { key: 'limit', type: 'integer', required: false, description: 'Items per page', target: 'queryParams' } },
  { id: 'query-search', label: 'Search Query', icon: Search, category: 'Headers & Params', createParam: { key: 'q', type: 'string', required: false, description: 'Search term', target: 'queryParams' } },
  { id: 'path-id', label: 'Path ID Param', icon: Code, category: 'Headers & Params', createParam: { key: 'id', type: 'string', required: true, description: 'Resource ID', target: 'pathParams' } },

  // Auth
  { id: 'auth-bearer', label: 'Bearer Token', icon: Key, category: 'Authentication' },
  { id: 'auth-apikey', label: 'API Key', icon: Shield, category: 'Authentication' },
  { id: 'auth-oauth', label: 'OAuth 2.0', icon: Lock, category: 'Authentication' },

  // Middleware
  { id: 'mw-ratelimit', label: 'Rate Limiting', icon: Clock, category: 'Middleware' },
  { id: 'mw-cors', label: 'CORS Config', icon: Globe, category: 'Middleware' },
  { id: 'mw-validation', label: 'Validation', icon: Shield, category: 'Middleware' },
  { id: 'mw-cache', label: 'Cache Control', icon: Zap, category: 'Middleware' },

  // Triggers
  { id: 'trigger-cron', label: 'Cron Job', icon: Clock, category: 'Triggers', createEndpoint: { method: 'POST', path: '/cron/task-name', summary: 'Scheduled cron job', tag: 'Triggers', requestBody: '{\n  "schedule": "*/5 * * * *",\n  "timezone": "UTC"\n}' } },
  { id: 'trigger-webhook', label: 'Webhook', icon: Zap, category: 'Triggers', createEndpoint: { method: 'POST', path: '/webhooks/incoming', summary: 'Incoming webhook handler', tag: 'Triggers', requestBody: '{\n  "event": "string",\n  "payload": {}\n}' } },
  { id: 'trigger-event', label: 'Event Listener', icon: ArrowDown, category: 'Triggers', createEndpoint: { method: 'POST', path: '/events/on-event', summary: 'Event-driven trigger', tag: 'Triggers', requestBody: '{\n  "eventType": "string",\n  "source": "string",\n  "data": {}\n}' } },
  { id: 'trigger-queue', label: 'Message Queue', icon: Layers, category: 'Triggers', createEndpoint: { method: 'POST', path: '/queue/process', summary: 'Queue message processor', tag: 'Triggers', requestBody: '{\n  "queueName": "string",\n  "message": {},\n  "retryCount": 3\n}' } },
  { id: 'trigger-sse', label: 'Server-Sent Events', icon: ArrowRight, category: 'Triggers', createEndpoint: { method: 'GET', path: '/sse/stream', summary: 'SSE event stream', tag: 'Triggers' } },

  // Database Operations
  { id: 'db-query', label: 'DB Query', icon: Database, category: 'Database', createEndpoint: { method: 'POST', path: '/db/query', summary: 'Execute database query', tag: 'Database', requestBody: '{\n  "table": "string",\n  "filter": {},\n  "select": ["*"],\n  "limit": 50\n}' } },
  { id: 'db-insert', label: 'DB Insert', icon: Database, category: 'Database', createEndpoint: { method: 'POST', path: '/db/insert', summary: 'Insert record', tag: 'Database', requestBody: '{\n  "table": "string",\n  "data": {}\n}' } },
  { id: 'db-update', label: 'DB Update', icon: Database, category: 'Database', createEndpoint: { method: 'PUT', path: '/db/update/:id', summary: 'Update record', tag: 'Database', requestBody: '{\n  "table": "string",\n  "data": {},\n  "where": {}\n}' } },
  { id: 'db-delete', label: 'DB Delete', icon: Database, category: 'Database', createEndpoint: { method: 'DELETE', path: '/db/delete/:id', summary: 'Delete record', tag: 'Database' } },
  { id: 'db-migration', label: 'DB Migration', icon: Database, category: 'Database', createEndpoint: { method: 'POST', path: '/db/migrate', summary: 'Run migration', tag: 'Database', requestBody: '{\n  "version": "string",\n  "up": "SQL string",\n  "down": "SQL string"\n}' } },

  // Integrations
  { id: 'int-email', label: 'Send Email', icon: Send, category: 'Integrations', createEndpoint: { method: 'POST', path: '/integrations/email', summary: 'Send email notification', tag: 'Integrations', requestBody: '{\n  "to": "string",\n  "subject": "string",\n  "body": "string",\n  "html": true\n}' } },
  { id: 'int-sms', label: 'Send SMS', icon: Send, category: 'Integrations', createEndpoint: { method: 'POST', path: '/integrations/sms', summary: 'Send SMS message', tag: 'Integrations', requestBody: '{\n  "to": "+1234567890",\n  "message": "string"\n}' } },
  { id: 'int-payment', label: 'Payment', icon: Shield, category: 'Integrations', createEndpoint: { method: 'POST', path: '/integrations/payment', summary: 'Process payment', tag: 'Integrations', requestBody: '{\n  "amount": 0,\n  "currency": "USD",\n  "method": "card",\n  "token": "string"\n}' } },
  { id: 'int-storage', label: 'File Storage', icon: Database, category: 'Integrations', createEndpoint: { method: 'POST', path: '/integrations/storage/upload', summary: 'Upload to storage', tag: 'Integrations', requestBody: '{\n  "bucket": "string",\n  "path": "string",\n  "file": "(binary)"\n}' } },
  { id: 'int-push', label: 'Push Notification', icon: Zap, category: 'Integrations', createEndpoint: { method: 'POST', path: '/integrations/push', summary: 'Send push notification', tag: 'Integrations', requestBody: '{\n  "userId": "string",\n  "title": "string",\n  "body": "string",\n  "data": {}\n}' } },

  // Logging & Monitoring
  { id: 'log-error', label: 'Error Logger', icon: AlertCircle, category: 'Logging', createEndpoint: { method: 'POST', path: '/logs/error', summary: 'Log error event', tag: 'Logging', requestBody: '{\n  "level": "error",\n  "message": "string",\n  "stack": "string",\n  "context": {}\n}' } },
  { id: 'log-audit', label: 'Audit Trail', icon: Shield, category: 'Logging', createEndpoint: { method: 'POST', path: '/logs/audit', summary: 'Record audit event', tag: 'Logging', requestBody: '{\n  "action": "string",\n  "userId": "string",\n  "resource": "string",\n  "details": {}\n}' } },
  { id: 'log-health', label: 'Health Check', icon: CheckCircle, category: 'Logging', createEndpoint: { method: 'GET', path: '/health', summary: 'Service health check', tag: 'Logging' } },
];

const categories = [...new Set(apiElements.map(e => e.category))];

let paramCounter = 0;
const newParamId = () => `param-${++paramCounter}-${Date.now()}`;

let endpointCounter = 0;
const newEndpointId = () => `ep-${++endpointCounter}-${Date.now()}`;

const defaultEndpoint = (): ApiEndpoint => ({
  id: newEndpointId(),
  method: 'GET',
  path: '/api/resource',
  summary: 'New endpoint',
  tag: 'General',
  headers: [],
  queryParams: [],
  pathParams: [],
  requestBody: '',
  responseBody: '{\n  "data": [],\n  "message": "Success"\n}',
  statusCode: 200,
  auth: 'none',
});

/* ─── Parse endpoints from node content ─── */
function parseEndpoints(content?: string): ApiEndpoint[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Invalid JSON or not an array
  }
  return [];
}

/* ─── Generate preview HTML from endpoints ─── */
function generateApiPreviewHtml(endpoints: ApiEndpoint[], title: string): string {
  const endpointsHtml = endpoints.map(ep => {
    const methodClass = ep.method.toLowerCase();
    const paramsHtml = [...ep.headers, ...ep.queryParams, ...ep.pathParams].map(p =>
      `<tr><td class="param-name">${p.key}</td><td class="param-type">${p.type}</td><td>${p.required ? '<span class="required">required</span>' : '<span class="optional">optional</span>'}</td><td class="param-desc">${p.description}</td></tr>`
    ).join('');

    return `
      <div class="endpoint ${methodClass}">
        <div class="endpoint-header">
          <span class="method-badge ${methodClass}">${ep.method}</span>
          <span class="path">${ep.path}</span>
          <span class="summary">${ep.summary}</span>
          ${ep.auth !== 'none' ? `<span class="auth-badge">🔒 ${ep.auth}</span>` : ''}
        </div>
        ${paramsHtml ? `<div class="params"><table><thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>${paramsHtml}</tbody></table></div>` : ''}
        ${ep.requestBody ? `<div class="body-section"><span class="body-label">Request Body</span><pre>${ep.requestBody}</pre></div>` : ''}
        <div class="body-section"><span class="body-label">Response ${ep.statusCode}</span><pre>${ep.responseBody || '{ }'}</pre></div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'SF Mono', 'Fira Code', monospace; background:#0a0a0f; color:#e2e8f0; padding:24px; }
    h1 { font-size:14px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:#f1f5f9; margin-bottom:4px; }
    .subtitle { font-size:10px; color:#64748b; margin-bottom:24px; }
    .endpoint { border:1px solid #1e293b; border-radius:12px; margin-bottom:16px; overflow:hidden; }
    .endpoint-header { display:flex; align-items:center; gap:10px; padding:12px 16px; background:#111827; }
    .method-badge { font-size:10px; font-weight:900; letter-spacing:0.1em; padding:4px 10px; border-radius:6px; }
    .method-badge.get { background:#065f46; color:#6ee7b7; }
    .method-badge.post { background:#1e3a5f; color:#93c5fd; }
    .method-badge.put { background:#78350f; color:#fcd34d; }
    .method-badge.patch { background:#7c2d12; color:#fdba74; }
    .method-badge.delete { background:#7f1d1d; color:#fca5a5; }
    .path { font-size:12px; font-weight:700; color:#f1f5f9; }
    .summary { font-size:10px; color:#64748b; margin-left:auto; }
    .auth-badge { font-size:9px; background:#312e81; color:#a5b4fc; padding:3px 8px; border-radius:6px; }
    .params { padding:12px 16px; border-top:1px solid #1e293b; }
    table { width:100%; font-size:10px; border-collapse:collapse; }
    th { text-align:left; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; padding:4px 8px 8px; font-size:9px; }
    td { padding:4px 8px; border-top:1px solid #1e293b; }
    .param-name { color:#93c5fd; font-weight:600; }
    .param-type { color:#a78bfa; }
    .param-desc { color:#94a3b8; }
    .required { color:#f87171; font-size:9px; font-weight:700; }
    .optional { color:#64748b; font-size:9px; }
    .body-section { padding:12px 16px; border-top:1px solid #1e293b; }
    .body-label { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; display:block; margin-bottom:6px; }
    pre { font-size:11px; color:#a5b4fc; background:#0f172a; padding:12px; border-radius:8px; overflow-x:auto; white-space:pre-wrap; }
  </style></head><body>
    <h1>📡 ${title}</h1>
    <div class="subtitle">${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''} defined</div>
    ${endpointsHtml}
  </body></html>`;
}

/* ─── Main Component ─── */
interface Props {
  node: CanvasNode;
  onClose: () => void;
}

export const ApiVisualEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(() => {
    const parsed = parseEndpoints(node.generatedCode);
    return parsed.length > 0 ? parsed : [defaultEndpoint()];
  });
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(endpoints[0]?.id || null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map(c => [c, true]))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<ApiEndpoint[][]>([endpoints]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [dragOverEndpointId, setDragOverEndpointId] = useState<string | null>(null);

  const selectedEndpoint = endpoints.find(ep => ep.id === selectedEndpointId) || null;
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback((newEndpoints: ApiEndpoint[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newEndpoints]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updateEndpoints = useCallback((newEndpoints: ApiEndpoint[]) => {
    setEndpoints(newEndpoints);
    pushHistory(newEndpoints);
    setIsDirty(true);
  }, [pushHistory]);

  const updateSelectedEndpoint = useCallback((updates: Partial<ApiEndpoint>) => {
    if (!selectedEndpointId) return;
    const newEndpoints = endpoints.map(ep => ep.id === selectedEndpointId ? { ...ep, ...updates } : ep);
    updateEndpoints(newEndpoints);
  }, [selectedEndpointId, endpoints, updateEndpoints]);

  // Save to node
  const saveToNode = useCallback(() => {
    const code = JSON.stringify(endpoints, null, 2);
    const preview = generateApiPreviewHtml(endpoints, node.title);
    updateNode(node.id, { generatedCode: code, content: preview });
    setIsDirty(false);
  }, [endpoints, node.id, node.title, updateNode]);

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
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEndpoints(history[newIndex]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEndpoints(history[newIndex]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  // Add endpoint
  const addEndpoint = useCallback((template?: Partial<ApiEndpoint>) => {
    const ep: ApiEndpoint = { ...defaultEndpoint(), ...template };
    const newEndpoints = [...endpoints, ep];
    updateEndpoints(newEndpoints);
    setSelectedEndpointId(ep.id);
  }, [endpoints, updateEndpoints]);

  // Remove endpoint
  const removeEndpoint = useCallback((id: string) => {
    const newEndpoints = endpoints.filter(ep => ep.id !== id);
    updateEndpoints(newEndpoints);
    if (selectedEndpointId === id) setSelectedEndpointId(newEndpoints[0]?.id || null);
  }, [endpoints, selectedEndpointId, updateEndpoints]);

  // Duplicate endpoint
  const duplicateEndpoint = useCallback((id: string) => {
    const source = endpoints.find(ep => ep.id === id);
    if (!source) return;
    const ep: ApiEndpoint = { ...source, id: newEndpointId(), summary: source.summary + ' (copy)' };
    const idx = endpoints.findIndex(ep => ep.id === id);
    const newEndpoints = [...endpoints.slice(0, idx + 1), ep, ...endpoints.slice(idx + 1)];
    updateEndpoints(newEndpoints);
    setSelectedEndpointId(ep.id);
  }, [endpoints, updateEndpoints]);

  // Add param
  const addParam = useCallback((target: 'headers' | 'queryParams' | 'pathParams', template?: Partial<ApiParam>) => {
    if (!selectedEndpoint) return;
    const param: ApiParam = { id: newParamId(), key: '', type: 'string', required: false, description: '', ...template };
    updateSelectedEndpoint({ [target]: [...selectedEndpoint[target], param] });
  }, [selectedEndpoint, updateSelectedEndpoint]);

  // Remove param
  const removeParam = useCallback((target: 'headers' | 'queryParams' | 'pathParams', paramId: string) => {
    if (!selectedEndpoint) return;
    updateSelectedEndpoint({ [target]: selectedEndpoint[target].filter(p => p.id !== paramId) });
  }, [selectedEndpoint, updateSelectedEndpoint]);

  // Update param
  const updateParam = useCallback((target: 'headers' | 'queryParams' | 'pathParams', paramId: string, updates: Partial<ApiParam>) => {
    if (!selectedEndpoint) return;
    updateSelectedEndpoint({
      [target]: selectedEndpoint[target].map(p => p.id === paramId ? { ...p, ...updates } : p),
    });
  }, [selectedEndpoint, updateSelectedEndpoint]);

  // Handle drag from element panel
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverEndpointId(null);
    const raw = e.dataTransfer.getData('application/api-element');
    if (!raw) return;
    try {
      const element: ApiElement = JSON.parse(raw);
      if (element.createEndpoint) {
        addEndpoint(element.createEndpoint);
      } else if (element.createParam && selectedEndpoint) {
        addParam(element.createParam.target, { key: element.createParam.key, type: element.createParam.type, required: element.createParam.required ?? false, description: element.createParam.description });
      } else if (element.category === 'Authentication' && selectedEndpoint) {
        const authMap: Record<string, ApiEndpoint['auth']> = { 'auth-bearer': 'bearer', 'auth-apikey': 'api-key', 'auth-oauth': 'oauth2' };
        if (authMap[element.id]) updateSelectedEndpoint({ auth: authMap[element.id] });
      } else if (element.category === 'Responses' && selectedEndpoint) {
        const codeMatch = element.label.match(/^(\d+)/);
        if (codeMatch) updateSelectedEndpoint({ statusCode: parseInt(codeMatch[1]) });
      } else if (element.category === 'Payloads' && selectedEndpoint) {
        const bodyTemplates: Record<string, string> = {
          'json-body': '{\n  "key": "value"\n}',
          'form-body': '{\n  "field": "value",\n  "file": "(binary)"\n}',
          'file-upload': '{\n  "file": "(binary)",\n  "description": "string"\n}',
        };
        if (bodyTemplates[element.id]) updateSelectedEndpoint({ requestBody: bodyTemplates[element.id] });
      } else if (element.category === 'Middleware' && selectedEndpoint) {
        const mwHeaders: Record<string, ApiParam> = {
          'mw-ratelimit': { id: newParamId(), key: 'X-RateLimit-Limit', type: 'integer', required: false, description: 'Max requests per window' },
          'mw-cors': { id: newParamId(), key: 'Access-Control-Allow-Origin', type: 'string', required: false, description: '*' },
          'mw-validation': { id: newParamId(), key: 'X-Validation', type: 'string', required: false, description: 'Schema validation enabled' },
          'mw-cache': { id: newParamId(), key: 'Cache-Control', type: 'string', required: false, description: 'max-age=3600' },
        };
        if (mwHeaders[element.id]) addParam('headers', mwHeaders[element.id]);
      }
    } catch (e) {
      console.error('Failed to parse dropped element:', e);
    }
  }, [selectedEndpoint, addEndpoint, addParam, updateSelectedEndpoint]);

  const filteredElements = searchQuery
    ? apiElements.filter(el => el.label.toLowerCase().includes(searchQuery.toLowerCase()) || el.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : apiElements;

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
            <Server className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">API Builder</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[160px]">{node.title}</span>
          <span className="text-[9px] font-bold text-muted-foreground/60">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={() => addEndpoint()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-secondary/80 text-foreground hover:bg-secondary transition-all">
            <Plus className="w-3 h-3" /> Endpoint
          </button>

          <div className="h-4 w-px bg-border mx-1.5" />

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

      {/* Main */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: API Elements */}
        {showLeftPanel && (
          <div className="w-60 border-r border-border bg-card/90 backdrop-blur flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search elements..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-2 pb-3 space-y-1">
                {categories.map(cat => {
                  const items = filteredElements.filter(el => el.category === cat);
                  if (items.length === 0) return null;
                  const isExpanded = expandedCategories[cat] !== false;
                  return (
                    <div key={cat}>
                      <button
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !isExpanded }))}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {cat}
                        <span className="ml-auto text-[8px] font-bold text-muted-foreground/50">{items.length}</span>
                      </button>
                      {isExpanded && (
                        <div className="space-y-0.5 ml-1">
                          {items.map(el => (
                            <div
                              key={el.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/api-element', JSON.stringify(el));
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              onClick={() => {
                                if (el.createEndpoint) addEndpoint(el.createEndpoint);
                                else if (el.createParam && selectedEndpoint) addParam(el.createParam.target, el.createParam);
                              }}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab hover:bg-secondary/80 transition-colors group"
                            >
                              <el.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                              <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{el.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center: Endpoints list */}
        <div
          className="flex-1 overflow-auto bg-secondary/20 p-6"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={handleDrop}
        >
          <div className="max-w-3xl mx-auto space-y-3">
            {endpoints.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Server className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-bold text-muted-foreground mb-2">No endpoints yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Drag elements from the left panel or click + Endpoint</p>
                <button onClick={() => addEndpoint()} className="brand-button flex items-center gap-2 !py-3 !px-6">
                  <Plus className="w-3 h-3" /> Add First Endpoint
                </button>
              </div>
            )}

            {endpoints.map((ep) => {
              const isActive = ep.id === selectedEndpointId;
              return (
                <motion.div
                  key={ep.id}
                  layout
                  onClick={() => setSelectedEndpointId(ep.id)}
                  className={`rounded-2xl border overflow-hidden transition-all cursor-pointer ${
                    isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
                  } ${dragOverEndpointId === ep.id ? 'ring-2 ring-blue-500/30' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverEndpointId(ep.id); }}
                  onDragLeave={() => setDragOverEndpointId(null)}
                  onDrop={(e) => { setDragOverEndpointId(null); setSelectedEndpointId(ep.id); handleDrop(e); }}
                >
                  {/* Endpoint header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-card">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className={`text-[10px] font-black px-3 py-1 rounded-md border ${methodColors[ep.method]}`}>{ep.method}</span>
                    <span className="text-sm font-mono font-bold text-foreground">{ep.path}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{ep.summary}</span>
                    {ep.auth !== 'none' && <Lock className="w-3.5 h-3.5 text-primary/60" />}
                    <button onClick={(e) => { e.stopPropagation(); duplicateEndpoint(ep.id); }} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
                      <Copy className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeEndpoint(ep.id); }} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Expanded view when selected */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-4 space-y-4 bg-card/50">
                          {/* Method & Path */}
                          <div className="flex gap-2">
                            <select
                              value={ep.method}
                              onChange={(e) => updateSelectedEndpoint({ method: e.target.value as HttpMethod })}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${methodColors[ep.method]} bg-transparent focus:outline-none cursor-pointer`}
                            >
                              {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map(m => (
                                <option key={m} value={m} className="bg-card text-foreground">{m}</option>
                              ))}
                            </select>
                            <input
                              value={ep.path}
                              onChange={(e) => updateSelectedEndpoint({ path: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="/api/..."
                            />
                          </div>

                          {/* Summary & Tag */}
                          <div className="flex gap-2">
                            <input
                              value={ep.summary}
                              onChange={(e) => updateSelectedEndpoint({ summary: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Summary..."
                            />
                            <input
                              value={ep.tag}
                              onChange={(e) => updateSelectedEndpoint({ tag: e.target.value })}
                              className="w-32 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Tag"
                            />
                          </div>

                          {/* Auth & Status */}
                          <div className="flex gap-2">
                            <div className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                              <select
                                value={ep.auth}
                                onChange={(e) => updateSelectedEndpoint({ auth: e.target.value as ApiEndpoint['auth'] })}
                                className="px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                              >
                                <option value="none">No Auth</option>
                                <option value="bearer">Bearer Token</option>
                                <option value="api-key">API Key</option>
                                <option value="oauth2">OAuth 2.0</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                              <input
                                type="number"
                                value={ep.statusCode}
                                onChange={(e) => updateSelectedEndpoint({ statusCode: parseInt(e.target.value) || 200 })}
                                className="w-20 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>

                          {/* Params sections */}
                          {(['headers', 'queryParams', 'pathParams'] as const).map(target => (
                            <div key={target}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                  {target === 'headers' ? '📋 Headers' : target === 'queryParams' ? '🔍 Query Params' : '📌 Path Params'}
                                </span>
                                <button onClick={() => addParam(target)} className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary/80 transition-colors">
                                  <Plus className="w-3 h-3" /> Add
                                </button>
                              </div>
                              {ep[target].length > 0 && (
                                <div className="space-y-1.5">
                                  {ep[target].map(param => (
                                    <div key={param.id} className="flex items-center gap-1.5 group">
                                      <input
                                        value={param.key}
                                        onChange={(e) => updateParam(target, param.id, { key: e.target.value })}
                                        className="w-28 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="key"
                                      />
                                      <select
                                        value={param.type}
                                        onChange={(e) => updateParam(target, param.id, { type: e.target.value })}
                                        className="w-20 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground focus:outline-none cursor-pointer"
                                      >
                                        {['string', 'integer', 'number', 'boolean', 'array', 'object'].map(t => (
                                          <option key={t} value={t}>{t}</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => updateParam(target, param.id, { required: !param.required })}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black border transition-all ${
                                          param.required ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-border text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        {param.required ? 'REQ' : 'OPT'}
                                      </button>
                                      <input
                                        value={param.description}
                                        onChange={(e) => updateParam(target, param.id, { description: e.target.value })}
                                        className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="description"
                                      />
                                      <button onClick={() => removeParam(target, param.id)} className="p-1 rounded-lg text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Request Body */}
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">📤 Request Body</span>
                            <textarea
                              value={ep.requestBody}
                              onChange={(e) => updateSelectedEndpoint({ requestBody: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              rows={4}
                              placeholder='{ "key": "value" }'
                            />
                          </div>

                          {/* Response Body */}
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">📥 Response Body</span>
                            <textarea
                              value={ep.responseBody}
                              onChange={(e) => updateSelectedEndpoint({ responseBody: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              rows={4}
                              placeholder='{ "data": [] }'
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-card/90 text-[9px] font-bold text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>📡 {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{endpoints.reduce((sum, ep) => sum + ep.headers.length + ep.queryParams.length + ep.pathParams.length, 0)} params</span>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && <span className="text-primary">● Unsaved</span>}
          <span>API Builder v1.0</span>
        </div>
      </div>
    </motion.div>
  );
};
