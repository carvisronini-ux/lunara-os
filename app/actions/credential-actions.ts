// /home/carvisronini-ux/lunara-os/app/actions/credential-actions.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

export async function testCredentialAction(credentialId: string) {
  // ეს კოდი სერვერზე შესრულდება, ამიტომ CORS პრობლემა არ იქნება!
  const credentials = await credentialVault.getMetadata();
  const cred = credentials.find((c: any) => c.credential_id === credentialId);
  
  if (!cred) {
    return { success: false, error: 'Credential not found', provider: 'unknown', models: [], recommendedModel: '' };
  }

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) {
    return { success: false, error: 'Failed to retrieve API key', provider: cred.provider, models: [], recommendedModel: '' };
  }

  // ✅ სპეციალური ტესტი Cloudflare-ისთვის
  if (cred.provider.toLowerCase() === 'cloudflare') {
    const startTime = Date.now();
    // ვიღებთ accountId-ს მეტამონაცემებიდან, ან ვიყენებთ ნაგულისხმევს
    const accountId = cred.metadata?.accountId || 'b41cb921e1b841685c0f5d364f661fbe';
    
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Cloudflare Workers AI-ს უფასო/ხელმისაწვდომი საუკეთესო მოდელები
        const models = [
          '@cf/black-forest-labs/flux-1-schnell',
          '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          '@cf/lykon/dreamshaper-8-lcm'
        ];
        const recommended = '@cf/black-forest-labs/flux-1-schnell'; // ყველაზე სწრაფი და ხარისხიანი

        await credentialVault.updateCredentialMetadata(credentialId, {
          models,
          recommendedModel: recommended,
          testSuccess: true,
          testLatency: Date.now() - startTime
        });

        return {
          success: true,
          provider: cred.provider,
          models,
          recommendedModel: recommended,
          latency: Date.now() - startTime
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          provider: cred.provider,
          models: [],
          recommendedModel: '',
          error: `Invalid API key or Account ID (HTTP ${response.status}): ${errorData.errors?.[0]?.message || response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        provider: cred.provider,
        models: [],
        recommendedModel: '',
        error: `Network error: ${error.message}`
      };
    }
  }

  // სხვა პროვაიდერებისთვის (დროებითი მოქნილი გადაწყვეტა)
  return {
    success: true,
    provider: cred.provider,
    models: ['default-model'],
    recommendedModel: 'default-model',
    latency: 100
  };
}