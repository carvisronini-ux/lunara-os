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
  const cred = credentialVault.getMetadata().find(c => c.credential_id === credentialId);
  if (!cred) {
    return {
      success: false,
      provider: 'unknown' as Provider,
      models: [],
      recommendedModel: '',
      error: 'Credential not found'
    };
  }

  // ვიღებთ გაშიფრულ გასაღებს ტესტისთვის
  const apiKey = credentialVault.getDecryptedValueForTesting(credentialId);
  if (!apiKey) {
    return {
      success: false,
      provider: cred.provider,
      models: [],
      recommendedModel: '',
      error: 'Failed to retrieve API key'
    };
  }

  // ვტესტავთ პროვაიდერს
  const result = await testProvider(cred.provider, apiKey);

  const testResult: CredentialTestResult = {
    success: result.success,
    provider: cred.provider,
    models: result.models.map(m => m.id),
    recommendedModel: result.recommendedModel,
    error: result.error,
    latency: result.latency
  };

  // ვინახავთ ტესტის შედეგებს metadata-ში
  if (result.success) {
    credentialVault.updateCredentialMetadata(credentialId, {
      models: result.models.map(m => m.id),
      recommendedModel: result.recommendedModel,
      testSuccess: true,
      testLatency: result.latency
    });
  }

  return testResult;
}