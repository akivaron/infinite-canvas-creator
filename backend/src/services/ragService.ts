import db from '../config/database.js';
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
  async indexCode(
    projectId: string,
    filePath: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const preparedText = embeddingService.prepareCodeForEmbedding(content, filePath);
      const embedding = await embeddingService.generateEmbedding(preparedText);

      const existingResult = await db.query(
        'SELECT id FROM code_embeddings WHERE project_id = $1 AND file_path = $2',
        [projectId, filePath]
      );

      if (existingResult.rows.length > 0) {
        await db.query(
          `UPDATE code_embeddings
           SET content = $1, embedding = $2, metadata = $3, updated_at = NOW()
           WHERE id = $4`,
          [content, JSON.stringify(embedding), metadata || {}, existingResult.rows[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO code_embeddings (project_id, file_path, content, embedding, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [projectId, filePath, content, JSON.stringify(embedding), metadata || {}]
        );
      }
    } catch (error) {
      console.error('Error indexing code:', error);
      throw error;
    }
  }

  async indexNode(
    projectId: string,
    nodeId: string,
    nodeType: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const preparedText = `${nodeType}: ${content}`;
      const embedding = await embeddingService.generateEmbedding(preparedText);

      const existingResult = await db.query(
        'SELECT id FROM canvas_embeddings WHERE canvas_id = $1 AND node_id = $2',
        [projectId, nodeId]
      );

      if (existingResult.rows.length > 0) {
        await db.query(
          `UPDATE canvas_embeddings
           SET content = $1, embedding = $2, metadata = $3, updated_at = NOW()
           WHERE id = $4`,
          [content, JSON.stringify(embedding), metadata || {}, existingResult.rows[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO canvas_embeddings (canvas_id, node_id, content, embedding, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [projectId, nodeId, content, JSON.stringify(embedding), metadata || {}]
        );
      }
    } catch (error) {
      console.error('Error indexing node:', error);
      throw error;
    }
  }

  async indexConversationTurn(
    sessionId: string,
    turnId: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const embedding = await embeddingService.generateEmbedding(content);

      await db.query(
        `INSERT INTO agent_context_embeddings (session_id, turn_id, content, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (turn_id) DO UPDATE
         SET content = $3, embedding = $4, metadata = $5, updated_at = NOW()`,
        [sessionId, turnId, content, JSON.stringify(embedding), metadata || {}]
      );
    } catch (error) {
      console.error('Error indexing conversation:', error);
      throw error;
    }
  }

  async searchCode(
    projectId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const result = await db.query(
        `SELECT
          file_path,
          content,
          metadata,
          1 - (embedding::vector <=> $1::vector) as similarity
         FROM code_embeddings
         WHERE project_id = $2
           AND 1 - (embedding::vector <=> $1::vector) > $3
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $4`,
        [JSON.stringify(queryEmbedding), projectId, threshold, limit]
      );

      return result.rows.map(row => ({
        filePath: row.file_path,
        content: row.content,
        similarity: row.similarity,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error searching code:', error);
      return [];
    }
  }

  async searchNodes(
    projectId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const result = await db.query(
        `SELECT
          node_id,
          content,
          metadata,
          1 - (embedding::vector <=> $1::vector) as similarity
         FROM canvas_embeddings
         WHERE canvas_id = $2
           AND 1 - (embedding::vector <=> $1::vector) > $3
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $4`,
        [JSON.stringify(queryEmbedding), projectId, threshold, limit]
      );

      return result.rows.map(row => ({
        nodeId: row.node_id,
        nodeType: row.metadata?.nodeType || 'unknown',
        content: row.content,
        similarity: row.similarity,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error searching nodes:', error);
      return [];
    }
  }

  async searchConversations(
    sessionId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const result = await db.query(
        `SELECT
          turn_id,
          content,
          metadata,
          1 - (embedding::vector <=> $1::vector) as similarity
         FROM agent_context_embeddings
         WHERE session_id = $2
           AND 1 - (embedding::vector <=> $1::vector) > $3
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $4`,
        [JSON.stringify(queryEmbedding), sessionId, threshold, limit]
      );

      return result.rows.map(row => ({
        turnId: row.turn_id,
        content: row.content,
        similarity: row.similarity,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  async getRAGContext(
    projectId: string,
    sessionId: string,
    query: string,
    options?: {
      codeLimit?: number;
      nodeLimit?: number;
      conversationLimit?: number;
      threshold?: number;
    }
  ): Promise<RAGContext> {
    const {
      codeLimit = 5,
      nodeLimit = 5,
      conversationLimit = 5,
      threshold = 0.7
    } = options || {};

    const [relevantCode, relevantNodes, relevantConversations] = await Promise.all([
      this.searchCode(projectId, query, codeLimit, threshold),
      this.searchNodes(projectId, query, nodeLimit, threshold),
      this.searchConversations(sessionId, query, conversationLimit, threshold)
    ]);

    const summary = this.generateSummary(relevantCode, relevantNodes, relevantConversations);

    return {
      relevantCode,
      relevantNodes,
      relevantConversations,
      summary
    };
  }

  private generateSummary(
    code: any[],
    nodes: any[],
    conversations: any[]
  ): string {
    const parts: string[] = [];

    if (code.length > 0) {
      parts.push(`Found ${code.length} relevant code files`);
    }

    if (nodes.length > 0) {
      parts.push(`Found ${nodes.length} relevant canvas nodes`);
    }

    if (conversations.length > 0) {
      parts.push(`Found ${conversations.length} relevant conversation turns`);
    }

    return parts.length > 0
      ? parts.join('. ') + '.'
      : 'No relevant context found.';
  }

  async deleteProjectEmbeddings(projectId: string): Promise<void> {
    await Promise.all([
      db.query('DELETE FROM code_embeddings WHERE project_id = $1', [projectId]),
      db.query('DELETE FROM canvas_embeddings WHERE canvas_id = $1', [projectId])
    ]);
  }

  async deleteSessionEmbeddings(sessionId: string): Promise<void> {
    await db.query('DELETE FROM agent_context_embeddings WHERE session_id = $1', [sessionId]);
  }

  async batchIndexCode(
    projectId: string,
    files: Array<{ filePath: string; content: string; metadata?: any }>
  ): Promise<void> {
    await Promise.all(
      files.map(file =>
        this.indexCode(projectId, file.filePath, file.content, file.metadata)
      )
    );
  }

  async getProjectStats(projectId: string) {
    const [codeResult, nodeResult] = await Promise.all([
      db.query(
        'SELECT COUNT(*) as count FROM code_embeddings WHERE project_id = $1',
        [projectId]
      ),
      db.query(
        'SELECT COUNT(*) as count FROM canvas_embeddings WHERE canvas_id = $1',
        [projectId]
      )
    ]);

    return {
      codeFiles: parseInt(codeResult.rows[0]?.count || '0'),
      nodes: parseInt(nodeResult.rows[0]?.count || '0')
    };
  }
}

export const ragService = new RAGService();
