// ============================================================
// LUNARA OS — Image Generation Service (Dynamic Model Discovery)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution), §40 (Credentials)
// Purpose: Generate images using dynamically discovered models from Gemini
// ============================================================

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
}

export interface ImageGenerationOptions {
  visualPrompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  style?: 'dark-luxury' | 'cosmic-editorial' | 'mystic-minimal';
  width?: number;
  height?: number;
}

// Cache for discovered image model (to avoid asking every time)
let cachedImageModel: string | null = null;
let cachedImageProvider: string | null = null;

// ============================================================
// 1. DYNAMIC MODEL DISCOVERY (კითხე Gemini-ს რა მოდელი აქვს)
// ============================================================

async function discoverImageModel(): Promise<{ model: string; provider: string; apiKey: string } | null> {
  // თუ cache-ში გვაქვს, დავაბრუნოთ
  if (cachedImageModel && cachedImageProvider) {
    console.log('[ImageGenerator] 📦 Using cached image model:', cachedImageModel);
    
    const credentials = credentialVault.getMetadata();
    const activeCred = credentials.find(c => c.provider === cachedImageProvider && c.status === 'ACTIVE');
    
    if (activeCred) {
      const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
      if (apiKey) {
        return { model: cachedImageModel, provider: cachedImageProvider, apiKey };
      }
    }
    
    // Cache invalid - გავასუფთავოთ
    cachedImageModel = null;
    cachedImageProvider = null;
  }

  console.log('[ImageGenerator] 🔍 Discovering best image generation model from Gemini...');

  try {
    // ავიღოთ Gemini-ს გასაღები Credential Vault-დან
    await credentialVault.ready;
    const credentials = credentialVault.getMetadata();
    const geminiCred = credentials.find(c => c.provider === 'gemini' && c.status === 'ACTIVE');
    
    if (!geminiCred) {
      console.error('[ImageGenerator] ❌ No active Gemini credential found');
      return null;
    }

    const apiKey = credentialVault.getDecryptedValueForTesting(geminiCred.credential_id);
    if (!apiKey) {
      console.error('[ImageGenerator] ❌ Failed to decrypt Gemini API key');
      return null;
    }

    // ვკითხოთ Gemini-ს ტექსტურ მოდელს
    const modelName = geminiCred.metadata?.recommendedModel || 'gemini-2.5-flash-lite';
    
    const discoveryPrompt = `What is the best FREE image generation model available in your ecosystem (Google/Gemini)? 
Reply with ONLY the model name (e.g., "imagen-3.0-generate-002" or "imagen-3.0-fast-generate-001"). 
If you don't know, reply with "unknown".`;

    const response = await generateWithProvider('gemini', apiKey, modelName, discoveryPrompt, 'You are a helpful assistant.');

    if (response.success && response.content && !response.content.toLowerCase().includes('unknown')) {
      // ამოვიღოთ მოდელის სახელი პასუხიდან
      const modelMatch = response.content.match(/imagen[-\w.]+/i);
      if (modelMatch) {
        const discoveredModel = modelMatch[0];
        console.log(`[ImageGenerator] ✅ Discovered image model: ${discoveredModel}`);
        
        cachedImageModel = discoveredModel;
        cachedImageProvider = 'gemini';
        
        return { model: discoveredModel, provider: 'gemini', apiKey };
      }
    }

    console.warn('[ImageGenerator] ⚠️ Could not discover image model. Using fallback: imagen-3.0-generate-002');
    cachedImageModel = 'imagen-3.0-generate-002';
    cachedImageProvider = 'gemini';
    
    return { model: 'imagen-3.0-generate-002', provider: 'gemini', apiKey };
  } catch (error) {
    console.error('[ImageGenerator] ❌ Model discovery failed:', error);
    return null;
  }
}

// ============================================================
// 2. GEMINI IMAGEN (დინამიური მოდელით)
// ============================================================

