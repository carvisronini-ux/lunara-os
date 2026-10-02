// /home/carvisronini-ux/lunara-os/lib/instagram/ai-generator.ts
import { credentialVault } from '@/services/credentials/credential-vault';

export interface HoroscopeGenerationResult {
  text1: string; // Hook (max 50 chars)
  text2: string; // Body (max 150 chars)
  hashtags: string[]; // 5-7 tags
}

export async function generateHoroscopeContent(
  zodiacName: string,
  period: 'daily' | 'weekly'
): Promise<HoroscopeGenerationResult> {
  
  // 1. ველოდებით, სანამ CredentialVault ჩატვირთავს მონაცემებს ბაზიდან
  await credentialVault.ready;

  // 2. ვითხოვთ როგორც გასაღებს, ისე რეკომენდებულ მოდელს ჭკვიანი საცავიდან
  const { apiKey: vaultApiKey, recommendedModel } = credentialVault.getCredentialDetailsByProvider('groq');

  // 🔍 დიაგნოსტიკური ლოგები: ზუსტად რას გვაძლევს Vault?
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

  // 4. ვიყენებთ Vault-ის რეკომენდებულ მოდელს (მაგ: openai/gpt-oss-120b)
  // თუ საცავში არ არის მითითებული, ვიყენებთ სტანდარტულ fallback მოდელს
  const modelToUse = recommendedModel || 'llama-3.3-70b-versatile';

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
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: JSON.stringify({
        model: modelToUse, // ✅ ჭკვიანი საცავიდან აღებული მოდელი
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