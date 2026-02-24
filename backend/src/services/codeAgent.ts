import type { GenerationRequest, GenerationResponse, StreamChunk, CodeContext } from '../types/agent.js';
import { ContextAnalyzer } from './contextAnalyzer.js';
import { DiffGenerator } from './diffGenerator.js';
import { ASTAnalyzer } from './astAnalyzer.js';
import { SymbolResolver } from './symbolResolver.js';
import { ChangeDetector } from './changeDetector.js';
import { ConversationMemory } from './conversationMemory.js';

export class CodeAgent {
  private contextAnalyzer: ContextAnalyzer;
  private diffGenerator: DiffGenerator;
  private astAnalyzer: ASTAnalyzer;
  private symbolResolver: SymbolResolver;
  private changeDetector: ChangeDetector;
  private conversationMemory: ConversationMemory;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'anthropic/claude-3.5-sonnet') {
    this.apiKey = apiKey;
    this.model = model;
    this.contextAnalyzer = new ContextAnalyzer();
    this.diffGenerator = new DiffGenerator();
    this.astAnalyzer = new ASTAnalyzer();
    this.symbolResolver = new SymbolResolver();
    this.changeDetector = new ChangeDetector();
    this.conversationMemory = new ConversationMemory();
  }

  async *generate(request: GenerationRequest): AsyncGenerator<StreamChunk> {
    yield { type: 'progress', data: { message: 'Analyzing context...', phase: 'analyzing' } };

    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    yield { type: 'progress', data: { message: 'Generating code...', phase: 'generating' } };

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://infinite-canvas.dev',
          'X-Title': 'Infinite Canvas IDE',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { type: 'progress', data: { message: content, phase: 'streaming' } };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      yield { type: 'progress', data: { message: 'Parsing response...', phase: 'parsing' } };

      const result = await this.parseAndProcess(request);

      if (request.mode === 'edit' && request.targetFile) {
        const diff = this.diffGenerator.generateDiff(
          request.context.currentFile?.content || '',
          result.content
        );
        result.diff = diff;
        yield { type: 'diff', data: { diff, file: request.targetFile } };
      }

      yield { type: 'complete', data: result };
    } catch (error) {
      yield { type: 'error', data: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }

  private buildSystemPrompt(request: GenerationRequest): string {
    const contextPrompt = this.contextAnalyzer.buildContextPrompt(request.context);

    let basePrompt = `You are an expert software engineer AI assistant, similar to Cursor AI.

${contextPrompt}

# Your Capabilities

1. **Context-Aware**: You understand the entire project structure, dependencies, and recent changes
2. **Incremental Updates**: You can make precise edits to existing code
3. **Best Practices**: You follow modern coding standards and patterns
4. **Type Safety**: You prioritize type safety and proper error handling
5. **Consistent Style**: You match the existing code style and conventions

# Guidelines

- Always consider the existing codebase and maintain consistency
- Use the project's established patterns and conventions
- Import from existing utilities and components when possible
- Write clean, maintainable, well-documented code
- Consider edge cases and error handling
- Optimize for readability and maintainability over cleverness
`;

    if (request.mode === 'edit') {
      basePrompt += `\n# Mode: EDIT
- You are modifying existing code
- Make minimal, focused changes
- Preserve existing functionality unless asked to change it
- Return only the modified code, maintaining the original structure
`;
    } else if (request.mode === 'complete') {
      basePrompt += `\n# Mode: COMPLETION
- You are completing code at the cursor position
- Provide intelligent, context-aware completions
- Match the surrounding code style exactly
- Be concise and relevant
`;
    } else if (request.mode === 'explain') {
      basePrompt += `\n# Mode: EXPLANATION
- Explain the code clearly and concisely
- Highlight key concepts and patterns
- Provide examples if helpful
- Consider the user's likely level of understanding
`;
    } else {
      basePrompt += `\n# Mode: GENERATION
- You are creating new code from scratch
- Follow modern best practices
- Create production-quality code
- Include proper error handling and types
`;
    }

    return basePrompt;
  }

  private buildUserPrompt(request: GenerationRequest): string {
    let prompt = request.prompt;

    if (request.mode === 'edit' && request.context.currentFile) {
      prompt += `\n\n# Current File Content:\n\`\`\`${request.context.currentFile.language}\n${request.context.currentFile.content}\n\`\`\``;

      if (request.selectionRange) {
        prompt += `\n\n# Selected Range:\nLines ${request.selectionRange.start.line} to ${request.selectionRange.end.line}`;
      }
    }

    if (request.context.relatedFiles.length > 0) {
      prompt += `\n\n# Related Files Context:\n`;
      request.context.relatedFiles.forEach(file => {
        prompt += `\n## ${file.path}\n\`\`\`${file.language}\n${file.content.slice(0, 500)}...\n\`\`\``;
      });
    }

    if (request.mode === 'generate') {
      prompt += `\n\nReturn a JSON object with this structure:
{
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "file content",
      "language": "language",
      "action": "create" | "update"
    }
  ],
  "explanation": "Brief explanation of what was generated"
}`;
    }

    return prompt;
  }

  private async parseAndProcess(request: GenerationRequest): Promise<GenerationResponse> {
    return {
      type: request.mode === 'complete' ? 'completion' :
            request.mode === 'explain' ? 'explanation' :
            request.mode === 'edit' ? 'edit' : 'file',
      content: '',
      files: [],
      explanation: '',
    };
  }
}
