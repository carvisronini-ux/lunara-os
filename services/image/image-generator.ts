// ============================================================
// LUNARA OS — Image Generation Service (Bulletproof & Debuggable)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution)
// Purpose: Generate brand-consistent images with fallback mechanisms
// ============================================================

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  prompt?: string;
  provider?: string;
  error?: string;
  latency?: number;
}

export interface ImageGenerationOptions {
  visualPrompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  style?: 'dark-luxury' | 'cosmic-editorial' | 'mystic-minimal';
  width?: number;
  height?: number;
}

async function generateWithPollinations(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  
  try {
    const { visualPrompt, width = 1280, height = 1280, style = 'dark-luxury' } = options;

    console.log(`[ImageGenerator] 🎨 Attempt ${attempt}: Starting Pollinations generation...`);
    
    // 1. შევკვეცოთ prompt თუ ძალიან გრძელია (Pollinations ზოგჯერ ბლოკავს 500+ სიმბოლოს)
    const safePrompt = visualPrompt.length > 400 ? visualPrompt.substring(0, 400) + '...' : visualPrompt;

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, no text, no watermarks, no logos',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, no text, no watermarks, no logos',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, no text, no watermarks, no logos'
    };

    const finalPrompt = `${safePrompt}, ${styleEnhancements[style]}, professional photography, 8k resolution, ultra detailed`;
    const encodedPrompt = encodeURIComponent(finalPrompt);
    
    // დავამატოთ random seed, რომ თავიდან ავიცილოთ ქეშირებული/შეცდომიანი პასუხები
    const seed = Math.floor(Math.random() * 999999);
    
    // ✅ წყალსანიშნის მოსაშლელი პარამეტრები:
    // - nologo=true: ძველი პარამეტრი ლოგოს მოსაშლელად
    // - watermark=false: ახალი პარამეტრი წყალსანიშნის მოსაშლელად
    // - model=flux: უახლესი, უმაღლესი ხარისხის მოდელი (ნაკლებად ამატებს წყალსანიშნეს)
    // - enhance=true: ავტომატური prompt გაუმჯობესება
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&watermark=false&seed=${seed}&enhance=true&model=flux`;

    console.log(`[ImageGenerator] 🌐 Fetching: ${imageUrl.substring(0, 120)}...`);

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/jpeg, image/png, image/webp',
        'User-Agent': 'LunaraOS-Bot/1.0' // ზოგიერთი სერვერი ბლოკავს default Node.js User-Agent-ს
      },
      // დავამატოთ timeout, რომ უსასრულოდ არ ელოდოს
      signal: AbortSignal.timeout(15000) // 15 წამი
    });

    console.log(`[ImageGenerator] 📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[ImageGenerator] ❌ Pollinations HTTP Error:`, errorText);
      
      // თუ პირველი მცდელობაა, ვცადოთ მეორედ (შესაძლოა დროებითი გლიტჩი იყოს)
      if (attempt === 1) {
        console.log('[ImageGenerator] 🔄 Retrying once...');
        return generateWithPollinations(options, 2);
      }
      
      return {
        success: false,
        provider: 'pollinations',
        error: `HTTP ${response.status}: ${errorText}`,
        latency: Date.now() - startTime
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    console.log(`[ImageGenerator] ✅ Success! Generated ${imageBuffer.length} bytes image.`);

    return {
      success: true,
      imageUrl,
      imageBuffer,
      prompt: finalPrompt,
      provider: 'pollinations',
      latency: Date.now() - startTime
    };
  } catch (error) {
    console.error(`[ImageGenerator] ❌ Pollinations Exception (Attempt ${attempt}):`, error);
    
    if (attempt === 1) {
      console.log('[ImageGenerator] 🔄 Retrying after exception...');
      return generateWithPollinations(options, 2);
    }

    return {
      success: false,
      provider: 'pollinations',
      error: error instanceof Error ? error.message : 'Unknown network error',
      latency: Date.now() - startTime
    };
  }
}

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator]  Starting image generation pipeline...');
  
  // 1. მთავარი პროვაიდერი: Pollinations.ai (ულიმიტო, უფასო)
  const pollinationsResult = await generateWithPollinations(options);
  
  if (pollinationsResult.success) {
    return pollinationsResult;
  }

  console.warn('[ImageGenerator] ⚠️ Pollinations failed permanently. No fallback configured yet to avoid paid APIs.');
  
  return {
    success: false,
    error: `Image generation failed: ${pollinationsResult.error}`,
    latency: pollinationsResult.latency
  };
}