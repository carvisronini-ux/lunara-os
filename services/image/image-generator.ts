// ============================================================
// LUNARA OS — Image Generation Service (Cloudflare + Smart HF Fallback)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution), §40 (Credentials)
// Purpose: 100% Free, No-Card required, intelligent model fallback.
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

// ⚠️ მნიშვნელოვანი: შენი Cloudflare Account ID (URL-დან აღებული)
const CLOUDFLARE_ACCOUNT_ID = 'b41cb921e1b841685c0f5d364f661fbe';

// ============================================================
// HELPER: ჭკვიანად პოულობს ფოტოს მოდელს ან იყენებს უსაფრთხო Fallback-ს
// ============================================================
function getImageModel(cred: any, fallbackModel: string): string {
  if (!cred.metadata) return fallbackModel;

  const imageKeywords = ['flux', 'stable-diffusion', 'sdxl', 'imagen', 'midjourney', 'dall-e', 'kontext', 'generate'];
  
  // 1. ვეძებთ სიაში
  if (cred.metadata.models && cred.metadata.models.length > 0) {
    const found = cred.metadata.models.find((m: string) => 
      imageKeywords.some(kw => m.toLowerCase().includes(kw))
    );
    if (found) {
      console.log(`[Model Discovery] ✅ Found image model in metadata: ${found}`);
      return found;
    }
  }

  // 2. ვამოწმებთ recommendedModel-ს
  if (cred.metadata.recommendedModel) {
    const isImageModel = imageKeywords.some(kw => 
      cred.metadata.recommendedModel.toLowerCase().includes(kw)
    );
    if (isImageModel) {
      console.log(`[Model Discovery] ✅ Recommended model is valid for images: ${cred.metadata.recommendedModel}`);
      return cred.metadata.recommendedModel;
    }
  }

  // 3. უსაფრთხო Fallback: თუ მეტამონაცემები ტექსტურია, ვიყენებთ გარანტირებულ ფოტოს მოდელს
  console.warn(`[Model Discovery] ⚠️ Metadata indicates text-only models. Using safe fallback: ${fallbackModel}`);
  return fallbackModel;
}

// ============================================================
// MAIN GENERATOR
// ============================================================
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🚀 Starting No-Card dynamic image generation pipeline...');
  const pipelineStart = Date.now();

  await credentialVault.ready;
  const credentials = credentialVault.getMetadata();

  // პრიორიტეტი: Cloudflare (უფასო/ულიმიტო) -> Hugging Face -> Pollinations
  const priorityOrder = ['cloudflare', 'huggingface', 'pollinations'];
  
  let selectedCred: any = null;
  let modelName: string = '';

  for (const targetProvider of priorityOrder) {
    const cred = credentials.find(c => 
      c.provider.toLowerCase() === targetProvider && c.status === 'ACTIVE'
    );

    if (cred) {
      selectedCred = cred;
      // Fallback ოგიკა: Cloudflare-სთვის SDXL, HF-სთვისაც SDXL
      const fallback = targetProvider === 'cloudflare' 
        ? '@cf/stabilityai/stable-diffusion-xl-base-1.0' 
        : 'stabilityai/stable-diffusion-xl-base-1.0';
      
      modelName = getImageModel(cred, fallback);
      console.log(`[ImageGenerator] ✅ Selected: ${cred.provider}, Model: ${modelName}`);
      break;
    }
  }

  if (!selectedCred) {
    console.error('[ImageGenerator]  CRITICAL: No active image generation credentials found.');
    return { success: false, provider: 'unknown', error: 'No active credentials', latency: Date.now() - pipelineStart };
  }

  const apiKey = credentialVault.getDecryptedValueForTesting(selectedCred.credential_id);
  if (!apiKey) {
    return { success: false, provider: selectedCred.provider, error: 'Failed to decrypt API key', latency: Date.now() - pipelineStart };
  }

  const { visualPrompt, style = 'dark-luxury' } = options;
  const styleEnhancements: Record<string, string> = {
    'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
    'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
    'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
  };

  const safePrompt = visualPrompt.length > 300 ? visualPrompt.substring(0, 300) : visualPrompt;
  const finalPrompt = `${safePrompt}, ${styleEnhancements[style]}`;
  const provider = selectedCred.provider.toLowerCase();

  try {
    // ============================================================
    // A. CLOUDFLARE WORKERS AI (უფასო, ულიმიტო, ბარათის გარეშე)
    // ============================================================
    if (provider === 'cloudflare') {
      console.log(`[Cloudflare] 🎨 Generating with model: ${modelName}`);
      const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${modelName}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`, 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: finalPrompt
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.errors?.[0]?.message || err.message || `HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      console.log(`[Cloudflare] ✅ Success: Generated ${imageBuffer.length} bytes (NO WATERMARK)`);
      return { success: true, imageBuffer, prompt: finalPrompt, provider: 'cloudflare', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
    }

    // ============================================================
    // B. HUGGING FACE (უსაფრთხო Fallback SDXL-ზე)
    // ============================================================
    if (provider === 'huggingface') {
      console.log(`[HuggingFace] 🎨 Generating with model: ${modelName}`);
      const apiUrl = `https://router.huggingface.co/hf-inference/models/${modelName}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`, 
          'Content-Type': 'application/json',
          'x-use-cache': 'false'
        },
        body: JSON.stringify({
          inputs: finalPrompt,
          parameters: { width: 1024, height: 1024, num_inference_steps: 30, guidance_scale: 7.5 }
        })
      });

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${err}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`[HuggingFace] ✅ Success: Generated ${imageBuffer.length} bytes (NO WATERMARK)`);
      return { success: true, imageBuffer, prompt: finalPrompt, provider: 'huggingface', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
    }

    // ============================================================
    // C. POLLINATIONS.AI (უკანასკნელი შანსი)
    // ============================================================
    if (provider === 'pollinations') {
      console.log(`[Pollinations] 🎨 Generating (LAST RESORT)`);
      const encodedPrompt = encodeURIComponent(finalPrompt);
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&watermark=false&seed=${seed}&enhance=true&model=flux`;

      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: { 'Accept': 'image/jpeg, image/png, image/webp', 'User-Agent': 'LunaraOS-Bot/1.0' },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`[Pollinations] ⚠️ Success: Generated ${imageBuffer.length} bytes.`);
      
      let finalBuffer = imageBuffer;
      if (imageBuffer.length >= 50000) {
        try {
          const watermarkSvg = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg"><text x="190" y="40" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="rgba(255, 255, 255, 0.7)" text-anchor="end">◈ Lunara</text></svg>`;
          finalBuffer = await sharp(imageBuffer).composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast', blend: 'overlay' }]).toBuffer();
          console.log('[Watermark] ✅ Applied successfully');
        } catch (e) {
          console.warn('[Watermark] ️ Failed, using original.');
        }
      }
      return { success: true, imageBuffer: finalBuffer, prompt: finalPrompt, provider: 'pollinations', model: 'flux', hasWatermark: false, latency: Date.now() - pipelineStart };
    }

    throw new Error(`Provider ${provider} logic not implemented`);

  } catch (error) {
    console.error(`[ImageGenerator] ❌ ${provider} failed:`, error);
    return { 
      success: false, 
      provider, 
      model: modelName,
      error: error instanceof Error ? error.message : 'Unknown error', 
      latency: Date.now() - pipelineStart 
    };
  }
}