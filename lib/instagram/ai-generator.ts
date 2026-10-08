// /home/carvisronini-ux/lunara-os/lib/instagram/ai-generator.ts
import { credentialVault } from '@/services/credentials/credential-vault';

export interface HoroscopeGenerationResult {
  text1: string; // Only hook/question (max 50 chars)
  text2: string; // Only forecast (max 150 chars)
  hashtags: string[]; // 5-7 hashtags
}

export async function generateHoroscopeContent(
  zodiacName: string,
  period: 'daily' | 'weekly',
  config?: any
): Promise<HoroscopeGenerationResult> {
  
  await credentialVault.ready;

  const { apiKey: vaultApiKey, recommendedModel } = credentialVault.getCredentialDetailsByProvider('groq');

  console.log('[AI Generator] 🔑 Key found in Vault:', !!vaultApiKey);
  console.log('[AI Generator] 🎯 Recommended model from Vault:', recommendedModel || 'Not specified (Fallback will be used)');

  let finalApiKey: string | null = vaultApiKey;
  if (!finalApiKey) {
    console.log('[AI Generator] ⚠️ Vault not found. Falling back to .env.');
    finalApiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || null;
  }

  if (!finalApiKey) {
    throw new Error('GROQ API Key not found. Please check CredentialVault or .env file.');
  }

  const modelToUse = recommendedModel || 'llama-3.3-70b-versatile';
  const periodText = period === 'daily' ? 'daily' : 'weekly';

  let systemPrompt = `You are a warm, engaging, and mystical astrologer and Instagram copywriter for LUNARA OS.
Generate a ${periodText} horoscope post in ENGLISH. The tone must be alive, emotional, uplifting, and deeply personal. NEVER use robotic, hardcore, dry, or generic language.

STRICT VISUAL LAYOUT RULES (DO NOT BREAK):
1. "text1" MUST BE ONLY a short, engaging, emotional hook or question (e.g., "the universe is whispering to", "a beautiful secret about"). MAX 50 characters. DO NOT include the actual forecast here.
2. "text2" MUST BE ONLY the actual horoscope forecast, advice, or prediction. Make it feel personal, warm, and inspiring. MAX 150 characters. DO NOT repeat the hook here.
3. "hashtags": Exactly 5-7 relevant English hashtags, always including #LUNARA and #${zodiacName}.

Return ONLY valid JSON in this exact format:
{
  "text1": "Your short emotional hook here",
  "text2": "Your warm, personal forecast here",
  "hashtags": ["#LUNARA", "#${zodiacName}", "#Astrology", "#Horoscope", "#Zodiac"]
}`;

  // ✅ დინამიურად ვაერთიანებთ კონფიგურაციას, თუ ის არსებობს
  if (config) {
    systemPrompt = `${config.master_prompt || 'You are an expert Instagram Static Post creation agent.'}

--- THINKING STYLE ---
${config.thinking_style || ''}

--- SKILLS & CONSTRAINTS ---
${config.skills_constraints || ''}

--- SPECIFIC TASK FOR THIS GENERATION ---
${systemPrompt}`;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (!content) {
      throw new Error('Empty AI response');
    }

    const parsed = JSON.parse(content) as HoroscopeGenerationResult;
    
    if (!parsed.text1 || !parsed.text2 || !Array.isArray(parsed.hashtags)) {
      throw new Error('Invalid JSON structure from AI');
    }

    return parsed;
  } catch (error) {
    console.error('[AI Generator] Error:', error);
    throw new Error(`AI Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

// ✅ განახლებული: იღებს config-ს და აერთიანებს მას პრომპტთან
export async function generateViralText1(zodiacName: string, config?: any): Promise<string> {
  await credentialVault.ready;

  const { apiKey: vaultApiKey, recommendedModel } = credentialVault.getCredentialDetailsByProvider('groq');

  let finalApiKey: string | null = vaultApiKey;
  if (!finalApiKey) {
    finalApiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || null;
  }

  if (!finalApiKey) {
    throw new Error('API Key not found in Vault or .env');
  }

  const modelToUse = recommendedModel || 'llama-3.3-70b-versatile';

  const basePrompt = `You are a warm, engaging, and mystical Instagram copywriter for LUNARA OS.
Generate a SHORT, ALIVE, EMOTIONAL, and INTRIGUING hook or question for a horoscope post about ${zodiacName}.
It should feel personal, cosmic, and seamlessly lead into the zodiac name (which will be displayed right below it visually).

Examples of PERFECT hooks:
- "the universe is whispering to"
- "a beautiful secret about"
- "what the stars are revealing for"
- "your cosmic energy today for"
- "a magical message for"

STRICT RULES:
1. MUST BE in English.
2. MAX 40 characters.
3. DO NOT include the zodiac name in the output.
4. DO NOT include punctuation at the end (no period, no question mark).
5. Return ONLY the raw text string. NO JSON, NO quotes, NO markdown. Keep it warm and alive, never robotic or hardcore.`;

  let systemPrompt = basePrompt;
  
  // ✅ დინამიურად ვაერთიანებთ კონფიგურაციას
  if (config) {
    systemPrompt = `${config.master_prompt || 'You are an expert Instagram Static Post creation agent.'}

--- THINKING STYLE ---
${config.thinking_style || ''}

--- SKILLS & CONSTRAINTS ---
${config.skills_constraints || ''}

--- SPECIFIC TASK FOR THIS GENERATION ---
${basePrompt}`;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.9,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content?.trim();

    if (content) {
      content = content.replace(/^["']|["']$/g, '').replace(/^`+|`+$/g, '').trim();
    }

    if (!content) {
      throw new Error('Empty AI response');
    }

    return content;
  } catch (error) {
    console.error('[AI Generator] Text1 Error:', error);
    throw new Error(`AI Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

// ✅ განახლებული: იღებს config-ს და აერთიანებს მას პრომპტთან
export async function generateHoroscopeText2(zodiacName: string, text1Hook: string, config?: any): Promise<string> {
  await credentialVault.ready;

  const { apiKey: vaultApiKey, recommendedModel } = credentialVault.getCredentialDetailsByProvider('groq');

  let finalApiKey: string | null = vaultApiKey;
  if (!finalApiKey) {
    finalApiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || null;
  }

  if (!finalApiKey) {
    throw new Error('API Key not found in Vault or .env');
  }

  const modelToUse = recommendedModel || 'llama-3.3-70b-versatile';

  const basePrompt = `You are a warm, engaging, and mystical astrologer for LUNARA OS.
Your task is to write a SHORT, MEANINGFUL, and EMOTIONAL horoscope forecast for ${zodiacName}.

CONTEXT: The post starts with this hook: "${text1Hook || 'the stars'}"

⚠️ CRITICAL RULE - NO REPETITION:
Your Text 2 MUST NOT repeat, restate, or include ANY part of the hook above. 
The hook will already be displayed visually above your text. Start your forecast DIRECTLY with the actual prediction/advice.

Examples of CORRECT Text 2 (DO NOT repeat the hook):
- Hook: "a celestial secret waiting for you"
- ✅ CORRECT Text 2: "this week, your quiet strength blossoms into radiant confidence, guiding love and purpose home."
- ❌ WRONG Text 2: "a celestial secret waiting for you: this week, your quiet strength..."

STRICT RULES:
1. MUST BE in English.
2. Tone: Alive, emotional, uplifting, deeply personal, and mystical. NEVER robotic, hardcore, dry, or generic.
3. LENGTH: MAX 150 characters (1-2 short sentences). This is critical for the visual layout.
4. DO NOT start with the hook. DO NOT include the hook anywhere in your response.
5. Return ONLY the raw text string. NO JSON, NO quotes, NO markdown, NO hashtags here.`;

  let systemPrompt = basePrompt;

  // ✅ დინამიურად ვაერთიანებთ კონფიგურაციას
  if (config) {
    systemPrompt = `${config.master_prompt || 'You are an expert Instagram Static Post creation agent.'}

--- THINKING STYLE ---
${config.thinking_style || ''}

--- SKILLS & CONSTRAINTS ---
${config.skills_constraints || ''}

--- SPECIFIC TASK FOR THIS GENERATION ---
${basePrompt}`;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.85,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content?.trim();

    if (content) {
      content = content.replace(/^["']|["']$/g, '').replace(/^`+|`+$/g, '').trim();
    }

    if (!content) {
      throw new Error('Empty AI response');
    }

    return content;
  } catch (error) {
    console.error('[AI Generator] Text2 Error:', error);
    throw new Error(`AI Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}