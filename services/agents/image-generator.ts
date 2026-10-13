// /home/carvisronini-ux/lunara-os/services/agents/image-generator.ts
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';
import { getBestAvailableModel, reclassifyModelToChat } from './model-router';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  provider?: string;
  generationLogs: string[];
}

export class ImageGenerator {
  async generateImage(imagePrompt: string, agentType: string): Promise<ImageGenerationResult> {
    const logs: string[] = [];
    logs.push(`🎨 იწყება სურათის გენერაცია აგენტისთვის: ${agentType}`);
    logs.push(`📝 Prompt: ${imagePrompt.substring(0, 80)}...`);

    await credentialVault.ready;

    // ✅ დინამიური მოდელის შერჩევა და "თვითაღდგენადი" ციკლი
    let modelInfo = await getBestAvailableModel('image');
    let attempts = 0;
    const maxAttempts = 3; // მაქსიმუმ 3 ცდა, რომ უსასრულო ციკლში არ ჩავარდეს

    while (attempts < maxAttempts) {
      if (!modelInfo) {
        logs.push(`❌ ვერცერთმა პროვაიდერმა ვერ შესთავაზა გამოსახულების გენერაციის მოდელი.`);
        return { success: false, error: 'No image generation models available', generationLogs: logs };
      }

      logs.push(`🔄 [ცდა ${attempts + 1}/${maxAttempts}] ვცდილობთ: ${modelInfo.provider} -> ${modelInfo.modelName}`);

      const result = await this.tryGenerateWithProvider(modelInfo, imagePrompt, agentType, logs);
      
      if (result.success) {
        logs.push(`🎉 ${modelInfo.provider}-მა წარმატებით შექმნა სურათი მოდელით: ${modelInfo.modelName}!`);
        return { ...result, generationLogs: logs };
      }
      
      // ✅ შევამოწმოთ, არის თუ არა შეცდომა იმის მანიშნებელი, რომ მოდელი ფოტოს არ აგენერირებს
      const errorMsg = result.error?.toLowerCase() || '';
      const isNotAnImageModelError = 
        errorMsg.includes('not supported') || 
        errorMsg.includes('chat') || 
        errorMsg.includes('text generation') || 
        errorMsg.includes('invalid model') ||
        errorMsg.includes('does not exist');

      if (isNotAnImageModelError) {
        logs.push(`⚠️ მოდელი "${modelInfo.modelName}" არ არის გამოსახულების გენერატორი. სისტემა ავტომატურად ასწორებს მონაცემთა ბაზას...`);
        
        // გადავიყვანოთ Chat კატეგორიაში
        await reclassifyModelToChat(modelInfo.credentialId, modelInfo.modelName);
        
        // ვიღებთ შემდეგ საუკეთესო მოდელს სიიდან
        modelInfo = await getBestAvailableModel('image');
        attempts++;
      } else {
        // სხვა ტიპის შეცდომაა (მაგ. Rate Limit, ცუდი Prompt), არ გადავყავართ, უბრალოდ ვაბრუნებთ შეცდომას
        logs.push(`❌ გენერაცია ვერ მოხერხდა: ${result.error}`);
        return { ...result, generationLogs: logs };
      }
    }

    logs.push(`❌ გენერაციის ყველა ცდა ამოიწურა.`);
    return { success: false, error: 'All available image models failed or were reclassified.', generationLogs: logs };
  }

  // ✅ დინამიური მარშრუტიზაცია პროვაიდერის მიხედვით
  private async tryGenerateWithProvider(
    modelInfo: { provider: string; credentialId: string; modelName: string; apiKey: string },
    imagePrompt: string,
    agentType: string,
    logs: string[]
  ): Promise<ImageGenerationResult> {
    if (modelInfo.provider === 'cloudflare') {
      return this.tryCloudflareAI(modelInfo, imagePrompt, agentType, logs);
    }
    
    // აქ მომავალში დაემატება სხვა პროვაიდერები (მაგ. openai, stability)
    logs.push(`⚠️ პროვაიდერი ${modelInfo.provider} ჯერ არ არის იმპლემენტირებული გენერატორში.`);
    return { success: false, error: `Provider ${modelInfo.provider} not implemented`, generationLogs: logs };
  }

  private async tryCloudflareAI(
    modelInfo: { credentialId: string; modelName: string; apiKey: string },
    imagePrompt: string,
    agentType: string,
    logs: string[]
  ): Promise<ImageGenerationResult> {
    // ვიღებთ Account ID-ს მეტამონაცემებიდან (უსაფრთხოებისთვის)
    const cred = credentialVault.getMetadata().find((c: any) => c.credential_id === modelInfo.credentialId);
    const accountId = cred?.metadata?.accountId || 'b41cb921e1b841685c0f5d364f661fbe';
    
    const leaseId = accessManager.requestAccess(`${agentType}-img-cloudflare`, 'cloudflare', 'spend', 'Image Gen', null, 120);
    if (!leaseId) {
      return { success: false, error: 'Failed to acquire Cloudflare lease', generationLogs: logs };
    }

    try {
      logs.push(`📋 Cloudflare: ვიყენებ Account ID-ს: ${accountId}`);
      logs.push(`🤖 Cloudflare: ვიყენებ დინამიურ მოდელს: ${modelInfo.modelName}`);

      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelInfo.modelName}`;
      logs.push(`📤 Cloudflare: ვგზავნი მოთხოვნას...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${modelInfo.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          steps: 4
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logs.push(`❌ Cloudflare: გენერაცია ვერ მოხერხდა (HTTP ${response.status})`);
        logs.push(`   შეცდომა: ${errorText.substring(0, 200)}`);
        return { success: false, error: `Cloudflare API Error: ${response.status} - ${errorText}`, generationLogs: logs };
      }

      const data = await response.json();

      if (data.result?.image) {
        logs.push(`✅ Cloudflare: სურათი წარმატებით შეიქმნა!`);
        return {
          success: true,
          imageBuffer: Buffer.from(data.result.image, 'base64'),
          provider: 'cloudflare',
          generationLogs: logs
        };
      } else if (data.image) {
        logs.push(`✅ Cloudflare: სურათი წარმატებით შეიქმნა!`);
        return {
          success: true,
          imageBuffer: Buffer.from(data.image, 'base64'),
          provider: 'cloudflare',
          generationLogs: logs
        };
      } else {
        logs.push(`❌ Cloudflare: პასუხში სურათი ვერ ვიპოვე.`);
        logs.push(`   მიღებული პასუხი: ${JSON.stringify(data).substring(0, 150)}`);
        return { success: false, error: 'No image in Cloudflare response', generationLogs: logs };
      }

    } catch (error: any) {
      logs.push(`❌ Cloudflare: კრიტიკული შეცდომა: ${error.message}`);
      return { success: false, error: error.message, generationLogs: logs };
    } finally {
      accessManager.revokeLease(leaseId, 'system_cleanup');
    }
  }
}

export const imageGenerator = new ImageGenerator();