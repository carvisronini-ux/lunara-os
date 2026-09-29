// ============================================================
// LUNARA OS — Image Generation Service (100% Dynamic, Zero Hardcoding)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution), §40 (Credentials)
// Purpose: Rely ENTIRELY on Vault metadata (recommendedModel). No hardcoded keywords.
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
// MAIN GENERATOR: Dynamic routing based purely on Vault metadata
// ============================================================
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  console.log('[ImageGenerator] 🚀 Starting 100% dynamic image generation pipeline...');
  const pipelineStart = Date.now();

  await credentialVault.ready;
  const credentials = credentialVault.getMetadata();

  // 1. ვეძებთ პირველ აქტიურ კრედალს, რომელსაც აქვს დატესტილი `recommendedModel`
  // პრიორიტეტი: huggingface -> gemini -> pollinations
  const priorityOrder = ['huggingface', 'gemini', 'pollinations'];
  
  let selectedCred: any = null;
  let modelName: string | null = null;

  for (const targetProvider of priorityOrder) {
    const cred = credentials.find(c => 
      c.provider.toLowerCase() === targetProvider && 
      c.status === 'ACTIVE' &&
      c.metadata?.recommendedModel // ✅ ვიყენებთ მხოლოდ იმ მოდელს, რაც "Test" ღილაკმა დაადასტურა
    );

    if (cred) {
      selectedCred = cred;
      modelName = cred.metadata.recommendedModel;
      console.log(`[ImageGenerator] ✅ Selected provider: ${cred.provider}, Model: ${modelName} (from metadata)`);
      break;
    }
  }

  if (!selectedCred || !modelName) {
    console.error('[ImageGenerator] ❌ CRITICAL: No active credential with a tested recommendedModel found.');
    console.error('[ImageGenerator] 💡 Action Required: Go to API Vault and click "Test" on your image generation keys.');
    return { 
      success: false, 
      provider: 'unknown', 
      error: 'No tested image model found in Vault. Please test credentials first.', 
      latency: Date.now() - pipelineStart 
    };
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

  // პრომპტის ოპტიმიზაცია სტაბილურობისთვის
  const safePrompt = visualPrompt.length > 300 ? visualPrompt.substring(0, 300) : visualPrompt;
  const finalPrompt = `${safePrompt}, ${styleEnhancements[style]}`;
  const provider = selectedCred.provider.toLowerCase();

  try {
    // ============================================================
    // A. HUGGING FACE (Unified Router - ავტომატურად არჩევს საუკეთესო ინფრასტრუქტურას)
    // ============================================================
    if (provider === 'huggingface') {
      console.log(`[HuggingFace] 🎨 Generating with dynamic model: ${modelName}`);
      // ✅ Unified Router: არ გვჭირდება endpoint-ის გამოცნობა, HF თვითონ ხვდება
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
    // B. GEMINI (Predict API)
    // ============================================================
    if (provider === 'gemini') {
      console.log(`[Gemini] 🎨 Generating with dynamic model: ${modelName}`);
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
      console.log(`[Gemini] ✅ Success: Generated ${imageBuffer.length} bytes (NO WATERMARK)`);
      return { success: true, imageBuffer, prompt: finalPrompt, provider: 'gemini', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
    }

    // ============================================================
    // C. POLLINATIONS.AI (Fallback)
    // ============================================================
    if (provider === 'pollinations') {
      console.log(`[Pollinations] 🎨 Generating with dynamic model: ${modelName} (LAST RESORT)`);
      const encodedPrompt = encodeURIComponent(finalPrompt);
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&watermark=false&seed=${seed}&enhance=true&model=${modelName}`;

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
      
      // ვცდილობთ წყალსანიშნის დადება, თუ სურათი რეალურია
      let finalBuffer = imageBuffer;
      if (imageBuffer.length >= 50000) {
        try {
          const watermarkSvg = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg"><text x="190" y="40" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="rgba(255, 255, 255, 0.7)" text-anchor="end">◈ Lunara</text></svg>`;
          finalBuffer = await sharp(imageBuffer).composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast', blend: 'overlay' }]).toBuffer();
          console.log('[Watermark] ✅ Applied successfully');
        } catch (wmError) {
          console.warn('[Watermark] ⚠️ Failed to apply, using original buffer:', wmError instanceof Error ? wmError.message : 'Unknown');
        }
      } else {
        console.warn('[Watermark] ⚠️ Image buffer too small (<50KB), skipping to avoid corruption.');
      }

      return { success: true, imageBuffer: finalBuffer, prompt: finalPrompt, provider: 'pollinations', model: modelName, hasWatermark: false, latency: Date.now() - pipelineStart };
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