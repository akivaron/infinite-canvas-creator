import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Save, X, ChevronLeft, ChevronRight,
  Loader2, Search, Filter, RefreshCw, Download, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { databaseAPI, type ColumnSchema } from '@/lib/database-api';
import { toast } from 'sonner';

interface DataViewerProps {
  nodeId: string;
  tableName: string;
  onClose?: () => void;
}

export function DataViewer({ nodeId, tableName, onClose }: DataViewerProps) {
  const [data, setData] = useState<any[]>([]);
  const [schema, setSchema] = useState<ColumnSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, any>>({});

  useEffect(() => {
    loadTableSchema();
    loadData();
  }, [nodeId, tableName, page]);

  const loadTableSchema = async () => {
    try {
      const tableSchema = await databaseAPI.getTableSchema(nodeId, tableName);
      setSchema(tableSchema);

      const initialRow: Record<string, any> = {};
      tableSchema.forEach(col => {
        if (col.defaultValue) {
          initialRow[col.name] = col.defaultValue;
        } else if (col.type === 'boolean') {
          initialRow[col.name] = false;
        } else if (['integer', 'bigint', 'float', 'decimal'].includes(col.type)) {
          initialRow[col.name] = 0;
        } else {
          initialRow[col.name] = '';
        }
      });
      setNewRow(initialRow);
    } catch (error: any) {
      toast.error('Failed to load table schema: ' + error.message);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await databaseAPI.queryData(nodeId, tableName, {
        limit: pageSize,
        offset: page * pageSize,
        orderBy: schema.find(col => col.primaryKey)?.name || schema[0]?.name,
      });
      setData(result);
      setTotalRows(result.length);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertRow = async () => {
    const requiredColumns = schema.filter(col => !col.nullable && !col.defaultValue);
    const missingColumns = requiredColumns.filter(col => !newRow[col.name]);

    if (missingColumns.length > 0) {
      toast.error(`Missing required columns: ${missingColumns.map(c => c.name).join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      await databaseAPI.insertData(nodeId, tableName, newRow);
      toast.success('Row inserted successfully');
      setShowAddModal(false);
      loadData();

      const initialRow: Record<string, any> = {};
      schema.forEach(col => {
        if (col.defaultValue) {
          initialRow[col.name] = col.defaultValue;
        } else if (col.type === 'boolean') {
          initialRow[col.name] = false;
        } else if (['integer', 'bigint', 'float', 'decimal'].includes(col.type)) {
          initialRow[col.name] = 0;
        } else {
          initialRow[col.name] = '';
        }
      });
      setNewRow(initialRow);
    } catch (error: any) {
      toast.error('Failed to insert row: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRow = async (originalRow: any) => {
    if (!editingRow) return;

    const primaryKeyCol = schema.find(col => col.primaryKey);
    if (!primaryKeyCol) {
      toast.error('No primary key found');
      return;
    }

    try {
      setLoading(true);
      const where = { [primaryKeyCol.name]: originalRow[primaryKeyCol.name] };
      await databaseAPI.updateData(nodeId, tableName, editingRow, where);
      toast.success('Row updated successfully');
      setEditingRow(null);
      loadData();
    } catch (error: any) {
      toast.error('Failed to update row: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRow = async (row: any) => {
    if (!confirm('Are you sure you want to delete this row?')) {
      return;
    }

    const primaryKeyCol = schema.find(col => col.primaryKey);
    if (!primaryKeyCol) {
      toast.error('No primary key found');
      return;
    }

    try {
      setLoading(true);
      const where = { [primaryKeyCol.name]: row[primaryKeyCol.name] };
      await databaseAPI.deleteData(nodeId, tableName, where);
      toast.success('Row deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete row: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'NULL';
    if (type === 'boolean') return value ? 'true' : 'false';
    if (type === 'json' || type === 'jsonb') return JSON.stringify(value);
    if (type === 'timestamp' || type === 'timestamptz' || type === 'date') {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  const parseValue = (value: string, type: string): any => {
    if (value === '' || value === 'NULL') return null;
    if (type === 'boolean') return value === 'true';
    if (['integer', 'bigint'].includes(type)) return parseInt(value);
    if (['float', 'decimal'].includes(type)) return parseFloat(value);
    if (type === 'json' || type === 'jsonb') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">{tableName}</h3>
          <Badge variant="secondary">{data.length} rows</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} disabled={loading}>
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No data yet</p>
            <p className="text-xs">Add your first row to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {schema.map((col) => (
                  <TableHead key={col.name}>
                    <div className="flex items-center gap-1">
                      <span>{col.name}</span>
                      {col.primaryKey && <Badge variant="outline" className="text-xs">PK</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {col.type}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {schema.map((col) => (
                    <TableCell key={col.name}>
                      {editingRow && editingRow._originalIndex === rowIndex ? (
                        <Input
                          value={editingRow[col.name]}
                          onChange={(e) =>
                            setEditingRow({ ...editingRow, [col.name]: e.target.value })
                          }
                          className="h-8"
                          disabled={col.primaryKey}
                        />
                      ) : (
                        <span className="text-sm">{formatValue(row[col.name], col.type)}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingRow && editingRow._originalIndex === rowIndex ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateRow(row)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRow(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRow({ ...row, _originalIndex: rowIndex })}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRow(row)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages || 1}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0 || loading}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={data.length < pageSize || loading}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
                <h3 className="font-semibold">Add New Row</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {schema.map((col) => (
                    <div key={col.name}>
                      <Label className="flex items-center gap-2">
                        {col.name}
                        <span className="text-xs text-muted-foreground">({col.type})</span>
                        {!col.nullable && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        value={newRow[col.name] || ''}
                        onChange={(e) =>
                          setNewRow({
                            ...newRow,
                            [col.name]: parseValue(e.target.value, col.type),
                          })
                        }
                        placeholder={col.defaultValue || `Enter ${col.name}...`}
                        disabled={col.defaultValue !== undefined && col.defaultValue !== null}
                      />
                    </div>
                  ))}
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
                <Button onClick={handleInsertRow} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Row
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
