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

// ფილტრი რომელიც გამორიცხავს არა-LLM მოდელებს
const GROQ_NON_CHAT_PATTERNS = [
  'whisper',           // Speech-to-Text
  'prompt-guard',      // Safety model
  'orpheus',           // Audio model
  'distil-whisper',    // Speech-to-Text
  'llava',             // Vision
  'safeguard',         // Safety-only models
];

// ფილტრი რომელიც გამორიცხავს არა-ინგლისურ LLM-ებს (Lunara-სთვის)
const NON_ENGLISH_PATTERNS = [
  'allam',             // არაბული
  'jais',              // არაბული
  'aya',               // მრავალენოვანი (არა ინგლისური-ფოკუსი)
];

function isGroqChatModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return !GROQ_NON_CHAT_PATTERNS.some(pattern => lower.includes(pattern));
}

function isEnglishModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return !NON_ENGLISH_PATTERNS.some(pattern => lower.includes(pattern));
}

// ჭკვიანი მოდელის შერჩევა: პრიორიტეტი ენიჭება ინგლისურ, დიდ LLM-ებს
function selectBestGroqModel(models: ProviderModel[]): string {
  // 1. ფილტრავს მხოლოდ chat/text generation მოდელებს
  const chatModels = models.filter(m => isGroqChatModel(m.id));
  
  // 2. ფილტრავს მხოლოდ ინგლისურ მოდელებს
  const englishModels = chatModels.filter(m => isEnglishModel(m.id));
  
  // 3. თუ ინგლისური მოდელები არ არის, იყენებს ყველა chat მოდელს
  const candidates = englishModels.length > 0 ? englishModels : chatModels;
  
  if (candidates.length === 0) return '';

  // 4. პრიორიტეტული სია (ყველაზე დიდი/ძლიერი პირველი)
  const priorityOrder = [
    'openai/gpt-oss-120b',      // ყველაზე დიდი
    'qwen/qwen3.8-27b',         // დიდი, მრავალენოვანი
    'openai/gpt-oss-20b',       // საშუალო
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'gemma-7b-it'
  ];

  // 5. ეძებს პრიორიტეტულ სიაში
  for (const preferred of priorityOrder) {
    if (candidates.some(m => m.id === preferred)) {
      return preferred;
    }
  }

  // 6. თუ არცერთი პრიორიტეტული არ არის, ირჩევს ყველაზე დიდ მოდელს (სახელის მიხედვით)
  // მოდელები რომლებიც შეიცავენ რიცხვებს (ზომას) — ვირჩევთ ყველაზე დიდს
  const modelsWithSize = candidates
    .map(m => {
      const match = m.id.match(/(\d+)[bB]/);
      return { model: m, size: match ? parseInt(match[1]) : 0 };
    })
    .filter(m => m.size > 0)
    .sort((a, b) => b.size - a.size);

  if (modelsWithSize.length > 0) {
    return modelsWithSize[0].model.id;
  }

  // 7. ბოლო შანსი: პირველი ხელმისაწვდომი
  return candidates[0].id;
}

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
    const allModels: ProviderModel[] = data.data || [];

    // იყენებს კვიან შერჩევას
    const recommendedModel = selectBestGroqModel(allModels);
    
    // აბრუნებს მხოლოდ chat მოდელებს UI-სთვის
    const chatModels = allModels.filter(m => isGroqChatModel(m.id));

    return {
      success: true,
      provider: 'groq',
      models: chatModels.length > 0 ? chatModels : allModels,
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
      cost: 0
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
      models.find(m => m.id.includes('flash'))?.id ||
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
      cost: 0
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