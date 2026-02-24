# Project & Canvas Management API Documentation

Complete API documentation for canvas node persistence, project management, versioning, collaboration, and more.

## Base URL

```
http://localhost:3001/api
```

## Endpoints Overview

- `/projects` - Project management
- `/projects/:id/nodes` - Canvas nodes CRUD
- `/projects/:id/connections` - Node connections
- `/projects/:id/versions` - Version history
- `/projects/:id/star` - Favorites
- `/projects/:id/export` - Export/Import

---

## Projects API

### List Projects

```http
GET /api/projects
```

**Query Parameters:**
- `isPublic` (boolean) - Filter public projects
- `userId` (string) - Filter by user ID
- `tags` (string) - Comma-separated tags
- `search` (string) - Search in name/description
- `limit` (number) - Page size (default: 20)
- `offset` (number) - Page offset (default: 0)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "My Canvas Project",
      "description": "A visual programming canvas",
      "thumbnail": "https://...",
      "tags": ["react", "typescript"],
      "is_public": false,
      "fork_count": 0,
      "view_count": 12,
      "star_count": 3,
      "metadata": {
        "framework": "react",
        "language": "typescript"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Project Details

```http
GET /api/projects/:projectId
```

**Response:**
```json
{
  "project": { /* project object */ },
  "nodes": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "node_id": "node_1",
      "node_type": "code",
      "position_x": 100,
      "position_y": 200,
      "width": 300,
      "height": 400,
      "data": {
        "label": "Button Component",
        "code": "const Button = () => {...}",
        "prompt": "Create a reusable button"
      },
      "metadata": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "connections": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "source_node_id": "node_1",
      "target_node_id": "node_2",
      "connection_type": "data",
      "metadata": {},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Note:** Increments view_count automatically.

### Create Project

```http
POST /api/projects
```

**Request Body:**
```json
{
  "userId": "uuid",
  "name": "New Project",
  "description": "Project description",
  "thumbnail": "https://...",
  "tags": ["react", "canvas"],
  "isPublic": false,
  "metadata": {
    "framework": "react",
    "version": "1.0"
  }
}
```

**Response:**
```json
{
  "project": { /* created project */ }
}
```

### Update Project

```http
PUT /api/projects/:projectId
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "thumbnail": "https://...",
  "tags": ["updated", "tags"],
  "isPublic": true,
  "metadata": { /* updated metadata */ }
}
```

**Response:**
```json
{
  "project": { /* updated project */ }
}
```

### Delete Project

```http
DELETE /api/projects/:projectId
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Also deletes all nodes, connections, versions, and RAG embeddings.

---

## Canvas Nodes API

### Create Node

```http
POST /api/projects/:projectId/nodes
```

**Request Body:**
```json
{
  "nodeId": "node_123",
  "nodeType": "code",
  "position": { "x": 100, "y": 200 },
  "size": { "width": 300, "height": 400 },
  "data": {
    "label": "Component Name",
    "code": "const Component = () => {...}",
    "prompt": "Create a component",
    "language": "typescript"
  },
  "metadata": {
    "color": "#ff0000",
    "collapsed": false
  }
}
```

**Response:**
```json
{
  "node": { /* created node */ }
}
```

**Note:** Automatically indexes node in RAG system.

### Update Node

```http
PUT /api/projects/:projectId/nodes/:nodeId
```

**Request Body:** (all fields optional)
```json
{
  "nodeType": "visual",
  "position": { "x": 150, "y": 250 },
  "size": { "width": 400, "height": 500 },
  "data": { /* updated data */ },
  "metadata": { /* updated metadata */ }
}
```

**Response:**
```json
{
  "node": { /* updated node */ }
}
```

**Note:** Re-indexes in RAG if data changes.

### Delete Node

```http
DELETE /api/projects/:projectId/nodes/:nodeId
```

**Response:**
```json
{
  "success": true
}
```

### Batch Create/Update Nodes

```http
POST /api/projects/:projectId/nodes/batch
```

