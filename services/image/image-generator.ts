// ============================================================
// LUNARA OS — Image Generation Service (Enhanced Debugging)
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
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  
  try {
    const {
      visualPrompt,
      width = 1280,
      height = 1280,
      style = 'dark-luxury'
    } = options;

    console.log('[ImageGenerator] 🎨 Starting Pollinations generation...');
    console.log('[ImageGenerator] 📝 Prompt:', visualPrompt.substring(0, 150) + '...');

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, no text, no watermarks',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, no text, no watermarks',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, no text, no watermarks'
    };

    const enhancedPrompt = `${visualPrompt}, ${styleEnhancements[style]}, professional photography, 8k resolution, ultra detailed`;
    
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;

    console.log('[ImageGenerator] 🌐 URL:', imageUrl.substring(0, 100) + '...');

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/jpeg, image/png, image/webp'
      }
    });

    console.log('[ImageGenerator] 📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageGenerator] ❌ Pollinations error:', errorText);
      return {
        success: false,
        provider: 'pollinations',
        error: `HTTP ${response.status}: ${errorText}`,
        latency: Date.now() - startTime
      };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log('[ImageGenerator] ✅ Image generated:', imageBuffer.length, 'bytes');

    return {
      success: true,
      imageUrl,
      imageBuffer,
      prompt: enhancedPrompt,
      provider: 'pollinations',
      latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[ImageGenerator] ❌ Pollinations exception:', error);
    return {
      success: false,
      provider: 'pollinations',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🎨 Starting image generation...');
  console.log('[ImageGenerator] 📝 Visual prompt:', options.visualPrompt.substring(0, 100) + '...');

  const pollinationsResult = await generateWithPollinations(options);
  
  if (pollinationsResult.success) {
    console.log(`[ImageGenerator] ✅ Pollinations succeeded in ${pollinationsResult.latency}ms`);
    return pollinationsResult;
  }

  console.warn('[ImageGenerator] ⚠️ Pollinations failed:', pollinationsResult.error);

  return {
    success: false,
    error: `All image generation providers failed: ${pollinationsResult.error}`,
    latency: 0
  };
}