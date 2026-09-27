// ============================================================
// LUNARA OS — Unified API Adapters (Professional Grade)
// Foundation: §22, §40, §45, §60 (Reduce complexity, isolate credentials)
// Purpose: Flawless API key testing, intelligent model selection, text generation
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
// GLOBAL MODEL FILTERING RULES
// ============================================================

const EXCLUDE_PATTERNS = [
  'embed', 'embedding', 'vision', 'guard', 'safeguard', 'safety',
  'whisper', 'audio', 'speech', 'stt', 'tts',
  'allam', 'jais', 'aya', 'arabic', 'chinese', 'russian', // არა-ინგლისური ფოკუსი
  'base', 'pretrain' // Base მოდელები ცუდია instruction-following-ისთვის
];

const PREFER_PATTERNS = [
  'instruct', 'chat', 'versatile', 'it', 'flash', 'pro' // ინსტრუქციებზე მორგებული მოდელები
];

function isValidModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  
  // 1. უარვყოფთ აშკარად არასასურველს
  if (EXCLUDE_PATTERNS.some(pattern => lower.includes(pattern))) {
    return false;
  }
  
  // 2. ვანიჭებთ უპირატესობას instruct/chat ვარიანტებს (თუ არ არის ცნობილი გამონაკლისი)
  const hasPrefer = PREFER_PATTERNS.some(pattern => lower.includes(pattern));
  const isKnownGoodBase = lower.includes('llama-3.3-70b') || lower.includes('deepseek-v3');
  
  return hasPrefer || isKnownGoodBase || lower.includes('gpt-oss');
}

// ============================================================
// GROQ ADAPTER (Ultra-fast, Free Tier Optimized)
// ============================================================

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

function selectBestGroqModel(models: ProviderModel[]): string {
  const validModels = models.filter(m => isValidModel(m.id));
  if (validModels.length === 0) return '';

  // მკაცრი პრიორიტეტული სია (ხარისხი და უფასო ხელმისაწვდომობა)
  const priorityOrder = [
    'llama-3.3-70b-versatile',      // 🥇 საუკეთესო: უახლესი, უფასო, მაღალი ხარისხი
    'llama-3.1-70b-versatile',      // 🥈 შესანიშნავი ალტერნატივა
    'llama-3.1-8b-instant',         // 🥉 სწრაფი, მსუბუქი ამოცანებისთვის
    'mixtral-8x7b-32768',           // დიდი კონტექსტისთვის
    'gemma2-9b-it',                 // კარგი მცირე მოდელი
    'llama3-70b-8192',              // Legacy 70B
    'llama3-8b-8192'                // Legacy 8B
  ];

  for (const preferred of priorityOrder) {
    if (validModels.some(m => m.id === preferred)) {
      return preferred;
    }
  }

  // Fallback: ვირჩევთ პირველს, რომელიც შეიცავს 'llama' ან 'mixtral'-ს
  const fallback = validModels.find(m => m.id.includes('llama') || m.id.includes('mixtral') || m.id.includes('gemma'));
  return fallback ? fallback.id : validModels[0].id;
}

