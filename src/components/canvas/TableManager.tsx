import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Eye, Database, Table2, Columns,
  AlertCircle, Loader2, Check, X, Key, Link2, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { databaseAPI, type ColumnSchema } from '@/lib/database-api';
import { toast } from 'sonner';

interface TableManagerProps {
  nodeId: string;
  onSelectTable?: (tableName: string) => void;
}

const COLUMN_TYPES = [
  { value: 'uuid', label: 'UUID', icon: Hash },
  { value: 'serial', label: 'Serial', icon: Hash },
  { value: 'text', label: 'Text', icon: Database },
  { value: 'varchar', label: 'Varchar', icon: Database },
  { value: 'integer', label: 'Integer', icon: Hash },
  { value: 'bigint', label: 'BigInt', icon: Hash },
  { value: 'float', label: 'Float', icon: Hash },
  { value: 'decimal', label: 'Decimal', icon: Hash },
  { value: 'boolean', label: 'Boolean', icon: Check },
  { value: 'date', label: 'Date', icon: Database },
  { value: 'timestamp', label: 'Timestamp', icon: Database },
  { value: 'timestamptz', label: 'Timestamp w/ TZ', icon: Database },
  { value: 'json', label: 'JSON', icon: Database },
  { value: 'jsonb', label: 'JSONB', icon: Database },
  { value: 'array', label: 'Array', icon: Database },
];

export function TableManager({ nodeId, onSelectTable }: TableManagerProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnSchema[]>([
    {
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      nullable: false,
      unique: true,
    },
  ]);

  useEffect(() => {
    loadTables();
  }, [nodeId]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const tablesList = await databaseAPI.listTables(nodeId);
      setTables(tablesList);
    } catch (error: any) {
      toast.error('Failed to load tables: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async () => {
    if (!tableName.trim()) {
      toast.error('Table name is required');
      return;
    }

    if (columns.length === 0) {
      toast.error('At least one column is required');
      return;
    }

    const hasPrimaryKey = columns.some(col => col.primaryKey);
    if (!hasPrimaryKey) {
      toast.error('At least one primary key column is required');
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.createTable(nodeId, tableName, columns);
      toast.success(`Table "${tableName}" created successfully`);
      setShowCreateModal(false);
      setTableName('');
      setColumns([
        {
          name: 'id',
          type: 'uuid',
          primaryKey: true,
          nullable: false,
          unique: true,
        },
      ]);
      loadTables();
    } catch (error: any) {
      toast.error('Failed to create table: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (table: string) => {
    if (!confirm(`Are you sure you want to delete table "${table}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.dropTable(nodeId, table);
      toast.success(`Table "${table}" deleted successfully`);
      loadTables();
    } catch (error: any) {
      toast.error('Failed to delete table: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: `column_${columns.length + 1}`,
        type: 'text',
        primaryKey: false,
        nullable: true,
        unique: false,
      },
    ]);
  };

  const updateColumn = (index: number, updates: Partial<ColumnSchema>) => {
    setColumns(columns.map((col, i) => (i === index ? { ...col, ...updates } : col)));
  };

  const removeColumn = (index: number) => {
    if (columns.length === 1) {
      toast.error('Cannot remove the last column');
      return;
    }
    setColumns(columns.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Table2 className="w-5 h-5" />
          <h3 className="font-semibold">Tables</h3>
          <Badge variant="secondary">{tables.length}</Badge>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Table
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loading && tables.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tables yet</p>
              <p className="text-xs">Create your first table to get started</p>
            </div>
          ) : (
            tables.map((table) => (
              <Card key={table} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4" />
                      <span className="font-medium">{table}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectTable?.(table)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTable(table)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Create New Table</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Table Name</Label>
                    <Input
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      placeholder="users, products, orders..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Columns</Label>
                      <Button size="sm" variant="outline" onClick={addColumn}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Column
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {columns.map((col, index) => (
                        <Card key={index}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Input
                                  value={col.name}
                                  onChange={(e) =>
                                    updateColumn(index, { name: e.target.value })
                                  }
                                  placeholder="Column name"
                                />
                              </div>
                              <Select
                                value={col.type}
                                onValueChange={(value) =>
                                  updateColumn(index, { type: value })
                                }
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COLUMN_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeColumn(index)}
                                disabled={columns.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                  checked={col.primaryKey}
                                  onCheckedChange={(checked) =>
                                    updateColumn(index, { primaryKey: !!checked })
                                  }
                                />
                                <Key className="w-3 h-3" />
                                <span>Primary Key</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                  checked={col.unique}
                                  onCheckedChange={(checked) =>
                                    updateColumn(index, { unique: !!checked })
                                  }
                                />
                                <span>Unique</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                  checked={!col.nullable}
                                  onCheckedChange={(checked) =>
                                    updateColumn(index, { nullable: !checked })
                                  }
                                />
                                <span>Not Null</span>
                              </label>
                            </div>

                            <Input
                              value={col.defaultValue || ''}
                              onChange={(e) =>
                                updateColumn(index, { defaultValue: e.target.value })
                              }
                              placeholder="Default value (optional)"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateTable} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Table
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
