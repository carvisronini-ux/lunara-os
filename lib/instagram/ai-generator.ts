// /home/carvisronini-ux/lunara-os/lib/instagram/ai-generator.ts
import { credentialVault } from '@/services/credentials/credential-vault';

export interface HoroscopeGenerationResult {
  text1: string; // მხოლოდ ჰუკი/შეკითხვა (მაქს 50 სიმბოლო)
  text2: string; // მხოლოდ პროგნოზი (მაქს 150 სიმბოლო)
  hashtags: string[]; // 5-7 ჰეშთეგი
}

export async function generateHoroscopeContent(
  zodiacName: string,
  period: 'daily' | 'weekly'
): Promise<HoroscopeGenerationResult> {
  
  // 1. ველოდებით, სანამ CredentialVault ჩატვირთავს მონაცემებს ბაზიდან
  await credentialVault.ready;

  // 2. ვითხოვთ როგორც გასაღებს, ისე რეკომენდებულ მოდელს ჭკვიანი საცავიდან
  const { apiKey: vaultApiKey, recommendedModel } = credentialVault.getCredentialDetailsByProvider('groq');

  console.log('[AI Generator] 🔑 გასაღები მოიძებნა Vault-ში:', !!vaultApiKey);
  console.log('[AI Generator] 🎯 რეკომენდებული მოდელი Vault-იდან:', recommendedModel || 'არ არის მითითებული (Fallback-ი გამოიყენება)');

  // 3. Fallback: თუ Vault-ში რატომღაც არ არის, ვცდილობთ .env-დან წაკითხვას
  let finalApiKey: string | null = vaultApiKey;
  if (!finalApiKey) {
    console.log('[AI Generator] ⚠️ Vault-მა ვერ მოიძებნა. გადავდივართ .env-ზე.');
    finalApiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || null;
  }

  if (!finalApiKey) {
    throw new Error('GROQ API Key ვერ მოიძებნა. გთხოვთ, შეამოწმოთ CredentialVault ან .env ფაილი.');
  }

  // 4. ვიყენებთ Vault-ის რეკომენდებულ მოდელს
  const modelToUse = recommendedModel || 'llama-3.3-70b-versatile';
  const periodText = period === 'daily' ? 'daily' : 'weekly';

  // ✅ ულტრა-მკაცრი პრომფტი ზუსტი დაყოფისთვის
  const systemPrompt = `You are an expert astrologer and Instagram copywriter for LUNARA OS.
Generate a ${periodText} horoscope post in ENGLISH.

STRICT VISUAL LAYOUT RULES (DO NOT BREAK):
1. "text1" MUST BE ONLY a short, engaging hook or question (e.g., "What's in store for ${zodiacName} this ${periodText}?"). MAX 50 characters. DO NOT include the actual forecast here.
2. "text2" MUST BE ONLY the actual horoscope forecast, advice, or prediction. MAX 150 characters. DO NOT repeat the hook here.
3. "hashtags": Exactly 5-7 relevant English hashtags, always including #LUNARA and #${zodiacName}.

Return ONLY valid JSON in this exact format:
{
  "text1": "Your short hook/question here",
  "text2": "Your actual forecast/advice here",
  "hashtags": ["#LUNARA", "#${zodiacName}", "#Astrology", "#Horoscope", "#Zodiac"]
}`;

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