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

  // ✅ ახალი: სპეციალური ტესტი KIE.ai-სთვის (რადგან ის OpenAI-ს თავსებადია)
  if (cred.provider.toLowerCase() === 'kie') {
    const startTime = Date.now();
    try {
      const response = await fetch('https://api.kie.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // თუ მოდელების სია მოდის, ვიღებთ მას, თუ არა - ვუთითებთ საუკეთესოებს ხელით
        const models = data.data ? data.data.map((m: any) => m.id) : ['flux', 'stable-diffusion-xl'];
        const recommended = 'flux'; // KIE.ai-ს საუკეთესო უწყალსანიშნო მოდელი ფოტოსთვის

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
          error: `HTTP ${response.status}: ${errorText}`,
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

  // ✅ სტანდარტული ტესტირება სხვა პროვაიდერებისთვის (gemini, groq, და ა.შ.)
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