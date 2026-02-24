export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export class OpenRouterService {
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
  ): Promise<Response> {
    const {
      model = 'anthropic/claude-3.5-sonnet',
      temperature = 0.7,
      max_tokens = 4000,
      top_p = 1,
      frequency_penalty = 0,
      presence_penalty = 0,
      stream = false,
    } = options;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://infinite-canvas.dev',
        'X-Title': 'Infinite Canvas IDE',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        stream,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.statusText} - ${error}`);
    }

    return response;
  }

  async chatStream(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
  ): Promise<Response> {
    return this.chat(messages, { ...options, stream: true });
  }

  async chatComplete(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
  ): Promise<string> {
    const response = await this.chat(messages, { ...options, stream: false });
    const data: any = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenRouter');
    }

    return data.choices[0].message.content;
  }

  async getModels(): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.data || [];
  }

  async improvePrompt(
    prompt: string,
    platform: 'web' | 'mobile' | 'desktop' = 'web'
  ): Promise<{ improvedPrompt: string; caption: string }> {
    const systemPrompt = `You are an expert at improving app generation prompts.
Your job is to take a basic prompt and enhance it with specific details, best practices, and modern design patterns.

Guidelines:
- Add specific technical requirements
- Include UI/UX best practices
- Mention responsive design
- Specify modern frameworks and tools
- Add accessibility considerations
- Include performance optimization hints

Return a JSON object with two fields:
1. "improvedPrompt": The enhanced, detailed prompt
2. "caption": A short 3-5 word catchy title for the app

Platform: ${platform}`;

    const userPrompt = `Improve this prompt: "${prompt}"`;

    const response = await this.chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.8,
        max_tokens: 1000,
      }
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse improved prompt JSON:', error);
    }

    return {
      improvedPrompt: prompt,
      caption: 'Custom App',
    };
  }

  async explainCode(code: string, context?: string): Promise<string> {
    const systemPrompt = `You are an expert code explainer.
Explain code clearly and concisely, focusing on:
- What the code does
- Key concepts and patterns
- Important details
- Potential improvements`;

    let userPrompt = `Explain this code:\n\n\`\`\`\n${code}\n\`\`\``;

    if (context) {
      userPrompt += `\n\nContext: ${context}`;
    }

    return this.chatComplete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  async generateCompletion(
    code: string,
    cursorPosition: { line: number; character: number },
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are an intelligent code completion assistant.
Generate the most likely code continuation based on the context.
Return ONLY the completion code, no explanations.`;

    const lines = code.split('\n');
    const currentLine = lines[cursorPosition.line] || '';
    const beforeCursor = currentLine.substring(0, cursorPosition.character);

    let userPrompt = `Complete this code:\n\n${code}\n\nCursor at line ${cursorPosition.line}, position ${cursorPosition.character}\nCurrent line: ${beforeCursor}|`;

    if (context) {
      userPrompt += `\n\nContext: ${context}`;
    }

    return this.chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3,
        max_tokens: 500,
      }
    );
  }
}

export function createOpenRouterService(apiKey: string): OpenRouterService {
  return new OpenRouterService(apiKey);
}