**Request Body:**
```json
{
  "nodes": [
    {
      "nodeId": "node_1",
      "nodeType": "code",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 200, "height": 100 },
      "data": {},
      "metadata": {}
    },
    {
      "nodeId": "node_2",
      "nodeType": "visual",
      "position": { "x": 300, "y": 0 },
      "size": { "width": 200, "height": 100 },
      "data": {},
      "metadata": {}
    }
  ]
}
```

**Response:**
```json
{
  "nodes": [ /* created/updated nodes */ ]
}
```

**Note:** Uses UPSERT - creates or updates based on (project_id, node_id).

---

## Connections API

### Create Connection

```http
POST /api/projects/:projectId/connections
```

**Request Body:**
```json
{
  "sourceNodeId": "node_1",
  "targetNodeId": "node_2",
  "connectionType": "data",
  "metadata": {
    "label": "passes data to",
    "color": "#00ff00"
  }
}
```

**Response:**
```json
{
  "connection": { /* created connection */ }
}
```

### Delete Connection

```http
DELETE /api/projects/:projectId/connections/:connectionId
```

**Response:**
```json
{
  "success": true
}
```

---

## Version History API

### List Versions

```http
GET /api/projects/:projectId/versions
```

**Response:**
```json
{
  "versions": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "version_number": 3,
      "snapshot": {
        "project": { /* project state */ },
        "nodes": [ /* nodes state */ ],
        "connections": [ /* connections state */ ]
      },
      "changes": "Added new component",
      "created_by": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Version

```http
POST /api/projects/:projectId/versions
```

**Request Body:**
```json
{
  "userId": "uuid",
  "changes": "Manual save: Added authentication flow"
}
```

**Response:**
```json
{
  "version": { /* created version */ }
}
```

**Note:** Automatically captures full project state including all nodes and connections.

### Restore Version

```http
POST /api/projects/:projectId/restore/:versionNumber
```

**Response:**
```json
{
  "success": true
}
```

**Note:**
- Deletes current nodes and connections
- Restores from snapshot
- Updates project metadata
- Creates new version automatically

---

## Stars/Favorites API

### Star Project

```http
POST /api/projects/:projectId/star
```

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Increments project star_count automatically.

### Unstar Project

```http
DELETE /api/projects/:projectId/star/:userId
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Decrements project star_count automatically.

---

## Export/Import API

### Export Project

```http
GET /api/projects/:projectId/export?format=json
```

**Query Parameters:**
- `format` - Export format (currently only "json")

**Response:**
```json
{
  "version": "1.0",
  "project": { /* project data */ },
  "nodes": [ /* all nodes */ ],
  "connections": [ /* all connections */ ],
  "exportedAt": "2024-01-01T00:00:00Z"
}
```

