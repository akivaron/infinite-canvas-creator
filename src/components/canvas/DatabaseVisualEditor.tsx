import { useState, useRef, useCallback, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Undo2, Redo2, Plus, Trash2, ChevronDown, ChevronRight,
  Database, Table2, Key, Link2, Hash, Type, Calendar, ToggleLeft,
  Search, PanelLeft, PanelRight, ArrowRight, Shield, Layers,
  FileJson, Columns, List, Binary, Clock, MapPin, Image,
  CircleDot, Square, Braces, AlertCircle, Users, CreditCard,
  Bell, Lock, Settings, Activity, FileText, Globe, Workflow,
  BookOpen, Tag, MessageSquare, Star, Heart, Share2, Bookmark,
  Phone, MapPinned, Percent, Receipt, Truck, ShoppingCart,
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
  uuid: Key, serial: Hash, text: Type, varchar: Type,
  integer: Hash, bigint: Hash, float: Hash, decimal: Hash,
  boolean: ToggleLeft, date: Calendar, timestamp: Clock, timestamptz: Clock,
  json: Braces, jsonb: Braces, array: List, enum: CircleDot, bytea: Binary,
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

const defaultCol = (name: string, type: ColumnType, opts?: Partial<Omit<DbColumn, 'id' | 'name' | 'type'>>): Omit<DbColumn, 'id'> => ({
  name, type, isPrimary: false, isNullable: opts?.isNullable ?? true, isUnique: opts?.isUnique ?? false, defaultValue: opts?.defaultValue ?? '', ...opts,
});
const pkCol = (name = 'id', type: ColumnType = 'uuid'): Omit<DbColumn, 'id'> => ({
  name, type, isPrimary: true, isNullable: false, isUnique: true, defaultValue: type === 'uuid' ? 'gen_random_uuid()' : '',
});
const tsCol = (name = 'created_at'): Omit<DbColumn, 'id'> => defaultCol(name, 'timestamptz', { isNullable: false, defaultValue: 'now()' });
const fkCol = (name: string): Omit<DbColumn, 'id'> => defaultCol(name, 'uuid', { isNullable: false });

const dbElements: DbElement[] = [
  // ── Tables: Auth & Users ──
  { id: 'tbl-users', label: 'Users', icon: Users, category: 'Auth & Users', createTable: { name: 'users', columns: [
    pkCol(), defaultCol('email', 'varchar', { isNullable: false, isUnique: true }), defaultCol('name', 'varchar', { isNullable: false }),
    defaultCol('avatar_url', 'text'), defaultCol('password_hash', 'text', { isNullable: false }), tsCol(),
  ] } },
  { id: 'tbl-profiles', label: 'Profiles', icon: Users, category: 'Auth & Users', createTable: { name: 'profiles', columns: [
    pkCol(), fkCol('user_id'), defaultCol('bio', 'text'), defaultCol('website', 'varchar'),
    defaultCol('location', 'varchar'), defaultCol('phone', 'varchar'), tsCol(),
  ] } },
  { id: 'tbl-roles', label: 'Roles', icon: Shield, category: 'Auth & Users', createTable: { name: 'roles', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('description', 'text'), tsCol(),
  ] } },
  { id: 'tbl-permissions', label: 'Permissions', icon: Lock, category: 'Auth & Users', createTable: { name: 'permissions', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('resource', 'varchar', { isNullable: false }), defaultCol('action', 'varchar', { isNullable: false }),
  ] } },
  { id: 'tbl-role-perms', label: 'Role Permissions', icon: Shield, category: 'Auth & Users', createTable: { name: 'role_permissions', columns: [
    pkCol('id', 'serial'), defaultCol('role_id', 'integer', { isNullable: false }), defaultCol('permission_id', 'integer', { isNullable: false }),
  ] } },
  { id: 'tbl-sessions', label: 'Sessions', icon: Activity, category: 'Auth & Users', createTable: { name: 'sessions', columns: [
    pkCol(), fkCol('user_id'), defaultCol('token', 'text', { isNullable: false, isUnique: true }),
    defaultCol('ip_address', 'varchar'), defaultCol('user_agent', 'text'),
    defaultCol('expires_at', 'timestamptz', { isNullable: false }), tsCol(),
  ] } },

  // ── Tables: Content ──
  { id: 'tbl-posts', label: 'Posts', icon: FileText, category: 'Content', createTable: { name: 'posts', columns: [
    pkCol(), defaultCol('title', 'varchar', { isNullable: false }), defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('content', 'text'), fkCol('author_id'), defaultCol('published', 'boolean', { isNullable: false, defaultValue: 'false' }),
    defaultCol('published_at', 'timestamptz'), tsCol(),
  ] } },
  { id: 'tbl-categories', label: 'Categories', icon: Layers, category: 'Content', createTable: { name: 'categories', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }), defaultCol('parent_id', 'integer'),
  ] } },
  { id: 'tbl-tags', label: 'Tags', icon: Tag, category: 'Content', createTable: { name: 'tags', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }), defaultCol('color', 'varchar'),
  ] } },
  { id: 'tbl-comments', label: 'Comments', icon: MessageSquare, category: 'Content', createTable: { name: 'comments', columns: [
    pkCol(), fkCol('post_id'), fkCol('user_id'), defaultCol('body', 'text', { isNullable: false }),
    defaultCol('parent_id', 'uuid'), tsCol(),
  ] } },
  { id: 'tbl-media', label: 'Media / Files', icon: Image, category: 'Content', createTable: { name: 'media', columns: [
    pkCol(), defaultCol('url', 'text', { isNullable: false }), defaultCol('filename', 'varchar', { isNullable: false }),
    defaultCol('mime_type', 'varchar'), defaultCol('size', 'bigint'), fkCol('uploaded_by'), tsCol(),
  ] } },
  { id: 'tbl-pages', label: 'Pages', icon: BookOpen, category: 'Content', createTable: { name: 'pages', columns: [
    pkCol(), defaultCol('title', 'varchar', { isNullable: false }), defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('content', 'text'), defaultCol('meta', 'jsonb'), defaultCol('is_published', 'boolean', { defaultValue: 'false' }), tsCol(),
  ] } },

  // ── Tables: E-Commerce ──
  { id: 'tbl-products', label: 'Products', icon: ShoppingCart, category: 'E-Commerce', createTable: { name: 'products', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false }), defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('price', 'decimal', { isNullable: false, defaultValue: '0' }), defaultCol('compare_price', 'decimal'),
    defaultCol('description', 'text'), defaultCol('category_id', 'integer'), defaultCol('stock', 'integer', { isNullable: false, defaultValue: '0' }),
    defaultCol('sku', 'varchar', { isUnique: true }), defaultCol('images', 'jsonb'), tsCol(),
  ] } },
  { id: 'tbl-orders', label: 'Orders', icon: Receipt, category: 'E-Commerce', createTable: { name: 'orders', columns: [
    pkCol(), fkCol('user_id'), defaultCol('total', 'decimal', { isNullable: false, defaultValue: '0' }),
    defaultCol('subtotal', 'decimal', { isNullable: false, defaultValue: '0' }),
    defaultCol('tax', 'decimal', { defaultValue: '0' }), defaultCol('discount', 'decimal', { defaultValue: '0' }),
    defaultCol('status', 'varchar', { isNullable: false, defaultValue: "'pending'" }),
    defaultCol('shipping_address', 'jsonb'), tsCol(),
  ] } },
  { id: 'tbl-order-items', label: 'Order Items', icon: Receipt, category: 'E-Commerce', createTable: { name: 'order_items', columns: [
    pkCol('id', 'serial'), fkCol('order_id'), defaultCol('product_id', 'integer', { isNullable: false }),
    defaultCol('quantity', 'integer', { isNullable: false, defaultValue: '1' }),
    defaultCol('unit_price', 'decimal', { isNullable: false }), defaultCol('total', 'decimal', { isNullable: false }),
  ] } },
  { id: 'tbl-coupons', label: 'Coupons', icon: Percent, category: 'E-Commerce', createTable: { name: 'coupons', columns: [
    pkCol('id', 'serial'), defaultCol('code', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('discount_type', 'varchar', { isNullable: false }), defaultCol('discount_value', 'decimal', { isNullable: false }),
    defaultCol('min_order', 'decimal'), defaultCol('expires_at', 'timestamptz'), defaultCol('usage_limit', 'integer'),
  ] } },
  { id: 'tbl-reviews', label: 'Reviews', icon: Star, category: 'E-Commerce', createTable: { name: 'reviews', columns: [
    pkCol(), defaultCol('product_id', 'integer', { isNullable: false }), fkCol('user_id'),
    defaultCol('rating', 'integer', { isNullable: false }), defaultCol('title', 'varchar'),
    defaultCol('body', 'text'), tsCol(),
  ] } },
  { id: 'tbl-cart', label: 'Shopping Cart', icon: ShoppingCart, category: 'E-Commerce', createTable: { name: 'cart_items', columns: [
    pkCol('id', 'serial'), fkCol('user_id'), defaultCol('product_id', 'integer', { isNullable: false }),
    defaultCol('quantity', 'integer', { isNullable: false, defaultValue: '1' }), tsCol(),
  ] } },

  // ── Tables: Social & Engagement ──
  { id: 'tbl-likes', label: 'Likes / Reactions', icon: Heart, category: 'Social', createTable: { name: 'likes', columns: [
    pkCol(), fkCol('user_id'), defaultCol('likeable_id', 'uuid', { isNullable: false }),
    defaultCol('likeable_type', 'varchar', { isNullable: false }), defaultCol('reaction', 'varchar', { defaultValue: "'like'" }), tsCol(),
  ] } },
  { id: 'tbl-follows', label: 'Follows', icon: Users, category: 'Social', createTable: { name: 'follows', columns: [
    pkCol(), fkCol('follower_id'), fkCol('following_id'), tsCol(),
  ] } },
  { id: 'tbl-bookmarks', label: 'Bookmarks', icon: Bookmark, category: 'Social', createTable: { name: 'bookmarks', columns: [
    pkCol(), fkCol('user_id'), defaultCol('bookmarkable_id', 'uuid', { isNullable: false }),
    defaultCol('bookmarkable_type', 'varchar', { isNullable: false }), tsCol(),
  ] } },
  { id: 'tbl-shares', label: 'Shares', icon: Share2, category: 'Social', createTable: { name: 'shares', columns: [
    pkCol(), fkCol('user_id'), defaultCol('shareable_id', 'uuid', { isNullable: false }),
    defaultCol('shareable_type', 'varchar', { isNullable: false }), defaultCol('platform', 'varchar'), tsCol(),
  ] } },

  // ── Tables: System ──
  { id: 'tbl-notifications', label: 'Notifications', icon: Bell, category: 'System', createTable: { name: 'notifications', columns: [
    pkCol(), fkCol('user_id'), defaultCol('type', 'varchar', { isNullable: false }),
    defaultCol('title', 'varchar', { isNullable: false }), defaultCol('body', 'text'),
    defaultCol('data', 'jsonb'), defaultCol('read_at', 'timestamptz'), tsCol(),
  ] } },
  { id: 'tbl-audit', label: 'Audit Log', icon: Activity, category: 'System', createTable: { name: 'audit_logs', columns: [
    pkCol(), fkCol('user_id'), defaultCol('action', 'varchar', { isNullable: false }),
    defaultCol('resource_type', 'varchar', { isNullable: false }), defaultCol('resource_id', 'varchar'),
    defaultCol('old_data', 'jsonb'), defaultCol('new_data', 'jsonb'), defaultCol('ip_address', 'varchar'), tsCol(),
  ] } },
  { id: 'tbl-settings', label: 'Settings', icon: Settings, category: 'System', createTable: { name: 'settings', columns: [
    pkCol('id', 'serial'), defaultCol('key', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('value', 'jsonb', { isNullable: false }), defaultCol('group', 'varchar'), tsCol(),
  ] } },
  { id: 'tbl-payments', label: 'Payments', icon: CreditCard, category: 'System', createTable: { name: 'payments', columns: [
    pkCol(), fkCol('user_id'), defaultCol('order_id', 'uuid'),
    defaultCol('amount', 'decimal', { isNullable: false }), defaultCol('currency', 'varchar', { isNullable: false, defaultValue: "'USD'" }),
    defaultCol('method', 'varchar', { isNullable: false }), defaultCol('status', 'varchar', { isNullable: false, defaultValue: "'pending'" }),
    defaultCol('provider_id', 'varchar'), defaultCol('metadata', 'jsonb'), tsCol(),
  ] } },
  { id: 'tbl-webhooks', label: 'Webhooks', icon: Globe, category: 'System', createTable: { name: 'webhooks', columns: [
    pkCol(), defaultCol('url', 'text', { isNullable: false }), defaultCol('events', 'array'),
    defaultCol('secret', 'varchar'), defaultCol('is_active', 'boolean', { defaultValue: 'true' }),
    defaultCol('last_triggered_at', 'timestamptz'), tsCol(),
  ] } },
  { id: 'tbl-jobs', label: 'Job Queue', icon: Workflow, category: 'System', createTable: { name: 'jobs', columns: [
    pkCol(), defaultCol('queue', 'varchar', { isNullable: false, defaultValue: "'default'" }),
    defaultCol('payload', 'jsonb', { isNullable: false }), defaultCol('status', 'varchar', { isNullable: false, defaultValue: "'pending'" }),
    defaultCol('attempts', 'integer', { defaultValue: '0' }), defaultCol('max_attempts', 'integer', { defaultValue: '3' }),
    defaultCol('scheduled_at', 'timestamptz'), defaultCol('started_at', 'timestamptz'),
    defaultCol('completed_at', 'timestamptz'), defaultCol('error', 'text'), tsCol(),
  ] } },
  { id: 'tbl-addresses', label: 'Addresses', icon: MapPinned, category: 'System', createTable: { name: 'addresses', columns: [
    pkCol(), fkCol('user_id'), defaultCol('label', 'varchar'),
    defaultCol('line1', 'varchar', { isNullable: false }), defaultCol('line2', 'varchar'),
    defaultCol('city', 'varchar', { isNullable: false }), defaultCol('state', 'varchar'),
    defaultCol('postal_code', 'varchar'), defaultCol('country', 'varchar', { isNullable: false }),
    defaultCol('is_default', 'boolean', { defaultValue: 'false' }),
  ] } },

  // ── Tables: Misc ──
  { id: 'tbl-empty', label: 'Empty Table', icon: Square, category: 'Basic', createTable: { name: 'new_table', columns: [pkCol()] } },
  { id: 'tbl-pivot', label: 'Pivot / Junction', icon: Link2, category: 'Basic', createTable: { name: 'pivot_table', columns: [
    pkCol('id', 'serial'), fkCol('left_id'), fkCol('right_id'), tsCol(),
  ] } },

  // ── Column Types ──
  { id: 'col-uuid', label: 'UUID', icon: Key, category: 'Columns', createColumn: defaultCol('id', 'uuid') },
  { id: 'col-serial', label: 'Serial', icon: Hash, category: 'Columns', createColumn: defaultCol('id', 'serial') },
  { id: 'col-varchar', label: 'Varchar', icon: Type, category: 'Columns', createColumn: defaultCol('name', 'varchar', { isNullable: false }) },
  { id: 'col-text', label: 'Text', icon: Type, category: 'Columns', createColumn: defaultCol('content', 'text') },
  { id: 'col-integer', label: 'Integer', icon: Hash, category: 'Columns', createColumn: defaultCol('count', 'integer', { isNullable: false, defaultValue: '0' }) },
  { id: 'col-decimal', label: 'Decimal', icon: Hash, category: 'Columns', createColumn: defaultCol('amount', 'decimal', { isNullable: false, defaultValue: '0' }) },
  { id: 'col-boolean', label: 'Boolean', icon: ToggleLeft, category: 'Columns', createColumn: defaultCol('is_active', 'boolean', { isNullable: false, defaultValue: 'false' }) },
  { id: 'col-timestamp', label: 'Timestamp', icon: Clock, category: 'Columns', createColumn: tsCol() },
  { id: 'col-json', label: 'JSONB', icon: Braces, category: 'Columns', createColumn: defaultCol('metadata', 'jsonb', { defaultValue: "'{}'" }) },
  { id: 'col-enum', label: 'Enum', icon: CircleDot, category: 'Columns', createColumn: defaultCol('status', 'enum') },
  { id: 'col-array', label: 'Array', icon: List, category: 'Columns', createColumn: defaultCol('tags', 'array', { defaultValue: "'{}'" }) },
  { id: 'col-fk', label: 'Foreign Key (UUID)', icon: Link2, category: 'Columns', createColumn: fkCol('ref_id') },
  { id: 'col-fk-int', label: 'Foreign Key (Int)', icon: Link2, category: 'Columns', createColumn: defaultCol('ref_id', 'integer', { isNullable: false }) },

  // ── Constraints ──
  { id: 'con-pk', label: 'Primary Key', icon: Key, category: 'Constraints' },
  { id: 'con-fk', label: 'Foreign Key', icon: Link2, category: 'Constraints' },
  { id: 'con-unique', label: 'Unique', icon: Shield, category: 'Constraints' },
  { id: 'con-notnull', label: 'Not Null', icon: AlertCircle, category: 'Constraints' },
  { id: 'con-check', label: 'Check Constraint', icon: Shield, category: 'Constraints' },
  { id: 'con-default', label: 'Default Value', icon: Settings, category: 'Constraints' },

  // ── Indexes ──
  { id: 'idx-btree', label: 'B-Tree Index', icon: Columns, category: 'Indexes' },
  { id: 'idx-hash', label: 'Hash Index', icon: Hash, category: 'Indexes' },
  { id: 'idx-gin', label: 'GIN Index', icon: Columns, category: 'Indexes' },
  { id: 'idx-gist', label: 'GiST Index', icon: MapPin, category: 'Indexes' },
  { id: 'idx-composite', label: 'Composite Index', icon: Columns, category: 'Indexes' },
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
      `<tr><td style="padding:6px 12px;font-size:11px;color:${c.isPrimary ? '#f59e0b' : '#e2e8f0'};font-weight:${c.isPrimary ? '700' : '400'};">${c.isPrimary ? '🔑 ' : c.reference ? '🔗 ' : ''}${c.name}</td><td style="padding:6px 12px;font-size:10px;color:#a78bfa;">${c.type}</td><td style="padding:6px 12px;font-size:9px;color:#64748b;">${c.isPrimary ? 'PK ' : ''}${c.isUnique ? 'UQ ' : ''}${!c.isNullable ? 'NN' : ''}</td></tr>`
    ).join('');
    return `<div style="background:#111827;border:1px solid ${t.color}40;border-radius:12px;overflow:hidden;min-width:220px;"><div style="padding:10px 16px;background:${t.color}20;border-bottom:1px solid ${t.color}30;display:flex;align-items:center;gap:8px;"><span style="font-size:12px;">🗄️</span><span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:${t.color};">${t.name}</span><span style="font-size:9px;color:#64748b;margin-left:auto;">${t.columns.length} cols</span></div><table style="width:100%;border-collapse:collapse;">${colsHtml}</table></div>`;
  }).join('');
  const relHtml = relations.map(r => {
    const from = tables.find(t => t.id === r.fromTableId);
    const to = tables.find(t => t.id === r.toTableId);
    if (!from || !to) return '';
    const fromCol = from.columns.find(c => c.id === r.fromColumnId);
    const toCol = to.columns.find(c => c.id === r.toColumnId);
    return `<div style="padding:8px 16px;background:#1e293b;border-radius:8px;font-size:10px;display:flex;align-items:center;gap:8px;"><span style="color:${from.color};">${from.name}.${fromCol?.name || '?'}</span><span style="color:#64748b;">→ ${r.type} →</span><span style="color:${to.color};">${to.name}.${toCol?.name || '?'}</span></div>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'SF Mono','Fira Code',monospace;background:#0a0a0f;color:#e2e8f0;padding:24px;}</style></head><body><h1 style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#f1f5f9;margin-bottom:4px;">🗄️ ${title}</h1><div style="font-size:10px;color:#64748b;margin-bottom:24px;">${tables.length} tables, ${relations.length} relations</div><div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px;">${tablesHtml}</div>${relHtml ? `<div style="margin-top:16px;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px;">Relations</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${relHtml}</div></div>` : ''}</body></html>`;
}

/* ─── Main Component ─── */
interface Props { node: CanvasNode; onClose: () => void; }

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
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(elementCategories.map(c => [c, c === 'Auth & Users' || c === 'Content' || c === 'Columns']))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<typeof schema[]>([schema]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Canvas pan/zoom
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Drag-to-connect between tables
  const [connectingFrom, setConnectingFrom] = useState<{ tableId: string; columnId: string } | null>(null);
  const [connectMousePos, setConnectMousePos] = useState({ x: 0, y: 0 });

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

  const saveToNode = useCallback(() => {
    const code = JSON.stringify(schema, null, 2);
    const preview = generatePreviewHtml(schema.tables, schema.relations, node.title);
    updateNode(node.id, { generatedCode: code, content: preview });
    setIsDirty(false);
  }, [schema, node.id, node.title, updateNode]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(saveToNode, 1500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [isDirty, saveToNode]);

  const handleClose = useCallback(() => { if (isDirty) saveToNode(); onClose(); }, [isDirty, saveToNode, onClose]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) { const i = historyIndex - 1; setHistoryIndex(i); setSchema(history[i]); setIsDirty(true); }
  }, [historyIndex, history]);
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) { const i = historyIndex + 1; setHistoryIndex(i); setSchema(history[i]); setIsDirty(true); }
  }, [historyIndex, history]);

  const addTable = useCallback((template?: DbElement['createTable']) => {
    const newTable: DbTable = {
      id: uid(), name: template?.name || 'new_table',
      color: tableColors[schema.tables.length % tableColors.length],
      x: 50 + schema.tables.length * 60, y: 50 + schema.tables.length * 40,
      columns: (template?.columns || [{ name: 'id', type: 'uuid' as ColumnType, isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' }]).map(c => ({
        id: uid(), name: c.name, type: c.type, isPrimary: c.isPrimary || false,
        isNullable: c.isNullable ?? true, isUnique: c.isUnique || false, defaultValue: c.defaultValue || '',
      })),
    };
    updateSchema({ ...schema, tables: [...schema.tables, newTable] });
    setSelectedTableId(newTable.id);
  }, [schema, updateSchema]);

  const addColumn = useCallback((template?: DbElement['createColumn']) => {
    if (!selectedTableId) return;
    const newCol: DbColumn = {
      id: uid(), name: template?.name || 'new_column', type: (template?.type as ColumnType) || 'text',
      isPrimary: template?.isPrimary || false, isNullable: template?.isNullable ?? true,
      isUnique: template?.isUnique || false, defaultValue: template?.defaultValue || '',
    };
    updateSchema({ ...schema, tables: schema.tables.map(t => t.id === selectedTableId ? { ...t, columns: [...t.columns, newCol] } : t) });
  }, [selectedTableId, schema, updateSchema]);

  const deleteTable = useCallback((tableId: string) => {
    updateSchema({ tables: schema.tables.filter(t => t.id !== tableId), relations: schema.relations.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId) });
    if (selectedTableId === tableId) setSelectedTableId(null);
  }, [schema, selectedTableId, updateSchema]);

  const deleteColumn = useCallback((tableId: string, colId: string) => {
    updateSchema({
      tables: schema.tables.map(t => t.id === tableId ? { ...t, columns: t.columns.filter(c => c.id !== colId) } : t),
      relations: schema.relations.filter(r => !((r.fromTableId === tableId && r.fromColumnId === colId) || (r.toTableId === tableId && r.toColumnId === colId))),
    });
  }, [schema, updateSchema]);

  const updateColumn = useCallback((tableId: string, colId: string, updates: Partial<DbColumn>) => {
    updateSchema({ ...schema, tables: schema.tables.map(t => t.id === tableId ? { ...t, columns: t.columns.map(c => c.id === colId ? { ...c, ...updates } : c) } : t) });
  }, [schema, updateSchema]);

  const updateTable = useCallback((tableId: string, updates: Partial<DbTable>) => {
    updateSchema({ ...schema, tables: schema.tables.map(t => t.id === tableId ? { ...t, ...updates } : t) });
  }, [schema, updateSchema]);

  const addRelation = useCallback((fromTableId: string, fromColumnId: string, toTableId: string, toColumnId: string, type: RelationType = 'one-to-many') => {
    // Avoid duplicates
    const exists = schema.relations.some(r => r.fromTableId === fromTableId && r.fromColumnId === fromColumnId && r.toTableId === toTableId && r.toColumnId === toColumnId);
    if (exists) return;
    updateSchema({ ...schema, relations: [...schema.relations, { id: uid(), fromTableId, fromColumnId, toTableId, toColumnId, type }] });
  }, [schema, updateSchema]);

  const handleElementDrop = useCallback((element: DbElement) => {
    if (element.createTable) addTable(element.createTable);
    else if (element.createColumn) addColumn(element.createColumn);
  }, [addTable, addColumn]);

  // ─── Canvas mouse handlers ───
  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCanvasZoom(prev => Math.max(0.2, Math.min(3, prev * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  const handleCanvasMouseDown = useCallback((e: ReactMouseEvent) => {
    if (connectingFrom) { setConnectingFrom(null); return; }
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasPan.x, y: e.clientY - canvasPan.y });
      setSelectedTableId(null);
    }
  }, [canvasPan, connectingFrom]);

  const handleCanvasMouseMove = useCallback((e: ReactMouseEvent) => {
    if (isPanning) setCanvasPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    if (draggingTableId) {
      setSchema(prev => ({
        ...prev,
        tables: prev.tables.map(t => t.id === draggingTableId
          ? { ...t, x: (e.clientX - dragOffset.x) / canvasZoom - canvasPan.x / canvasZoom, y: (e.clientY - dragOffset.y) / canvasZoom - canvasPan.y / canvasZoom }
          : t),
      }));
      setIsDirty(true);
    }
    if (connectingFrom) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) setConnectMousePos({ x: (e.clientX - rect.left - canvasPan.x) / canvasZoom, y: (e.clientY - rect.top - canvasPan.y) / canvasZoom });
    }
  }, [isPanning, panStart, draggingTableId, dragOffset, canvasZoom, canvasPan, connectingFrom]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggingTableId) { pushHistory(schema); setDraggingTableId(null); }
  }, [draggingTableId, schema, pushHistory]);

  const handleTableMouseDown = useCallback((e: ReactMouseEvent, tableId: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      // Complete connection: from table → to table
      if (connectingFrom.tableId !== tableId) {
        const toTable = schema.tables.find(t => t.id === tableId);
        const pkCol = toTable?.columns.find(c => c.isPrimary);
        if (pkCol) {
          // Add FK column to source table + relation
          const fromTable = schema.tables.find(t => t.id === connectingFrom.tableId);
          const fkName = `${toTable!.name}_id`;
          const newColId = uid();
          const newCol: DbColumn = {
            id: newColId, name: fkName, type: pkCol.type as ColumnType,
            isPrimary: false, isNullable: false, isUnique: false, defaultValue: '',
            reference: { tableId, columnId: pkCol.id },
          };
          const newTables = schema.tables.map(t =>
            t.id === connectingFrom.tableId ? { ...t, columns: [...t.columns, newCol] } : t
          );
          const newRel: DbRelation = { id: uid(), fromTableId: connectingFrom.tableId, fromColumnId: newColId, toTableId: tableId, toColumnId: pkCol.id, type: 'one-to-many' };
          updateSchema({ tables: newTables, relations: [...schema.relations, newRel] });
        }
      }
      setConnectingFrom(null);
      return;
    }
    setSelectedTableId(tableId);
    const table = schema.tables.find(t => t.id === tableId);
    if (!table) return;
    setDraggingTableId(tableId);
    setDragOffset({ x: e.clientX - (table.x * canvasZoom + canvasPan.x), y: e.clientY - (table.y * canvasZoom + canvasPan.y) });
  }, [schema, canvasZoom, canvasPan, connectingFrom, updateSchema]);

  // Start connecting from a table's connect handle
  const handleStartConnect = useCallback((e: ReactMouseEvent, tableId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom({ tableId, columnId: '' });
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setConnectMousePos({ x: (e.clientX - rect.left - canvasPan.x) / canvasZoom, y: (e.clientY - rect.top - canvasPan.y) / canvasZoom });
  }, [canvasPan, canvasZoom]);

  const filteredElements = searchQuery
    ? dbElements.filter(e => e.label.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : dbElements;

  const getRelationPath = useCallback((rel: DbRelation) => {
    const fromTable = schema.tables.find(t => t.id === rel.fromTableId);
    const toTable = schema.tables.find(t => t.id === rel.toTableId);
    if (!fromTable || !toTable) return null;
    const fromX = fromTable.x + 240;
    const fromColIdx = fromTable.columns.findIndex(c => c.id === rel.fromColumnId);
    const fromY = fromTable.y + 44 + Math.max(0, fromColIdx) * 30 + 15;
    const toX = toTable.x;
    const toColIdx = toTable.columns.findIndex(c => c.id === rel.toColumnId);
    const toY = toTable.y + 44 + Math.max(0, toColIdx) * 30 + 15;
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  }, [schema.tables]);

  // Connection preview line
  const getConnectPreviewPath = useCallback(() => {
    if (!connectingFrom) return null;
    const fromTable = schema.tables.find(t => t.id === connectingFrom.tableId);
    if (!fromTable) return null;
    const fromX = fromTable.x + 240;
    const fromY = fromTable.y + 20;
    const toX = connectMousePos.x;
    const toY = connectMousePos.y;
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  }, [connectingFrom, connectMousePos, schema.tables]);

  const columnTypes: ColumnType[] = ['uuid', 'serial', 'text', 'varchar', 'integer', 'bigint', 'float', 'decimal', 'boolean', 'date', 'timestamp', 'timestamptz', 'json', 'jsonb', 'array', 'enum', 'bytea'];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10" style={{ background: '#0f0f15' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLeftPanel(!showLeftPanel)} className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${showLeftPanel ? 'text-cyan-400' : 'text-white/30'}`} title="Toggle Elements">
            <PanelLeft className="w-4 h-4" />
          </button>
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-widest text-white/80">Database Designer</span>
          <span className="text-[9px] text-white/30 ml-2">{node.title}</span>
          {connectingFrom && (
            <span className="text-[9px] font-bold text-cyan-400 animate-pulse ml-4 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Click target table to connect...
              <button onClick={() => setConnectingFrom(null)} className="ml-1 p-0.5 rounded bg-white/10 hover:bg-white/20"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
          {isDirty && <span className="text-[9px] font-bold text-amber-400 animate-pulse">UNSAVED</span>}
          <button onClick={saveToNode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-xs font-bold"><Save className="w-3.5 h-3.5" /> Save</button>
          <button onClick={() => setShowRightPanel(!showRightPanel)} className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${showRightPanel ? 'text-cyan-400' : 'text-white/30'}`} title="Toggle Properties">
            <PanelRight className="w-4 h-4" />
          </button>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Panel: Elements ─── */}
        <AnimatePresence>
          {showLeftPanel && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-r border-white/10 flex flex-col overflow-hidden" style={{ background: '#0c0c12' }}>
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search elements..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {elementCategories.map(cat => {
                    const items = filteredElements.filter(e => e.category === cat);
                    if (items.length === 0) return null;
                    const isExpanded = expandedCategories[cat] ?? false;
                    return (
                      <div key={cat} className="mb-1">
                        <button onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
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
                                  <button key={el.id} onClick={() => handleElementDrop(el)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors cursor-pointer">
                                    <ElIcon className="w-3.5 h-3.5 text-cyan-400/60 shrink-0" />
                                    <span className="text-[11px] font-semibold truncate">{el.label}</span>
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
          className={`flex-1 relative overflow-hidden ${connectingFrom ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
          style={{ background: '#08080d' }}
          onWheel={handleCanvasWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={() => { handleCanvasMouseUp(); }}
        >
          {/* Grid */}
          <div className="canvas-bg absolute inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: `${20 * canvasZoom}px ${20 * canvasZoom}px`,
            backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px`,
          }} />

          {/* Relations SVG + connection preview */}
          <svg className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`, transformOrigin: '0 0' }}>
            {schema.relations.map(rel => {
              const path = getRelationPath(rel);
              if (!path) return null;
              const fromTable = schema.tables.find(t => t.id === rel.fromTableId);
              return (
                <g key={rel.id}>
                  <path d={path} fill="none" stroke={fromTable?.color || '#6366f1'} strokeWidth={1.5} strokeDasharray={rel.type === 'many-to-many' ? '6 3' : 'none'} opacity={0.5} />
                  <path d={path} fill="none" stroke={fromTable?.color || '#6366f1'} strokeWidth={4} opacity={0.08} />
                </g>
              );
            })}
            {/* Connection preview line */}
            {connectingFrom && (() => {
              const p = getConnectPreviewPath();
              return p ? <path d={p} fill="none" stroke="#06b6d4" strokeWidth={2} strokeDasharray="6 4" opacity={0.7} /> : null;
            })()}
          </svg>

          {/* Tables */}
          <div style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`, transformOrigin: '0 0', position: 'absolute', inset: 0 }}>
            {schema.tables.map(table => (
              <div
                key={table.id}
                className={`absolute select-none transition-shadow ${connectingFrom ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedTableId === table.id ? 'ring-2 ring-cyan-500/50' : ''} ${connectingFrom && connectingFrom.tableId !== table.id ? 'ring-2 ring-cyan-400/30 ring-offset-1' : ''}`}
                style={{ left: table.x, top: table.y, width: 240, borderRadius: 12, overflow: 'visible', background: '#111827', border: `1px solid ${table.color}30`, boxShadow: selectedTableId === table.id ? `0 0 20px ${table.color}20` : 'none' }}
                onMouseDown={e => handleTableMouseDown(e, table.id)}
              >
                {/* Connect handle (right side) */}
                <div
                  className="absolute -right-3 top-3 w-6 h-6 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center cursor-crosshair hover:bg-cyan-500/40 hover:border-cyan-400 hover:scale-110 transition-all z-10"
                  onMouseDown={e => handleStartConnect(e, table.id)}
                  title="Drag to connect"
                >
                  <Link2 className="w-3 h-3 text-cyan-400" />
                </div>

                {/* Table header */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl" style={{ background: `${table.color}15`, borderBottom: `1px solid ${table.color}20` }}>
                  <Table2 className="w-3.5 h-3.5" style={{ color: table.color }} />
                  <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: table.color }}>{table.name}</span>
                  <span className="text-[9px] text-white/30 ml-auto">{table.columns.length}</span>
                  <button onClick={e => { e.stopPropagation(); deleteTable(table.id); }} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {/* Columns */}
                {table.columns.map(col => {
                  const ColIcon = columnTypeIcons[col.type] || Type;
                  return (
                    <div key={col.id} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors cursor-pointer ${selectedColumnId === col.id ? 'bg-white/5' : ''}`}
                      onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); setSelectedColumnId(col.id); setShowRightPanel(true); }}>
                      {col.isPrimary ? <Key className="w-3 h-3 text-amber-400 shrink-0" /> : col.reference ? <Link2 className="w-3 h-3 text-purple-400 shrink-0" /> : <ColIcon className="w-3 h-3 text-white/30 shrink-0" />}
                      <span className={`text-[11px] flex-1 truncate ${col.isPrimary ? 'font-bold text-amber-300' : 'text-white/70'}`}>{col.name}</span>
                      <span className="text-[9px] text-purple-400/60">{col.type}</span>
                      {!col.isNullable && <span className="text-[8px] text-red-400/60 shrink-0">NN</span>}
                    </div>
                  );
                })}
                <button onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); addColumn(); }} className="w-full flex items-center gap-2 px-3 py-2 text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors rounded-b-xl">
                  <Plus className="w-3 h-3" /><span className="text-[10px]">Add column</span>
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
                <p className="text-xs text-white/10 mt-1">Click elements in the left panel to add tables</p>
              </div>
            </div>
          )}

          {/* Zoom + info */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold text-white/40">{Math.round(canvasZoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Database className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-bold text-white/40">{schema.tables.length} tables</span>
              <Link2 className="w-3 h-3 text-white/30 ml-1" />
              <span className="text-[10px] font-bold text-white/40">{schema.relations.length} relations</span>
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Properties ─── */}
        <AnimatePresence>
          {showRightPanel && selectedTable && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-l border-white/10 flex flex-col overflow-hidden" style={{ background: '#0c0c12' }}>
              <div className="p-3 border-b border-white/10 flex items-center gap-2">
                <Table2 className="w-4 h-4" style={{ color: selectedTable.color }} />
                <span className="text-xs font-black uppercase tracking-widest text-white/80 flex-1">Properties</span>
                <button onClick={() => setShowRightPanel(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {/* Table name */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Table Name</label>
                    <input value={selectedTable.name} onChange={e => updateTable(selectedTable.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-500/50" />
                  </div>
                  {/* Color */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {tableColors.map(c => (
                        <button key={c} onClick={() => updateTable(selectedTable.id, { color: c })} className={`w-6 h-6 rounded-full transition-all ${selectedTable.color === c ? 'ring-2 ring-white/50 scale-110' : ''}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  {/* Columns */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Columns ({selectedTable.columns.length})</label>
                      <button onClick={() => addColumn()} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[9px] font-bold hover:bg-cyan-500/20 transition-colors"><Plus className="w-3 h-3" /> Add</button>
                    </div>
                    <div className="space-y-1">
                      {selectedTable.columns.map(col => (
                        <div key={col.id} className={`rounded-lg border transition-colors ${selectedColumnId === col.id ? 'bg-white/5 border-cyan-500/30' : 'border-white/5 hover:border-white/10'}`}>
                          <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer" onClick={() => setSelectedColumnId(selectedColumnId === col.id ? null : col.id)}>
                            {col.isPrimary ? <Key className="w-3 h-3 text-amber-400 shrink-0" /> : <Type className="w-3 h-3 text-white/30 shrink-0" />}
                            <span className="text-[11px] text-white/70 flex-1 truncate">{col.name}</span>
                            <span className="text-[9px] text-purple-400/60">{col.type}</span>
                            <button onClick={e => { e.stopPropagation(); deleteColumn(selectedTable.id, col.id); }} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                          <AnimatePresence>
                            {selectedColumnId === col.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-2 pb-2 space-y-2">
                                  <input value={col.name} onChange={e => updateColumn(selectedTable.id, col.id, { name: e.target.value })} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50" placeholder="Column name" />
                                  <select value={col.type} onChange={e => updateColumn(selectedTable.id, col.id, { type: e.target.value as ColumnType })} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50">
                                    {columnTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <input value={col.defaultValue} onChange={e => updateColumn(selectedTable.id, col.id, { defaultValue: e.target.value })} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50" placeholder="Default value" />
                                  <div className="flex gap-2 flex-wrap">
                                    <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer"><input type="checkbox" checked={col.isPrimary} onChange={e => updateColumn(selectedTable.id, col.id, { isPrimary: e.target.checked })} className="rounded" /> PK</label>
                                    <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer"><input type="checkbox" checked={col.isNullable} onChange={e => updateColumn(selectedTable.id, col.id, { isNullable: e.target.checked })} className="rounded" /> Nullable</label>
                                    <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer"><input type="checkbox" checked={col.isUnique} onChange={e => updateColumn(selectedTable.id, col.id, { isUnique: e.target.checked })} className="rounded" /> Unique</label>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-white/30 mb-1 block">Foreign Key →</label>
                                    <select
                                      value={col.reference ? `${col.reference.tableId}:${col.reference.columnId}` : ''}
                                      onChange={e => {
                                        if (!e.target.value) { updateColumn(selectedTable.id, col.id, { reference: undefined }); return; }
                                        const [tId, cId] = e.target.value.split(':');
                                        updateColumn(selectedTable.id, col.id, { reference: { tableId: tId, columnId: cId } });
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
                  {/* Relations */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2 block">Relations</label>
                    {schema.relations.filter(r => r.fromTableId === selectedTable.id || r.toTableId === selectedTable.id).map(rel => {
                      const other = rel.fromTableId === selectedTable.id ? schema.tables.find(t => t.id === rel.toTableId) : schema.tables.find(t => t.id === rel.fromTableId);
                      const fromCol = schema.tables.find(t => t.id === rel.fromTableId)?.columns.find(c => c.id === rel.fromColumnId);
                      const toCol = schema.tables.find(t => t.id === rel.toTableId)?.columns.find(c => c.id === rel.toColumnId);
                      return (
                        <div key={rel.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 mb-1">
                          <Link2 className="w-3 h-3 text-purple-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-white/60 block truncate">{fromCol?.name} → {other?.name}.{toCol?.name}</span>
                            <select value={rel.type} onChange={e => updateSchema({ ...schema, relations: schema.relations.map(r => r.id === rel.id ? { ...r, type: e.target.value as RelationType } : r) })} className="mt-1 w-full px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/50 outline-none">
                              <option value="one-to-one">1:1</option>
                              <option value="one-to-many">1:N</option>
                              <option value="many-to-many">M:N</option>
                            </select>
                          </div>
                          <button onClick={() => updateSchema({ ...schema, relations: schema.relations.filter(r => r.id !== rel.id) })} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 shrink-0"><Trash2 className="w-2.5 h-2.5" /></button>
                        </div>
                      );
                    })}
                    {schema.relations.filter(r => r.fromTableId === selectedTable.id || r.toTableId === selectedTable.id).length === 0 && (
                      <p className="text-[10px] text-white/20">No relations. Use the <Link2 className="w-3 h-3 inline" /> handle on tables to connect them.</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
