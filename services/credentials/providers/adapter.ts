// ============================================================
// LUNARA OS — Unified API Adapters
// Foundation: §22, §40, §45
// Purpose: Test API keys, fetch models, generate text
// ============================================================

export interface ProviderModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface TestResult {
  success: boolean;
  provider: string;
  models: ProviderModel[];
  recommendedModel: string;
  error?: string;
  latency?: number;
}

export interface GenerateResult {
  success: boolean;
  content: string;
  model: string;
  provider: string;
  error?: string;
  latency?: number;
  cost?: number;
}

// ============================================================
// GROQ ADAPTER
// ============================================================

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

export async function testGroqApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${GROQ_API_BASE}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        provider: 'groq',
        models: [],
        recommendedModel: '',
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        latency
      };
    }

    const data = await response.json();
    const models: ProviderModel[] = data.data || [];

    // Groq-ის უფასო მოდელების პრიორიტეტი (§45 Cost Intelligence)
    const freeTierPriority = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];

    const recommendedModel = freeTierPriority.find(m => 
      models.some(model => model.id === m)
    ) || models[0]?.id || '';

    return {
      success: true,
      provider: 'groq',
      models,
      recommendedModel,
      latency
    };
  } catch (error) {
    return {
      success: false,
      provider: 'groq',
      models: [],
      recommendedModel: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

export async function generateWithGroq(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<GenerateResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'You are Lunara OS — mysterious, intelligent, emotionally precise. Write concisely. Avoid generic AI astrology clichés.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        content: '',
        model,
        provider: 'groq',
        error: errorData.error?.message || `HTTP ${response.status}`,
        latency
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      model,
      provider: 'groq',
      latency,
      cost: 0 // Groq free tier
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      model,
      provider: 'groq',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

// ============================================================
// DEEPSEEK ADAPTER
// ============================================================

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

export async function testDeepSeekApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        provider: 'deepseek',
        models: [],
        recommendedModel: '',
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        latency
      };
    }

    const data = await response.json();
    const models: ProviderModel[] = data.data || [];

    // DeepSeek-ის მოდელების პრიორიტეტი
    const recommendedModel = 
      models.find(m => m.id === 'deepseek-chat')?.id ||
      models.find(m => m.id === 'deepseek-reasoner')?.id ||
      models[0]?.id || '';

    return {
      success: true,
      provider: 'deepseek',
      models,
      recommendedModel,
      latency
    };
  } catch (error) {
    return {
      success: false,
      provider: 'deepseek',
      models: [],
      recommendedModel: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

export async function generateWithDeepSeek(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<GenerateResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'You are Lunara OS — mysterious, intelligent, emotionally precise. Write concisely. Avoid generic AI astrology clichés.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        content: '',
        model,
        provider: 'deepseek',
        error: errorData.error?.message || `HTTP ${response.status}`,
        latency
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      model,
      provider: 'deepseek',
      latency,
      cost: 0 // DeepSeek free tier (for now)
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      model,
      provider: 'deepseek',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

// ============================================================
// UNIFIED ADAPTER ROUTER
// ============================================================

export async function testProvider(provider: string, apiKey: string): Promise<TestResult> {
  switch (provider) {
    case 'groq':
      return testGroqApiKey(apiKey);
    case 'deepseek':
      return testDeepSeekApiKey(apiKey);
    default:
      return {
        success: false,
        provider,
        models: [],
        recommendedModel: '',
        error: `Testing not implemented for provider: ${provider}`
      };
  }
}

export async function generateWithProvider(
  provider: string,
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<GenerateResult> {
  switch (provider) {
    case 'groq':
      return generateWithGroq(apiKey, model, prompt, systemPrompt);
    case 'deepseek':
      return generateWithDeepSeek(apiKey, model, prompt, systemPrompt);
    default:
      return {
        success: false,
        content: '',
        model,
        provider,
        error: `Generation not implemented for provider: ${provider}`
      };
  }
}

// ============================================================
// LUNARA SYSTEM PROMPTS (§4 Brand Voice)
// ============================================================

export const LUNARA_SYSTEM_PROMPTS = {
  muse: 'You are Muse, Lunara OS Content Lead. Write in a mysterious, intelligent, intimate tone. Modern and concise. Avoid generic AI astrology clichés, fake certainty, and "AI woman + galaxy" aesthetics. Follow Dark Luxury / Cosmic Editorial style.',
  nyx: 'You are Nyx, Lunara OS Intelligence Agent. Analyze trends with precision. Be data-driven but emotionally intelligent. Identify opportunities for Lunara Media Network.',
  sage: 'You are Sage, Lunara OS Chief Strategist. Think long-term. Connect insights to strategy. Be precise and actionable.',
  aegis: 'You are Aegis, Lunara OS Quality Director. Evaluate content against brand standards. Be strict but fair. Focus on originality, emotional relevance, and brand fit.',
  echo: 'You are Echo, Lunara OS Distribution Manager. Optimize for platform-native engagement. Think about timing, hooks, and CTAs.'
};