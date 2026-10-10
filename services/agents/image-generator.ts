// /home/carvisronini-ux/lunara-os/services/agents/image-generator.ts
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  provider?: string;
}

export class ImageGenerator {
  /**
   * გენერირებს სურათს image_prompt-ის საფუძველზე.
   * იყენებს KIE AI-ს (primary) ან Gemini Imagen/Gemini Flash-ს (fallback).
   */
  async generateImage(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    console.log(`\n[ImageGenerator] 🎨 ==========================================`);
    console.log(`[ImageGenerator] 🎨 Starting image generation for: ${agentType}`);
    console.log(`[ImageGenerator] 📝 Prompt preview: ${imagePrompt.substring(0, 100)}...`);

    // ველოდებით CredentialVault-ის მზადყოფნას
    await credentialVault.ready;

    // 1. ცდილობს KIE AI-ის გამოყენებას
    try {
      console.log(`[ImageGenerator] 🔄 Attempt 1: Trying KIE AI...`);
      const kieResult = await this.generateWithKIE(imagePrompt, agentType);
      if (kieResult.success) {
        console.log(`[ImageGenerator] ✅ KIE AI succeeded!`);
        return kieResult;
      }
      console.warn(`[ImageGenerator] ⚠️ KIE AI failed: ${kieResult.error}. Moving to fallback...`);
    } catch (error) {
      console.error(`[ImageGenerator] ❌ KIE AI critical error:`, error);
    }

    // 2. Fallback: Gemini Imagen 3 (სპეციალური სურათების მოდელი)
    try {
      console.log(`[ImageGenerator] 🔄 Attempt 2: Trying Gemini Imagen 3...`);
      const imagenResult = await this.generateWithGeminiImagen(imagePrompt, agentType);
      if (imagenResult.success) {
        console.log(`[ImageGenerator] ✅ Gemini Imagen 3 succeeded!`);
        return imagenResult;
      }
      console.warn(`[ImageGenerator] ⚠️ Gemini Imagen 3 failed: ${imagenResult.error}. Moving to next fallback...`);
    } catch (error) {
      console.error(`[ImageGenerator] ❌ Gemini Imagen 3 critical error:`, error);
    }

    // 3. Fallback: Gemini 2.0 Flash Exp (მულტიმოდალური მოდელი, ხშირად სხვა ლიმიტით)
    try {
      console.log(`[ImageGenerator] 🔄 Attempt 3: Trying Gemini 2.0 Flash Exp...`);
      const flashResult = await this.generateWithGeminiFlash(imagePrompt, agentType);
      if (flashResult.success) {
        console.log(`[ImageGenerator] ✅ Gemini 2.0 Flash succeeded!`);
        return flashResult;
      }
      console.warn(`[ImageGenerator] ⚠️ Gemini 2.0 Flash failed: ${flashResult.error}.`);
    } catch (error) {
      console.error(`[ImageGenerator] ❌ Gemini 2.0 Flash critical error:`, error);
    }

    // ყველა მეთოდი ვერ იმუშავა
    console.error(`[ImageGenerator] ❌ ==========================================`);
    console.error(`[ImageGenerator] ❌ All image generation methods failed.`);
    return {
      success: false,
      error: 'All image generators (KIE AI, Gemini Imagen 3, Gemini 2.0 Flash) failed. Check API credentials, quotas, or prompt validity.'
    };
  }

  /**
   * KIE AI-ის გამოყენებით სურათის გენერაცია
   */
  private async generateWithKIE(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const cred = credentialVault.getCredentialByProvider('kie', 'spend');
    if (!cred) {
      return { success: false, error: 'KIE AI credential not found in vault' };
    }

    const leaseId = accessManager.requestAccess(
      `${agentType}-img-kie`,
      'kie',
      'spend',
      `Generate image for ${agentType}`,
      null,
      120
    );

    if (!leaseId) {
      return { success: false, error: 'Failed to acquire KIE AI lease' };
    }

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-kie`);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt KIE AI API key' };
      }

      const model = cred.metadata?.recommendedModel || 'flux1-kontext';
      console.log(`[ImageGenerator] 🤖 Using KIE AI model: ${model}`);

      const response = await fetch('https://api.kie.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: imagePrompt,
          n: 1,
          size: '1024x1280', // 4:5 პროპორცია Telegram-ისთვის
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`KIE AI API Error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      
      if (data.data && data.data[0] && data.data[0].url) {
        return { success: true, imageUrl: data.data[0].url, provider: 'kie' };
      } else if (data.data && data.data[0] && data.data[0].b64_json) {
        const buffer = Buffer.from(data.data[0].b64_json, 'base64');
        return { success: true, imageBuffer: buffer, provider: 'kie' };
      } else {
        throw new Error('Invalid response format from KIE AI');
      }

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }

  /**
   * Gemini Imagen 3-ის გამოყენებით სურათის გენერაცია (სპეციალური მოდელი)
   */
  private async generateWithGeminiImagen(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const cred = credentialVault.getCredentialByProvider('gemini', 'spend');
    if (!cred) {
      return { success: false, error: 'Gemini credential not found in vault' };
    }

    const leaseId = accessManager.requestAccess(
      `${agentType}-img-imagen`,
      'gemini',
      'spend',
      `Generate image with Imagen 3 for ${agentType}`,
      null,
      120
    );

    if (!leaseId) {
      return { success: false, error: 'Failed to acquire Gemini Imagen lease' };
    }

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-imagen`);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt Gemini API key' };
      }

      console.log(`[ImageGenerator] 🤖 Using Gemini Imagen 3 model...`);

      // Imagen 3-ის სპეციფიური API endpoint და ფორმატი
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '4:5',
              personGeneration: 'allow_all'
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Imagen API Error: ${response.status} - ${errorText.substring(0, 300)}`);
      }

      const data = await response.json();
      
      if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
        return { success: true, imageBuffer: buffer, provider: 'gemini-imagen' };
      } else {
        throw new Error('No image data found in Gemini Imagen response');
      }

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }

  /**
   * Gemini 2.0 Flash Exp-ის გამოყენებით სურათის გენერაცია (მულტიმოდალური fallback)
   */
  private async generateWithGeminiFlash(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const cred = credentialVault.getCredentialByProvider('gemini', 'spend');
    if (!cred) {
      return { success: false, error: 'Gemini credential not found in vault' };
    }

    const leaseId = accessManager.requestAccess(
      `${agentType}-img-flash`,
      'gemini',
      'spend',
      `Generate image with Flash for ${agentType}`,
      null,
      120
    );

    if (!leaseId) {
      return { success: false, error: 'Failed to acquire Gemini Flash lease' };
    }

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-flash`);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt Gemini API key' };
      }

      console.log(`[ImageGenerator] 🤖 Using Gemini 2.0 Flash Exp model...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `Generate a high-quality image based on this exact description, no text or watermarks: ${imagePrompt}` }]
            }],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT']
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Flash API Error: ${response.status} - ${errorText.substring(0, 300)}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          return { success: true, imageBuffer: buffer, provider: 'gemini-flash' };
        }
      }

      throw new Error('No image data found in Gemini Flash response');

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }
}

export const imageGenerator = new ImageGenerator();