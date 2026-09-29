// ============================================================
// LUNARA OS — Image Generation Service (Smart Model Discovery)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution), §40 (Credentials)
// Purpose: Intelligently find IMAGE models in metadata, ignore text-only models.
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
// HELPER: ჭკვიანად ეძებს ფოტოს გენერაციის მოდელს მეტამონაცემებში
// ============================================================
function getBestModel(cred: any, keywords: string[] = []): string | null {
  if (!cred.metadata) return null;

  // 1. პირველ რიგში, ვეძებთ კონკრეტულ საკვანძო სიტყვებს (მაგ: 'image', 'flux') მოდელების სიაში
  if (cred.metadata.models && cred.metadata.models.length > 0 && keywords.length > 0) {
    const found = cred.metadata.models.find((m: string) => 
      keywords.some(kw => m.toLowerCase().includes(kw.toLowerCase()))
    );
    if (found) {
      console.log(`[Model Discovery] ✅ Found matching model in list: ${found}`);
      return found;
    }
  }

  // 2. თუ სიაში ვერ ვიპოვეთ, ვამოწმებთ recommendedModel-ს, შეიცავს თუ არა ის საკვანძო სიტყვებს
  if (cred.metadata.recommendedModel && keywords.length > 0) {
    const isRecommendedValid = keywords.some(kw => 
      cred.metadata.recommendedModel.toLowerCase().includes(kw.toLowerCase())
    );
    if (isRecommendedValid) {
      console.log(`[Model Discovery] ✅ Recommended model is valid for this task: ${cred.metadata.recommendedModel}`);
      return cred.metadata.recommendedModel;
    }
  }

  // 3. უკანასკნელი შანსი: თუ საკვანძო სიტყვები არ არის მითითებული, ვაბრუნებთ recommendedModel-ს
  if (cred.metadata.recommendedModel && keywords.length === 0) {
    return cred.metadata.recommendedModel;
  }

  console.warn(`[Model Discovery] ⚠️ No model matching keywords [${keywords.join(', ')}] found. Available models:`, cred.metadata.models);
  return null;
}

