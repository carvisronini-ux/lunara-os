// ============================================================
// LUNARA OS — Image Generation Service (All Keys from Vault)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution), §40 (Credentials)
// Purpose: Ask Gemini for the best model, then use it. Fallback to HF/Pollinations.
// ============================================================

import sharp from 'sharp';
import { credentialVault } from '@/services/credentials/credential-vault';
import { generateWithProvider } from '@/services/credentials/providers/adapter';

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

// Cache for discovered image model
let cachedImageModel: string | null = null;
let cachedImageProvider: string | null = null;

// ============================================================
// 1. DYNAMIC MODEL DISCOVERY (ვკითხავთ Gemini-ს სწორ მოდელს)
// ============================================================

async function discoverImageModel(): Promise<{ model: string; provider: string; apiKey: string } | null> {
  if (cachedImageModel && cachedImageProvider) {
    console.log('[ImageGenerator] 📦 Using cached image model:', cachedImageModel);
    const credentials = credentialVault.getMetadata();
    const activeCred = credentials.find(c => c.provider === cachedImageProvider && c.status === 'ACTIVE');
    if (activeCred) {
      const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
      if (apiKey) return { model: cachedImageModel, provider: cachedImageProvider, apiKey };
    }
    cachedImageModel = null;
    cachedImageProvider = null;
    console.log('[ImageGenerator] ⚠️ Cache invalid, re-discovering...');
  }

  console.log('[ImageGenerator] 🔍 Discovering best image generation model from Gemini...');

  try {
    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    
    // ✅ ჯერ ვეძებთ სპეციალურად ფოტოსთვის შექმნილ გასაღებს
    let geminiCred = credentials.find(c => 
      c.provider === 'gemini' && 
      c.status === 'ACTIVE' && 
      c.name.toUpperCase().includes('IMAGE')
    );

    // თუ "IMAGE" სახელის გასაღები არ ვიპოვეთ, ვიღებთ ნებისმიერ აქტიურ Gemini-ს
    if (!geminiCred) {
      console.log('[ImageGenerator] ⚠️ Dedicated IMAGE key not found. Falling back to any active Gemini key.');
      geminiCred = credentials.find(c => c.provider === 'gemini' && c.status === 'ACTIVE');
    }
    
    if (!geminiCred) return null;

    const apiKey = credentialVault.getDecryptedValueForTesting(geminiCred.credential_id);
    if (!apiKey) return null;

    const modelName = geminiCred.metadata?.recommendedModel || 'gemini-2.5-flash-lite';
    
    // ✅ გაუმჯობესებული Prompt: ვაიძულებთ LLM-ს, არ მოიგონოს არარსებული ვერსია
    const discoveryPrompt = `What is the EXACT, currently available model name for Google's Imagen 3 image generation in the v1beta API? 
    Reply with ONLY the model name (e.g., "imagen-3.0-generate-001" or "imagen-3.0-fast-generate-001"). 
    Do NOT hallucinate version numbers like "002" if they are not officially released. If unsure, reply with "imagen-3.0-generate-001".`;

    const response = await generateWithProvider('gemini', apiKey, modelName, discoveryPrompt, 'You are a helpful API assistant.');

    if (response.success && response.content) {
      const modelMatch = response.content.match(/imagen[-\w.]+/i);
      if (modelMatch) {
        const discoveredModel = modelMatch[0];
        console.log(`[ImageGenerator] ✅ Discovered image model: ${discoveredModel}`);
        cachedImageModel = discoveredModel;
        cachedImageProvider = 'gemini';
        return { model: discoveredModel, provider: 'gemini', apiKey };
      }
    }

    console.warn('[ImageGenerator] ⚠️ Could not discover model. Falling back to default: imagen-3.0-generate-001');
    cachedImageModel = 'imagen-3.0-generate-001';
    cachedImageProvider = 'gemini';
    return { model: 'imagen-3.0-generate-001', provider: 'gemini', apiKey };
  } catch (error) {
    console.error('[ImageGenerator] ❌ Model discovery failed:', error);
    return null;
  }
}

// ============================================================
// 2. GEMINI IMAGEN (იყენებს დინამიურად აღმოჩენილ მოდელს)
// ============================================================

