import { useState, useEffect, useCallback } from 'react';
import { createDatabaseNode, getDatabaseNode, executeSQLInNode, getNodeTables, deleteDatabaseNode } from '@/lib/database-nodes';
import { useToast } from '@/hooks/use-toast';

export function useDatabaseNode(nodeId: string) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [tables, setTables] = useState<Array<{ table_name: string; table_type: string }>>([]);
  const { toast } = useToast();

  const initializeDatabase = useCallback(async (displayName: string, projectId?: string) => {
    if (isInitializing || isInitialized) return;

    setIsInitializing(true);
    try {
      const result = await createDatabaseNode({
        nodeId,
        displayName,
        projectId,
      });

      setSchemaName(result.schema_name);
      setIsInitialized(true);

      toast({
        title: 'Database Created',
        description: `Isolated database schema "${result.schema_name}" has been created successfully.`,
      });

      return result;
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        try {
          const existingNode = await getDatabaseNode(nodeId);
          setSchemaName(existingNode.schema_name);
          setIsInitialized(true);
          return existingNode;
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to initialize database',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create database',
          variant: 'destructive',
        });
      }
    } finally {
      setIsInitializing(false);
    }
  }, [nodeId, isInitializing, isInitialized, toast]);

  const checkIfExists = useCallback(async () => {
    try {
      const node = await getDatabaseNode(nodeId);
      setSchemaName(node.schema_name);
      setIsInitialized(true);
      return true;
    } catch {
      return false;
    }
  }, [nodeId]);

  const executeSQL = useCallback(async (sql: string) => {
    if (!isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await executeSQLInNode(nodeId, sql);
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
      const tableList = await getNodeTables(nodeId);
      setTables(tableList);
    } catch (error: any) {
      console.error('Failed to refresh tables:', error);
    }
  }, [nodeId, isInitialized]);

  const deleteDatabase = useCallback(async () => {
    try {
      await deleteDatabaseNode(nodeId);
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
