// /home/carvisronini-ux/lunara-os/lib/instagram/ai-generator.ts
import OpenAI from 'openai';

export interface HoroscopeGenerationResult {
  text1: string; // Hook (max 40-50 chars)
  text2: string; // Body (max 120-150 chars)
  hashtags: string[]; // 5-7 tags
}

export async function generateHoroscopeContent(
  zodiacName: string,
  period: 'daily' | 'weekly'
): Promise<HoroscopeGenerationResult> {
  // 1. ვამოწმებთ გასაღებს (ჯერ Groq-ს, მერე OpenAI-ს)
  // შენიშვნა: თუ გსურს Credential Vault-ის გამოყენება, აქ ჩასვი შენი ფუნქცია, მაგ: const apiKey = await getVaultKey('GROQ');
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY or OPENAI_API_KEY in environment variables or Vault');
  }

  // 2. კონფიგურაცია: თუ Groq-ს ვიყენებთ, ვცვლით baseURL-ს და მოდელს
  const isGroq = !!process.env.GROQ_API_KEY;
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
  });
  
  const model = isGroq ? 'llama3-70b-8192' : 'gpt-4o'; // Groq-სთვის ოპტიმალური მოდელი

  const periodText = period === 'daily' ? 'daily' : 'weekly';
  
  const systemPrompt = `You are an expert astrologer and Instagram copywriter for LUNARA OS.
Generate a horoscope post in ENGLISH.
Strict constraints:
1. text1: A short, engaging hook/question (e.g., "What's happening today with ${zodiacName}?"). Max 50 characters.
2. text2: Informative, interesting, and positive forecast. Max 150 characters.
3. hashtags: Exactly 5-7 relevant English hashtags, always including #LUNARA and #${zodiacName}.

Return ONLY valid JSON in this exact format:
{
  "text1": "Your hook here",
  "text2": "Your forecast here",
  "hashtags": ["#LUNARA", "#${zodiacName}", "#Astrology", "#Horoscope", "#Zodiac"]
}`;

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' }, // ვაიძულებთ JSON პასუხს
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content) as HoroscopeGenerationResult;
    
    // ვალიდაცია
    if (!parsed.text1 || !parsed.text2 || !Array.isArray(parsed.hashtags)) {
      throw new Error('Invalid JSON structure from AI');
    }

    return parsed;
  } catch (error) {
    console.error('[AI Generator] Error:', error);
    throw new Error(`AI Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}