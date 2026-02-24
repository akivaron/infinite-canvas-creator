export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface AgentResult {
  files: GeneratedFile[];
  previewHtml: string;
  label: string;
  description: string;
  category: 'header' | 'hero' | 'features' | 'pricing' | 'footer' | 'dashboard' | 'mobile';
}

export type Platform = 'web' | 'mobile' | 'api' | 'desktop' | 'cli' | 'database';

export interface AgentContext {
  title: string;
  description: string;
  platform: Platform;
  language?: string;
  apiKey: string;
  modelId: string;
}
