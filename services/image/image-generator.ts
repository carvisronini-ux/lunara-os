// ============================================================
// LUNARA OS — Image Generation Service (Priority Chain + Watermark Cover)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution)
// Purpose: Generate images with priority: Gemini → HuggingFace → Pollinations
// Auto-cover watermarks with Lunara branding if needed
// ============================================================

import sharp from 'sharp';
import { credentialVault } from '@/services/credentials/credential-vault';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  prompt?: string;
  provider?: string;
  model?: string;
  error?: string;
  latency?: number;
  hasWatermark?: boolean;
}

export interface ImageGenerationOptions {
  visualPrompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  style?: 'dark-luxury' | 'cosmic-editorial' | 'mystic-minimal';
  width?: number;
  height?: number;
}

// ============================================================
// WATERMARK COVER FUNCTION (დაფარავს ნებისმიერ არსებულ წყალსანიშნეს)
// ============================================================

async function applyLunaraWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('[Watermark] ️ Applying Lunara watermark to cover existing...');

    const watermarkSvg = `
      <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <text x="190" y="40" 
              font-family="Arial, sans-serif" 
              font-size="14" 
              font-weight="bold"
              fill="rgba(255, 255, 255, 0.7)"
              text-anchor="end">
          ◈ Lunara
        </text>
      </svg>
    `;

    const result = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          gravity: 'southeast',
          blend: 'overlay'
        }
      ])
      .toBuffer();

    console.log('[Watermark] ✅ Watermark applied successfully');
    return result;
  } catch (error) {
    console.error('[Watermark] ❌ Failed to apply watermark:', error);
    return imageBuffer;
  }
}

// ============================================================
// 1. GEMINI IMAGEN 3 (Primary - Best Quality, No Watermark)
// ============================================================

