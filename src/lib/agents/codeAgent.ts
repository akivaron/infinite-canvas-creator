import { generateOpenRouterCompletion, type ProgressCallback } from '@/lib/openrouter';
import { getSystemPrompt } from './prompts';
import type { AgentContext, AgentResult, GeneratedFile } from './types';

export async function runCodeAgent(
  ctx: AgentContext,
  onProgress?: ProgressCallback
): Promise<AgentResult> {
  const systemPrompt = getSystemPrompt(ctx.platform, ctx.language);

  const userPrompt = `Create a ${ctx.platform} project called "${ctx.title}".
Project description: ${ctx.description || 'A modern, well-designed application.'}
${ctx.language ? `Language/framework: ${ctx.language}` : ''}

Generate a unique, creative, production-quality variation. Make the design beautiful and the code complete.`;

  const response = await generateOpenRouterCompletion(
    ctx.apiKey,
    ctx.modelId,
    userPrompt,
    systemPrompt,
    onProgress
  );

  onProgress?.('finalizing', 'Building preview...', 'Almost done');

  return parseAgentResponse(response, ctx);
}

function parseAgentResponse(raw: string, ctx: AgentContext): AgentResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }

  const data = JSON.parse(jsonMatch[0]);

  const files: GeneratedFile[] = (data.files || []).map((f: any) => ({
    path: f.path || 'untitled',
    content: f.content || '',
    language: f.language || inferLanguage(f.path || ''),
  }));

  return {
    files,
    previewHtml: data.previewHtml || buildFallbackPreview(ctx.title),
    label: data.label || `${ctx.title} — ${ctx.platform}`,
    description: data.description || `Generated ${ctx.platform} project.`,
    category: data.category || (ctx.platform === 'mobile' ? 'mobile' : 'hero'),
  };
}

function inferLanguage(path: string): string {
  if (path.endsWith('.tsx')) return 'typescriptreact';
  if (path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.jsx')) return 'javascriptreact';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.sql')) return 'sql';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.rs')) return 'rust';
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.php')) return 'php';
  if (path.endsWith('.md')) return 'markdown';
  return 'text';
}

function buildFallbackPreview(title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.c{text-align:center;padding:40px}
h1{font-size:24px;font-weight:900;margin-bottom:8px}
p{font-size:13px;color:#64748b}
</style></head><body><div class="c"><h1>${title}</h1><p>Generated project files available in the code editor.</p></div></body></html>`;
}