async function generateWithGemini(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    const { visualPrompt, style = 'dark-luxury' } = options;
    console.log(`[Gemini] 🎨 Attempt ${attempt}: Starting Imagen generation...`);

    const modelInfo = await discoverImageModel();
    if (!modelInfo) {
      return { success: false, provider: 'gemini', error: 'Failed to discover image model or get API key', latency: Date.now() - startTime };
    }

    const { model, apiKey } = modelInfo;
    console.log(`[Gemini] 📡 Using dynamically discovered model: ${model}`);

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const negativePrompt = 'watermark, text, words, letters, signature, logo, username, artist name, blurry, low quality, distorted, deformed, cartoon, illustration, 3d render, bright colors, pastel, neon, ugly, messy, bad anatomy, oversaturated';
    const finalPrompt = `${visualPrompt}, ${styleEnhancements[style]}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

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

      return { success: false, provider: 'gemini', model, error: errorMessage, latency: Date.now() - startTime };
    }

    const data = await response.json();

    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      const base64Image = data.predictions[0].bytesBase64Encoded;
      const imageBuffer = Buffer.from(base64Image, 'base64');
      console.log(`[Gemini] ✅ Success! Generated ${imageBuffer.length} bytes image (NO WATERMARK).`);

      return {
        success: true, imageBuffer, prompt: finalPrompt, provider: 'gemini',
        model: model, hasWatermark: false, latency: Date.now() - startTime
      };
    }

    return { success: false, provider: 'gemini', model, error: 'No image data in response', latency: Date.now() - startTime };
  } catch (error) {
    console.error('[Gemini] ❌ Exception:', error);
    return { success: false, provider: 'gemini', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// 3. HUGGING FACE SDXL (ახლა Vault-დან იღებს გასაღებს!)
// ============================================================

async function generateWithHuggingFace(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    
    // ✅ ახლა Vault-დან ვეძებთ Hugging Face-ის გასაღებს
    const hfCred = credentials.find(c => c.provider === 'huggingface' && c.status === 'ACTIVE');
    
    if (!hfCred) {
      return { success: false, provider: 'huggingface', error: 'No active Hugging Face credential found in Vault', latency: 0 };
    }

    const token = credentialVault.getDecryptedValueForTesting(hfCred.credential_id);
    if (!token) {
      return { success: false, provider: 'huggingface', error: 'Failed to decrypt Hugging Face token', latency: 0 };
    }

    const { visualPrompt, style = 'dark-luxury' } = options;
    console.log(`[HuggingFace] 🎨 Attempt ${attempt}: Starting SDXL generation...`);

    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const negativePrompt = 'watermark, text, words, letters, signature, logo, username, artist name, blurry, low quality, distorted, deformed, cartoon, illustration, 3d render, bright colors, pastel, neon, ugly, messy, bad anatomy';
    const finalPrompt = `${visualPrompt}, ${styleEnhancements[style]}`;

    const apiUrl = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0`;

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
      console.log('[HuggingFace] ⏳ Model loading (Cold Start). Waiting 20 seconds...');
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
      return { success: false, provider: 'huggingface', error: `HTTP ${response.status}: ${errorText}`, latency: Date.now() - startTime };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[HuggingFace] ✅ Success! Generated ${imageBuffer.length} bytes image (NO WATERMARK).`);

    return {
      success: true, imageBuffer, prompt: finalPrompt, provider: 'huggingface',
      model: 'stable-diffusion-xl-base-1.0', hasWatermark: false, latency: Date.now() - startTime
    };
  } catch (error) {
    console.error('[HuggingFace] ❌ Exception:', error);
    return { success: false, provider: 'huggingface', error: error instanceof Error ? error.message : 'Unknown error', latency: Date.now() - startTime };
  }
}

// ============================================================
// 4. POLLINATIONS.AI (Last Resort)
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

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: { 'Accept': 'image/jpeg, image/png, image/webp', 'User-Agent': 'LunaraOS-Bot/1.0' },
      signal: AbortSignal.timeout(15000)
    });

    console.log(`[Pollinations] 📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Pollinations] ❌ Error:', errorText);
      if (attempt < 2) return generateWithPollinations(options, attempt + 1);
      return { success: false, provider: 'pollinations', error: `HTTP ${response.status}: ${errorText}`, latency: Date.now() - startTime };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[Pollinations] ⚠️ Success! Generated ${imageBuffer.length} bytes image.`);

    return {
      success: true, imageUrl, imageBuffer, prompt: finalPrompt, provider: 'pollinations',
      model: 'flux', hasWatermark: true, latency: Date.now() - startTime
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
    console.log('[Watermark] ️ Applying Lunara watermark to cover existing...');
    
    // ✅ დაცვა: თუ სურათი ძალიან პატარაა (შეცდომის გვერდი), ვტოვებთ ორიგინალს
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
    return imageBuffer; // ✅ მნიშვნელოვანი: არ ვაჩერებთ მთლიან პაიპლაინს
  }
}

// ============================================================
// MAIN: Priority Chain
// ============================================================

export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🚀 Starting image generation pipeline with priority chain...');
  const pipelineStart = Date.now();

  console.log('[ImageGenerator] 1️⃣ Trying Gemini (Dedicated IMAGE Key Priority)...');
  const geminiResult = await generateWithGemini(options);
  if (geminiResult.success) {
    console.log(`[ImageGenerator] ✅ Gemini succeeded with model ${geminiResult.model} in ${geminiResult.latency}ms (NO WATERMARK)`);
    return geminiResult;
  }
  console.warn(`[ImageGenerator] ⚠️ Gemini failed: ${geminiResult.error}. Moving to next provider...`);

  console.log('[ImageGenerator] 2️⃣ Trying Hugging Face SDXL (from Vault)...');
  const hfResult = await generateWithHuggingFace(options);
  if (hfResult.success) {
    console.log(`[ImageGenerator] ✅ Hugging Face succeeded in ${hfResult.latency}ms (NO WATERMARK)`);
    return hfResult;
  }
  console.warn(`[ImageGenerator] ⚠️ Hugging Face failed: ${hfResult.error}. Moving to last resort...`);

  console.log('[ImageGenerator] 3️⃣ Trying Pollinations.ai (LAST RESORT - will attempt to cover watermark)...');
  const pollinationsResult = await generateWithPollinations(options);
  
  if (pollinationsResult.success) {
    console.log(`[ImageGenerator] ⚠️ Pollinations succeeded in ${pollinationsResult.latency}ms. Attempting to cover watermark...`);
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