**Headers:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="project-name.json"
```

### Import Project

```http
POST /api/projects/import
```

**Request Body:**
```json
{
  "userId": "uuid",
  "projectData": {
    "version": "1.0",
    "project": { /* project data */ },
    "nodes": [ /* nodes to import */ ],
    "connections": [ /* connections to import */ ]
  }
}
```

**Response:**
```json
{
  "project": { /* newly created project */ }
}
```

**Note:**
- Creates new project with "(Imported)" suffix
- Preserves all node positions and data
- Recreates all connections
- Assigns to importing user

---

## Database Schema

### canvas_projects
```sql
CREATE TABLE canvas_projects (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  thumbnail text,
  tags text[],
  is_public boolean DEFAULT false,
  fork_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  star_count integer DEFAULT 0,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
);
```

### canvas_nodes
```sql
CREATE TABLE canvas_nodes (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES canvas_projects(id),
  node_id text NOT NULL,
  node_type text NOT NULL,
  position_x float,
  position_y float,
  width float,
  height float,
  data jsonb,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(project_id, node_id)
);
```

### canvas_connections
```sql
CREATE TABLE canvas_connections (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES canvas_projects(id),
  source_node_id text NOT NULL,
  target_node_id text NOT NULL,
  connection_type text,
  metadata jsonb,
  created_at timestamptz
);
```

### project_versions
```sql
CREATE TABLE project_versions (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES canvas_projects(id),
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  changes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz
);
```

### project_collaborators
```sql
CREATE TABLE project_collaborators (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES canvas_projects(id),
  user_id uuid REFERENCES auth.users(id),
  role text CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz,
  UNIQUE(project_id, user_id)
);
```

### project_stars
```sql
CREATE TABLE project_stars (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES canvas_projects(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz,
  UNIQUE(project_id, user_id)
);
```

---

## Row Level Security (RLS)

### Public Access
- Anyone can view public projects and their nodes/connections
- Anyone can view star counts

### Authenticated Access
- Users can view/edit/delete their own projects
- Users can view projects they're collaborating on
- Editors can modify nodes and connections
- Viewers can only read
- Users can star/unstar any project
- Users can export any accessible project
- Users can import to create new projects

### Owner Permissions
- Full control over project
- Manage collaborators
- Delete project
- Change visibility

---

## Integration with RAG System

When nodes are created or updated, they are automatically indexed in the RAG system:

```typescript
// Automatic indexing on node save
await ragService.indexCanvasNode(
  projectId,
  nodeId,
  nodeType,
  nodeData
);

// Can be searched later
const results = await ragService.searchCanvasNodes(
  "button component",
  projectId
);
```

This enables:
- Semantic search across canvas nodes
- Context-aware code generation
- Smart suggestions based on existing nodes
- Project-wide understanding

---

## Complete Workflow Example

### 1. Create Project
```bash
POST /api/projects
{
  "userId": "user_123",
  "name": "E-commerce Dashboard",
  "tags": ["react", "typescript", "tailwind"]
}
```

### 2. Add Nodes
```bash
POST /api/projects/proj_456/nodes/batch
{
  "nodes": [
    {
      "nodeId": "header",
      "nodeType": "code",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Header Component",
        "code": "const Header = () => {...}"
      }
    },
    {
      "nodeId": "sidebar",
      "nodeType": "code",
      "position": { "x": 0, "y": 200 },
      "data": {
        "label": "Sidebar Navigation",
        "code": "const Sidebar = () => {...}"
      }
    }
  ]
}
```

### 3. Connect Nodes
```bash
POST /api/projects/proj_456/connections
{
  "sourceNodeId": "header",
  "targetNodeId": "sidebar",
  "connectionType": "visual"
}
```

### 4. Save Version
```bash
POST /api/projects/proj_456/versions
{
  "userId": "user_123",
  "changes": "Initial layout with header and sidebar"
}
```

### 5. Export Project
```bash
GET /api/projects/proj_456/export?format=json
```

### 6. Share (Make Public)
```bash
PUT /api/projects/proj_456
{
  "isPublic": true
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common status codes:
- `400` - Bad Request (invalid input)
- `404` - Not Found (project/node doesn't exist)
- `500` - Internal Server Error

---

## Frontend Integration Examples

### React Hook for Projects

```typescript
import { useState, useEffect } from 'react';

export function useProject(projectId: string) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3001/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      });
  }, [projectId]);

  const saveNode = async (node) => {
    const response = await fetch(
      `http://localhost:3001/api/projects/${projectId}/nodes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      }
    );
    return response.json();
  };

  return { project, loading, saveNode };
}
```

### Save Canvas State

```typescript
async function saveCanvas(projectId: string, nodes: Node[], connections: Connection[]) {
  // Batch save all nodes
  await fetch(`http://localhost:3001/api/projects/${projectId}/nodes/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes })
  });

  // Save connections
  for (const conn of connections) {
    await fetch(`http://localhost:3001/api/projects/${projectId}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conn)
    });
  }

  // Create version snapshot
  await fetch(`http://localhost:3001/api/projects/${projectId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUserId,
      changes: 'Auto-save'
    })
  });
}
```

---

## Summary

The Projects API provides:

✅ **Complete CRUD** for projects, nodes, connections
✅ **Version History** with snapshots and restore
✅ **Collaboration** with role-based access
✅ **Stars/Favorites** system
✅ **Export/Import** for backup and sharing
✅ **RAG Integration** for intelligent search
✅ **RLS Security** for data protection
✅ **Auto-increment** counters (views, stars, forks)
✅ **Batch Operations** for performance
✅ **Rich Metadata** support with JSONB

Ready for production use!