async function generateWithGemini(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    const { visualPrompt, style = 'dark-luxury' } = options;

    console.log(`[Gemini] 🎨 Attempt ${attempt}: Starting Imagen 3 generation...`);

    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    const geminiCred = credentials.find(c => c.provider === 'gemini' && c.status === 'ACTIVE');
    
    if (!geminiCred) {
      return {
        success: false,
        provider: 'gemini',
        error: 'No active Gemini credential found',
        latency: Date.now() - startTime
      };
    }

    const apiKey = credentialVault.getDecryptedValueForTesting(geminiCred.credential_id);
    if (!apiKey) {
      return {
        success: false,
        provider: 'gemini',
        error: 'Failed to decrypt Gemini API key',
        latency: Date.now() - startTime
      };
    }

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const negativePrompt = 'watermark, text, words, letters, signature, logo, username, artist name, blurry, low quality, distorted, deformed, cartoon, illustration, 3d render, bright colors, pastel, neon, ugly, messy, bad anatomy, oversaturated';
    const finalPrompt = `${visualPrompt}, ${styleEnhancements[style]}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          negativePrompt: negativePrompt
        }
      })
    });

    console.log(`[Gemini] 📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
      console.error('[Gemini] ❌ Error:', errorMessage);

      if (attempt < 2 && response.status === 429) {
        console.log('[Gemini] 🔄 Rate limited. Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return generateWithGemini(options, attempt + 1);
      }

      return {
        success: false,
        provider: 'gemini',
        error: errorMessage,
        latency: Date.now() - startTime
      };
    }

    const data = await response.json();

    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      const base64Image = data.predictions[0].bytesBase64Encoded;
      const imageBuffer = Buffer.from(base64Image, 'base64');

      console.log(`[Gemini] ✅ Success! Generated ${imageBuffer.length} bytes image (NO WATERMARK).`);

      return {
        success: true,
        imageBuffer,
        prompt: finalPrompt,
        provider: 'gemini',
        model: 'imagen-3.0-generate-002',
        hasWatermark: false,
        latency: Date.now() - startTime
      };
    }

    return {
      success: false,
      provider: 'gemini',
      error: 'No image data in response',
      latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[Gemini] ❌ Exception:', error);
    return {
      success: false,
      provider: 'gemini',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

// ============================================================
// 2. HUGGING FACE SDXL (Secondary - Good Quality, No Watermark)
// ============================================================

async function generateWithHuggingFace(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    return {
      success: false,
      provider: 'huggingface',
      error: 'HUGGINGFACE_API_TOKEN missing in .env',
      latency: 0
    };
  }

  try {
    const { visualPrompt, style = 'dark-luxury' } = options;

    console.log(`[HuggingFace] 🎨 Attempt ${attempt}: Starting SDXL generation...`);

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const negativePrompt = 'watermark, text, words, letters, signature, logo, username, artist name, blurry, low quality, distorted, deformed, cartoon, illustration, 3d render, bright colors, pastel, neon, ugly, messy, bad anatomy';
    const finalPrompt = `${visualPrompt}, ${styleEnhancements[style]}`;

    const model = 'stabilityai/stable-diffusion-xl-base-1.0';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: finalPrompt,
        parameters: {
          negative_prompt: negativePrompt,
          width: 1024,
          height: 1024,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 999999)
        }
      })
    });

    console.log(`[HuggingFace] 📡 Response status: ${response.status}`);

    if (response.status === 503) {
      console.log('[HuggingFace] ⏳ Model loading (Cold Start). Waiting 20 seconds...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      return generateWithHuggingFace(options, attempt + 1);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[HuggingFace] ❌ Error:', errorText);

      if (attempt < 2) {
        console.log('[HuggingFace] 🔄 Retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return generateWithHuggingFace(options, attempt + 1);
      }

      return {
        success: false,
        provider: 'huggingface',
        error: `HTTP ${response.status}: ${errorText}`,
        latency: Date.now() - startTime
      };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[HuggingFace] ✅ Success! Generated ${imageBuffer.length} bytes image (NO WATERMARK).`);

    return {
      success: true,
      imageBuffer,
      prompt: finalPrompt,
      provider: 'huggingface',
      model: 'stable-diffusion-xl-base-1.0',
      hasWatermark: false,
      latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[HuggingFace] ❌ Exception:', error);
    return {
      success: false,
      provider: 'huggingface',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

// ============================================================
// 3. POLLINATIONS.AI (Last Resort - May Have Watermark)
// ============================================================

async function generateWithPollinations(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    const { visualPrompt, width = 1024, height = 1024, style = 'dark-luxury' } = options;

    console.log(`[Pollinations] 🎨 Attempt ${attempt}: Starting generation (LAST RESORT)...`);

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, no text, no watermarks, no logos',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, no text, no watermarks, no logos',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, no text, no watermarks, no logos'
    };

    const safePrompt = visualPrompt.length > 400 ? visualPrompt.substring(0, 400) : visualPrompt;
    const finalPrompt = `${safePrompt}, ${styleEnhancements[style]}, professional photography, 8k resolution, ultra detailed`;
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const seed = Math.floor(Math.random() * 999999);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&watermark=false&seed=${seed}&enhance=true&model=flux`;

    console.log(`[Pollinations] 🌐 Fetching: ${imageUrl.substring(0, 120)}...`);

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/jpeg, image/png, image/webp',
        'User-Agent': 'LunaraOS-Bot/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });

    console.log(`[Pollinations] 📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Pollinations] ❌ Error:', errorText);

      if (attempt < 2) {
        console.log('[Pollinations] 🔄 Retrying...');
        return generateWithPollinations(options, attempt + 1);
      }

      return {
        success: false,
        provider: 'pollinations',
        error: `HTTP ${response.status}: ${errorText}`,
        latency: Date.now() - startTime
      };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[Pollinations] ⚠️ Success! Generated ${imageBuffer.length} bytes image (MAY HAVE WATERMARK - will be covered).`);

    return {
      success: true,
      imageUrl,
      imageBuffer,
      prompt: finalPrompt,
      provider: 'pollinations',
      model: 'flux',
      hasWatermark: true,
      latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[Pollinations] ❌ Exception:', error);
    return {
      success: false,
      provider: 'pollinations',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
}

// ============================================================
// MAIN: ჭკვიანი როტაცია პრიორიტეტებით + წყალსანიშნის დაფარვა
// ============================================================

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🚀 Starting image generation pipeline with priority chain...');
  const pipelineStart = Date.now();

  console.log('[ImageGenerator] 1️⃣ Trying Gemini Imagen 3 (PRIORITY)...');
  const geminiResult = await generateWithGemini(options);
  
  if (geminiResult.success) {
    console.log(`[ImageGenerator] ✅ Gemini succeeded with model ${geminiResult.model} in ${geminiResult.latency}ms (NO WATERMARK)`);
    return geminiResult;
  }
  
  console.warn(`[ImageGenerator] ⚠️ Gemini failed: ${geminiResult.error}. Moving to next provider...`);

  console.log('[ImageGenerator] 2️⃣ Trying Hugging Face SDXL...');
  const hfResult = await generateWithHuggingFace(options);
  
  if (hfResult.success) {
    console.log(`[ImageGenerator] ✅ Hugging Face succeeded in ${hfResult.latency}ms (NO WATERMARK)`);
    return hfResult;
  }
  
  console.warn(`[ImageGenerator] ⚠️ Hugging Face failed: ${hfResult.error}. Moving to last resort...`);

  console.log('[ImageGenerator] 3️⃣ Trying Pollinations.ai (LAST RESORT - will cover watermark)...');
  const pollinationsResult = await generateWithPollinations(options);
  
  if (pollinationsResult.success) {
    console.log(`[ImageGenerator] ⚠️ Pollinations succeeded in ${pollinationsResult.latency}ms (HAS WATERMARK - applying cover...)`);
    
    const coveredImageBuffer = await applyLunaraWatermark(pollinationsResult.imageBuffer!);
    
    return {
      ...pollinationsResult,
      imageBuffer: coveredImageBuffer,
      hasWatermark: false
    };
  }
  
  console.warn(`[ImageGenerator] ⚠️ Pollinations failed: ${pollinationsResult.error}`);

  const totalLatency = Date.now() - pipelineStart;
  console.error('[ImageGenerator] ❌ All providers failed!');
  
  return {
    success: false,
    error: `All image generation providers failed. Last error: ${pollinationsResult.error}`,
    latency: totalLatency
  };
}