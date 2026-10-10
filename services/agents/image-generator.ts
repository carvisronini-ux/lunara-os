// /home/carvisronini-ux/lunara-os/services/agents/image-generator.ts
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  provider?: string;
  generationLogs: string[];
}

export class ImageGenerator {
  async generateImage(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const logs: string[] = [];
    logs.push(`🎨 იწყება სურათის გენერაცია აგენტისთვის: ${agentType}`);
    logs.push(`📝 Prompt: ${imagePrompt.substring(0, 80)}...`);

    await credentialVault.ready;

    // ============================================================
    // მეთოდი 1: KIE AI (მკაცრად დინამიური მოდელის აღმოჩენა)
    // ============================================================
    try {
      logs.push(`🔄 [1/2] ვამოწმებ KIE AI-ს ხელმისაწვდომ მოდელებს...`);
      const kieResult = await this.generateWithKIE(imagePrompt, agentType, logs);
      if (kieResult.success) {
        logs.push(`✅ KIE AI-მ წარმატებით შექმნა სურათი!`);
        return { ...kieResult, generationLogs: logs };
      }
      logs.push(`⚠️ KIE AI ვერ გამოიყენა: ${kieResult.error}`);
    } catch (error: any) {
      logs.push(`❌ KIE AI კრიტიკული შეცდომა: ${error.message}`);
    }

    // ============================================================
    // მეთოდი 2: Gemini (მკაცრად დინამიური მოდელის აღმოჩენა)
    // ============================================================
    try {
      logs.push(`🔄 [2/2] ვამოწმებ Gemini-ს ხელმისაწვდომ სურათის მოდელებს...`);
      const geminiResult = await this.generateWithGemini(imagePrompt, agentType, logs);
      if (geminiResult.success) {
        logs.push(`✅ Gemini-მ წარმატებით შექმნა სურათი!`);
        return { ...geminiResult, generationLogs: logs };
      }
      logs.push(`⚠️ Gemini ვერ გამოიყენა: ${geminiResult.error}`);
    } catch (error: any) {
      logs.push(`❌ Gemini კრიტიკული შეცდომა: ${error.message}`);
    }

    logs.push(`❌ ყველა მეთოდი ვერ იმუშავა. სურათი ვერ შეიქმნა.`);
    return {
      success: false,
      error: 'All image generators failed dynamically.',
      generationLogs: logs
    };
  }