async function generateWithGemini(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    const { visualPrompt, style = 'dark-luxury' } = options;

    console.log(`[Gemini] 🎨 Attempt ${attempt}: Starting image generation...`);

    // დინამიურად აღმოჩენილი მოდელი
    const modelInfo = await discoverImageModel();
    if (!modelInfo) {
      return {
        success: false,
        provider: 'gemini',
        error: 'Failed to discover image model',
        latency: Date.now() - startTime
      };
    }

    const { model, apiKey } = modelInfo;
    console.log(`[Gemini] 📡 Using model: ${model}`);

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
      console.error('[Gemini]  Error:', errorMessage);

      if (attempt < 2 && response.status === 429) {
        console.log('[Gemini] 🔄 Rate limited. Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return generateWithGemini(options, attempt + 1);
      }

      return {
        success: false,
        provider: 'gemini',
        model,
        error: errorMessage,
        latency: Date.now() - startTime
      };
    }

    const data = await response.json();

    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      const base64Image = data.predictions[0].bytesBase64Encoded;
      const imageBuffer = Buffer.from(base64Image, 'base64');

      console.log(`[Gemini] ✅ Success! Generated ${imageBuffer.length} bytes image.`);

      return {
        success: true,
        imageBuffer,
        prompt: finalPrompt,
        provider: 'gemini',
        model,
        latency: Date.now() - startTime
      };
    }

    return {
      success: false,
      provider: 'gemini',
      model,
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
// 3. HUGGING FACE SDXL (Secondary Fallback)
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
      error: 'HUGGINGFACE_API_TOKEN missing',
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
      console.log('[HuggingFace]  Model loading (Cold Start). Waiting 20 seconds...');
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
    console.log(`[HuggingFace] ✅ Success! Generated ${imageBuffer.length} bytes image.`);

    return {
      success: true,
      imageBuffer,
      prompt: finalPrompt,
      provider: 'huggingface',
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
// 4. POLLINATIONS.AI (Last Resort)
// ============================================================

async function generateWithPollinations(
  options: ImageGenerationOptions,
  attempt: number = 1
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  try {
    const { visualPrompt, width = 1024, height = 1024, style = 'dark-luxury' } = options;

    console.log(`[Pollinations] 🎨 Attempt ${attempt}: Starting generation...`);

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
    console.log(`[Pollinations] ✅ Success! Generated ${imageBuffer.length} bytes image.`);

    return {
      success: true,
      imageUrl,
      imageBuffer,
      prompt: finalPrompt,
      provider: 'pollinations',
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
// MAIN: ჭკვიანი როტაცია დინამიური მოდელის აღმოჩენით
// ============================================================

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🚀 Starting image generation pipeline with dynamic model discovery...');
  const pipelineStart = Date.now();

  // 1. ცადე Gemini (დინამიურად აღმოჩენილი მოდელით)
  console.log('[ImageGenerator] 1️⃣ Trying Gemini (dynamic model)...');
  const geminiResult = await generateWithGemini(options);
  
  if (geminiResult.success) {
    console.log(`[ImageGenerator] ✅ Gemini succeeded with model ${geminiResult.model} in ${geminiResult.latency}ms`);
    return geminiResult;
  }
  
  console.warn(`[ImageGenerator] ⚠️ Gemini failed: ${geminiResult.error}. Moving to next provider...`);

  // 2. ცადე Hugging Face SDXL
  console.log('[ImageGenerator] 2️⃣ Trying Hugging Face SDXL...');
  const hfResult = await generateWithHuggingFace(options);
  
  if (hfResult.success) {
    console.log(`[ImageGenerator] ✅ Hugging Face succeeded in ${hfResult.latency}ms`);
    return hfResult;
  }
  
  console.warn(`[ImageGenerator] ⚠️ Hugging Face failed: ${hfResult.error}. Moving to next provider...`);

  // 3. ცადე Pollinations.ai (ბოლო შანსი)
  console.log('[ImageGenerator] 3️⃣ Trying Pollinations.ai (last resort)...');
  const pollinationsResult = await generateWithPollinations(options);
  
  if (pollinationsResult.success) {
    console.log(`[ImageGenerator] ✅ Pollinations succeeded in ${pollinationsResult.latency}ms`);
    return pollinationsResult;
  }
  
  console.warn(`[ImageGenerator] ⚠️ Pollinations failed: ${pollinationsResult.error}`);

  // ყველა ჩავარდა
  const totalLatency = Date.now() - pipelineStart;
  console.error('[ImageGenerator] ❌ All providers failed!');
  
  return {
    success: false,
    error: `All image generation providers failed. Last error: ${pollinationsResult.error}`,
    latency: totalLatency
  };
}