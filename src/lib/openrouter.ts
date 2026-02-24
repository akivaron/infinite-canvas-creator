export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
}

export async function fetchOpenRouterModels(): Promise<{ id: string; name: string; free: boolean }[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    
    return data.data
      .map((model: OpenRouterModel) => ({
        id: model.id,
        name: model.name,
        free: parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0,
      }))
      .sort((a: any, b: any) => (a.free === b.free ? a.name.localeCompare(b.name) : a.free ? -1 : 1));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

export interface ProgressCallback {
  (phase: 'thinking' | 'generating' | 'parsing' | 'finalizing', message: string, detail?: string): void;
}

export async function improvePrompt(
  apiKey: string,
  model: string,
  originalPrompt: string,
  platform: string
): Promise<{ improvedPrompt: string; caption: string }> {
  try {
    const systemPrompt = `You are a prompt engineering expert. Your task is to improve user prompts to get better results from AI code generation.

Improve the prompt by:
1. Adding specific technical details
2. Clarifying ambiguous requirements
3. Adding modern design principles
4. Specifying best practices
5. Making it more actionable

Return ONLY a JSON object with this structure:
{
  "improvedPrompt": "the enhanced version of the prompt with more details and clarity",
  "caption": "a short, catchy 3-5 word title for this project"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Infinite Canvas IDE',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Platform: ${platform}\nOriginal prompt: ${originalPrompt}\n\nImprove this prompt and generate a caption.` },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to improve prompt');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { improvedPrompt: originalPrompt, caption: 'New Project' };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      improvedPrompt: result.improvedPrompt || originalPrompt,
      caption: result.caption || 'New Project',
    };
  } catch (error) {
    console.error('Error improving prompt:', error);
    return { improvedPrompt: originalPrompt, caption: 'New Project' };
  }
}

export async function generateOpenRouterCompletion(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    onProgress?.('thinking', 'Analyzing request...', model.split('/').pop());

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Infinite Canvas IDE',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate completion');
    }

    onProgress?.('generating', 'Generating code...', 'Receiving response');

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let fileCount = 0;
    let lastFile = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          fullContent += delta;

          const pathMatches = fullContent.match(/"path"\s*:\s*"([^"]+)"/g);
          if (pathMatches && pathMatches.length > fileCount) {
            fileCount = pathMatches.length;
            const match = pathMatches[pathMatches.length - 1].match(/"path"\s*:\s*"([^"]+)"/);
            if (match && match[1] !== lastFile) {
              lastFile = match[1];
              onProgress?.('generating', `Writing ${lastFile}...`, `${fileCount} file(s)`);
            }
          }
        } catch {
          // skip invalid JSON chunks
        }
      }
    }

    onProgress?.('parsing', 'Parsing response...', `${fileCount} file(s) generated`);

    return fullContent;
  } catch (error) {
    console.error('Error generating OpenRouter completion:', error);
    throw error;
  }
}
