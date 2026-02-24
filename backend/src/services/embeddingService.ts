import { pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private model: any = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.model) return;

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initialize();
    await this.initPromise;
    this.isInitializing = false;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('Initializing embedding model...');
      this.model = await pipeline('feature-extraction', this.modelName);
      console.log('Embedding model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      await this.initialize();
    }

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    try {
      const output = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      return Array.from(output.data);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  truncateText(text: string, maxLength: number = 512): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  }

  prepareCodeForEmbedding(code: string, filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    const fileExt = fileName.split('.').pop() || '';

    const cleanCode = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const prepared = `File: ${fileName} (${fileExt})\n${cleanCode}`;

    return this.truncateText(prepared, 512);
  }

  prepareCanvasNodeForEmbedding(node: any): string {
    const parts: string[] = [];

    parts.push(`Type: ${node.type}`);

    if (node.data?.label) {
      parts.push(`Label: ${node.data.label}`);
    }

    if (node.data?.prompt) {
      parts.push(`Prompt: ${node.data.prompt}`);
    }

    if (node.data?.code) {
      const cleanCode = node.data.code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(`Code: ${cleanCode.substring(0, 300)}`);
    }

    if (node.data?.value) {
      parts.push(`Value: ${JSON.stringify(node.data.value).substring(0, 100)}`);
    }

    const text = parts.join('\n');
    return this.truncateText(text, 512);
  }

  prepareConversationForEmbedding(prompt: string, response?: string): string {
    let text = `User: ${prompt}`;

    if (response) {
      text += `\nAssistant: ${response}`;
    }

    return this.truncateText(text, 512);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  async findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: { id: string; embedding: number[]; metadata?: any }[],
    topK: number = 5
  ): Promise<{ id: string; similarity: number; metadata?: any }[]> {
    const similarities = candidateEmbeddings.map(candidate => ({
      id: candidate.id,
      similarity: this.calculateSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata,
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

export const embeddingService = new EmbeddingService();
