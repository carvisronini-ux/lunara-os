// ============================================================
// LUNARA OS — Credential Tester
// Foundation: §22, §40, §45
// Purpose: Test API keys and auto-detect best free models
// ============================================================

import { credentialVault } from './credential-vault';
import { testProvider } from './providers/adapter';
import type { Provider } from './types';

export interface CredentialTestResult {
  success: boolean;
  provider: Provider;
  models: string[];
  recommendedModel: string;
  error?: string;
  latency?: number;
}

export async function testCredential(credentialId: string): Promise<CredentialTestResult> {
  // ✅ ველოდებით მონაცემების წამოღებას Supabase-დან (ქეშიდან)
  const credentials = await credentialVault.getMetadata();
  const cred = credentials.find(c => c.credential_id === credentialId);
  
  if (!cred) {
    return {
      success: false,
      provider: 'unknown' as Provider,
      models: [],
      recommendedModel: '',
      error: 'Credential not found'
    };
  }

  // ✅ ველოდებით გაშიფრული გასაღების მიღებას
  const apiKey = await credentialVault.getDecryptedValueForTesting(credentialId);
  if (!apiKey) {
    return {
      success: false,
      provider: cred.provider,
      models: [],
      recommendedModel: '',
      error: 'Failed to retrieve API key or credential is not ACTIVE'
    };
  }

  // ✅ ახალი: სპეციალური ტესტი Cloudflare-ისთვის
  if (cred.provider.toLowerCase() === 'cloudflare') {
    const startTime = Date.now();
    const accountId = 'b41cb921e1b841685c0f5d364f661fbe';
    
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const models = ['@cf/stabilityai/stable-diffusion-xl-base-1.0', '@cf/black-forest-labs/flux-1-schnell'];
        const recommended = '@cf/stabilityai/stable-diffusion-xl-base-1.0';

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
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          provider: cred.provider,
          models: [],
          recommendedModel: '',
          error: `Invalid API key or Account ID (HTTP ${response.status}): ${errorText}`,
          latency: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: cred.provider,
        models: [],
        recommendedModel: '',
        error: error instanceof Error ? error.message : 'Unknown network error',
        latency: Date.now() - startTime
      };
    }
  }

  // ✅ სპეციალური ტესტი KIE.ai-სთვის - კრედიტების ბალანსის შემოწმება
  if (cred.provider.toLowerCase() === 'kie') {
    const startTime = Date.now();
    try {
      const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const models = ['flux1-kontext', 'flux-2/flex-text-to-image', 'flux-2/pro-text-to-image'];
        const recommended = 'flux1-kontext';

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
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          provider: cred.provider,
          models: [],
          recommendedModel: '',
          error: `Invalid API key (HTTP ${response.status}): ${errorText}`,
          latency: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: cred.provider,
        models: [],
        recommendedModel: '',
        error: error instanceof Error ? error.message : 'Unknown network error',
        latency: Date.now() - startTime
      };
    }
  }

  // ✅ სტანდარტული ტესტირება სხვა პროვაიდერებისთვის (gemini, groq, huggingface და ა.შ.)
  const result = await testProvider(cred.provider, apiKey);

  const testResult: CredentialTestResult = {
    success: result.success,
    provider: cred.provider,
    models: result.models.map(m => m.id),
    recommendedModel: result.recommendedModel,
    error: result.error,
    latency: result.latency
  };

  // ✅ მეტამონაცემების შენახვა Supabase-ში (თუ ტესტი წარმატებულია)
  if (result.success) {
    await credentialVault.updateCredentialMetadata(credentialId, {
      models: result.models.map(m => m.id),
      recommendedModel: result.recommendedModel,
      testSuccess: true,
      testLatency: result.latency
    });
  }

  return testResult;
}