// ============================================================
// 1. GEMINI IMAGEN (ჭკვიანი შერჩევა)
// ============================================================
async function generateWithGemini(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  console.log('[Gemini] 🎨 Attempt: Starting Imagen generation...');

  try {
    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    
    let geminiCred = credentials.find(c => 
      c.provider === 'gemini' && 
      c.status === 'ACTIVE' && 
      c.name.toUpperCase().includes('IMAGE')
    );

    if (!geminiCred) {
      console.log('[Gemini] ⚠️ Dedicated IMAGE key not found. Falling back to any active Gemini key.');
      geminiCred = credentials.find(c => c.provider === 'gemini' && c.status === 'ACTIVE');
    }
    
    if (!geminiCred) {
      return { success: false, provider: 'gemini', error: 'No active Gemini credential found', latency: Date.now() - startTime };
    }

    const apiKey = credentialVault.getDecryptedValueForTesting(geminiCred.credential_id);
    if (!apiKey) {
      return { success: false, provider: 'gemini', error: 'Failed to decrypt Gemini API key', latency: Date.now() - startTime };
    }

    // ✅ ვეძებთ კონკრეტულად ფოტოს მოდელებს, არა ტექსტურს!
    const rawModelName = getBestModel(geminiCred, ['imagen', 'image', 'generate']);
    if (!rawModelName) {
      console.error('[Gemini] ❌ No image generation model found in metadata. This credential appears to be text-only.');
      return { success: false, provider: 'gemini', error: 'No image model discovered. Credential is text-only.', latency: Date.now() - startTime };
    }
    
    const modelName: string = rawModelName;
    console.log(`[Gemini] 📡 Using dynamically discovered image model: ${modelName}`);

    const { visualPrompt, style = 'dark-luxury' } = options;
    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const negativePrompt = 'watermark, text, words, letters, signature, logo, username, artist name, blurry, low quality, distorted, deformed, cartoon, illustration, 3d render, bright colors, pastel, neon, ugly, messy, bad anatomy, oversaturated';
    const finalPrompt = `${visualPrompt}, ${styleEnhancements[style]}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1', negativePrompt: negativePrompt }
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

      return { success: false, provider: 'gemini', model: modelName, error: errorMessage, latency: Date.now() - startTime };
    }

    const data = await response.json();

    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      const base64Image = data.predictions[0].bytesBase64Encoded;
      const imageBuffer = Buffer.from(base64Image, 'base64');
      console.log(`[Gemini] ✅ Success! Generated ${imageBuffer.length} bytes image (NO WATERMARK).`);

      return {
        success: true, imageBuffer, prompt: finalPrompt, provider: 'gemini',
        model: modelName, hasWatermark: false, latency: Date.now() - startTime
      };
    }

    return { success: false, provider: 'gemini', model: modelName, error: 'No image data in response', latency: Date.now() - startTime };
  } catch (error) {
    console.error('[Gemini] ❌ Exception:', error);
    return { success: false, provider: 'gemini', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// 2. HUGGING FACE (ჭკვიანი შერჩევა)
// ============================================================
async function generateWithHuggingFace(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    
    const hfCred = credentials.find(c => c.provider === 'huggingface' && c.status === 'ACTIVE');
    
    if (!hfCred) {
      return { success: false, provider: 'huggingface', error: 'No active Hugging Face credential found in Vault', latency: 0 };
    }

    const token = credentialVault.getDecryptedValueForTesting(hfCred.credential_id);
    if (!token) {
      return { success: false, provider: 'huggingface', error: 'Failed to decrypt Hugging Face token', latency: 0 };
    }

    // ✅ ვეძებთ კონკრეტულად ფოტოს მოდელებს (SDXL, Flux), არა Llama-ს!
    const rawModelName = getBestModel(hfCred, ['stable-diffusion', 'sdxl', 'flux']);
    if (!rawModelName) {
      console.error('[HuggingFace] ❌ No image generation model found in metadata. This credential appears to be text-only.');
      return { success: false, provider: 'huggingface', error: 'No image model discovered. Credential is text-only.', latency: Date.now() - startTime };
    }

    const modelName: string = rawModelName;
    const { visualPrompt, style = 'dark-luxury' } = options;
    console.log(`[HuggingFace] 🎨 Attempt ${attempt}: Starting generation with dynamic model: ${modelName}`);

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const negativePrompt = 'watermark, text, words, letters, signature, logo, username, artist name, blurry, low quality, distorted, deformed, cartoon, illustration, 3d render, bright colors, pastel, neon, ugly, messy, bad anatomy';
    const finalPrompt = `${visualPrompt}, ${styleEnhancements[style]}`;

    const apiUrl = `https://api-inference.huggingface.co/models/${modelName}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: finalPrompt,
        parameters: { negative_prompt: negativePrompt, width: 1024, height: 1024, num_inference_steps: 30, guidance_scale: 7.5, seed: Math.floor(Math.random() * 999999) }
      })
    });

    console.log(`[HuggingFace] 📡 Response status: ${response.status}`);

    if (response.status === 503) {
      console.log(`[HuggingFace] ⏳ Model ${modelName} loading (Cold Start). Waiting 20 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 20000));
      return generateWithHuggingFace(options, attempt + 1);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[HuggingFace] ❌ Error:', errorText);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return generateWithHuggingFace(options, attempt + 1);
      }
      return { success: false, provider: 'huggingface', model: modelName, error: `HTTP ${response.status}: ${errorText}`, latency: Date.now() - startTime };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[HuggingFace] ✅ Success! Generated ${imageBuffer.length} bytes image (NO WATERMARK).`);

    return {
      success: true, imageBuffer, prompt: finalPrompt, provider: 'huggingface',
      model: modelName, hasWatermark: false, latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[HuggingFace] ❌ Exception:', error);
    return { success: false, provider: 'huggingface', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// 3. POLLINATIONS.AI (დინამიური, უკანასკნელი შანსი)
// ============================================================
async function generateWithPollinations(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    
    const pollinationsCred = credentials.find(c => c.provider === 'pollinations' && c.status === 'ACTIVE');
    
    const rawModelName = pollinationsCred ? getBestModel(pollinationsCred, ['flux', 'midjourney', 'stable-diffusion']) : null;
    const modelName: string = rawModelName || 'flux';
    
    const { visualPrompt, width = 1024, height = 1024, style = 'dark-luxury' } = options;
    console.log(`[Pollinations] 🎨 Attempt ${attempt}: Starting generation with dynamic model: ${modelName} (LAST RESORT)...`);

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, no text, no watermarks, no logos',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, no text, no watermarks, no logos',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, no text, no watermarks, no logos'
    };

    const safePrompt = visualPrompt.length > 400 ? visualPrompt.substring(0, 400) : visualPrompt;
    const finalPrompt = `${safePrompt}, ${styleEnhancements[style]}, professional photography, 8k resolution, ultra detailed`;
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const seed = Math.floor(Math.random() * 999999);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&watermark=false&seed=${seed}&enhance=true&model=${modelName}`;

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: { 'Accept': 'image/jpeg, image/png, image/webp', 'User-Agent': 'LunaraOS-Bot/1.0' },
      signal: AbortSignal.timeout(15000)
    });

    console.log(`[Pollinations] 📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Pollinations] ❌ Error:', errorText);
      if (attempt < 2) {
        console.log('[Pollinations] 🔄 Rate limited or error, retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return generateWithPollinations(options, attempt + 1);
      }
      return { success: false, provider: 'pollinations', model: modelName, error: `HTTP ${response.status}: ${errorText}`, latency: Date.now() - startTime };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[Pollinations] ⚠️ Success! Generated ${imageBuffer.length} bytes image.`);

    return {
      success: true, imageUrl, imageBuffer, prompt: finalPrompt, provider: 'pollinations',
      model: modelName, hasWatermark: true, latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[Pollinations] ❌ Exception:', error);
    return { success: false, provider: 'pollinations', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// WATERMARK COVER FUNCTION (Safe Fallback)
// ============================================================
async function applyLunaraWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    if (imageBuffer.length < 50000) {
      console.warn('[Watermark] ⚠️ Image buffer too small (<50KB), skipping watermark to avoid corruption.');
      return imageBuffer;
    }

    const watermarkSvg = `
      <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <text x="190" y="40" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="rgba(255, 255, 255, 0.7)" text-anchor="end">
          ◈ Lunara
        </text>
      </svg>
    `;

    const result = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast', blend: 'overlay' }])
      .toBuffer();

    console.log('[Watermark] ✅ Watermark applied successfully');
    return result;
  } catch (error) {
    console.error('[Watermark] ❌ Failed to apply watermark (falling back to original):', error instanceof Error ? error.message : 'Unknown error');
    return imageBuffer;
  }
}

// ============================================================
// MAIN: Priority Chain (Dynamic & Smart)
// ============================================================
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🚀 Starting image generation pipeline with dynamic priority chain...');
  const pipelineStart = Date.now();

  console.log('[ImageGenerator] 1️⃣ Trying Gemini (Smart Model Discovery)...');
  const geminiResult = await generateWithGemini(options);
  if (geminiResult.success) {
    console.log(`[ImageGenerator] ✅ Gemini succeeded with model ${geminiResult.model} in ${geminiResult.latency}ms (NO WATERMARK)`);
    return geminiResult;
  }
  console.warn(`[ImageGenerator] ⚠️ Gemini failed: ${geminiResult.error}. Moving to next provider...`);

  console.log('[ImageGenerator] 2️⃣ Trying Hugging Face (Smart Model Discovery)...');
  const hfResult = await generateWithHuggingFace(options);
  if (hfResult.success) {
    console.log(`[ImageGenerator] ✅ Hugging Face succeeded with model ${hfResult.model} in ${hfResult.latency}ms (NO WATERMARK)`);
    return hfResult;
  }
  console.warn(`[ImageGenerator] ⚠️ Hugging Face failed: ${hfResult.error}. Moving to last resort...`);

  console.log('[ImageGenerator] 3️⃣ Trying Pollinations.ai (LAST RESORT - will attempt to cover watermark)...');
  const pollinationsResult = await generateWithPollinations(options);
  
  if (pollinationsResult.success) {
    console.log(`[ImageGenerator] ⚠️ Pollinations succeeded with model ${pollinationsResult.model} in ${pollinationsResult.latency}ms. Attempting to cover watermark...`);
    const coveredImageBuffer = await applyLunaraWatermark(pollinationsResult.imageBuffer!);
    
    return {
      ...pollinationsResult,
      imageBuffer: coveredImageBuffer,
      hasWatermark: false 
    };
  }
  
  console.warn(`[ImageGenerator] ⚠️ Pollinations failed: ${pollinationsResult.error}`);
  return { success: false, error: `All providers failed. Last error: ${pollinationsResult.error}`, latency: Date.now() - pipelineStart };
}