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
  Network, Boxes, BarChart3, GitBranch, Hexagon,
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Database Engine Types ─── */
type DbEngine = 'sql' | 'nosql' | 'vector' | 'graph' | 'timeseries' | 'keyvalue';

const dbEngines: { id: DbEngine; label: string; icon: typeof Database; description: string }[] = [
  { id: 'sql', label: 'SQL', icon: Database, description: 'PostgreSQL, MySQL, SQLite' },
  { id: 'nosql', label: 'NoSQL', icon: Braces, description: 'MongoDB, CouchDB, Firestore' },
  { id: 'vector', label: 'Vector', icon: Hexagon, description: 'Pinecone, Weaviate, pgvector' },
  { id: 'graph', label: 'Graph', icon: GitBranch, description: 'Neo4j, ArangoDB, Neptune' },
  { id: 'timeseries', label: 'Time Series', icon: BarChart3, description: 'InfluxDB, TimescaleDB' },
  { id: 'keyvalue', label: 'Key-Value', icon: Boxes, description: 'Redis, DynamoDB, Valkey' },
];

/* ─── Types ─── */
type ColumnType = 'uuid' | 'serial' | 'text' | 'varchar' | 'integer' | 'bigint' | 'float' | 'decimal' | 'boolean' | 'date' | 'timestamp' | 'timestamptz' | 'json' | 'jsonb' | 'array' | 'enum' | 'bytea'
  // NoSQL
  | 'object' | 'objectId' | 'string' | 'number' | 'map' | 'reference'
  // Vector
  | 'vector' | 'embedding' | 'sparse_vector' | 'metadata'
  // Graph
  | 'node_label' | 'relationship' | 'property'
  // TimeSeries
  | 'time' | 'field' | 'tag_ts' | 'measurement'
  // KeyValue
  | 'key' | 'value' | 'hash_kv' | 'sorted_set' | 'list_kv' | 'ttl';

type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many'
  // Graph specific
  | 'directed' | 'bidirectional' | 'weighted';

interface DbColumn {
  id: string;
  name: string;
  type: ColumnType;
  isPrimary: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue: string;
  reference?: { tableId: string; columnId: string };
  /** Vector dimension for vector DBs */
  dimension?: number;
  /** Graph relationship label */
  relLabel?: string;
}

interface DbTable {
  id: string;
  name: string;
  columns: DbColumn[];
  x: number;
  y: number;
  color: string;
  /** Entity kind for non-SQL: 'collection', 'index', 'node', 'edge', 'bucket', 'measurement' */
  kind?: string;
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

/* ─── Engine-specific column types ─── */
const columnTypesByEngine: Record<DbEngine, ColumnType[]> = {
  sql: ['uuid', 'serial', 'text', 'varchar', 'integer', 'bigint', 'float', 'decimal', 'boolean', 'date', 'timestamp', 'timestamptz', 'json', 'jsonb', 'array', 'enum', 'bytea'],
  nosql: ['objectId', 'string', 'number', 'boolean', 'object', 'array', 'date', 'map', 'reference', 'json', 'bytea'],
  vector: ['uuid', 'text', 'vector', 'embedding', 'sparse_vector', 'metadata', 'integer', 'float', 'boolean', 'json', 'array'],
  graph: ['uuid', 'text', 'integer', 'float', 'boolean', 'node_label', 'relationship', 'property', 'json', 'array', 'date'],
  timeseries: ['time', 'field', 'tag_ts', 'measurement', 'float', 'integer', 'text', 'boolean'],
  keyvalue: ['key', 'value', 'hash_kv', 'sorted_set', 'list_kv', 'ttl', 'json', 'text', 'integer'],
};

const relationTypesByEngine: Record<DbEngine, { value: RelationType; label: string }[]> = {
  sql: [{ value: 'one-to-one', label: '1:1' }, { value: 'one-to-many', label: '1:N' }, { value: 'many-to-many', label: 'M:N' }],
  nosql: [{ value: 'one-to-one', label: 'Embedded' }, { value: 'one-to-many', label: 'Reference' }, { value: 'many-to-many', label: 'Many Ref' }],
  vector: [{ value: 'one-to-one', label: 'Metadata Link' }, { value: 'one-to-many', label: 'Namespace' }],
  graph: [{ value: 'directed', label: 'Directed →' }, { value: 'bidirectional', label: 'Bidirectional ↔' }, { value: 'weighted', label: 'Weighted →' }],
  timeseries: [{ value: 'one-to-one', label: 'Tag Link' }, { value: 'one-to-many', label: 'Derived' }],
  keyvalue: [{ value: 'one-to-one', label: 'Key Ref' }, { value: 'one-to-many', label: 'Hash Field' }],
};

const entityLabel: Record<DbEngine, string> = {
  sql: 'Table', nosql: 'Collection', vector: 'Index', graph: 'Node', timeseries: 'Measurement', keyvalue: 'Bucket',
};

const columnTypeIcons: Partial<Record<ColumnType, typeof Key>> = {
  uuid: Key, serial: Hash, text: Type, varchar: Type, string: Type,
  integer: Hash, bigint: Hash, float: Hash, decimal: Hash, number: Hash,
  boolean: ToggleLeft, date: Calendar, timestamp: Clock, timestamptz: Clock, time: Clock,
  json: Braces, jsonb: Braces, object: Braces, map: Braces, metadata: Braces,
  array: List, list_kv: List, enum: CircleDot, bytea: Binary,
  objectId: Key, reference: Link2, vector: Hexagon, embedding: Hexagon, sparse_vector: Hexagon,
  node_label: GitBranch, relationship: Network, property: Settings,
  field: BarChart3, tag_ts: Tag, measurement: Activity,
  key: Key, value: Type, hash_kv: Hash, sorted_set: List, ttl: Clock,
};

const tableColors = ['#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

/* ─── Element Templates ─── */
interface DbElement {
  id: string;
  label: string;
  icon: typeof Database;
  category: string;
  engine?: DbEngine | 'all';
  createTable?: { name: string; kind?: string; columns?: Array<Omit<DbColumn, 'id'>> };
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
  // ── SQL Tables ──
  { id: 'tbl-users', label: 'Users', icon: Users, category: 'Auth & Users', engine: 'sql', createTable: { name: 'users', columns: [
    pkCol(), defaultCol('email', 'varchar', { isNullable: false, isUnique: true }), defaultCol('name', 'varchar', { isNullable: false }),
    defaultCol('avatar_url', 'text'), defaultCol('password_hash', 'text', { isNullable: false }), tsCol(),
  ] } },
  { id: 'tbl-profiles', label: 'Profiles', icon: Users, category: 'Auth & Users', engine: 'sql', createTable: { name: 'profiles', columns: [
    pkCol(), fkCol('user_id'), defaultCol('bio', 'text'), defaultCol('website', 'varchar'),
    defaultCol('location', 'varchar'), defaultCol('phone', 'varchar'), tsCol(),
  ] } },
  { id: 'tbl-roles', label: 'Roles', icon: Shield, category: 'Auth & Users', engine: 'sql', createTable: { name: 'roles', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('description', 'text'), tsCol(),
  ] } },
  { id: 'tbl-permissions', label: 'Permissions', icon: Lock, category: 'Auth & Users', engine: 'sql', createTable: { name: 'permissions', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('resource', 'varchar', { isNullable: false }), defaultCol('action', 'varchar', { isNullable: false }),
  ] } },
  { id: 'tbl-role-perms', label: 'Role Permissions', icon: Shield, category: 'Auth & Users', engine: 'sql', createTable: { name: 'role_permissions', columns: [
    pkCol('id', 'serial'), defaultCol('role_id', 'integer', { isNullable: false }), defaultCol('permission_id', 'integer', { isNullable: false }),
  ] } },
  { id: 'tbl-sessions', label: 'Sessions', icon: Activity, category: 'Auth & Users', engine: 'sql', createTable: { name: 'sessions', columns: [
    pkCol(), fkCol('user_id'), defaultCol('token', 'text', { isNullable: false, isUnique: true }),
    defaultCol('ip_address', 'varchar'), defaultCol('user_agent', 'text'),
    defaultCol('expires_at', 'timestamptz', { isNullable: false }), tsCol(),
  ] } },

