import { useState, useEffect, useCallback } from 'react';
import { databaseAPI } from '@/lib/database-api';
import { useToast } from '@/hooks/use-toast';

export function useDatabaseNode(nodeId: string) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [tables, setTables] = useState<Array<{ table_name: string; table_type: string }>>([]);
  const { toast } = useToast();

  const initializeDatabase = useCallback(
    async (displayName: string) => {
      if (isInitializing || isInitialized) return;

      setIsInitializing(true);
      try {
        // First try to see if schema already exists for this node
        try {
          const existing = await databaseAPI.getSchema(nodeId);
          if (existing?.schemaName) {
            setSchemaName(existing.schemaName);
            setIsInitialized(true);
            return existing;
          }
        } catch {
          // ignore and fall through to create
        }

        const created = await databaseAPI.createDatabase(nodeId, displayName);
        setSchemaName(created.schemaName);
        setIsInitialized(true);

        toast({
          title: 'Database Created',
          description: `Isolated database schema "${created.schemaName}" has been created successfully.`,
        });

        return created;
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create database',
          variant: 'destructive',
        });
      } finally {
        setIsInitializing(false);
      }
    },
    [nodeId, isInitializing, isInitialized, toast]
  );

  const checkIfExists = useCallback(async () => {
    try {
      const existing = await databaseAPI.getSchema(nodeId);
      if (existing?.schemaName) {
        setSchemaName(existing.schemaName);
        setIsInitialized(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [nodeId]);

  const executeSQL = useCallback(async (sql: string) => {
    if (!isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await databaseAPI.executeSQL(nodeId, sql);
      return result;
    } catch (error: any) {
      toast({
        title: 'SQL Error',
        description: error.message || 'Failed to execute SQL',
        variant: 'destructive',
      });
      throw error;
    }
  }, [nodeId, isInitialized, toast]);

  const refreshTables = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const tableNames = await databaseAPI.listTables(nodeId);
      setTables(tableNames.map(name => ({ table_name: name, table_type: 'BASE TABLE' })));
    } catch (error: any) {
      console.error('Failed to refresh tables:', error);
    }
  }, [nodeId, isInitialized]);

  const deleteDatabase = useCallback(async () => {
    try {
      await databaseAPI.deleteDatabase(nodeId);
      setIsInitialized(false);
      setSchemaName(null);
      setTables([]);

      toast({
        title: 'Database Deleted',
        description: 'Database has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete database',
        variant: 'destructive',
      });
      throw error;
    }
  }, [nodeId, toast]);

  useEffect(() => {
    checkIfExists();
  }, [checkIfExists]);

  useEffect(() => {
    if (isInitialized) {
      refreshTables();
    }
  }, [isInitialized, refreshTables]);

  return {
    isInitialized,
    isInitializing,
    schemaName,
    tables,
    initializeDatabase,
    executeSQL,
    refreshTables,
    deleteDatabase,
  };
}
