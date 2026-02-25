import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, X, Loader2, Key, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { databaseAPI, type ColumnSchema } from '@/lib/database-api';
import { toast } from 'sonner';

interface ColumnEditorProps {
  nodeId: string;
  tableName: string;
  onClose?: () => void;
}

const COLUMN_TYPES = [
  { value: 'uuid', label: 'UUID', category: 'ID' },
  { value: 'serial', label: 'Serial', category: 'ID' },
  { value: 'text', label: 'Text', category: 'String' },
  { value: 'varchar', label: 'Varchar', category: 'String' },
  { value: 'integer', label: 'Integer', category: 'Number' },
  { value: 'bigint', label: 'BigInt', category: 'Number' },
  { value: 'float', label: 'Float', category: 'Number' },
  { value: 'decimal', label: 'Decimal', category: 'Number' },
  { value: 'boolean', label: 'Boolean', category: 'Boolean' },
  { value: 'date', label: 'Date', category: 'DateTime' },
  { value: 'timestamp', label: 'Timestamp', category: 'DateTime' },
  { value: 'timestamptz', label: 'Timestamp w/ TZ', category: 'DateTime' },
  { value: 'json', label: 'JSON', category: 'JSON' },
  { value: 'jsonb', label: 'JSONB', category: 'JSON' },
  { value: 'array', label: 'Array', category: 'Array' },
  { value: 'bytea', label: 'Bytea', category: 'Binary' },
  { value: 'enum', label: 'Enum', category: 'Enum' },
];

export function ColumnEditor({ nodeId, tableName, onClose }: ColumnEditorProps) {
  const [schema, setSchema] = useState<ColumnSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newColumn, setNewColumn] = useState<ColumnSchema>({
    name: '',
    type: 'text',
    primaryKey: false,
    nullable: true,
    unique: false,
  });
  const [availableTables, setAvailableTables] = useState<string[]>([]);

  useEffect(() => {
    loadSchema();
    loadAvailableTables();
  }, [nodeId, tableName]);

  const loadSchema = async () => {
    try {
      setLoading(true);
      const tableSchema = await databaseAPI.getTableSchema(nodeId, tableName);
      setSchema(tableSchema);
    } catch (error: any) {
      toast.error('Failed to load schema: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTables = async () => {
    try {
      const tables = await databaseAPI.listTables(nodeId);
      setAvailableTables(tables.filter(t => t !== tableName));
    } catch (error: any) {
      console.error('Failed to load tables:', error);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumn.name.trim()) {
      toast.error('Column name is required');
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.addColumn(nodeId, tableName, newColumn);
      toast.success(`Column "${newColumn.name}" added successfully`);
      setShowAddModal(false);
      setNewColumn({
        name: '',
        type: 'text',
        primaryKey: false,
        nullable: true,
        unique: false,
      });
      loadSchema();
    } catch (error: any) {
      toast.error('Failed to add column: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async (columnName: string) => {
    if (!confirm(`Are you sure you want to delete column "${columnName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.dropColumn(nodeId, tableName, columnName);
      toast.success(`Column "${columnName}" deleted successfully`);
      loadSchema();
    } catch (error: any) {
      toast.error('Failed to delete column: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedTypes = COLUMN_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, typeof COLUMN_TYPES>);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">Columns - {tableName}</h3>
          <Badge variant="secondary">{schema.length} columns</Badge>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-1" />
          Add Column
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading && schema.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {schema.map((col) => (
              <Card key={col.name}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{col.name}</span>
                        {col.primaryKey && (
                          <Badge variant="default" className="text-xs">
                            <Key className="w-3 h-3 mr-1" />
                            Primary Key
                          </Badge>
                        )}
                        {col.unique && !col.primaryKey && (
                          <Badge variant="secondary" className="text-xs">
                            Unique
                          </Badge>
                        )}
                        {!col.nullable && (
                          <Badge variant="outline" className="text-xs">
                            Not Null
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Type: <span className="font-mono">{col.type}</span></span>
                        {col.defaultValue && (
                          <span>Default: <span className="font-mono">{col.defaultValue}</span></span>
                        )}
                      </div>

                      {col.references && (
                        <div className="flex items-center gap-1 text-sm text-blue-600">
                          <Link2 className="w-3 h-3" />
                          <span>References {col.references.table}({col.references.column})</span>
                        </div>
                      )}
                    </div>

                    {!col.primaryKey && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteColumn(col.name)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <AnimatePresence>
        {showAddModal && (
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
              className="bg-card border rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Add New Column</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Column Name *</Label>
                    <Input
                      value={newColumn.name}
                      onChange={(e) =>
                        setNewColumn({ ...newColumn, name: e.target.value })
                      }
                      placeholder="email, age, description..."
                    />
                  </div>

                  <div>
                    <Label>Data Type *</Label>
                    <Select
                      value={newColumn.type}
                      onValueChange={(value) =>
                        setNewColumn({ ...newColumn, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedTypes).map(([category, types]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {types.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Default Value</Label>
                    <Input
                      value={newColumn.defaultValue || ''}
                      onChange={(e) =>
                        setNewColumn({ ...newColumn, defaultValue: e.target.value })
                      }
                      placeholder="now(), gen_random_uuid(), 0..."
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={newColumn.primaryKey}
                        onCheckedChange={(checked) =>
                          setNewColumn({ ...newColumn, primaryKey: !!checked })
                        }
                      />
                      <Key className="w-4 h-4" />
                      <span>Primary Key</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={newColumn.unique}
                        onCheckedChange={(checked) =>
                          setNewColumn({ ...newColumn, unique: !!checked })
                        }
                      />
                      <span>Unique</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={!newColumn.nullable}
                        onCheckedChange={(checked) =>
                          setNewColumn({ ...newColumn, nullable: !checked })
                        }
                      />
                      <span>Not Null</span>
                    </label>
                  </div>

                  {availableTables.length > 0 && (
                    <div className="border-t pt-4">
                      <Label>Foreign Key (Optional)</Label>
                      <Select
                        value={newColumn.references?.table || ''}
                        onValueChange={(table) => {
                          if (table) {
                            setNewColumn({
                              ...newColumn,
                              references: { table, column: 'id' },
                            });
                          } else {
                            const { references, ...rest } = newColumn;
                            setNewColumn(rest);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select table..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {availableTables.map((table) => (
                            <SelectItem key={table} value={table}>
                              {table}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {newColumn.references && (
                        <Input
                          value={newColumn.references.column}
                          onChange={(e) =>
                            setNewColumn({
                              ...newColumn,
                              references: {
                                ...newColumn.references!,
                                column: e.target.value,
                              },
                            })
                          }
                          placeholder="Column name"
                          className="mt-2"
                        />
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddColumn} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Column
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