  // ── SQL Content ──
  { id: 'tbl-posts', label: 'Posts', icon: FileText, category: 'Content', engine: 'sql', createTable: { name: 'posts', columns: [
    pkCol(), defaultCol('title', 'varchar', { isNullable: false }), defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('content', 'text'), fkCol('author_id'), defaultCol('published', 'boolean', { isNullable: false, defaultValue: 'false' }),
    defaultCol('published_at', 'timestamptz'), tsCol(),
  ] } },
  { id: 'tbl-categories', label: 'Categories', icon: Layers, category: 'Content', engine: 'sql', createTable: { name: 'categories', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }), defaultCol('parent_id', 'integer'),
  ] } },
  { id: 'tbl-tags', label: 'Tags', icon: Tag, category: 'Content', engine: 'sql', createTable: { name: 'tags', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }), defaultCol('color', 'varchar'),
  ] } },
  { id: 'tbl-comments', label: 'Comments', icon: MessageSquare, category: 'Content', engine: 'sql', createTable: { name: 'comments', columns: [
    pkCol(), fkCol('post_id'), fkCol('user_id'), defaultCol('body', 'text', { isNullable: false }),
    defaultCol('parent_id', 'uuid'), tsCol(),
  ] } },
  { id: 'tbl-media', label: 'Media / Files', icon: Image, category: 'Content', engine: 'sql', createTable: { name: 'media', columns: [
    pkCol(), defaultCol('url', 'text', { isNullable: false }), defaultCol('filename', 'varchar', { isNullable: false }),
    defaultCol('mime_type', 'varchar'), defaultCol('size', 'bigint'), fkCol('uploaded_by'), tsCol(),
  ] } },
  { id: 'tbl-pages', label: 'Pages', icon: BookOpen, category: 'Content', engine: 'sql', createTable: { name: 'pages', columns: [
    pkCol(), defaultCol('title', 'varchar', { isNullable: false }), defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('content', 'text'), defaultCol('meta', 'jsonb'), defaultCol('is_published', 'boolean', { defaultValue: 'false' }), tsCol(),
  ] } },

  // ── SQL E-Commerce ──
  { id: 'tbl-products', label: 'Products', icon: ShoppingCart, category: 'E-Commerce', engine: 'sql', createTable: { name: 'products', columns: [
    pkCol('id', 'serial'), defaultCol('name', 'varchar', { isNullable: false }), defaultCol('slug', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('price', 'decimal', { isNullable: false, defaultValue: '0' }), defaultCol('compare_price', 'decimal'),
    defaultCol('description', 'text'), defaultCol('category_id', 'integer'), defaultCol('stock', 'integer', { isNullable: false, defaultValue: '0' }),
    defaultCol('sku', 'varchar', { isUnique: true }), defaultCol('images', 'jsonb'), tsCol(),
  ] } },
  { id: 'tbl-orders', label: 'Orders', icon: Receipt, category: 'E-Commerce', engine: 'sql', createTable: { name: 'orders', columns: [
    pkCol(), fkCol('user_id'), defaultCol('total', 'decimal', { isNullable: false, defaultValue: '0' }),
    defaultCol('status', 'varchar', { isNullable: false, defaultValue: "'pending'" }),
    defaultCol('shipping_address', 'jsonb'), tsCol(),
  ] } },
  { id: 'tbl-order-items', label: 'Order Items', icon: Receipt, category: 'E-Commerce', engine: 'sql', createTable: { name: 'order_items', columns: [
    pkCol('id', 'serial'), fkCol('order_id'), defaultCol('product_id', 'integer', { isNullable: false }),
    defaultCol('quantity', 'integer', { isNullable: false, defaultValue: '1' }),
    defaultCol('unit_price', 'decimal', { isNullable: false }), defaultCol('total', 'decimal', { isNullable: false }),
  ] } },
  { id: 'tbl-coupons', label: 'Coupons', icon: Percent, category: 'E-Commerce', engine: 'sql', createTable: { name: 'coupons', columns: [
    pkCol('id', 'serial'), defaultCol('code', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('discount_type', 'varchar', { isNullable: false }), defaultCol('discount_value', 'decimal', { isNullable: false }),
    defaultCol('min_order', 'decimal'), defaultCol('expires_at', 'timestamptz'), defaultCol('usage_limit', 'integer'),
  ] } },
  { id: 'tbl-reviews', label: 'Reviews', icon: Star, category: 'E-Commerce', engine: 'sql', createTable: { name: 'reviews', columns: [
    pkCol(), defaultCol('product_id', 'integer', { isNullable: false }), fkCol('user_id'),
    defaultCol('rating', 'integer', { isNullable: false }), defaultCol('title', 'varchar'),
    defaultCol('body', 'text'), tsCol(),
  ] } },
  { id: 'tbl-cart', label: 'Shopping Cart', icon: ShoppingCart, category: 'E-Commerce', engine: 'sql', createTable: { name: 'cart_items', columns: [
    pkCol('id', 'serial'), fkCol('user_id'), defaultCol('product_id', 'integer', { isNullable: false }),
    defaultCol('quantity', 'integer', { isNullable: false, defaultValue: '1' }), tsCol(),
  ] } },

  // ── SQL Social ──
  { id: 'tbl-likes', label: 'Likes / Reactions', icon: Heart, category: 'Social', engine: 'sql', createTable: { name: 'likes', columns: [
    pkCol(), fkCol('user_id'), defaultCol('likeable_id', 'uuid', { isNullable: false }),
    defaultCol('likeable_type', 'varchar', { isNullable: false }), defaultCol('reaction', 'varchar', { defaultValue: "'like'" }), tsCol(),
  ] } },
  { id: 'tbl-follows', label: 'Follows', icon: Users, category: 'Social', engine: 'sql', createTable: { name: 'follows', columns: [
    pkCol(), fkCol('follower_id'), fkCol('following_id'), tsCol(),
  ] } },
  { id: 'tbl-bookmarks', label: 'Bookmarks', icon: Bookmark, category: 'Social', engine: 'sql', createTable: { name: 'bookmarks', columns: [
    pkCol(), fkCol('user_id'), defaultCol('bookmarkable_id', 'uuid', { isNullable: false }),
    defaultCol('bookmarkable_type', 'varchar', { isNullable: false }), tsCol(),
  ] } },

  // ── SQL System ──
  { id: 'tbl-notifications', label: 'Notifications', icon: Bell, category: 'System', engine: 'sql', createTable: { name: 'notifications', columns: [
    pkCol(), fkCol('user_id'), defaultCol('type', 'varchar', { isNullable: false }),
    defaultCol('title', 'varchar', { isNullable: false }), defaultCol('body', 'text'),
    defaultCol('data', 'jsonb'), defaultCol('read_at', 'timestamptz'), tsCol(),
  ] } },
  { id: 'tbl-audit', label: 'Audit Log', icon: Activity, category: 'System', engine: 'sql', createTable: { name: 'audit_logs', columns: [
    pkCol(), fkCol('user_id'), defaultCol('action', 'varchar', { isNullable: false }),
    defaultCol('resource_type', 'varchar', { isNullable: false }), defaultCol('resource_id', 'varchar'),
    defaultCol('old_data', 'jsonb'), defaultCol('new_data', 'jsonb'), defaultCol('ip_address', 'varchar'), tsCol(),
  ] } },
  { id: 'tbl-settings', label: 'Settings', icon: Settings, category: 'System', engine: 'sql', createTable: { name: 'settings', columns: [
    pkCol('id', 'serial'), defaultCol('key', 'varchar', { isNullable: false, isUnique: true }),
    defaultCol('value', 'jsonb', { isNullable: false }), defaultCol('group', 'varchar'), tsCol(),
  ] } },
  { id: 'tbl-payments', label: 'Payments', icon: CreditCard, category: 'System', engine: 'sql', createTable: { name: 'payments', columns: [
    pkCol(), fkCol('user_id'), defaultCol('order_id', 'uuid'),
    defaultCol('amount', 'decimal', { isNullable: false }), defaultCol('currency', 'varchar', { isNullable: false, defaultValue: "'USD'" }),
    defaultCol('method', 'varchar', { isNullable: false }), defaultCol('status', 'varchar', { isNullable: false, defaultValue: "'pending'" }),
    defaultCol('provider_id', 'varchar'), defaultCol('metadata', 'jsonb'), tsCol(),
  ] } },
  { id: 'tbl-webhooks', label: 'Webhooks', icon: Globe, category: 'System', engine: 'sql', createTable: { name: 'webhooks', columns: [
    pkCol(), defaultCol('url', 'text', { isNullable: false }), defaultCol('events', 'array'),
    defaultCol('secret', 'varchar'), defaultCol('is_active', 'boolean', { defaultValue: 'true' }),
    defaultCol('last_triggered_at', 'timestamptz'), tsCol(),
  ] } },
  { id: 'tbl-jobs', label: 'Job Queue', icon: Workflow, category: 'System', engine: 'sql', createTable: { name: 'jobs', columns: [
    pkCol(), defaultCol('queue', 'varchar', { isNullable: false, defaultValue: "'default'" }),
    defaultCol('payload', 'jsonb', { isNullable: false }), defaultCol('status', 'varchar', { isNullable: false, defaultValue: "'pending'" }),
    defaultCol('attempts', 'integer', { defaultValue: '0' }), defaultCol('max_attempts', 'integer', { defaultValue: '3' }),
    defaultCol('scheduled_at', 'timestamptz'), defaultCol('completed_at', 'timestamptz'), defaultCol('error', 'text'), tsCol(),
  ] } },

  // ── SQL Basic ──
  { id: 'tbl-empty', label: 'Empty Table', icon: Square, category: 'Basic', engine: 'sql', createTable: { name: 'new_table', columns: [pkCol()] } },
  { id: 'tbl-pivot', label: 'Pivot / Junction', icon: Link2, category: 'Basic', engine: 'sql', createTable: { name: 'pivot_table', columns: [
    pkCol('id', 'serial'), fkCol('left_id'), fkCol('right_id'), tsCol(),
  ] } },

  // ══════════ NoSQL Templates ══════════
  { id: 'nosql-users', label: 'Users', icon: Users, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'users', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('email', 'string', { isNullable: false, isUnique: true }),
    defaultCol('name', 'string', { isNullable: false }), defaultCol('profile', 'object'), defaultCol('roles', 'array'),
    defaultCol('createdAt', 'date', { defaultValue: 'new Date()' }),
  ] } },
  { id: 'nosql-posts', label: 'Posts', icon: FileText, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'posts', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('title', 'string', { isNullable: false }),
    defaultCol('content', 'string'), defaultCol('author', 'reference'), defaultCol('tags', 'array'),
    defaultCol('metadata', 'object'), defaultCol('published', 'boolean', { defaultValue: 'false' }),
  ] } },
  { id: 'nosql-products', label: 'Products', icon: ShoppingCart, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'products', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('name', 'string', { isNullable: false }),
    defaultCol('price', 'number', { isNullable: false }), defaultCol('variants', 'array'),
    defaultCol('attributes', 'map'), defaultCol('images', 'array'),
  ] } },
  { id: 'nosql-orders', label: 'Orders', icon: Receipt, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'orders', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('userId', 'reference', { isNullable: false }),
    defaultCol('items', 'array', { isNullable: false }), defaultCol('total', 'number', { isNullable: false }),
    defaultCol('status', 'string', { defaultValue: "'pending'" }), defaultCol('shippingAddress', 'object'),
    defaultCol('createdAt', 'date', { defaultValue: 'new Date()' }),
  ] } },
  { id: 'nosql-comments', label: 'Comments', icon: MessageSquare, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'comments', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('postId', 'reference', { isNullable: false }),
    defaultCol('userId', 'reference'), defaultCol('text', 'string', { isNullable: false }),
    defaultCol('replies', 'array'), defaultCol('createdAt', 'date'),
  ] } },
  { id: 'nosql-notifications', label: 'Notifications', icon: Bell, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'notifications', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('userId', 'reference', { isNullable: false }),
    defaultCol('type', 'string', { isNullable: false }), defaultCol('payload', 'object'),
    defaultCol('read', 'boolean', { defaultValue: 'false' }), defaultCol('createdAt', 'date'),
  ] } },
  { id: 'nosql-chats', label: 'Chat Messages', icon: MessageSquare, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'messages', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('roomId', 'reference', { isNullable: false }),
    defaultCol('senderId', 'reference'), defaultCol('text', 'string'), defaultCol('attachments', 'array'),
    defaultCol('readBy', 'array'), defaultCol('sentAt', 'date'),
  ] } },
  { id: 'nosql-analytics', label: 'Analytics Events', icon: Activity, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'analytics', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('event', 'string', { isNullable: false }),
    defaultCol('userId', 'reference'), defaultCol('properties', 'map'),
    defaultCol('timestamp', 'date', { defaultValue: 'new Date()' }),
  ] } },
  { id: 'nosql-settings', label: 'App Settings', icon: Settings, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'settings', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }), defaultCol('key', 'string', { isNullable: false, isUnique: true }),
    defaultCol('value', 'object', { isNullable: false }), defaultCol('scope', 'string', { defaultValue: "'global'" }),
  ] } },
  { id: 'nosql-empty', label: 'Empty Collection', icon: Square, category: 'NoSQL Collections', engine: 'nosql', createTable: { name: 'new_collection', kind: 'collection', columns: [
    defaultCol('_id', 'objectId', { isPrimary: true, isNullable: false }),
  ] } },

  // ── NoSQL Columns ──
  { id: 'nosql-col-objectId', label: 'ObjectId', icon: Key, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('_id', 'objectId') },
  { id: 'nosql-col-string', label: 'String', icon: Type, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('field', 'string') },
  { id: 'nosql-col-number', label: 'Number', icon: Hash, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('count', 'number') },
  { id: 'nosql-col-boolean', label: 'Boolean', icon: ToggleLeft, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('flag', 'boolean', { defaultValue: 'false' }) },
  { id: 'nosql-col-object', label: 'Object', icon: Braces, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('data', 'object') },
  { id: 'nosql-col-array', label: 'Array', icon: List, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('items', 'array') },
  { id: 'nosql-col-map', label: 'Map', icon: Braces, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('metadata', 'map') },
  { id: 'nosql-col-ref', label: 'Reference', icon: Link2, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('ref_id', 'reference') },
  { id: 'nosql-col-date', label: 'Date', icon: Calendar, category: 'NoSQL Fields', engine: 'nosql', createColumn: defaultCol('createdAt', 'date') },

  // ══════════ Vector Templates ══════════
  { id: 'vec-embeddings', label: 'Embeddings', icon: Hexagon, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'embeddings', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('content', 'text', { isNullable: false }),
    defaultCol('embedding', 'vector', { isNullable: false, dimension: 1536 }),
    defaultCol('metadata', 'metadata'), defaultCol('namespace', 'text'),
  ] } },
  { id: 'vec-documents', label: 'Documents', icon: FileText, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'documents', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('title', 'text', { isNullable: false }),
    defaultCol('body', 'text'), defaultCol('embedding', 'vector', { isNullable: false, dimension: 768 }),
    defaultCol('source', 'text'), defaultCol('chunk_index', 'integer'),
  ] } },
  { id: 'vec-images', label: 'Image Vectors', icon: Image, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'image_vectors', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('image_url', 'text', { isNullable: false }),
    defaultCol('embedding', 'vector', { isNullable: false, dimension: 512 }),
    defaultCol('labels', 'array'), defaultCol('metadata', 'metadata'),
  ] } },
  { id: 'vec-qa', label: 'Q&A Pairs', icon: MessageSquare, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'qa_pairs', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('question', 'text', { isNullable: false }),
    defaultCol('answer', 'text', { isNullable: false }), defaultCol('q_embedding', 'vector', { isNullable: false, dimension: 1536 }),
    defaultCol('category', 'text'), defaultCol('metadata', 'metadata'),
  ] } },
  { id: 'vec-products', label: 'Product Search', icon: ShoppingCart, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'product_search', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false }),
    defaultCol('description', 'text'), defaultCol('embedding', 'vector', { isNullable: false, dimension: 768 }),
    defaultCol('price', 'float'), defaultCol('metadata', 'metadata'),
  ] } },
  { id: 'vec-code', label: 'Code Snippets', icon: FileJson, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'code_snippets', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('code', 'text', { isNullable: false }),
    defaultCol('language', 'text'), defaultCol('embedding', 'vector', { isNullable: false, dimension: 1536 }),
    defaultCol('file_path', 'text'), defaultCol('metadata', 'metadata'),
  ] } },
  { id: 'vec-empty', label: 'Empty Index', icon: Square, category: 'Vector Indexes', engine: 'vector', createTable: { name: 'new_index', kind: 'index', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('embedding', 'vector', { isNullable: false, dimension: 1536 }),
  ] } },

  // ── Vector Columns ──
  { id: 'vec-col-vector', label: 'Vector', icon: Hexagon, category: 'Vector Fields', engine: 'vector', createColumn: defaultCol('embedding', 'vector', { dimension: 1536 }) },
  { id: 'vec-col-sparse', label: 'Sparse Vector', icon: Hexagon, category: 'Vector Fields', engine: 'vector', createColumn: defaultCol('sparse', 'sparse_vector') },
  { id: 'vec-col-meta', label: 'Metadata', icon: Braces, category: 'Vector Fields', engine: 'vector', createColumn: defaultCol('metadata', 'metadata') },
  { id: 'vec-col-text', label: 'Text', icon: Type, category: 'Vector Fields', engine: 'vector', createColumn: defaultCol('content', 'text') },
  { id: 'vec-col-float', label: 'Float', icon: Hash, category: 'Vector Fields', engine: 'vector', createColumn: defaultCol('score', 'float') },

  // ══════════ Graph Templates ══════════
  { id: 'graph-person', label: 'Person Node', icon: Users, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'Person', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false }),
    defaultCol('email', 'text', { isUnique: true }), defaultCol('age', 'integer'),
    defaultCol('labels', 'node_label'),
  ] } },
  { id: 'graph-company', label: 'Company Node', icon: Globe, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'Company', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false }),
    defaultCol('industry', 'text'), defaultCol('founded', 'integer'),
  ] } },
  { id: 'graph-product', label: 'Product Node', icon: ShoppingCart, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'Product', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false }),
    defaultCol('category', 'text'), defaultCol('price', 'float'),
  ] } },
  { id: 'graph-location', label: 'Location Node', icon: MapPinned, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'Location', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false }),
    defaultCol('lat', 'float'), defaultCol('lng', 'float'), defaultCol('type', 'text'),
  ] } },
  { id: 'graph-event', label: 'Event Node', icon: Calendar, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'Event', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false }),
    defaultCol('date', 'date'), defaultCol('description', 'text'),
  ] } },
  { id: 'graph-tag', label: 'Tag Node', icon: Tag, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'Tag', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }), defaultCol('name', 'text', { isNullable: false, isUnique: true }),
  ] } },
  { id: 'graph-empty-node', label: 'Empty Node', icon: Square, category: 'Graph Nodes', engine: 'graph', createTable: { name: 'NewNode', kind: 'node', columns: [
    defaultCol('id', 'uuid', { isPrimary: true, isNullable: false }),
  ] } },

  // ── Graph Edges ──
  { id: 'graph-works-at', label: 'WORKS_AT', icon: Network, category: 'Graph Edges', engine: 'graph', createTable: { name: 'WORKS_AT', kind: 'edge', columns: [
    defaultCol('from', 'relationship', { isNullable: false }), defaultCol('to', 'relationship', { isNullable: false }),
    defaultCol('since', 'date'), defaultCol('role', 'text'),
  ] } },
  { id: 'graph-knows', label: 'KNOWS', icon: Network, category: 'Graph Edges', engine: 'graph', createTable: { name: 'KNOWS', kind: 'edge', columns: [
    defaultCol('from', 'relationship', { isNullable: false }), defaultCol('to', 'relationship', { isNullable: false }),
    defaultCol('weight', 'float', { defaultValue: '1.0' }),
  ] } },
  { id: 'graph-purchased', label: 'PURCHASED', icon: Network, category: 'Graph Edges', engine: 'graph', createTable: { name: 'PURCHASED', kind: 'edge', columns: [
    defaultCol('from', 'relationship', { isNullable: false }), defaultCol('to', 'relationship', { isNullable: false }),
    defaultCol('quantity', 'integer', { defaultValue: '1' }), defaultCol('date', 'date'),
  ] } },
  { id: 'graph-located-in', label: 'LOCATED_IN', icon: Network, category: 'Graph Edges', engine: 'graph', createTable: { name: 'LOCATED_IN', kind: 'edge', columns: [
    defaultCol('from', 'relationship', { isNullable: false }), defaultCol('to', 'relationship', { isNullable: false }),
    defaultCol('since', 'date'),
  ] } },
  { id: 'graph-tagged', label: 'TAGGED', icon: Network, category: 'Graph Edges', engine: 'graph', createTable: { name: 'TAGGED', kind: 'edge', columns: [
    defaultCol('from', 'relationship', { isNullable: false }), defaultCol('to', 'relationship', { isNullable: false }),
  ] } },

  // ── Graph Fields ──
  { id: 'graph-col-label', label: 'Node Label', icon: GitBranch, category: 'Graph Fields', engine: 'graph', createColumn: defaultCol('labels', 'node_label') },
  { id: 'graph-col-rel', label: 'Relationship', icon: Network, category: 'Graph Fields', engine: 'graph', createColumn: defaultCol('ref', 'relationship') },
  { id: 'graph-col-prop', label: 'Property', icon: Settings, category: 'Graph Fields', engine: 'graph', createColumn: defaultCol('prop', 'property') },
  { id: 'graph-col-text', label: 'Text', icon: Type, category: 'Graph Fields', engine: 'graph', createColumn: defaultCol('name', 'text') },
  { id: 'graph-col-int', label: 'Integer', icon: Hash, category: 'Graph Fields', engine: 'graph', createColumn: defaultCol('count', 'integer') },

  // ══════════ Time Series Templates ══════════
  { id: 'ts-metrics', label: 'System Metrics', icon: Activity, category: 'Time Series Measurements', engine: 'timeseries', createTable: { name: 'system_metrics', kind: 'measurement', columns: [
    defaultCol('time', 'time', { isPrimary: true, isNullable: false }), defaultCol('host', 'tag_ts', { isNullable: false }),
    defaultCol('region', 'tag_ts'), defaultCol('cpu_usage', 'field', { isNullable: false }),
    defaultCol('mem_usage', 'field'), defaultCol('disk_io', 'field'),
  ] } },
  { id: 'ts-events', label: 'App Events', icon: BarChart3, category: 'Time Series Measurements', engine: 'timeseries', createTable: { name: 'app_events', kind: 'measurement', columns: [
    defaultCol('time', 'time', { isPrimary: true, isNullable: false }), defaultCol('event_type', 'tag_ts', { isNullable: false }),
    defaultCol('user_id', 'tag_ts'), defaultCol('value', 'field'),
    defaultCol('metadata', 'field'),
  ] } },
  { id: 'ts-iot', label: 'IoT Sensor Data', icon: Activity, category: 'Time Series Measurements', engine: 'timeseries', createTable: { name: 'sensor_data', kind: 'measurement', columns: [
    defaultCol('time', 'time', { isPrimary: true, isNullable: false }), defaultCol('device_id', 'tag_ts', { isNullable: false }),
    defaultCol('sensor_type', 'tag_ts'), defaultCol('reading', 'field', { isNullable: false }),
    defaultCol('unit', 'tag_ts'),
  ] } },
  { id: 'ts-http', label: 'HTTP Requests', icon: Globe, category: 'Time Series Measurements', engine: 'timeseries', createTable: { name: 'http_requests', kind: 'measurement', columns: [
    defaultCol('time', 'time', { isPrimary: true, isNullable: false }), defaultCol('method', 'tag_ts', { isNullable: false }),
    defaultCol('path', 'tag_ts', { isNullable: false }), defaultCol('status_code', 'tag_ts'),
    defaultCol('response_time_ms', 'field', { isNullable: false }), defaultCol('bytes', 'field'),
  ] } },
  { id: 'ts-financial', label: 'Financial Ticks', icon: BarChart3, category: 'Time Series Measurements', engine: 'timeseries', createTable: { name: 'price_ticks', kind: 'measurement', columns: [
    defaultCol('time', 'time', { isPrimary: true, isNullable: false }), defaultCol('symbol', 'tag_ts', { isNullable: false }),
    defaultCol('exchange', 'tag_ts'), defaultCol('price', 'field', { isNullable: false }),
    defaultCol('volume', 'field'), defaultCol('bid', 'field'), defaultCol('ask', 'field'),
  ] } },
  { id: 'ts-logs', label: 'Log Entries', icon: FileText, category: 'Time Series Measurements', engine: 'timeseries', createTable: { name: 'logs', kind: 'measurement', columns: [
    defaultCol('time', 'time', { isPrimary: true, isNullable: false }), defaultCol('level', 'tag_ts', { isNullable: false }),
    defaultCol('service', 'tag_ts'), defaultCol('message', 'field', { isNullable: false }),
    defaultCol('trace_id', 'tag_ts'),
  ] } },

  // ── Time Series Fields ──
  { id: 'ts-col-time', label: 'Timestamp', icon: Clock, category: 'TS Fields', engine: 'timeseries', createColumn: defaultCol('time', 'time') },
  { id: 'ts-col-field', label: 'Field (value)', icon: BarChart3, category: 'TS Fields', engine: 'timeseries', createColumn: defaultCol('value', 'field') },
  { id: 'ts-col-tag', label: 'Tag (index)', icon: Tag, category: 'TS Fields', engine: 'timeseries', createColumn: defaultCol('label', 'tag_ts') },
  { id: 'ts-col-measurement', label: 'Measurement', icon: Activity, category: 'TS Fields', engine: 'timeseries', createColumn: defaultCol('metric', 'measurement') },

  // ══════════ Key-Value Templates ══════════
  { id: 'kv-cache', label: 'Cache Store', icon: Boxes, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'cache', kind: 'bucket', columns: [
    defaultCol('key', 'key', { isPrimary: true, isNullable: false }), defaultCol('value', 'value', { isNullable: false }),
    defaultCol('ttl', 'ttl', { defaultValue: '3600' }),
  ] } },
  { id: 'kv-session', label: 'Session Store', icon: Lock, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'sessions', kind: 'bucket', columns: [
    defaultCol('session_id', 'key', { isPrimary: true, isNullable: false }), defaultCol('data', 'hash_kv'),
    defaultCol('user_id', 'key'), defaultCol('ttl', 'ttl', { defaultValue: '86400' }),
  ] } },
  { id: 'kv-leaderboard', label: 'Leaderboard', icon: BarChart3, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'leaderboard', kind: 'bucket', columns: [
    defaultCol('board_name', 'key', { isPrimary: true, isNullable: false }), defaultCol('scores', 'sorted_set'),
  ] } },
  { id: 'kv-queue', label: 'Message Queue', icon: List, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'message_queue', kind: 'bucket', columns: [
    defaultCol('queue_name', 'key', { isPrimary: true, isNullable: false }), defaultCol('messages', 'list_kv'),
  ] } },
  { id: 'kv-config', label: 'Config Store', icon: Settings, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'config', kind: 'bucket', columns: [
    defaultCol('key', 'key', { isPrimary: true, isNullable: false }), defaultCol('value', 'json', { isNullable: false }),
  ] } },
  { id: 'kv-rate-limit', label: 'Rate Limiter', icon: Shield, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'rate_limits', kind: 'bucket', columns: [
    defaultCol('client_key', 'key', { isPrimary: true, isNullable: false }), defaultCol('count', 'integer', { defaultValue: '0' }),
    defaultCol('window_start', 'integer'), defaultCol('ttl', 'ttl', { defaultValue: '60' }),
  ] } },
  { id: 'kv-feature-flags', label: 'Feature Flags', icon: ToggleLeft, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'feature_flags', kind: 'bucket', columns: [
    defaultCol('flag_name', 'key', { isPrimary: true, isNullable: false }), defaultCol('enabled', 'value', { defaultValue: 'true' }),
    defaultCol('rollout_pct', 'integer', { defaultValue: '100' }),
  ] } },
  { id: 'kv-counter', label: 'Counters', icon: Hash, category: 'Key-Value Buckets', engine: 'keyvalue', createTable: { name: 'counters', kind: 'bucket', columns: [
    defaultCol('counter_key', 'key', { isPrimary: true, isNullable: false }), defaultCol('value', 'integer', { defaultValue: '0' }),
  ] } },

  // ── KV Fields ──
  { id: 'kv-col-key', label: 'Key', icon: Key, category: 'KV Fields', engine: 'keyvalue', createColumn: defaultCol('key', 'key') },
  { id: 'kv-col-value', label: 'Value', icon: Type, category: 'KV Fields', engine: 'keyvalue', createColumn: defaultCol('value', 'value') },
  { id: 'kv-col-hash', label: 'Hash', icon: Hash, category: 'KV Fields', engine: 'keyvalue', createColumn: defaultCol('data', 'hash_kv') },
  { id: 'kv-col-sorted', label: 'Sorted Set', icon: List, category: 'KV Fields', engine: 'keyvalue', createColumn: defaultCol('scores', 'sorted_set') },
  { id: 'kv-col-list', label: 'List', icon: List, category: 'KV Fields', engine: 'keyvalue', createColumn: defaultCol('items', 'list_kv') },
  { id: 'kv-col-ttl', label: 'TTL', icon: Clock, category: 'KV Fields', engine: 'keyvalue', createColumn: defaultCol('ttl', 'ttl', { defaultValue: '3600' }) },

  // ── SQL Column types ──
  { id: 'col-uuid', label: 'UUID', icon: Key, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('id', 'uuid') },
  { id: 'col-serial', label: 'Serial', icon: Hash, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('id', 'serial') },
  { id: 'col-varchar', label: 'Varchar', icon: Type, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('name', 'varchar', { isNullable: false }) },
  { id: 'col-text', label: 'Text', icon: Type, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('content', 'text') },
  { id: 'col-integer', label: 'Integer', icon: Hash, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('count', 'integer', { isNullable: false, defaultValue: '0' }) },
  { id: 'col-decimal', label: 'Decimal', icon: Hash, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('amount', 'decimal', { isNullable: false, defaultValue: '0' }) },
  { id: 'col-boolean', label: 'Boolean', icon: ToggleLeft, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('is_active', 'boolean', { isNullable: false, defaultValue: 'false' }) },
  { id: 'col-timestamp', label: 'Timestamp', icon: Clock, category: 'SQL Columns', engine: 'sql', createColumn: tsCol() },
  { id: 'col-json', label: 'JSONB', icon: Braces, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('metadata', 'jsonb', { defaultValue: "'{}'" }) },
  { id: 'col-enum', label: 'Enum', icon: CircleDot, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('status', 'enum') },
  { id: 'col-array', label: 'Array', icon: List, category: 'SQL Columns', engine: 'sql', createColumn: defaultCol('tags', 'array', { defaultValue: "'{}'" }) },
  { id: 'col-fk', label: 'Foreign Key (UUID)', icon: Link2, category: 'SQL Columns', engine: 'sql', createColumn: fkCol('ref_id') },

  // ── SQL Constraints & Indexes ──
  { id: 'con-pk', label: 'Primary Key', icon: Key, category: 'Constraints', engine: 'sql' },
  { id: 'con-fk', label: 'Foreign Key', icon: Link2, category: 'Constraints', engine: 'sql' },
  { id: 'con-unique', label: 'Unique', icon: Shield, category: 'Constraints', engine: 'sql' },
  { id: 'con-notnull', label: 'Not Null', icon: AlertCircle, category: 'Constraints', engine: 'sql' },
  { id: 'idx-btree', label: 'B-Tree Index', icon: Columns, category: 'Indexes', engine: 'sql' },
  { id: 'idx-hash', label: 'Hash Index', icon: Hash, category: 'Indexes', engine: 'sql' },
  { id: 'idx-gin', label: 'GIN Index', icon: Columns, category: 'Indexes', engine: 'sql' },
  { id: 'idx-gist', label: 'GiST Index', icon: MapPin, category: 'Indexes', engine: 'sql' },
];

