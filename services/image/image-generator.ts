// ============================================================
// LUNARA OS — Image Generation Service (True Fallback Chain)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution), §40 (Credentials)
// Purpose: Try providers sequentially. If one fails (network or API), move to the next.
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
  console.warn(`[Model Discovery] ⚠️ Metadata indicates text-only. Using safe fallback: ${fallbackModel}`);
  return fallbackModel;
}

// ============================================================
// MAIN GENERATOR: True Sequential Fallback Chain
// ============================================================
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator]  Starting True Fallback image generation pipeline...');
  const pipelineStart = Date.now();

  await credentialVault.ready;
  const credentials = credentialVault.getMetadata();

  // პრიორიტეტი: Cloudflare -> KIE AI -> Hugging Face -> Gemini -> Pollinations
  const priorityOrder = ['cloudflare', 'kie', 'huggingface', 'gemini', 'pollinations'];
  
  for (const targetProvider of priorityOrder) {
    const cred = credentials.find(c => 
      c.provider.toLowerCase() === targetProvider && c.status === 'ACTIVE'
    );

    if (!cred) {
      console.log(`[ImageGenerator] ⚠️ Skipping ${targetProvider}: No active credential found.`);
      continue;
    }

    // Fallback ლოგიკა თითოეული პროვაიდერისთვის
    let fallback = 'stabilityai/stable-diffusion-xl-base-1.0';
    if (targetProvider === 'cloudflare') fallback = '@cf/stabilityai/stable-diffusion-xl-base-1.0';
    if (targetProvider === 'kie') fallback = 'flux1-kontext';
    if (targetProvider === 'gemini') fallback = 'imagen-3.0-generate-001';
    
    const modelName = getImageModel(cred, fallback);
    const apiKey = credentialVault.getDecryptedValueForTesting(cred.credential_id);

    if (!apiKey) {
      console.warn(`[ImageGenerator] ⚠️ Skipping ${cred.provider}: Failed to decrypt API key.`);
      continue;
    }

    console.log(`[ImageGenerator] 🔄 Trying: ${cred.provider}, Model: ${modelName}`);

    const { visualPrompt, style = 'dark-luxury' } = options;
    const styleEnhancements: Record<string, string> = {
      'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, atmospheric, volumetric lighting, 8k resolution, masterpiece, photorealistic',
      'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, ethereal, 8k resolution, masterpiece, photorealistic',
      'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, serene, 8k resolution, masterpiece, photorealistic'
    };

    const safePrompt = visualPrompt.length > 300 ? visualPrompt.substring(0, 300) : visualPrompt;
    const finalPrompt = `${safePrompt}, ${styleEnhancements[style]}`;
    const provider = cred.provider.toLowerCase();

    try {
      // ============================================================
      // A. CLOUDFLARE WORKERS AI
      // ============================================================
      if (provider === 'cloudflare') {
        const accountId = 'b41cb921e1b841685c0f5d364f661fbe';
        const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: finalPrompt })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        console.log(`[Cloudflare] ✅ Success: Generated ${imageBuffer.length} bytes`);
        return { success: true, imageBuffer, prompt: finalPrompt, provider: 'cloudflare', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
      }

      // ============================================================
      // B. KIE.AI (Async Task)
      // ============================================================
      if (provider === 'kie') {
        console.log(`[KIE.ai] 🎨 Creating async task with model: ${modelName}`);
        
        // 1. Create Task
        const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            input: { prompt: finalPrompt, aspect_ratio: '1:1', output_format: 'jpeg', enable_translation: true }
          })
        });

        if (!createRes.ok) throw new Error(`KIE Create Task Failed: ${createRes.status}`);
        const createData = await createRes.json();
        const taskId = createData.data?.taskId;
        if (!taskId) throw new Error('No taskId from KIE');

        // 2. Poll for result
        let state = 'queuing';
        let attempts = 0;
        let resultUrl = '';

        while (state !== 'success' && state !== 'fail' && attempts < 15) {
          await new Promise(r => setTimeout(r, 4000));
          const statusRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            state = statusData.data?.state;
            if (state === 'success') {
              const resJson = JSON.parse(statusData.data?.resultJson || '{}');
              resultUrl = resJson.resultUrls?.[0];
            } else if (state === 'fail') {
              throw new Error(statusData.data?.failMsg || 'Task failed');
            }
          }
          attempts++;
        }

        if (state !== 'success' || !resultUrl) throw new Error('KIE task did not succeed');

        // 3. Download image
        const imgRes = await fetch(resultUrl);
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        console.log(`[KIE.ai] ✅ Success: Generated ${imageBuffer.length} bytes`);
        return { success: true, imageBuffer, prompt: finalPrompt, provider: 'kie', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
      }

      // ============================================================
      // C. HUGGING FACE
      // ============================================================
      if (provider === 'huggingface') {
        const apiUrl = `https://router.huggingface.co/hf-inference/models/${modelName}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'x-use-cache': 'false' },
          body: JSON.stringify({ inputs: finalPrompt, parameters: { width: 1024, height: 1024, num_inference_steps: 30, guidance_scale: 7.5 } })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => 'Unknown')}`);
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`[HuggingFace] ✅ Success: Generated ${imageBuffer.length} bytes`);
        return { success: true, imageBuffer, prompt: finalPrompt, provider: 'huggingface', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
      }

      // ============================================================
      // D. GEMINI (Predict API)
      // ============================================================
      if (provider === 'gemini') {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' }
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.predictions?.[0]?.bytesBase64Encoded) {
          throw new Error('No image data in Gemini response');
        }

        const imageBuffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
        console.log(`[Gemini] ✅ Success: Generated ${imageBuffer.length} bytes`);
        return { success: true, imageBuffer, prompt: finalPrompt, provider: 'gemini', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
      }

      // ============================================================
      // E. POLLINATIONS.AI (Last Resort)
      // ============================================================
      if (provider === 'pollinations') {
        const encodedPrompt = encodeURIComponent(finalPrompt);
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&watermark=false&seed=${seed}&enhance=true&model=flux`;

        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: { 'Accept': 'image/jpeg, image/png, image/webp', 'User-Agent': 'LunaraOS-Bot/1.0' },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      console.error(`[ImageGenerator] ❌ ${provider} failed:`, error instanceof Error ? error.message : 'Unknown error');
      console.log(`[ImageGenerator] 🔄 Moving to next provider in chain...`);
      continue; // <-- ეს არის ჯადოქრობა! თუ ჩავარდა, გადადის შემდეგზე.
    }
  }

  console.error('[ImageGenerator] ❌ CRITICAL: All image generation providers failed.');
  return { success: false, provider: 'unknown', error: 'All providers failed', latency: Date.now() - pipelineStart };
}