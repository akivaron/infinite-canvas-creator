const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DatabaseNode {
  id: string;
  node_id: string;
  schema_name: string;
  display_name: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDatabaseNodeRequest {
  nodeId: string;
  displayName: string;
  projectId?: string;
}

export interface ExecuteSQLRequest {
  sql: string;
}

export interface SQLResult {
  rows: any[];
  rowCount: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
}

async function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');

  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export async function createDatabaseNode(request: CreateDatabaseNodeRequest): Promise<DatabaseNode> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/database-nodes/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create database node');
  }

  const result = await response.json();
  return result.data;
}

export async function listDatabaseNodes(): Promise<DatabaseNode[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/database-nodes/list`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list database nodes');
  }

  const result = await response.json();
  return result.data;
}

export async function getDatabaseNode(nodeId: string): Promise<DatabaseNode> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/database-nodes/${nodeId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get database node');
  }

  const result = await response.json();
  return result.data;
}

export async function executeSQLInNode(nodeId: string, sql: string): Promise<SQLResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/database-nodes/${nodeId}/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to execute SQL');
  }

  const result = await response.json();
  return result.data;
}

export async function getNodeTables(nodeId: string): Promise<Array<{ table_name: string; table_type: string }>> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/database-nodes/${nodeId}/tables`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get tables');
  }

  const result = await response.json();
  return result.data;
}

export async function deleteDatabaseNode(nodeId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/database-nodes/${nodeId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete database node');
  }
}