/* ─── Parse/Generate ─── */
function parseSchema(content?: string): { tables: DbTable[]; relations: DbRelation[]; engine?: DbEngine } {
  if (!content) return { tables: [], relations: [] };
  try {
    const parsed = JSON.parse(content);
    if (parsed.tables) return parsed;
  } catch (e) {
    // Not valid JSON
  }
  return { tables: [], relations: [] };
}

function generatePreviewHtml(tables: DbTable[], relations: DbRelation[], title: string, engine: DbEngine): string {
  const eLabel = entityLabel[engine];
  const tablesHtml = tables.map(t => {
    const colsHtml = t.columns.map(c =>
      `<tr><td style="padding:6px 12px;font-size:11px;color:${c.isPrimary ? '#f59e0b' : '#e2e8f0'};font-weight:${c.isPrimary ? '700' : '400'};">${c.isPrimary ? '🔑 ' : c.reference ? '🔗 ' : ''}${c.name}</td><td style="padding:6px 12px;font-size:10px;color:#a78bfa;">${c.type}${c.dimension ? `(${c.dimension})` : ''}</td><td style="padding:6px 12px;font-size:9px;color:#64748b;">${c.isPrimary ? 'PK ' : ''}${c.isUnique ? 'UQ ' : ''}${!c.isNullable ? 'NN' : ''}</td></tr>`
    ).join('');
    return `<div style="background:#111827;border:1px solid ${t.color}40;border-radius:12px;overflow:hidden;min-width:220px;"><div style="padding:10px 16px;background:${t.color}20;border-bottom:1px solid ${t.color}30;display:flex;align-items:center;gap:8px;"><span style="font-size:12px;">🗄️</span><span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:${t.color};">${t.name}</span><span style="font-size:9px;color:#64748b;margin-left:auto;">${t.kind || eLabel} · ${t.columns.length} cols</span></div><table style="width:100%;border-collapse:collapse;">${colsHtml}</table></div>`;
  }).join('');
  const relHtml = relations.map(r => {
    const from = tables.find(t => t.id === r.fromTableId);
    const to = tables.find(t => t.id === r.toTableId);
    if (!from || !to) return '';
    const fromCol = from.columns.find(c => c.id === r.fromColumnId);
    const toCol = to.columns.find(c => c.id === r.toColumnId);
    return `<div style="padding:8px 16px;background:#1e293b;border-radius:8px;font-size:10px;display:flex;align-items:center;gap:8px;"><span style="color:${from.color};">${from.name}.${fromCol?.name || '?'}</span><span style="color:#64748b;">→ ${r.type} →</span><span style="color:${to.color};">${to.name}.${toCol?.name || '?'}</span></div>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'SF Mono','Fira Code',monospace;background:#0a0a0f;color:#e2e8f0;padding:24px;}</style></head><body><h1 style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#f1f5f9;margin-bottom:4px;">🗄️ ${title} <span style="font-size:10px;color:#64748b;">[${engine.toUpperCase()}]</span></h1><div style="font-size:10px;color:#64748b;margin-bottom:24px;">${tables.length} ${eLabel.toLowerCase()}s, ${relations.length} relations</div><div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px;">${tablesHtml}</div>${relHtml ? `<div style="margin-top:16px;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px;">Relations</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${relHtml}</div></div>` : ''}</body></html>`;
}

/* ─── Main Component ─── */
interface Props { node: CanvasNode; onClose: () => void; }

export const DatabaseVisualEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const [dbEngine, setDbEngine] = useState<DbEngine>(() => {
    const parsed = parseSchema(node.generatedCode);
    return parsed.engine || 'sql';
  });
  const [schema, setSchema] = useState(() => {
    const parsed = parseSchema(node.generatedCode);
    return parsed.tables.length > 0 ? parsed : { tables: [] as DbTable[], relations: [] as DbRelation[] };
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(schema.tables[0]?.id || null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Filter elements by engine
  const filteredDbElements = dbElements.filter(e => !e.engine || e.engine === 'all' || e.engine === dbEngine);
  const elementCategories = [...new Set(filteredDbElements.map(e => e.category))];

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(elementCategories.map(c => [c, true]))
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

  // Expand new categories when engine changes
  useEffect(() => {
    setExpandedCategories(Object.fromEntries(elementCategories.map(c => [c, true])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbEngine]);

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
    const code = JSON.stringify({ ...schema, engine: dbEngine }, null, 2);
    const preview = generatePreviewHtml(schema.tables, schema.relations, node.title, dbEngine);
    updateNode(node.id, { generatedCode: code, content: preview });
    setIsDirty(false);
  }, [schema, dbEngine, node.id, node.title, updateNode]);

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
    const eKind = template?.kind || entityLabel[dbEngine].toLowerCase();
    const newTable: DbTable = {
      id: uid(), name: template?.name || `new_${eKind}`,
      color: tableColors[schema.tables.length % tableColors.length],
      x: 50 + schema.tables.length * 60, y: 50 + schema.tables.length * 40,
      kind: eKind,
      columns: (template?.columns || [{ name: 'id', type: 'uuid' as ColumnType, isPrimary: true, isNullable: false, isUnique: true, defaultValue: 'gen_random_uuid()' }]).map(c => ({
        id: uid(), name: c.name, type: c.type, isPrimary: c.isPrimary || false,
        isNullable: c.isNullable ?? true, isUnique: c.isUnique || false, defaultValue: c.defaultValue || '',
        ...(c.dimension ? { dimension: c.dimension } : {}),
      })),
    };
    updateSchema({ ...schema, tables: [...schema.tables, newTable] });
    setSelectedTableId(newTable.id);
  }, [schema, updateSchema, dbEngine]);

  const addColumn = useCallback((template?: DbElement['createColumn']) => {
    if (!selectedTableId) return;
    const colTypes = columnTypesByEngine[dbEngine];
    const newCol: DbColumn = {
      id: uid(), name: template?.name || 'new_column', type: (template?.type as ColumnType) || colTypes[2] || 'text',
      isPrimary: template?.isPrimary || false, isNullable: template?.isNullable ?? true,
      isUnique: template?.isUnique || false, defaultValue: template?.defaultValue || '',
    };
    updateSchema({ ...schema, tables: schema.tables.map(t => t.id === selectedTableId ? { ...t, columns: [...t.columns, newCol] } : t) });
  }, [selectedTableId, schema, updateSchema, dbEngine]);

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
      if (connectingFrom.tableId !== tableId) {
        const toTable = schema.tables.find(t => t.id === tableId);
        const pk = toTable?.columns.find(c => c.isPrimary);
        if (pk) {
          const fkName = `${toTable!.name}_id`;
          const newColId = uid();
          const newCol: DbColumn = {
            id: newColId, name: fkName, type: pk.type as ColumnType,
            isPrimary: false, isNullable: false, isUnique: false, defaultValue: '',
            reference: { tableId, columnId: pk.id },
          };
          const newTables = schema.tables.map(t =>
            t.id === connectingFrom.tableId ? { ...t, columns: [...t.columns, newCol] } : t
          );
          const defaultRelType = dbEngine === 'graph' ? 'directed' as RelationType : 'one-to-many' as RelationType;
          const newRel: DbRelation = { id: uid(), fromTableId: connectingFrom.tableId, fromColumnId: newColId, toTableId: tableId, toColumnId: pk.id, type: defaultRelType };
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
  }, [schema, canvasZoom, canvasPan, connectingFrom, updateSchema, dbEngine]);

  const handleStartConnect = useCallback((e: ReactMouseEvent, tableId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom({ tableId, columnId: '' });
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setConnectMousePos({ x: (e.clientX - rect.left - canvasPan.x) / canvasZoom, y: (e.clientY - rect.top - canvasPan.y) / canvasZoom });
  }, [canvasPan, canvasZoom]);

  const filteredElements = searchQuery
    ? filteredDbElements.filter(e => e.label.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredDbElements;

  const filteredCategories = [...new Set(filteredElements.map(e => e.category))];

  // TABLE_WIDTH constant for relation path computation
  const TABLE_WIDTH = 240;

  const getRelationPath = useCallback((rel: DbRelation) => {
    const fromTable = schema.tables.find(t => t.id === rel.fromTableId);
    const toTable = schema.tables.find(t => t.id === rel.toTableId);
    if (!fromTable || !toTable) return null;

    const fromColIdx = fromTable.columns.findIndex(c => c.id === rel.fromColumnId);
    const toColIdx = toTable.columns.findIndex(c => c.id === rel.toColumnId);

    // Calculate Y positions based on column index (header ~44px, each col ~30px)
    const fromY = fromTable.y + 44 + Math.max(0, fromColIdx) * 30 + 15;
    const toY = toTable.y + 44 + Math.max(0, toColIdx) * 30 + 15;

    // Determine if we should go from right→left or figure out best side
    const fromCenterX = fromTable.x + TABLE_WIDTH / 2;
    const toCenterX = toTable.x + TABLE_WIDTH / 2;

    let fromX: number, toX: number;
    if (fromCenterX <= toCenterX) {
      fromX = fromTable.x + TABLE_WIDTH; // right edge
      toX = toTable.x; // left edge
    } else {
      fromX = fromTable.x; // left edge
      toX = toTable.x + TABLE_WIDTH; // right edge
    }

    const dx = toX - fromX;
    const cp = Math.max(60, Math.abs(dx) * 0.4);
    const cpSign = fromCenterX <= toCenterX ? 1 : -1;
    return `M ${fromX} ${fromY} C ${fromX + cp * cpSign} ${fromY}, ${toX - cp * cpSign} ${toY}, ${toX} ${toY}`;
  }, [schema.tables]);

  const getConnectPreviewPath = useCallback(() => {
    if (!connectingFrom) return null;
    const fromTable = schema.tables.find(t => t.id === connectingFrom.tableId);
    if (!fromTable) return null;
    const fromX = fromTable.x + TABLE_WIDTH;
    const fromY = fromTable.y + 20;
    const toX = connectMousePos.x;
    const toY = connectMousePos.y;
    const dx = toX - fromX;
    const cp = Math.max(60, Math.abs(dx) * 0.4);
    return `M ${fromX} ${fromY} C ${fromX + cp} ${fromY}, ${toX - cp} ${toY}, ${toX} ${toY}`;
  }, [connectingFrom, connectMousePos, schema.tables]);

  const columnTypes = columnTypesByEngine[dbEngine];
  const relTypes = relationTypesByEngine[dbEngine];
  const eLabel = entityLabel[dbEngine];

  // Compute graph-style colors for relation lines based on engine
  const getRelColor = (rel: DbRelation) => {
    const from = schema.tables.find(t => t.id === rel.fromTableId);
    return from?.color || '#6366f1';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10" style={{ background: '#0f0f15' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLeftPanel(!showLeftPanel)} className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${showLeftPanel ? 'text-cyan-400' : 'text-white/30'}`} title="Toggle Elements">
            <PanelLeft className="w-4 h-4" />
          </button>
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-widest text-white/80">DB Designer</span>

          {/* Engine selector */}
          <div className="flex items-center gap-1 ml-2 px-1 py-0.5 rounded-lg bg-white/5 border border-white/10">
            {dbEngines.map(eng => {
              const EngIcon = eng.icon;
              return (
                <button
                  key={eng.id}
                  onClick={() => setDbEngine(eng.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${dbEngine === eng.id ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                  title={eng.description}
                >
                  <EngIcon className="w-3 h-3" />
                  {eng.label}
                </button>
              );
            })}
          </div>

          <span className="text-[9px] text-white/30 ml-2">{node.title}</span>
          {connectingFrom && (
            <span className="text-[9px] font-bold text-cyan-400 animate-pulse ml-4 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Click target {eLabel.toLowerCase()} to connect...
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
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={`Search ${eLabel.toLowerCase()}s...`} className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {filteredCategories.map(cat => {
                    const items = filteredElements.filter(e => e.category === cat);
                    if (items.length === 0) return null;
                    const isExpanded = expandedCategories[cat] ?? true;
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

          {/* Relations SVG — FIXED: use width/height 9999 + overflow visible */}
          <svg
            className="absolute pointer-events-none"
            style={{
              left: 0, top: 0,
              width: 9999, height: 9999,
              overflow: 'visible',
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
              transformOrigin: '0 0',
            }}
          >
            <defs>
              <marker id="db-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 Z" fill="currentColor" opacity="0.6" />
              </marker>
            </defs>
            {schema.relations.map(rel => {
              const path = getRelationPath(rel);
              if (!path) return null;
              const color = getRelColor(rel);
              const isDashed = rel.type === 'many-to-many' || rel.type === 'bidirectional';
              return (
                <g key={rel.id}>
                  {/* Glow */}
                  <path d={path} fill="none" stroke={color} strokeWidth={6} opacity={0.06} />
                  {/* Main line */}
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={isDashed ? '8 4' : 'none'}
                    opacity={0.7}
                    strokeLinecap="round"
                    markerEnd="url(#db-arrow)"
                    style={{ color }}
                  />
                  {/* Animated dot */}
                  <circle r="3" fill={color} opacity={0.8}>
                    <animateMotion dur="3s" repeatCount="indefinite" path={path} />
                  </circle>
                  {/* Relation type label */}
                  {(() => {
                    const fromT = schema.tables.find(t => t.id === rel.fromTableId);
                    const toT = schema.tables.find(t => t.id === rel.toTableId);
                    if (!fromT || !toT) return null;
                    const mx = (fromT.x + TABLE_WIDTH + toT.x) / 2;
                    const fromColIdx = fromT.columns.findIndex(c => c.id === rel.fromColumnId);
                    const toColIdx = toT.columns.findIndex(c => c.id === rel.toColumnId);
                    const my = ((fromT.y + 44 + Math.max(0, fromColIdx) * 30 + 15) + (toT.y + 44 + Math.max(0, toColIdx) * 30 + 15)) / 2;
                    const label = relTypes.find(r => r.value === rel.type)?.label || rel.type;
                    return (
                      <text x={mx} y={my - 8} textAnchor="middle" fill={color} fontSize="9" fontWeight="bold" opacity={0.6}>
                        {label}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
            {/* Connection preview line */}
            {connectingFrom && (() => {
              const p = getConnectPreviewPath();
              return p ? (
                <g>
                  <path d={p} fill="none" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="8 4" opacity={0.8}>
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.6s" repeatCount="indefinite" />
                  </path>
                  <circle cx={connectMousePos.x} cy={connectMousePos.y} r="5" fill="#06b6d420" stroke="#06b6d4" strokeWidth={2} />
                </g>
              ) : null;
            })()}
          </svg>

          {/* Tables / Entities */}
          <div style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`, transformOrigin: '0 0', position: 'absolute', inset: 0 }}>
            {schema.tables.map(table => {
              const isGraphEdge = table.kind === 'edge';
              const isGraphNode = table.kind === 'node';
              const isCollection = table.kind === 'collection';
              const isIndex = table.kind === 'index';
              const isMeasurement = table.kind === 'measurement';
              const isBucket = table.kind === 'bucket';

              // Engine-specific border radius
              const radius = isGraphEdge ? 24 : isGraphNode ? 16 : isCollection ? 8 : isIndex ? 6 : isMeasurement ? 4 : isBucket ? 14 : 12;
              // Engine-specific border style
              const borderStyle = isGraphEdge ? 'dashed' : isMeasurement ? 'dotted' : 'solid';
              // Engine-specific background
              const bgColor = isCollection ? '#0d1117' : isIndex ? '#0a0f1a' : isMeasurement ? '#0f0d12' : isBucket ? '#100d0a' : '#111827';
              // Engine-specific header icon
              const HeaderIcon = isGraphEdge ? Network : isGraphNode ? GitBranch : isCollection ? Braces : isIndex ? Hexagon : isMeasurement ? BarChart3 : isBucket ? Boxes : Table2;
              // Engine-specific kind badge color
              const kindBadgeColor = isGraphEdge ? '#f43f5e' : isGraphNode ? '#22d3ee' : isCollection ? '#22c55e' : isIndex ? '#a78bfa' : isMeasurement ? '#f97316' : isBucket ? '#eab308' : table.color;
              // Engine-specific column accent
              const typeColor = isCollection ? '#22c55e' : isIndex ? '#a78bfa' : isMeasurement ? '#f97316' : isBucket ? '#eab308' : '#a78bfa';

              return (
                <div
                  key={table.id}
                  className={`absolute select-none transition-shadow ${connectingFrom ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedTableId === table.id ? 'ring-2 ring-cyan-500/50' : ''} ${connectingFrom && connectingFrom.tableId !== table.id ? 'ring-2 ring-cyan-400/30 ring-offset-1' : ''}`}
                  style={{
                    left: table.x, top: table.y, width: TABLE_WIDTH,
                    borderRadius: radius,
                    overflow: 'visible', background: bgColor,
                    border: `1px ${borderStyle} ${table.color}30`,
                    boxShadow: selectedTableId === table.id ? `0 0 20px ${table.color}20` : 'none',
                  }}
                  onMouseDown={e => handleTableMouseDown(e, table.id)}
                >
                  {/* Connect handle */}
                  <div
                    className="absolute -right-3 top-3 w-6 h-6 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center cursor-crosshair hover:bg-cyan-500/40 hover:border-cyan-400 hover:scale-110 transition-all z-10"
                    onMouseDown={e => handleStartConnect(e, table.id)}
                    title="Drag to connect"
                  >
                    <Link2 className="w-3 h-3 text-cyan-400" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: `${table.color}15`, borderBottom: `1px solid ${table.color}20`, borderRadius: `${radius}px ${radius}px 0 0` }}>
                    <HeaderIcon className="w-3.5 h-3.5" style={{ color: table.color }} />
                    <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: table.color }}>{table.name}</span>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full ml-auto mr-1" style={{ background: `${kindBadgeColor}20`, color: kindBadgeColor }}>{table.kind || eLabel}</span>
                    <span className="text-[9px] text-white/30">{table.columns.length}</span>
                    <button onClick={e => { e.stopPropagation(); deleteTable(table.id); }} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Engine-specific column display */}
                  {table.columns.map(col => {
                    const ColIcon = columnTypeIcons[col.type] || Type;
                    // NoSQL: show nested-style for object/array/map
                    const isNested = ['object', 'map', 'array', 'json', 'jsonb'].includes(col.type);
                    // Vector: highlight embedding columns
                    const isVector = ['vector', 'embedding', 'sparse_vector'].includes(col.type);
                    // TimeSeries: differentiate tags vs fields
                    const isTag = col.type === 'tag_ts';
                    const isField = col.type === 'field';
                    const isTime = col.type === 'time';
                    // KV: highlight key vs value
                    const isKey = col.type === 'key';
                    const isVal = col.type === 'value' || col.type === 'hash_kv' || col.type === 'sorted_set' || col.type === 'list_kv';

                    let nameColor = col.isPrimary ? 'text-amber-300' : 'text-white/70';
                    let nameBold = col.isPrimary ? 'font-bold' : '';
                    let bgHighlight = '';

                    if (isVector) { nameColor = 'text-purple-300'; bgHighlight = 'bg-purple-500/5'; }
                    if (isTag) { nameColor = 'text-orange-300'; bgHighlight = 'bg-orange-500/5'; }
                    if (isField) { nameColor = 'text-blue-300'; }
                    if (isTime) { nameColor = 'text-orange-400'; nameBold = 'font-bold'; bgHighlight = 'bg-orange-500/5'; }
                    if (isKey) { nameColor = 'text-yellow-300'; nameBold = 'font-bold'; bgHighlight = 'bg-yellow-500/5'; }
                    if (isVal) { bgHighlight = 'bg-blue-500/5'; }
                    if (isNested && isCollection) { bgHighlight = 'bg-green-500/5'; }

                    return (
                      <div key={col.id} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors cursor-pointer ${selectedColumnId === col.id ? 'bg-white/5' : bgHighlight}`}
                        onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); setSelectedColumnId(col.id); setShowRightPanel(true); }}>
                        {col.isPrimary ? <Key className="w-3 h-3 text-amber-400 shrink-0" /> : col.reference ? <Link2 className="w-3 h-3 text-purple-400 shrink-0" /> : <ColIcon className="w-3 h-3 shrink-0" style={{ color: isVector ? '#a78bfa' : isTag ? '#f97316' : isField ? '#60a5fa' : isKey ? '#eab308' : 'rgba(255,255,255,0.3)' }} />}
                        <span className={`text-[11px] flex-1 truncate ${nameBold} ${nameColor}`}>{isNested && isCollection ? `{ ${col.name} }` : col.name}</span>
                        <span className="text-[9px]" style={{ color: `${typeColor}99` }}>{col.type}{col.dimension ? `(${col.dimension})` : ''}</span>
                        {!col.isNullable && <span className="text-[8px] text-red-400/60 shrink-0">NN</span>}
                        {isTag && <span className="text-[7px] text-orange-400/50 shrink-0">TAG</span>}
                        {isField && <span className="text-[7px] text-blue-400/50 shrink-0">FIELD</span>}
                      </div>
                    );
                  })}
                  <button onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); addColumn(); }} className="w-full flex items-center gap-2 px-3 py-2 text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors" style={{ borderRadius: `0 0 ${radius}px ${radius}px` }}>
                    <Plus className="w-3 h-3" /><span className="text-[10px]">Add {isBucket ? 'field' : isCollection ? 'field' : isMeasurement ? 'field' : 'column'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {schema.tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Database className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-sm font-bold text-white/20">No {eLabel.toLowerCase()}s yet</p>
                <p className="text-xs text-white/10 mt-1">Click elements in the left panel to add {eLabel.toLowerCase()}s</p>
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
              <span className="text-[10px] font-bold text-white/40">{schema.tables.length} {eLabel.toLowerCase()}s</span>
              <Link2 className="w-3 h-3 text-white/30 ml-1" />
              <span className="text-[10px] font-bold text-white/40">{schema.relations.length} relations</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold text-cyan-400/60">{dbEngines.find(e => e.id === dbEngine)?.description}</span>
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
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">{eLabel} Name</label>
                    <input value={selectedTable.name} onChange={e => updateTable(selectedTable.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-cyan-500/50" />
                  </div>
                  {/* Kind */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Kind</label>
                    <span className="text-[11px] text-white/50 px-2 py-1 rounded bg-white/5 inline-block">{selectedTable.kind || eLabel.toLowerCase()}</span>
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
                                  {col.type === 'vector' || col.type === 'embedding' || col.type === 'sparse_vector' ? (
                                    <input type="number" value={col.dimension || 1536} onChange={e => updateColumn(selectedTable.id, col.id, { dimension: parseInt(e.target.value) || 1536 })} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50" placeholder="Dimension" />
                                  ) : null}
                                  <input value={col.defaultValue} onChange={e => updateColumn(selectedTable.id, col.id, { defaultValue: e.target.value })} className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/50" placeholder="Default value" />
                                  <div className="flex gap-2 flex-wrap">
                                    <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer"><input type="checkbox" checked={col.isPrimary} onChange={e => updateColumn(selectedTable.id, col.id, { isPrimary: e.target.checked })} className="rounded" /> PK</label>
                                    <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer"><input type="checkbox" checked={col.isNullable} onChange={e => updateColumn(selectedTable.id, col.id, { isNullable: e.target.checked })} className="rounded" /> Nullable</label>
                                    <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer"><input type="checkbox" checked={col.isUnique} onChange={e => updateColumn(selectedTable.id, col.id, { isUnique: e.target.checked })} className="rounded" /> Unique</label>
                                  </div>
                                  {dbEngine === 'sql' && (
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
                                  )}
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
                              {relTypes.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                            </select>
                          </div>
                          <button onClick={() => updateSchema({ ...schema, relations: schema.relations.filter(r => r.id !== rel.id) })} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 shrink-0"><Trash2 className="w-2.5 h-2.5" /></button>
                        </div>
                      );
                    })}
                    {schema.relations.filter(r => r.fromTableId === selectedTable.id || r.toTableId === selectedTable.id).length === 0 && (
                      <p className="text-[10px] text-white/20">No relations. Use the <Link2 className="w-3 h-3 inline" /> handle to connect.</p>
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
