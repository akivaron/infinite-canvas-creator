import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Loader2, Hash, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { databaseAPI, type ColumnSchema } from '@/lib/database-api';
import { toast } from 'sonner';

interface IndexManagerProps {
  nodeId: string;
  tableName: string;
  onClose?: () => void;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export function IndexManager({ nodeId, tableName, onClose }: IndexManagerProps) {
  const [schema, setSchema] = useState<ColumnSchema[]>([]);
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [indexName, setIndexName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isUnique, setIsUnique] = useState(false);

  useEffect(() => {
    loadSchema();
    loadIndexes();
  }, [nodeId, tableName]);

  const loadSchema = async () => {
    try {
      const tableSchema = await databaseAPI.getTableSchema(nodeId, tableName);
      setSchema(tableSchema);
    } catch (error: any) {
      toast.error('Failed to load schema: ' + error.message);
    }
  };

  const loadIndexes = async () => {
    try {
      setLoading(true);
      const result = await databaseAPI.executeSQL(
        nodeId,
        `SELECT
          i.relname as index_name,
          array_agg(a.attname) as column_names,
          ix.indisunique as is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = $1
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
        GROUP BY i.relname, ix.indisunique
        ORDER BY i.relname`,
        [tableName]
      );

      const indexList: IndexInfo[] = result.rows.map((row) => ({
        name: row.index_name,
        columns: row.column_names,
        unique: row.is_unique,
      }));

      setIndexes(indexList);
    } catch (error: any) {
      toast.error('Failed to load indexes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIndex = async () => {
    if (!indexName.trim()) {
      toast.error('Index name is required');
      return;
    }

    if (selectedColumns.length === 0) {
      toast.error('At least one column must be selected');
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.createIndex(
        nodeId,
        tableName,
        indexName,
        selectedColumns,
        isUnique
      );
      toast.success(`Index "${indexName}" created successfully`);
      setShowCreateModal(false);
      setIndexName('');
      setSelectedColumns([]);
      setIsUnique(false);
      loadIndexes();
    } catch (error: any) {
      toast.error('Failed to create index: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndex = async (indexName: string) => {
    if (!confirm(`Are you sure you want to delete index "${indexName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.dropIndex(nodeId, indexName);
      toast.success(`Index "${indexName}" deleted successfully`);
      loadIndexes();
    } catch (error: any) {
      toast.error('Failed to delete index: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (columnName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName]
    );
  };

  const generateIndexName = () => {
    if (selectedColumns.length === 0) return;
    const columnsStr = selectedColumns.join('_');
    const prefix = isUnique ? 'unique' : 'idx';
    setIndexName(`${prefix}_${tableName}_${columnsStr}`.toLowerCase());
  };

  useEffect(() => {
    if (selectedColumns.length > 0) {
      generateIndexName();
    }
  }, [selectedColumns, isUnique]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">Indexes - {tableName}</h3>
          <Badge variant="secondary">{indexes.length} indexes</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-1" />
          Create Index
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading && indexes.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : indexes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No indexes yet</p>
            <p className="text-xs">Create indexes to improve query performance</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {indexes.map((index) => (
              <Card key={index.name}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-medium">{index.name}</span>
                        {index.unique && (
                          <Badge variant="default" className="text-xs">
                            Unique
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {index.columns.map((col) => (
                          <Badge key={col} variant="secondary">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteIndex(index.name)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
              className="bg-card border rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Create New Index</h3>
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
                    <Label>Index Name *</Label>
                    <Input
                      value={indexName}
                      onChange={(e) => setIndexName(e.target.value)}
                      placeholder="idx_tablename_column"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-generated based on selected columns
                    </p>
                  </div>

                  <div>
                    <Label>Columns *</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select columns to include in the index
                    </p>
                    <div className="space-y-2 border rounded-md p-3">
                      {schema.map((col) => (
                        <label
                          key={col.name}
                          className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                        >
                          <Checkbox
                            checked={selectedColumns.includes(col.name)}
                            onCheckedChange={() => toggleColumn(col.name)}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{col.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({col.type})
                            </span>
                          </div>
                          {selectedColumns.includes(col.name) && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedColumns.indexOf(col.name) + 1}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={isUnique}
                        onCheckedChange={(checked) => setIsUnique(!!checked)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">Unique Index</div>
                        <div className="text-xs text-muted-foreground">
                          Enforce uniqueness constraint on selected columns
                        </div>
                      </div>
                    </label>
                  </div>

                  {selectedColumns.length > 0 && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <div className="text-xs font-medium mb-1">Preview:</div>
                      <code className="text-xs">
                        CREATE {isUnique ? 'UNIQUE ' : ''}INDEX {indexName || '...'} ON{' '}
                        {tableName} ({selectedColumns.join(', ')})
                      </code>
                    </div>
                  )}
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
                <Button
                  onClick={handleCreateIndex}
                  disabled={loading || selectedColumns.length === 0}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Index
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