  private async generateWithKIE(
    imagePrompt: string,
    agentType: string,
    logs: string[]
  ): Promise<ImageGenerationResult> {
    const cred = credentialVault.getCredentialByProvider('kie', 'spend');
    if (!cred) return { success: false, error: 'KIE AI credential not found', generationLogs: logs };

    const leaseId = accessManager.requestAccess(`${agentType}-img-kie`, 'kie', 'spend', 'Image Gen', null, 120);
    if (!leaseId) return { success: false, error: 'Failed to acquire KIE AI lease', generationLogs: logs };

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-kie`);
      if (!apiKey) return { success: false, error: 'Failed to decrypt KIE AI API key', generationLogs: logs };

      // 1. ვიღებთ ხელმისაწვდომ მოდელებს KIE AI-დან
      const modelsRes = await fetch('https://api.kie.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      let targetModel: string | null = null; // ❌ არანაირი წინასწარ ჩაწერილი მნიშვნელობა
      
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        // ვეძებთ მოდელებს, რომელთა ID შეიცავს სურათთან დაკავშირებულ სიტყვებს
        const imageModels = modelsData.data?.filter((m: any) => 
          m.id.toLowerCase().includes('flux') || 
          m.id.toLowerCase().includes('image') || 
          m.id.toLowerCase().includes('kontext') ||
          m.id.toLowerCase().includes('sd')
        ) || [];
        
        if (imageModels.length > 0) {
          targetModel = imageModels[0].id; // ვიღებთ პირველს, რასაც API გვაძლევს
          logs.push(`✅ KIE AI-მ დააბრუნა მოდელი: ${targetModel}`);
        } else {
          logs.push(`⚠️ KIE AI API-მ არ დააბრუნა არცერთი სურათის გენერაციის მოდელი.`);
          return { success: false, error: 'No image models returned by KIE API', generationLogs: logs };
        }
      } else {
        logs.push(`⚠️ KIE AI მოდელების სიის მიღება ვერ მოხერხდა (${modelsRes.status}).`);
        return { success: false, error: `Failed to fetch KIE models: ${modelsRes.status}`, generationLogs: logs };
      }

      // 2. ვცდილობთ გენერაციას მხოლოდ იმ მოდელით, რაც API-მ დააბრუნა
      logs.push(`🤖 ვცდილობთ გენერაციას KIE AI მოდელით: ${targetModel}`);
      const response = await fetch('https://api.kie.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: targetModel, prompt: imagePrompt, n: 1, size: '1024x1280' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`KIE AI API Error: ${response.status} - ${errorText.substring(0, 150)}`);
      }

      const data = await response.json();
      if (data.data?.[0]?.url) {
        return { success: true, imageUrl: data.data[0].url, provider: 'kie', generationLogs: logs };
      } else if (data.data?.[0]?.b64_json) {
        return { success: true, imageBuffer: Buffer.from(data.data[0].b64_json, 'base64'), provider: 'kie', generationLogs: logs };
      }
      throw new Error('Invalid response format from KIE AI');

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }

  private async generateWithGemini(
    imagePrompt: string,
    agentType: string,
    logs: string[]
  ): Promise<ImageGenerationResult> {
    const cred = credentialVault.getCredentialByProvider('gemini', 'spend');
    if (!cred) return { success: false, error: 'Gemini credential not found', generationLogs: logs };

    const leaseId = accessManager.requestAccess(`${agentType}-img-gemini`, 'gemini', 'spend', 'Image Gen', null, 120);
    if (!leaseId) return { success: false, error: 'Failed to acquire Gemini lease', generationLogs: logs };

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-gemini`);
      if (!apiKey) return { success: false, error: 'Failed to decrypt Gemini API key', generationLogs: logs };

      // 1. ვიღებთ ხელმისაწვდომ მოდელებს Gemini-დან
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      let targetModel: string | null = null; // ❌ არანაირი წინასწარ ჩაწერილი მნიშვნელობა (არც Imagen, არც Flash)

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        // ვეძებთ მხოლოდ იმ მოდელებს, რომლებიც API-ს თქმით, მხარს უჭერენ 'generateImages'-ს
        const imageModels = modelsData.models?.filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateImages')
        ).map((m: any) => m.name.replace('models/', '')) || [];

        if (imageModels.length > 0) {
          targetModel = imageModels[0]; // ვიღებთ პირველს, რასაც API გვაძლევს
          logs.push(`✅ Gemini-მ დააბრუნა სურათის მოდელი: ${targetModel}`);
        } else {
          logs.push(`⚠️ Gemini API-მ არ დააბრუნა არცერთი სურათის გენერაციის მოდელი ამ გასაღებისთვის.`);
          return { success: false, error: 'No image models returned by Gemini API', generationLogs: logs };
        }
      } else {
        logs.push(`⚠️ Gemini მოდელების სიის მიღება ვერ მოხერხდა (${modelsRes.status}).`);
        return { success: false, error: `Failed to fetch Gemini models: ${modelsRes.status}`, generationLogs: logs };
      }

      // 2. ვცდილობთ გენერაციას მხოლოდ იმ მოდელით, რაც API-მ დააბრუნა
      logs.push(`🤖 ვცდილობთ გენერაციას Gemini მოდელით: ${targetModel}`);
      
      // რადგან 'generateImages'-ის მხარდაჭერა გვაქვს, ვიყენებთ generateImages endpoint-ს
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateImages?key=${apiKey}`;
      
      const body = {
        instances: [{ prompt: imagePrompt }],
        parameters: { sampleCount: 1, aspectRatio: '4:5', personGeneration: 'allow_all' }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      
      if (data.predictions?.[0]?.bytesBase64Encoded) {
        return { success: true, imageBuffer: Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64'), provider: 'gemini', generationLogs: logs };
      }
      
      throw new Error('No image data found in Gemini response');

    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }
}

export const imageGenerator = new ImageGenerator();