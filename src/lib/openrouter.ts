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

export async function generateOpenRouterCompletion(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
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
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate completion');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating OpenRouter completion:', error);
    throw error;
  }
}
