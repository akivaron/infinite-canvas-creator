export interface FileContext {
  path: string;
  content: string;
  language: string;
  imports?: string[];
  exports?: string[];
  dependencies?: string[];
}

export interface CodeContext {
  currentFile?: FileContext;
  relatedFiles: FileContext[];
  projectStructure: ProjectStructure;
  recentChanges: FileChange[];
}

export interface ProjectStructure {
  files: string[];
  directories: string[];
  dependencies: Record<string, string>;
  framework?: string;
  language?: string;
}

export interface FileChange {
  path: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  diff?: string;
}

export interface GenerationRequest {
  prompt: string;
  context: CodeContext;
  mode: 'generate' | 'edit' | 'complete' | 'explain';
  targetFile?: string;
  selectionRange?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface GenerationResponse {
  type: 'file' | 'edit' | 'completion' | 'explanation';
  content: string;
  diff?: string;
  files?: GeneratedFile[];
  explanation?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  action: 'create' | 'update';
}

export interface StreamChunk {
  type: 'progress' | 'file' | 'diff' | 'complete' | 'error';
  data: any;
}

export interface AgentSession {
  id: string;
  userId: string;
  projectId: string;
  context: CodeContext;
  history: GenerationRequest[];
  createdAt: number;
  updatedAt: number;
}
