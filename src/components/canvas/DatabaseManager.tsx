import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Database, Table2, Columns, Hash, Terminal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { TableManager } from './TableManager';
import { DataViewer } from './DataViewer';
import { ColumnEditor } from './ColumnEditor';
import { IndexManager } from './IndexManager';
import { SQLConsole } from './SQLConsole';
import { databaseAPI } from '@/lib/database-api';
import { toast } from 'sonner';

interface DatabaseManagerProps {
  node: CanvasNode;
  onClose: () => void;
}

type ViewMode = 'tables' | 'data' | 'columns' | 'indexes' | 'sql';

export function DatabaseManager({ node, onClose }: DatabaseManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tables');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDatabaseExists();
  }, [node.id]);

  const checkDatabaseExists = async () => {
    try {
      setLoading(true);
      const result = await databaseAPI.getSchema(node.id);
      setSchemaName(result.schemaName);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        try {
          const result = await databaseAPI.createDatabase(node.id, node.title || 'New Database');
          setSchemaName(result.schemaName);
          toast.success('Database initialized');
        } catch (createError: any) {
          toast.error('Failed to initialize database: ' + createError.message);
        }
      } else {
        toast.error('Failed to check database: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setViewMode('data');
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
    setViewMode('tables');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-4 md:inset-8 bg-background border rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5" />
          <div>
            <h2 className="font-semibold">{node.title || 'Database Manager'}</h2>
            {schemaName && (
              <p className="text-xs text-muted-foreground">{schemaName}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            PostgreSQL
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Database className="w-12 h-12 mx-auto animate-pulse text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Initializing database...</p>
          </div>
        </div>
      ) : (
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b">
            <TabsTrigger value="tables" className="gap-2">
              <Table2 className="w-4 h-4" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2" disabled={!selectedTable}>
              <Database className="w-4 h-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-2" disabled={!selectedTable}>
              <Columns className="w-4 h-4" />
              Columns
            </TabsTrigger>
            <TabsTrigger value="indexes" className="gap-2" disabled={!selectedTable}>
              <Hash className="w-4 h-4" />
              Indexes
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-2">
              <Terminal className="w-4 h-4" />
              SQL Console
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="tables" className="h-full m-0">
              <TableManager nodeId={node.id} onSelectTable={handleSelectTable} />
            </TabsContent>

            <TabsContent value="data" className="h-full m-0">
              {selectedTable && (
                <DataViewer
                  nodeId={node.id}
                  tableName={selectedTable}
                  onClose={handleBackToTables}
                />
              )}
            </TabsContent>

            <TabsContent value="columns" className="h-full m-0">
              {selectedTable && (
                <ColumnEditor
                  nodeId={node.id}
                  tableName={selectedTable}
                  onClose={handleBackToTables}
                />
              )}
            </TabsContent>

            <TabsContent value="indexes" className="h-full m-0">
              {selectedTable && (
                <IndexManager
                  nodeId={node.id}
                  tableName={selectedTable}
                  onClose={handleBackToTables}
                />
              )}
            </TabsContent>

            <TabsContent value="sql" className="h-full m-0">
              <SQLConsole nodeId={node.id} />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </motion.div>
  );
}