export async function testGroqApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${GROQ_API_BASE}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'groq', models: [], recommendedModel: '', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    const allModels: ProviderModel[] = data.data || [];
    const validModels = allModels.filter(m => isValidModel(m.id));
    const recommendedModel = selectBestGroqModel(allModels);

    return { success: true, provider: 'groq', models: validModels, recommendedModel, latency };
  } catch (error) {
    return { success: false, provider: 'groq', models: [], recommendedModel: '', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

export async function generateWithGroq(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<GenerateResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are Lunara OS — mysterious, intelligent, emotionally precise. Write concisely. Avoid generic AI astrology clichés.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, content: '', model, provider: 'groq', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '', model, provider: 'groq', latency, cost: 0 };
  } catch (error) {
    return { success: false, content: '', model, provider: 'groq', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// DEEPSEEK ADAPTER (High Quality, Generous Free Tier)
// ============================================================

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

function selectBestDeepSeekModel(models: ProviderModel[]): string {
  const validModels = models.filter(m => isValidModel(m.id));
  if (validModels.length === 0) return models[0]?.id || '';

  const priorityOrder = ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3'];
  for (const preferred of priorityOrder) {
    if (validModels.some(m => m.id === preferred)) return preferred;
  }
  return validModels[0].id;
}

export async function testDeepSeekApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'deepseek', models: [], recommendedModel: '', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    const models: ProviderModel[] = data.data || [];
    const recommendedModel = selectBestDeepSeekModel(models);
    const validModels = models.filter(m => isValidModel(m.id));

    return { success: true, provider: 'deepseek', models: validModels, recommendedModel, latency };
  } catch (error) {
    return { success: false, provider: 'deepseek', models: [], recommendedModel: '', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

export async function generateWithDeepSeek(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<GenerateResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are Lunara OS — mysterious, intelligent, emotionally precise. Write concisely. Avoid generic AI astrology clichés.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, content: '', model, provider: 'deepseek', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '', model, provider: 'deepseek', latency, cost: 0 };
  } catch (error) {
    return { success: false, content: '', model, provider: 'deepseek', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// GEMINI ADAPTER (Google AI Studio — Best Free Tier)
// ============================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function selectBestGeminiModel(models: ProviderModel[]): string {
  const validModels = models.filter(m => isValidModel(m.id));
  if (validModels.length === 0) return '';

  const priorityOrder = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  for (const preferred of priorityOrder) {
    if (validModels.some(m => m.id.includes(preferred))) {
      // ვაბრუნებთ ზუსტ ID-ს, რომელიც API-მ დააბრუნა
      return validModels.find(m => m.id.includes(preferred))!.id;
    }
  }
  return validModels[0].id;
}

export async function testGeminiApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'gemini', models: [], recommendedModel: '', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    // Gemini აბრუნებს "models/gemini-...", ჩვენ გვჭირდება მხოლოდ სახელი
    const models: ProviderModel[] = (data.models || []).map((m: any) => ({ id: m.name.replace('models/', '') }));
    const validModels = models.filter(m => isValidModel(m.id));
    const recommendedModel = selectBestGeminiModel(models);

    return { success: true, provider: 'gemini', models: validModels, recommendedModel, latency };
  } catch (error) {
    return { success: false, provider: 'gemini', models: [], recommendedModel: '', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

export async function generateWithGemini(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<GenerateResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt || ''}\n\nUser: ${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, content: '', model, provider: 'gemini', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, content, model, provider: 'gemini', latency, cost: 0 };
  } catch (error) {
    return { success: false, content: '', model, provider: 'gemini', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// MISTRAL ADAPTER (1000 req/day Free Tier)
// ============================================================

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';

function selectBestMistralModel(models: ProviderModel[]): string {
  const validModels = models.filter(m => isValidModel(m.id));
  if (validModels.length === 0) return '';

  const priorityOrder = ['mistral-small-latest', 'mistral-medium-latest', 'open-mixtral-8x7b', 'mistral-tiny'];
  for (const preferred of priorityOrder) {
    if (validModels.some(m => m.id === preferred)) return preferred;
  }
  return validModels[0].id;
}

export async function testMistralApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${MISTRAL_API_BASE}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'mistral', models: [], recommendedModel: '', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    const models: ProviderModel[] = data.data || [];
    const validModels = models.filter(m => isValidModel(m.id));
    const recommendedModel = selectBestMistralModel(models);

    return { success: true, provider: 'mistral', models: validModels, recommendedModel, latency };
  } catch (error) {
    return { success: false, provider: 'mistral', models: [], recommendedModel: '', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

export async function generateWithMistral(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<GenerateResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are Lunara OS — mysterious, intelligent, emotionally precise. Write concisely. Avoid generic AI astrology clichés.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, content: '', model, provider: 'mistral', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '', model, provider: 'mistral', latency, cost: 0 };
  } catch (error) {
    return { success: false, content: '', model, provider: 'mistral', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// HUGGING FACE ADAPTER (Free Inference API)
// ============================================================

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

export async function testHuggingFaceApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const testModel = 'mistralai/Mistral-7B-Instruct-v0.3';
    const response = await fetch(`${HF_API_BASE}/${testModel}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: 'Test', parameters: { max_new_tokens: 10 } })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'huggingface', models: [], recommendedModel: '', error: errorData.error || `HTTP ${response.status}`, latency };
    }

    const availableModels = [
      'mistralai/Mistral-7B-Instruct-v0.3',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'HuggingFaceH4/zephyr-7b-beta'
    ];
    return { success: true, provider: 'huggingface', models: availableModels.map(id => ({ id })), recommendedModel: availableModels[0], latency };
  } catch (error) {
    return { success: false, provider: 'huggingface', models: [], recommendedModel: '', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

export async function generateWithHuggingFace(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<GenerateResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${HF_API_BASE}/${model}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: `<s>[INST] ${systemPrompt || ''}\n\n${prompt} [/INST]`,
        parameters: { max_new_tokens: 1024, temperature: 0.7 }
      })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, content: '', model, provider: 'huggingface', error: errorData.error || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    const content = Array.isArray(data) && data[0]?.generated_text ? data[0].generated_text : '';
    return { success: true, content, model, provider: 'huggingface', latency, cost: 0 };
  } catch (error) {
    return { success: false, content: '', model, provider: 'huggingface', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// TOGETHER AI ADAPTER ($25 Free Credits)
// ============================================================

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

function selectBestTogetherModel(models: ProviderModel[]): string {
  const validModels = models.filter(m => isValidModel(m.id));
  if (validModels.length === 0) return '';

  const priorityOrder = [
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3-70B-Instruct',
    'mistralai/Mixtral-8x7B-Instruct-v0.1'
  ];
  for (const preferred of priorityOrder) {
    if (validModels.some(m => m.id === preferred)) return preferred;
  }
  return validModels[0].id;
}

export async function testTogetherApiKey(apiKey: string): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${TOGETHER_API_BASE}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, provider: 'together', models: [], recommendedModel: '', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    const models: ProviderModel[] = data.data || [];
    const validModels = models.filter(m => isValidModel(m.id));
    const recommendedModel = selectBestTogetherModel(models);

    return { success: true, provider: 'together', models: validModels, recommendedModel, latency };
  } catch (error) {
    return { success: false, provider: 'together', models: [], recommendedModel: '', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

export async function generateWithTogether(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<GenerateResult> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are Lunara OS — mysterious, intelligent, emotionally precise. Write concisely. Avoid generic AI astrology clichés.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, content: '', model, provider: 'together', error: errorData.error?.message || `HTTP ${response.status}`, latency };
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '', model, provider: 'together', latency, cost: 0 };
  } catch (error) {
    return { success: false, content: '', model, provider: 'together', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// UNIFIED ADAPTER ROUTER
// ============================================================

export async function testProvider(provider: string, apiKey: string): Promise<TestResult> {
  switch (provider) {
    case 'groq': return testGroqApiKey(apiKey);
    case 'deepseek': return testDeepSeekApiKey(apiKey);
    case 'gemini': return testGeminiApiKey(apiKey);
    case 'mistral': return testMistralApiKey(apiKey);
    case 'huggingface': return testHuggingFaceApiKey(apiKey);
    case 'together': return testTogetherApiKey(apiKey);
    default:
      return { success: false, provider, models: [], recommendedModel: '', error: `Testing not implemented for provider: ${provider}` };
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
    case 'groq': return generateWithGroq(apiKey, model, prompt, systemPrompt);
    case 'deepseek': return generateWithDeepSeek(apiKey, model, prompt, systemPrompt);
    case 'gemini': return generateWithGemini(apiKey, model, prompt, systemPrompt);
    case 'mistral': return generateWithMistral(apiKey, model, prompt, systemPrompt);
    case 'huggingface': return generateWithHuggingFace(apiKey, model, prompt, systemPrompt);
    case 'together': return generateWithTogether(apiKey, model, prompt, systemPrompt);
    default:
      return { success: false, content: '', model, provider, error: `Generation not implemented for provider: ${provider}` };
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