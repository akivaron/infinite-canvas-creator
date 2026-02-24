import type { Platform } from './types';

export interface ModelTier {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'basic' | 'good' | 'excellent';
}

const MODEL_TIERS: ModelTier[] = [
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
    speed: 'fast',
    quality: 'good',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    speed: 'fast',
    quality: 'good',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    speed: 'fast',
    quality: 'good',
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    speed: 'medium',
    quality: 'excellent',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    speed: 'medium',
    quality: 'excellent',
  },
];

export interface TaskComplexity {
  platform: Platform;
  descriptionLength: number;
  hasSpecificRequirements: boolean;
  isSubSection: boolean;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateComplexityScore(task: TaskComplexity): number {
  let score = 0;

  const platformScores: Record<Platform, number> = {
    web: 3,
    mobile: 4,
    desktop: 4,
    api: 2,
    cli: 1,
    database: 2,
  };
  score += platformScores[task.platform] || 2;

  if (task.descriptionLength > 200) score += 2;
  else if (task.descriptionLength > 100) score += 1;

  if (task.hasSpecificRequirements) score += 2;
  if (task.isSubSection) score -= 1;

  return Math.max(1, Math.min(10, score));
}

export function selectOptimalModel(
  title: string,
  description: string,
  platform: Platform,
  isSubSection: boolean = false
): string {
  const fullText = `${title} ${description}`;
  const estimatedInputTokens = estimateTokens(fullText);

  const hasSpecificRequirements =
    /animation|complex|advanced|real-?time|3d|chart|graph|dashboard|auth|payment/i.test(fullText);

  const complexity = calculateComplexityScore({
    platform,
    descriptionLength: description.length,
    hasSpecificRequirements,
    isSubSection,
  });

  console.log('[ModelSelector] Complexity score:', complexity, 'Est. tokens:', estimatedInputTokens);

  if (complexity <= 3) {
    const fastModels = MODEL_TIERS.filter(m => m.speed === 'fast');
    const sorted = fastModels.sort((a, b) => a.costPer1kInput - b.costPer1kInput);
    console.log('[ModelSelector] Using fast/cheap model:', sorted[0].id);
    return sorted[0].id;
  }

  if (complexity <= 6) {
    const goodModels = MODEL_TIERS.filter(m => m.quality === 'good' || m.speed === 'fast');
    const balanced = goodModels.sort((a, b) => {
      const costA = a.costPer1kInput + a.costPer1kOutput;
      const costB = b.costPer1kInput + b.costPer1kOutput;
      const qualityBonus = (m: ModelTier) => (m.quality === 'good' ? 0.5 : 0);
      return (costA - qualityBonus(a)) - (costB - qualityBonus(b));
    });
    console.log('[ModelSelector] Using balanced model:', balanced[0].id);
    return balanced[0].id;
  }

  const powerfulModels = MODEL_TIERS.filter(m => m.quality === 'excellent');
  const sorted = powerfulModels.sort((a, b) => a.costPer1kInput - b.costPer1kInput);
  console.log('[ModelSelector] Using powerful model:', sorted[0].id);
  return sorted[0].id;
}

export function getModelInfo(modelId: string): ModelTier | undefined {
  return MODEL_TIERS.find(m => m.id === modelId);
}

export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelInfo(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1000) * model.costPer1kInput;
  const outputCost = (outputTokens / 1000) * model.costPer1kOutput;
  return inputCost + outputCost;
}
