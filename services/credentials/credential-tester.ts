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
  // ✅ განახლება 1: ველოდებით მონაცემების წამოღებას Supabase-დან (ქეშიდან)
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

  // ✅ განახლება 2: ველოდებით გაშიფრული გასაღების მიღებას
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

  // ვტესტავთ პროვაიდერს adapter-ის მეშვეობით
  const result = await testProvider(cred.provider, apiKey);

  const testResult: CredentialTestResult = {
    success: result.success,
    provider: cred.provider,
    models: result.models.map(m => m.id),
    recommendedModel: result.recommendedModel,
    error: result.error,
    latency: result.latency
  };

  // ✅ განახლება 3: ველოდებით მეტამონაცემების შენახვას Supabase-ში
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