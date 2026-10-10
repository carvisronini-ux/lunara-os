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
   * გენერირებს სურათს image_prompt-ის საფუძველზე
   * იყენებს KIE AI-ს (primary) ან Gemini-ს (fallback)
   */
  async generateImage(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    console.log(`[ImageGenerator]  Starting image generation for ${agentType}`);
    console.log(`[ImageGenerator]  Prompt: ${imagePrompt.substring(0, 100)}...`);

    // ველოდებით CredentialVault-ის მზადყოფნას
    await credentialVault.ready;

    // ცდილობს KIE AI-ის გამოყენებას
    try {
      const kieResult = await this.generateWithKIE(imagePrompt, agentType);
      if (kieResult.success) {
        return kieResult;
      }
      console.warn(`[ImageGenerator] ️ KIE AI failed: ${kieResult.error}. Trying Gemini...`);
    } catch (error) {
      console.error(`[ImageGenerator] ❌ KIE AI error:`, error);
    }

    // Fallback: Gemini
    try {
      const geminiResult = await this.generateWithGemini(imagePrompt, agentType);
      return geminiResult;
    } catch (error) {
      console.error(`[ImageGenerator] ❌ Gemini error:`, error);
      return {
        success: false,
        error: `Both KIE AI and Gemini failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * KIE AI-ის გამოყენებით სურათის გენერაცია
   * (OpenAI-ს თავსებადი API ფორმატი Flux მოდელებისთვის)
   */
  private async generateWithKIE(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    // ვიღებთ KIE AI-ის credentials
    const cred = credentialVault.getCredentialByProvider('kie', 'spend');
    if (!cred) {
      return { success: false, error: 'KIE AI credential not found' };
    }

    // ვითხოვთ ლიზს
    const leaseId = accessManager.requestAccess(
      `${agentType}-image-gen`,
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
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-image-gen`);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt KIE AI API key' };
      }

      const model = cred.metadata?.recommendedModel || 'flux1-kontext';
      console.log(`[ImageGenerator] 🤖 Using KIE AI model: ${model}`);

      // KIE AI-ის API (OpenAI-ს თავსებადი ფორმატი)
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
        throw new Error(`KIE AI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.data && data.data[0] && data.data[0].url) {
        console.log(`[ImageGenerator] ✅ KIE AI generated image successfully`);
        return {
          success: true,
          imageUrl: data.data[0].url,
          provider: 'kie'
        };
      } else if (data.data && data.data[0] && data.data[0].b64_json) {
        // თუ base64 ფორმატშია
        const buffer = Buffer.from(data.data[0].b64_json, 'base64');
        console.log(`[ImageGenerator] ✅ KIE AI generated image (base64) successfully`);
        return {
          success: true,
          imageBuffer: buffer,
          provider: 'kie'
        };
      } else {
        throw new Error('Invalid response format from KIE AI');
      }

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }

  /**
   * Gemini-ის გამოყენებით სურათის გენერაცია (fallback)
   */
  private async generateWithGemini(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const cred = credentialVault.getCredentialByProvider('gemini', 'spend');
    if (!cred) {
      return { success: false, error: 'Gemini credential not found' };
    }

    const leaseId = accessManager.requestAccess(
      `${agentType}-image-gen-gemini`,
      'gemini',
      'spend',
      `Generate image with Gemini for ${agentType}`,
      null,
      120
    );

    if (!leaseId) {
      return { success: false, error: 'Failed to acquire Gemini lease' };
    }

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-image-gen-gemini`);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt Gemini API key' };
      }

      // Gemini-ისთვის ვიყენებთ gemini-2.5-flash-image მოდელს (თუ metadata-შია)
      const availableModels = cred.metadata?.models || [];
      const imageModel = availableModels.find(m => m.includes('image')) || 'gemini-2.5-flash';
      
      console.log(`[ImageGenerator] 🤖 Using Gemini model: ${imageModel}`);

      // Gemini-ის API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `Generate an image based on this prompt: ${imagePrompt}` }]
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE']
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // ვეძებთ სურათს response-ში
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          console.log(`[ImageGenerator] ✅ Gemini generated image successfully`);
          return {
            success: true,
            imageBuffer: buffer,
            provider: 'gemini'
          };
        }
      }

      throw new Error('No image found in Gemini response');

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }
}

export const imageGenerator = new ImageGenerator();