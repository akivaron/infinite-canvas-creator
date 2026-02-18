import { useState, useRef, useCallback, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Undo2, Redo2, Plus, Trash2, ChevronDown, ChevronRight,
  Database, Table2, Key, Link2, Hash, Type, Calendar, ToggleLeft,
  Search, PanelLeft, GripVertical, ArrowRight, Shield, Layers,
  FileJson, Columns, List, Binary, Clock, MapPin, Image, Mail,
  CircleDot, Square, Braces, AlertCircle,
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Types ─── */
type ColumnType = 'uuid' | 'serial' | 'text' | 'varchar' | 'integer' | 'bigint' | 'float' | 'decimal' | 'boolean' | 'date' | 'timestamp' | 'timestamptz' | 'json' | 'jsonb' | 'array' | 'enum' | 'bytea';
type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';

interface DbColumn {
  id: string;
  name: string;
  type: ColumnType;
  isPrimary: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue: string;
  reference?: { tableId: string; columnId: string };
}

interface DbTable {
  id: string;
  name: string;
  columns: DbColumn[];
  x: number;
  y: number;
  color: string;
}

interface DbRelation {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  type: RelationType;
  label?: string;
}

const columnTypeIcons: Partial<Record<ColumnType, typeof Key>> = {
  uuid: Key,
  serial: Hash,
  text: Type,
  varchar: Type,
  integer: Hash,
  bigint: Hash,
  float: Hash,
  decimal: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  timestamp: Clock,
  timestamptz: Clock,
  json: Braces,
  jsonb: Braces,
  array: List,
  enum: CircleDot,
  bytea: Binary,
};

const tableColors = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

/* ─── Element Templates ─── */
interface DbElement {
  id: string;
  label: string;
  icon: typeof Database;
  category: string;
  createTable?: { name: string; columns?: Array<Omit<DbColumn, 'id'>> };
  createColumn?: Omit<DbColumn, 'id'>;
}

let counter = 0;
const uid = () => `db-${++counter}-${Date.now()}`;

const dbElements: DbElement[] = [
  // Common Tables
  { id: 'tbl-users', label: 'Users Table', icon: Database, category: 'Tables', createTable: { name: 'users', columns: [
    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
    { name: 'email', type: 'varchar', isPrimary: false, isNullable: false, isUnique: true, defaultValue: '' },
    { name: 'name', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'avatar_url', type: 'text', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
    { name: 'created_at', type: 'timestamptz', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'now()' },
  ] } },
  { id: 'tbl-posts', label: 'Posts Table', icon: Database, category: 'Tables', createTable: { name: 'posts', columns: [
    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
    { name: 'title', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'content', type: 'text', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
    { name: 'author_id', type: 'uuid', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'published', type: 'boolean', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'false' },
    { name: 'created_at', type: 'timestamptz', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'now()' },
  ] } },
  { id: 'tbl-products', label: 'Products Table', icon: Database, category: 'Tables', createTable: { name: 'products', columns: [
    { name: 'id', type: 'serial', isPrimary: true, isNullable: false, isUnique: true, defaultValue: '' },
    { name: 'name', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'price', type: 'decimal', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '0' },
    { name: 'description', type: 'text', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
    { name: 'category_id', type: 'integer', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
    { name: 'stock', type: 'integer', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '0' },
  ] } },
  { id: 'tbl-orders', label: 'Orders Table', icon: Database, category: 'Tables', createTable: { name: 'orders', columns: [
    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'total', type: 'decimal', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '0' },
    { name: 'status', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false, defaultValue: "'pending'" },
    { name: 'created_at', type: 'timestamptz', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'now()' },
  ] } },
  { id: 'tbl-categories', label: 'Categories Table', icon: Layers, category: 'Tables', createTable: { name: 'categories', columns: [
    { name: 'id', type: 'serial', isPrimary: true, isNullable: false, isUnique: true, defaultValue: '' },
    { name: 'name', type: 'varchar', isPrimary: false, isNullable: false, isUnique: true, defaultValue: '' },
    { name: 'parent_id', type: 'integer', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
  ] } },
  { id: 'tbl-comments', label: 'Comments Table', icon: Database, category: 'Tables', createTable: { name: 'comments', columns: [
    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
    { name: 'post_id', type: 'uuid', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'user_id', type: 'uuid', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'body', type: 'text', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'created_at', type: 'timestamptz', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'now()' },
  ] } },
  { id: 'tbl-tags', label: 'Tags Table', icon: Database, category: 'Tables', createTable: { name: 'tags', columns: [
    { name: 'id', type: 'serial', isPrimary: true, isNullable: false, isUnique: true, defaultValue: '' },
    { name: 'name', type: 'varchar', isPrimary: false, isNullable: false, isUnique: true, defaultValue: '' },
    { name: 'slug', type: 'varchar', isPrimary: false, isNullable: false, isUnique: true, defaultValue: '' },
  ] } },
  { id: 'tbl-media', label: 'Media Table', icon: Image, category: 'Tables', createTable: { name: 'media', columns: [
    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
    { name: 'url', type: 'text', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'type', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' },
    { name: 'size', type: 'bigint', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
    { name: 'uploaded_by', type: 'uuid', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' },
  ] } },
  { id: 'tbl-empty', label: 'Empty Table', icon: Square, category: 'Tables', createTable: { name: 'new_table', columns: [
    { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' },
  ] } },

  // Column types
  { id: 'col-uuid', label: 'UUID Column', icon: Key, category: 'Columns', createColumn: { name: 'id', type: 'uuid', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' } },
  { id: 'col-serial', label: 'Serial / Auto-increment', icon: Hash, category: 'Columns', createColumn: { name: 'id', type: 'serial', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' } },
  { id: 'col-varchar', label: 'Varchar', icon: Type, category: 'Columns', createColumn: { name: 'name', type: 'varchar', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' } },
  { id: 'col-text', label: 'Text', icon: Type, category: 'Columns', createColumn: { name: 'content', type: 'text', isPrimary: false, isNullable: true, isUnique: false, defaultValue: '' } },
  { id: 'col-integer', label: 'Integer', icon: Hash, category: 'Columns', createColumn: { name: 'count', type: 'integer', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '0' } },
  { id: 'col-decimal', label: 'Decimal / Float', icon: Hash, category: 'Columns', createColumn: { name: 'amount', type: 'decimal', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '0' } },
  { id: 'col-boolean', label: 'Boolean', icon: ToggleLeft, category: 'Columns', createColumn: { name: 'is_active', type: 'boolean', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'false' } },
  { id: 'col-timestamp', label: 'Timestamp', icon: Clock, category: 'Columns', createColumn: { name: 'created_at', type: 'timestamptz', isPrimary: false, isNullable: false, isUnique: false, defaultValue: 'now()' } },
  { id: 'col-json', label: 'JSON / JSONB', icon: Braces, category: 'Columns', createColumn: { name: 'metadata', type: 'jsonb', isPrimary: false, isNullable: true, isUnique: false, defaultValue: "'{}'" } },
  { id: 'col-enum', label: 'Enum', icon: CircleDot, category: 'Columns', createColumn: { name: 'status', type: 'enum', isPrimary: false, isNullable: false, isUnique: false, defaultValue: '' } },
  { id: 'col-array', label: 'Array', icon: List, category: 'Columns', createColumn: { name: 'tags', type: 'array', isPrimary: false, isNullable: true, isUnique: false, defaultValue: "'{}'" } },

  // Constraints
  { id: 'con-pk', label: 'Primary Key', icon: Key, category: 'Constraints' },
  { id: 'con-fk', label: 'Foreign Key', icon: Link2, category: 'Constraints' },
  { id: 'con-unique', label: 'Unique', icon: Shield, category: 'Constraints' },
  { id: 'con-notnull', label: 'Not Null', icon: AlertCircle, category: 'Constraints' },

  // Relations
  { id: 'rel-one-one', label: 'One-to-One', icon: ArrowRight, category: 'Relations' },
  { id: 'rel-one-many', label: 'One-to-Many', icon: ArrowRight, category: 'Relations' },
  { id: 'rel-many-many', label: 'Many-to-Many', icon: ArrowRight, category: 'Relations' },

  // Index types
  { id: 'idx-btree', label: 'B-Tree Index', icon: Columns, category: 'Indexes' },
  { id: 'idx-gin', label: 'GIN Index', icon: Columns, category: 'Indexes' },
  { id: 'idx-gist', label: 'GiST Index', icon: MapPin, category: 'Indexes' },
];

const elementCategories = [...new Set(dbElements.map(e => e.category))];

/* ─── Parse/Generate ─── */
function parseSchema(content?: string): { tables: DbTable[]; relations: DbRelation[] } {
  if (!content) return { tables: [], relations: [] };
  try {
    const parsed = JSON.parse(content);
    if (parsed.tables) return parsed;
  } catch {}
  return { tables: [], relations: [] };
}

function generatePreviewHtml(tables: DbTable[], relations: DbRelation[], title: string): string {
  const tablesHtml = tables.map(t => {
    const colsHtml = t.columns.map(c =>
      `<tr>
        <td style="padding:6px 12px;font-size:11px;color:${c.isPrimary ? '#f59e0b' : '#e2e8f0'};font-weight:${c.isPrimary ? '700' : '400'};">
          ${c.isPrimary ? '🔑 ' : c.reference ? '🔗 ' : ''}${c.name}
        </td>
        <td style="padding:6px 12px;font-size:10px;color:#a78bfa;">${c.type}</td>
        <td style="padding:6px 12px;font-size:9px;color:#64748b;">
          ${c.isPrimary ? 'PK ' : ''}${c.isUnique ? 'UQ ' : ''}${!c.isNullable ? 'NN' : ''}
        </td>
      </tr>`
    ).join('');
    return `<div style="background:#111827;border:1px solid ${t.color}40;border-radius:12px;overflow:hidden;min-width:220px;">
      <div style="padding:10px 16px;background:${t.color}20;border-bottom:1px solid ${t.color}30;display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;">🗄️</span>
        <span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:${t.color};">${t.name}</span>
        <span style="font-size:9px;color:#64748b;margin-left:auto;">${t.columns.length} cols</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">${colsHtml}</table>
    </div>`;
  }).join('');

  const relHtml = relations.map(r => {
    const from = tables.find(t => t.id === r.fromTableId);
    const to = tables.find(t => t.id === r.toTableId);
    if (!from || !to) return '';
    const fromCol = from.columns.find(c => c.id === r.fromColumnId);
    const toCol = to.columns.find(c => c.id === r.toColumnId);
    return `<div style="padding:8px 16px;background:#1e293b;border-radius:8px;font-size:10px;display:flex;align-items:center;gap:8px;">
      <span style="color:${from.color};">${from.name}.${fromCol?.name || '?'}</span>
      <span style="color:#64748b;">→ ${r.type} →</span>
      <span style="color:${to.color};">${to.name}.${toCol?.name || '?'}</span>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'SF Mono','Fira Code',monospace;background:#0a0a0f;color:#e2e8f0;padding:24px; }
  </style></head><body>
    <h1 style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#f1f5f9;margin-bottom:4px;">🗄️ ${title}</h1>
    <div style="font-size:10px;color:#64748b;margin-bottom:24px;">${tables.length} tables, ${relations.length} relations</div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px;">${tablesHtml}</div>
    ${relHtml ? `<div style="margin-top:16px;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px;">Relations</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${relHtml}</div></div>` : ''}
  </body></html>`;
}

/* ─── Main Component ─── */
interface Props {
  node: CanvasNode;
  onClose: () => void;
}

export const DatabaseVisualEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const [schema, setSchema] = useState(() => {
    const parsed = parseSchema(node.generatedCode);
    return parsed.tables.length > 0 ? parsed : { tables: [] as DbTable[], relations: [] as DbRelation[] };
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(schema.tables[0]?.id || null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(elementCategories.map(c => [c, true]))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<typeof schema[]>([schema]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [connectingFrom, setConnectingFrom] = useState<{ tableId: string; columnId: string } | null>(null);

  // Canvas pan/zoom for flow view
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTable = schema.tables.find(t => t.id === selectedTableId) || null;

  const pushHistory = useCallback((newSchema: typeof schema) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newSchema]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updateSchema = useCallback((newSchema: typeof schema) => {
    setSchema(newSchema);
    pushHistory(newSchema);
    setIsDirty(true);
  }, [pushHistory]);

  // Save to node
  const saveToNode = useCallback(() => {
    const code = JSON.stringify(schema, null, 2);
    const preview = generatePreviewHtml(schema.tables, schema.relations, node.title);
    updateNode(node.id, { generatedCode: code, content: preview });
    setIsDirty(false);
  }, [schema, node.id, node.title, updateNode]);

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
      setSchema(history[newIndex]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSchema(history[newIndex]);
      setIsDirty(true);
    }
  }, [historyIndex, history]);

  // Add table
  const addTable = useCallback((template?: DbElement['createTable']) => {
    const newTable: DbTable = {
      id: uid(),
      name: template?.name || 'new_table',
      color: tableColors[schema.tables.length % tableColors.length],
      x: 50 + schema.tables.length * 60,
      y: 50 + schema.tables.length * 40,
      columns: (template?.columns || [{ name: 'id', type: 'uuid', isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' }]).map(c => ({
        id: uid(),
        name: c.name || 'column',
        type: (c.type as ColumnType) || 'text',
        isPrimary: c.isPrimary || false,
        isNullable: c.isNullable ?? true,
        isUnique: c.isUnique || false,
        defaultValue: c.defaultValue || '',
      })),
    };
    updateSchema({ ...schema, tables: [...schema.tables, newTable] });
    setSelectedTableId(newTable.id);
  }, [schema, updateSchema]);

  // Add column to selected table
  const addColumn = useCallback((template?: DbElement['createColumn']) => {
    if (!selectedTableId) return;
    const newCol: DbColumn = {
      id: uid(),
      name: template?.name || 'new_column',
      type: (template?.type as ColumnType) || 'text',
      isPrimary: template?.isPrimary || false,
      isNullable: template?.isNullable ?? true,
      isUnique: template?.isUnique || false,
      defaultValue: template?.defaultValue || '',
    };
    const newTables = schema.tables.map(t =>
      t.id === selectedTableId ? { ...t, columns: [...t.columns, newCol] } : t
    );
    updateSchema({ ...schema, tables: newTables });
  }, [selectedTableId, schema, updateSchema]);

  // Delete table
  const deleteTable = useCallback((tableId: string) => {
    updateSchema({
      tables: schema.tables.filter(t => t.id !== tableId),
      relations: schema.relations.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId),
    });
    if (selectedTableId === tableId) setSelectedTableId(null);
  }, [schema, selectedTableId, updateSchema]);

  // Delete column
  const deleteColumn = useCallback((tableId: string, colId: string) => {
    const newTables = schema.tables.map(t =>
      t.id === tableId ? { ...t, columns: t.columns.filter(c => c.id !== colId) } : t
    );
    updateSchema({
      tables: newTables,
      relations: schema.relations.filter(r => !(
        (r.fromTableId === tableId && r.fromColumnId === colId) ||
        (r.toTableId === tableId && r.toColumnId === colId)
      )),
    });
  }, [schema, updateSchema]);

  // Update column
  const updateColumn = useCallback((tableId: string, colId: string, updates: Partial<DbColumn>) => {
    const newTables = schema.tables.map(t =>
      t.id === tableId ? {
        ...t,
        columns: t.columns.map(c => c.id === colId ? { ...c, ...updates } : c),
      } : t
    );
    updateSchema({ ...schema, tables: newTables });
  }, [schema, updateSchema]);

  // Update table
  const updateTable = useCallback((tableId: string, updates: Partial<DbTable>) => {
    const newTables = schema.tables.map(t => t.id === tableId ? { ...t, ...updates } : t);
    updateSchema({ ...schema, tables: newTables });
  }, [schema, updateSchema]);

  // Add relation
  const addRelation = useCallback((fromTableId: string, fromColumnId: string, toTableId: string, toColumnId: string, type: RelationType = 'one-to-many') => {
    const newRel: DbRelation = { id: uid(), fromTableId, fromColumnId, toTableId, toColumnId, type };
    updateSchema({ ...schema, relations: [...schema.relations, newRel] });
  }, [schema, updateSchema]);

  // Drag-drop from elements panel
  const handleElementDrop = useCallback((element: DbElement) => {
    if (element.createTable) {
      addTable(element.createTable);
    } else if (element.createColumn) {
      addColumn(element.createColumn);
    }
  }, [addTable, addColumn]);

  // Canvas mouse handlers
  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasZoom(prev => Math.max(0.2, Math.min(3, prev * delta)));
  }, []);

  const handleCanvasMouseDown = useCallback((e: ReactMouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasPan.x, y: e.clientY - canvasPan.y });
      setSelectedTableId(null);
    }
  }, [canvasPan]);

  const handleCanvasMouseMove = useCallback((e: ReactMouseEvent) => {
    if (isPanning) {
      setCanvasPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (draggingTableId) {
      const newTables = schema.tables.map(t =>
        t.id === draggingTableId
          ? { ...t, x: (e.clientX - dragOffset.x) / canvasZoom - canvasPan.x / canvasZoom, y: (e.clientY - dragOffset.y) / canvasZoom - canvasPan.y / canvasZoom }
          : t
      );
      setSchema(prev => ({ ...prev, tables: newTables }));
      setIsDirty(true);
    }
  }, [isPanning, panStart, draggingTableId, dragOffset, canvasZoom, canvasPan, schema.tables]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggingTableId) {
      pushHistory(schema);
      setDraggingTableId(null);
    }
  }, [draggingTableId, schema, pushHistory]);

  const handleTableMouseDown = useCallback((e: ReactMouseEvent, tableId: string) => {
    e.stopPropagation();
    setSelectedTableId(tableId);
    const table = schema.tables.find(t => t.id === tableId);
    if (!table) return;
    setDraggingTableId(tableId);
    setDragOffset({
      x: e.clientX - (table.x * canvasZoom + canvasPan.x),
      y: e.clientY - (table.y * canvasZoom + canvasPan.y),
    });
  }, [schema.tables, canvasZoom, canvasPan]);

  // Filter elements
  const filteredElements = searchQuery
    ? dbElements.filter(e => e.label.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : dbElements;

  // Draw relation lines
  const getRelationPath = useCallback((rel: DbRelation) => {
    const fromTable = schema.tables.find(t => t.id === rel.fromTableId);
    const toTable = schema.tables.find(t => t.id === rel.toTableId);
    if (!fromTable || !toTable) return null;

    const fromX = fromTable.x + 240;
    const fromColIdx = fromTable.columns.findIndex(c => c.id === rel.fromColumnId);
    const fromY = fromTable.y + 44 + fromColIdx * 30 + 15;

    const toX = toTable.x;
    const toColIdx = toTable.columns.findIndex(c => c.id === rel.toColumnId);
    const toY = toTable.y + 44 + toColIdx * 30 + 15;

    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  }, [schema.tables]);

  const columnTypes: ColumnType[] = ['uuid', 'serial', 'text', 'varchar', 'integer', 'bigint', 'float', 'decimal', 'boolean', 'date', 'timestamp', 'timestamptz', 'json', 'jsonb', 'array', 'enum', 'bytea'];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10" style={{ background: '#0f0f15' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
            <PanelLeft className="w-4 h-4" />
          </button>
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-widest text-white/80">Database Designer</span>
          <span className="text-[9px] text-white/30 ml-2">{node.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors disabled:opacity-30">
            <Redo2 className="w-4 h-4" />
          </button>
          {isDirty && <span className="text-[9px] font-bold text-amber-400 animate-pulse">UNSAVED</span>}
          <button onClick={saveToNode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-xs font-bold">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Panel: Elements ─── */}
        <AnimatePresence>
          {showLeftPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/10 flex flex-col overflow-hidden"
              style={{ background: '#0c0c12' }}
            >
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search elements..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {elementCategories.map(cat => {
                    const items = filteredElements.filter(e => e.category === cat);
                    if (items.length === 0) return null;
                    const isExpanded = expandedCategories[cat];
                    return (
                      <div key={cat} className="mb-1">
                        <button
                          onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {cat}
                          <span className="ml-auto text-white/20">{items.length}</span>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                              {items.map(el => {
                                const ElIcon = el.icon;
                                return (
                                  <button
                                    key={el.id}
                                    onClick={() => handleElementDrop(el)}
                                    draggable
                                    onDragStart={e => e.dataTransfer.setData('text/plain', el.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
                                  >
                                    <ElIcon className="w-3.5 h-3.5 text-cyan-400/60" />
                                    <span className="text-[11px] font-semibold">{el.label}</span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Center: Flow Canvas ─── */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ background: '#08080d' }}
          onWheel={handleCanvasWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* Grid pattern */}
          <div className="canvas-bg absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: `${20 * canvasZoom}px ${20 * canvasZoom}px`,
            backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px`,
          }} />

          {/* Relations SVG */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
              transformOrigin: '0 0',
            }}
          >
            {schema.relations.map(rel => {
              const path = getRelationPath(rel);
              if (!path) return null;
              const fromTable = schema.tables.find(t => t.id === rel.fromTableId);
              return (
                <g key={rel.id}>
                  <path d={path} fill="none" stroke={fromTable?.color || '#6366f1'} strokeWidth={1.5} strokeDasharray={rel.type === 'many-to-many' ? '6 3' : 'none'} opacity={0.5} />
                  <path d={path} fill="none" stroke={fromTable?.color || '#6366f1'} strokeWidth={3} opacity={0.1} />
                  {/* Relation type label */}
                </g>
              );
            })}
          </svg>

          {/* Tables */}
          <div
            style={{
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
              transformOrigin: '0 0',
              position: 'absolute',
              inset: 0,
            }}
          >
            {schema.tables.map(table => (
              <div
                key={table.id}
                className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow ${selectedTableId === table.id ? 'ring-2 ring-cyan-500/50' : ''}`}
                style={{
                  left: table.x,
                  top: table.y,
                  width: 240,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#111827',
                  border: `1px solid ${table.color}30`,
                  boxShadow: selectedTableId === table.id ? `0 0 20px ${table.color}20` : 'none',
                }}
                onMouseDown={e => handleTableMouseDown(e, table.id)}
              >
                {/* Table header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{ background: `${table.color}15`, borderBottom: `1px solid ${table.color}20` }}
                >
                  <Table2 className="w-3.5 h-3.5" style={{ color: table.color }} />
                  <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: table.color }}>{table.name}</span>
                  <span className="text-[9px] text-white/30 ml-auto">{table.columns.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteTable(table.id); }}
                    className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {/* Columns */}
                {table.columns.map(col => {
                  const ColIcon = columnTypeIcons[col.type] || Type;
                  return (
                    <div
                      key={col.id}
                      className={`flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors cursor-pointer ${selectedColumnId === col.id ? 'bg-white/5' : ''}`}
                      onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); setSelectedColumnId(col.id); }}
                    >
                      {col.isPrimary ? (
                        <Key className="w-3 h-3 text-amber-400 shrink-0" />
                      ) : col.reference ? (
                        <Link2 className="w-3 h-3 text-purple-400 shrink-0" />
                      ) : (
                        <ColIcon className="w-3 h-3 text-white/30 shrink-0" />
                      )}
                      <span className={`text-[11px] flex-1 truncate ${col.isPrimary ? 'font-bold text-amber-300' : 'text-white/70'}`}>{col.name}</span>
                      <span className="text-[9px] text-purple-400/60">{col.type}</span>
                      {!col.isNullable && <span className="text-[8px] text-red-400/60">NN</span>}
                    </div>
                  );
                })}
                {/* Add column button */}
                <button
                  onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); addColumn(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-[10px]">Add column</span>
                </button>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {schema.tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Database className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-sm font-bold text-white/20">No tables yet</p>
                <p className="text-xs text-white/10 mt-1">Drag tables from the left panel or click to add</p>
              </div>
            </div>
          )}

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-white/40">{Math.round(canvasZoom * 100)}%</span>
          </div>
        </div>

        {/* ─── Right Panel: Properties ─── */}
        {selectedTable && (
          <div className="w-[300px] border-l border-white/10 flex flex-col overflow-hidden" style={{ background: '#0c0c12' }}>
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4" style={{ color: selectedTable.color }} />
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Table Properties</span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Table name */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Table Name</label>
                  <input
                    value={selectedTable.name}
                    onChange={e => updateTable(selectedTable.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Table color */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {tableColors.map(c => (
                      <button
                        key={c}
                        onClick={() => updateTable(selectedTable.id, { color: c })}
                        className={`w-6 h-6 rounded-full transition-all ${selectedTable.color === c ? 'ring-2 ring-white/50 scale-110' : ''}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Columns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Columns</label>
                    <button onClick={() => addColumn()} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[9px] font-bold hover:bg-cyan-500/20 transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {selectedTable.columns.map(col => (
                      <div key={col.id} className={`rounded-lg border transition-colors ${selectedColumnId === col.id ? 'bg-white/5 border-cyan-500/30' : 'border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer" onClick={() => setSelectedColumnId(selectedColumnId === col.id ? null : col.id)}>
                          {col.isPrimary ? <Key className="w-3 h-3 text-amber-400 shrink-0" /> : <Type className="w-3 h-3 text-white/30 shrink-0" />}
                          <span className="text-[11px] text-white/70 flex-1 truncate">{col.name}</span>
                          <span className="text-[9px] text-purple-400/60">{col.type}</span>
                          <button onClick={e => { e.stopPropagation(); deleteColumn(selectedTable.id, col.id); }} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400">
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <AnimatePresence>
                          {selectedColumnId === col.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-2 pb-2 space-y-2">
                                <input
                                  value={col.name}
                                  onChange={e => updateColumn(selectedTable.id, col.id, { name: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50"
                                  placeholder="Column name"
                                />
                                <select
                                  value={col.type}
                                  onChange={e => updateColumn(selectedTable.id, col.id, { type: e.target.value as ColumnType })}
                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50"
                                >
                                  {columnTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <input
                                  value={col.defaultValue}
                                  onChange={e => updateColumn(selectedTable.id, col.id, { defaultValue: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50"
                                  placeholder="Default value"
                                />
                                <div className="flex gap-2 flex-wrap">
                                  <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer">
                                    <input type="checkbox" checked={col.isPrimary} onChange={e => updateColumn(selectedTable.id, col.id, { isPrimary: e.target.checked })} className="rounded" /> PK
                                  </label>
                                  <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer">
                                    <input type="checkbox" checked={col.isNullable} onChange={e => updateColumn(selectedTable.id, col.id, { isNullable: e.target.checked })} className="rounded" /> Nullable
                                  </label>
                                  <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer">
                                    <input type="checkbox" checked={col.isUnique} onChange={e => updateColumn(selectedTable.id, col.id, { isUnique: e.target.checked })} className="rounded" /> Unique
                                  </label>
                                </div>
                                {/* FK reference */}
                                <div>
                                  <label className="text-[9px] font-bold text-white/30 mb-1 block">Foreign Key →</label>
                                  <select
                                    value={col.reference ? `${col.reference.tableId}:${col.reference.columnId}` : ''}
                                    onChange={e => {
                                      if (!e.target.value) {
                                        updateColumn(selectedTable.id, col.id, { reference: undefined });
                                        return;
                                      }
                                      const [tId, cId] = e.target.value.split(':');
                                      updateColumn(selectedTable.id, col.id, { reference: { tableId: tId, columnId: cId } });
                                      // Also add a relation
                                      addRelation(selectedTable.id, col.id, tId, cId);
                                    }}
                                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50"
                                  >
                                    <option value="">None</option>
                                    {schema.tables.filter(t => t.id !== selectedTable.id).map(t =>
                                      t.columns.filter(c => c.isPrimary || c.isUnique).map(c => (
                                        <option key={`${t.id}:${c.id}`} value={`${t.id}:${c.id}`}>{t.name}.{c.name}</option>
                                      ))
                                    )}
                                  </select>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relations for this table */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2 block">Relations</label>
                  {schema.relations.filter(r => r.fromTableId === selectedTable.id || r.toTableId === selectedTable.id).map(rel => {
                    const other = rel.fromTableId === selectedTable.id
                      ? schema.tables.find(t => t.id === rel.toTableId)
                      : schema.tables.find(t => t.id === rel.fromTableId);
                    return (
                      <div key={rel.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 mb-1">
                        <Link2 className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] text-white/60 flex-1">{rel.type} → {other?.name || '?'}</span>
                        <button
                          onClick={() => updateSchema({ ...schema, relations: schema.relations.filter(r => r.id !== rel.id) })}
                          className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                  {schema.relations.filter(r => r.fromTableId === selectedTable.id || r.toTableId === selectedTable.id).length === 0 && (
                    <p className="text-[10px] text-white/20">No relations. Set foreign keys on columns to create them.</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};
