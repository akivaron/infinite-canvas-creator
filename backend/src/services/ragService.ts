import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { embeddingService } from './embeddingService.js';
import type { FileContext } from '../types/agent.js';

export interface RAGContext {
  relevantCode: Array<{
    filePath: string;
    content: string;
    similarity: number;
    metadata?: any;
  }>;
  relevantNodes: Array<{
    nodeId: string;
    nodeType: string;
    content: string;
    similarity: number;
    metadata?: any;
  }>;
  relevantConversations: Array<{
    turnId: string;
    content: string;
    similarity: number;
    metadata?: any;
  }>;
  summary: string;
}

export class RAGService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async indexCode(
    projectId: string,
    filePath: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const preparedText = embeddingService.prepareCodeForEmbedding(content, filePath);
      const embedding = await embeddingService.generateEmbedding(preparedText);

      const existingQuery = await this.supabase
        .from('code_embeddings')
        .select('id')
        .eq('project_id', projectId)
        .eq('file_path', filePath)
        .maybeSingle();

      if (existingQuery.data) {
        await this.supabase
          .from('code_embeddings')
          .update({
            content,
            embedding: JSON.stringify(embedding),
            metadata: metadata || {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingQuery.data.id);
      } else {
        await this.supabase
          .from('code_embeddings')
          .insert({
            project_id: projectId,
            file_path: filePath,
            content,
            embedding: JSON.stringify(embedding),
            metadata: metadata || {},
          });
      }
    } catch (error) {
      console.error('Error indexing code:', error);
      throw error;
    }
  }

  async indexBatchCode(
    projectId: string,
    files: Array<{ path: string; content: string; metadata?: any }>
  ): Promise<void> {
    for (const file of files) {
      await this.indexCode(projectId, file.path, file.content, file.metadata);
    }
  }

  async indexCanvasNode(
    projectId: string,
    nodeId: string,
    nodeType: string,
    nodeData: any
  ): Promise<void> {
    try {
      const preparedText = embeddingService.prepareCanvasNodeForEmbedding({
        type: nodeType,
        data: nodeData,
      });
      const embedding = await embeddingService.generateEmbedding(preparedText);

      const existingQuery = await this.supabase
        .from('canvas_node_embeddings')
        .select('id')
        .eq('node_id', nodeId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (existingQuery.data) {
        await this.supabase
          .from('canvas_node_embeddings')
          .update({
            node_type: nodeType,
            content: preparedText,
            embedding: JSON.stringify(embedding),
            metadata: nodeData || {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingQuery.data.id);
      } else {
        await this.supabase
          .from('canvas_node_embeddings')
          .insert({
            node_id: nodeId,
            project_id: projectId,
            node_type: nodeType,
            content: preparedText,
            embedding: JSON.stringify(embedding),
            metadata: nodeData || {},
          });
      }
    } catch (error) {
      console.error('Error indexing canvas node:', error);
      throw error;
    }
  }

  async indexConversationTurn(
    sessionId: string,
    turnId: string,
    prompt: string,
    response?: string,
    metadata?: any
  ): Promise<void> {
    try {
      const preparedText = embeddingService.prepareConversationForEmbedding(prompt, response);
      const embedding = await embeddingService.generateEmbedding(preparedText);

      await this.supabase
        .from('conversation_embeddings')
        .insert({
          session_id: sessionId,
          turn_id: turnId,
          content: preparedText,
          embedding: JSON.stringify(embedding),
          metadata: metadata || {},
        });
    } catch (error) {
      console.error('Error indexing conversation:', error);
      throw error;
    }
  }

  async searchCode(
    query: string,
    projectId?: string,
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<RAGContext['relevantCode']> {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const { data, error } = await this.supabase.rpc('search_code_embeddings', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: topK,
        filter_project_id: projectId || null,
      });

      if (error) {
        console.error('Error searching code:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        filePath: item.file_path,
        content: item.content,
        similarity: item.similarity,
        metadata: item.metadata,
      }));
    } catch (error) {
      console.error('Error in searchCode:', error);
      return [];
    }
  }

  async searchCanvasNodes(
    query: string,
    projectId?: string,
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<RAGContext['relevantNodes']> {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const { data, error } = await this.supabase.rpc('search_canvas_node_embeddings', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: topK,
        filter_project_id: projectId || null,
      });

      if (error) {
        console.error('Error searching canvas nodes:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        nodeId: item.node_id,
        nodeType: item.node_type,
        content: item.content,
        similarity: item.similarity,
        metadata: item.metadata,
      }));
    } catch (error) {
      console.error('Error in searchCanvasNodes:', error);
      return [];
    }
  }

  async searchConversations(
    query: string,
    sessionId?: string,
    topK: number = 3,
    threshold: number = 0.7
  ): Promise<RAGContext['relevantConversations']> {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const { data, error } = await this.supabase.rpc('search_conversation_embeddings', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: topK,
        filter_session_id: sessionId || null,
      });

      if (error) {
        console.error('Error searching conversations:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        turnId: item.turn_id,
        content: item.content,
        similarity: item.similarity,
        metadata: item.metadata,
      }));
    } catch (error) {
      console.error('Error in searchConversations:', error);
      return [];
    }
  }

  async buildRAGContext(
    query: string,
    projectId?: string,
    sessionId?: string,
    options?: {
      includeCode?: boolean;
      includeNodes?: boolean;
      includeConversations?: boolean;
      codeTopK?: number;
      nodesTopK?: number;
      conversationsTopK?: number;
    }
  ): Promise<RAGContext> {
    const {
      includeCode = true,
      includeNodes = true,
      includeConversations = true,
      codeTopK = 5,
      nodesTopK = 3,
      conversationsTopK = 2,
    } = options || {};

    const [relevantCode, relevantNodes, relevantConversations] = await Promise.all([
      includeCode ? this.searchCode(query, projectId, codeTopK) : Promise.resolve([]),
      includeNodes ? this.searchCanvasNodes(query, projectId, nodesTopK) : Promise.resolve([]),
      includeConversations ? this.searchConversations(query, sessionId, conversationsTopK) : Promise.resolve([]),
    ]);

    const summary = this.generateContextSummary(relevantCode, relevantNodes, relevantConversations);

    return {
      relevantCode,
      relevantNodes,
      relevantConversations,
      summary,
    };
  }

  private generateContextSummary(
    relevantCode: RAGContext['relevantCode'],
    relevantNodes: RAGContext['relevantNodes'],
    relevantConversations: RAGContext['relevantConversations']
  ): string {
    const parts: string[] = [];

    if (relevantCode.length > 0) {
      parts.push(`Found ${relevantCode.length} relevant code files:`);
      relevantCode.forEach((item, index) => {
        parts.push(`  ${index + 1}. ${item.filePath} (similarity: ${(item.similarity * 100).toFixed(1)}%)`);
      });
    }

    if (relevantNodes.length > 0) {
      parts.push(`\nFound ${relevantNodes.length} relevant canvas nodes:`);
      relevantNodes.forEach((item, index) => {
        parts.push(`  ${index + 1}. ${item.nodeType} node (similarity: ${(item.similarity * 100).toFixed(1)}%)`);
      });
    }

    if (relevantConversations.length > 0) {
      parts.push(`\nFound ${relevantConversations.length} relevant past conversations`);
    }

    return parts.join('\n') || 'No relevant context found';
  }

  async enhancePromptWithRAG(
    prompt: string,
    projectId?: string,
    sessionId?: string
  ): Promise<string> {
    const ragContext = await this.buildRAGContext(prompt, projectId, sessionId);

    let enhancedPrompt = prompt;

    if (ragContext.relevantCode.length > 0) {
      enhancedPrompt += '\n\n# Relevant Code Context\n';
      ragContext.relevantCode.forEach((item, index) => {
        enhancedPrompt += `\n## ${index + 1}. ${item.filePath}\n`;
        enhancedPrompt += `\`\`\`\n${item.content.substring(0, 500)}\n\`\`\`\n`;
      });
    }

    if (ragContext.relevantNodes.length > 0) {
      enhancedPrompt += '\n\n# Relevant Canvas Nodes\n';
      ragContext.relevantNodes.forEach((item, index) => {
        enhancedPrompt += `\n## ${index + 1}. ${item.nodeType} Node\n`;
        enhancedPrompt += `${item.content.substring(0, 300)}\n`;
      });
    }

    if (ragContext.relevantConversations.length > 0) {
      enhancedPrompt += '\n\n# Related Past Conversations\n';
      ragContext.relevantConversations.forEach((item, index) => {
        enhancedPrompt += `\n${index + 1}. ${item.content.substring(0, 200)}\n`;
      });
    }

    return enhancedPrompt;
  }

  async deleteProjectEmbeddings(projectId: string): Promise<void> {
    await Promise.all([
      this.supabase.from('code_embeddings').delete().eq('project_id', projectId),
      this.supabase.from('canvas_node_embeddings').delete().eq('project_id', projectId),
    ]);
  }

  async deleteSessionEmbeddings(sessionId: string): Promise<void> {
    await this.supabase
      .from('conversation_embeddings')
      .delete()
      .eq('session_id', sessionId);
  }
}

export const ragService = new RAGService();
