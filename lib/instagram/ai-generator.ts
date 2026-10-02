// /home/carvisronini-ux/lunara-os/lib/instagram/ai-generator.ts

export interface HoroscopeGenerationResult {
  text1: string; // Hook (max 50 chars)
  text2: string; // Body (max 150 chars)
  hashtags: string[]; // 5-7 tags
}

export async function generateHoroscopeContent(
  zodiacName: string,
  period: 'daily' | 'weekly'
): Promise<HoroscopeGenerationResult> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY ან OPENAI_API_KEY ვერ მოიძებნა გარემოს ცვლადებში ან Vault-ში');
  }

  // ✅ ახლა period გამოიყენება პრომფთში, რაც ხდის AI-ს პასუხს უფრო ზუსტს
  const periodText = period === 'daily' ? 'daily' : 'weekly';

  const systemPrompt = `You are an expert astrologer and Instagram copywriter for LUNARA OS.
Generate a ${periodText} horoscope post in ENGLISH.
Strict constraints:
1. text1: A short, engaging hook/question (e.g., "What's happening this ${periodText} with ${zodiacName}?"). Max 50 characters.
2. text2: Informative, interesting, and positive forecast. Max 150 characters.
3. hashtags: Exactly 5-7 relevant English hashtags, always including #LUNARA and #${zodiacName}.

Return ONLY valid JSON in this exact format:
{
  "text1": "Your hook here",
  "text2": "Your forecast here",
  "hashtags": ["#LUNARA", "#${zodiacName}", "#Astrology", "#Horoscope", "#Zodiac"]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
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