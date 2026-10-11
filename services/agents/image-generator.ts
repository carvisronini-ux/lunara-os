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
  async generateImage(imagePrompt: string, agentType: string): Promise<ImageGenerationResult> {
    const logs: string[] = [];
    logs.push(`🎨 იწყება სურათის გენერაცია აგენტისთვის: ${agentType}`);
    logs.push(`📝 Prompt: ${imagePrompt.substring(0, 80)}...`);

    await credentialVault.ready;

    // ✅ პირდაპირ ვცდილობთ Cloudflare Workers AI-ს გამოყენებას, რადგან ვიცით, რომ მუშაობს!
    logs.push(`🔄 [1/1] ვცდილობთ Cloudflare Workers AI-ს...`);
    const cloudflareResult = await this.tryCloudflareAI(imagePrompt, agentType, logs);
    
    if (cloudflareResult.success) {
      logs.push(`🎉 Cloudflare Workers AI-მ წარმატებით შექმნა სურათი!`);
      return { ...cloudflareResult, generationLogs: logs };
    }
    
    logs.push(`⚠️ Cloudflare ვერ გამოიყენა: ${cloudflareResult.error}`);
    logs.push(`❌ ვერცერთმა პროვაიდერმა ვერ შექმნა სურათი.`);
    
    return {
      success: false,
      error: cloudflareResult.error || 'All providers failed to generate image.',
      generationLogs: logs
    };
  }

  private async tryCloudflareAI(
    imagePrompt: string,
    agentType: string,
    logs: string[]
  ): Promise<ImageGenerationResult> {
    // ვეძებთ cloudflare გასაღებს
    const cred = credentialVault.getCredentialByProvider('cloudflare', 'spend');
    if (!cred) {
      return { success: false, error: 'Cloudflare credential not found in vault', generationLogs: logs };
    }

    // ვიღებთ Account ID-ს მეტამონაცემებიდან
    const accountId = cred.metadata?.accountId || 'b41cb921e1b841685c0f5d364f661fbe';
    logs.push(`📋 Cloudflare: ვიყენებ Account ID-ს: ${accountId}`);

    const leaseId = accessManager.requestAccess(`${agentType}-img-cloudflare`, 'cloudflare', 'spend', 'Image Gen', null, 120);
    if (!leaseId) {
      return { success: false, error: 'Failed to acquire Cloudflare lease', generationLogs: logs };
    }

    try {
      const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-cloudflare`);
      if (!apiKey) {
        return { success: false, error: 'Failed to decrypt Cloudflare API key', generationLogs: logs };
      }

      // ✅ ვიყენებთ საუკეთესო და ყველაზე სწრაფ მოდელს
      const modelName = '@cf/black-forest-labs/flux-1-schnell';
      logs.push(`🤖 Cloudflare: ვიყენებ მოდელს: ${modelName}`);

      // ✅ სწორი URL, რომელიც მოიცავს Account ID-ს შუაში
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
      logs.push(`📤 Cloudflare: ვგზავნი მოთხოვნას...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          steps: 4, // ოპტიმალური ბალანსი ხარისხსა და სისწრაფეს შორის
          seed: Math.floor(Math.random() * 10000)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logs.push(`❌ Cloudflare: გენერაცია ვერ მოხერხდა (HTTP ${response.status})`);
        logs.push(`   შეცდომა: ${errorText.substring(0, 200)}`);
        return { success: false, error: `Cloudflare API Error: ${response.status}`, generationLogs: logs };
      }

      const data = await response.json();

      // Cloudflare აბრუნებს base64 სურათს 'result.image' ან პირდაპირ 'image' ველში
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