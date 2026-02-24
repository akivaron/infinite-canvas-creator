import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CodeAgent } from '../services/codeAgent.js';
import { ContextAnalyzer } from '../services/contextAnalyzer.js';
import { ragService } from '../services/ragService.js';
import { createOpenRouterService } from '../services/openrouterService.js';
import type { GenerationRequest } from '../types/agent.js';

const router = Router();

const fileContextSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.string(),
  imports: z.array(z.string()).optional(),
  exports: z.array(z.string()).optional(),
});

const codeContextSchema = z.object({
  currentFile: fileContextSchema.optional(),
  relatedFiles: z.array(fileContextSchema),
  projectStructure: z.object({
    files: z.array(z.string()),
    directories: z.array(z.string()),
    dependencies: z.record(z.string()),
    framework: z.string().optional(),
    language: z.string().optional(),
  }),
  recentChanges: z.array(z.object({
    path: z.string(),
    type: z.enum(['create', 'update', 'delete']),
    timestamp: z.number(),
    diff: z.string().optional(),
  })),
});

const generationRequestSchema = z.object({
  prompt: z.string(),
  context: codeContextSchema,
  mode: z.enum(['generate', 'edit', 'complete', 'explain']),
  targetFile: z.string().optional(),
  selectionRange: z.object({
    start: z.object({ line: z.number(), character: z.number() }),
    end: z.object({ line: z.number(), character: z.number() }),
  }).optional(),
  apiKey: z.string(),
  model: z.string().optional(),
  projectId: z.string().optional(),
  sessionId: z.string().optional(),
  useRAG: z.boolean().optional(),
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const requestData = generationRequestSchema.parse(req.body) as GenerationRequest & {
      apiKey: string;
      model?: string;
      projectId?: string;
      sessionId?: string;
      useRAG?: boolean;
    };

    let enhancedPrompt = requestData.prompt;

    if (requestData.useRAG !== false) {
      try {
        enhancedPrompt = await ragService.enhancePromptWithRAG(
          requestData.prompt,
          requestData.projectId,
          requestData.sessionId
        );
      } catch (error) {
        console.warn('RAG enhancement failed, using original prompt:', error);
      }
    }

    const request: GenerationRequest = {
      ...requestData,
      prompt: enhancedPrompt,
    };

    const agent = new CodeAgent(requestData.apiKey, requestData.model);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of agent.generate(request)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Generation error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { prompt, context, position, apiKey, model } = req.body;

    const request: GenerationRequest = {
      prompt: `Complete this code: ${prompt}`,
      context,
      mode: 'complete',
      selectionRange: position ? {
        start: position,
        end: position,
      } : undefined,
    };

    const agent = new CodeAgent(apiKey, model);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of agent.generate(request)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Completion error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/explain', async (req: Request, res: Response) => {
  try {
    const { code, context, apiKey, model } = req.body;

    const request: GenerationRequest = {
      prompt: `Explain this code:\n\n${code}`,
      context,
      mode: 'explain',
    };

    const agent = new CodeAgent(apiKey, model);
    const chunks: any[] = [];

    for await (const chunk of agent.generate(request)) {
      chunks.push(chunk);
    }

    const result = chunks.find(c => c.type === 'complete')?.data;
    res.json(result || { explanation: 'No explanation generated' });
  } catch (error) {
    console.error('Explanation error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/analyze-context', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'files must be an array' });
    }

    const analyzer = new ContextAnalyzer();
    const analyzedFiles = files.map(f => analyzer.analyzeFile(f.path, f.content));

    const projectStructure = analyzer.buildProjectStructure(analyzedFiles);

    res.json({
      files: analyzedFiles,
      projectStructure,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/improve-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, platform, apiKey, model } = req.body;

    if (!prompt || !apiKey) {
      return res.status(400).json({ error: 'prompt and apiKey are required' });
    }

    const systemPrompt = `You are a prompt engineering expert. Improve user prompts for better AI code generation.

Improve the prompt by:
1. Adding specific technical details
2. Clarifying ambiguous requirements
3. Adding modern design principles
4. Specifying best practices
5. Making it more actionable

Return ONLY a JSON object:
{
  "improvedPrompt": "enhanced prompt with details",
  "caption": "short 3-5 word title"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://infinite-canvas.dev',
        'X-Title': 'Infinite Canvas IDE',
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Platform: ${platform || 'web'}\nOriginal: ${prompt}\n\nImprove this prompt.` },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('OpenRouter API error');
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.json({ improvedPrompt: prompt, caption: 'New Project' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (error) {
    console.error('Improve prompt error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      improvedPrompt: req.body.prompt,
      caption: 'New Project',
    });
  }
});

export default router;
