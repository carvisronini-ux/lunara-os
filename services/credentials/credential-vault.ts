// ============================================================
// LUNARA OS — Credential Vault (Zero-Budget Implementation)
// Foundation: §36-45, §70, §95
// Purpose: In-memory credential metadata management
// NOTE: In production, this would use Supabase/Vault. 
// For zero-budget demo, we use in-memory storage.
// ============================================================

export type CredentialType = "api_key" | "oauth_token" | "bearer_token" | "basic_auth";
export type CredentialStatus = "active" | "expired" | "revoked" | "suspended";
export type ProviderHealth = "healthy" | "degraded" | "unavailable";

export interface CredentialMetadata {
  credential_id: string;
  provider: string;           // "openai", "telegram", "tiktok", etc.
  credential_name: string;    // "openai_gpt4_key", "telegram_bot_token"
  credential_type: CredentialType;
  scope: string[];            // ["research.trends", "publishing.telegram"]
  status: CredentialStatus;
  created_at: number;
  last_verified: number | null;
  expires_at: number | null;
  quota_limit: number | null;  // requests per day
  quota_used: number;
  health: ProviderHealth;
  // ❌ NO actual API key stored here!
  // In production, actual secrets would be in Vercel Env Vars / Supabase Vault
}

export class CredentialVault {
  private credentials: Map<string, CredentialMetadata> = new Map();

  constructor() {
    console.log('[CredentialVault] Initialized (in-memory mode)');
    this.initializeMockCredentials();
  }

  private initializeMockCredentials() {
    // Mock credentials for demo purposes
    const mockCredentials: CredentialMetadata[] = [
      {
        credential_id: "cred_openai_001",
        provider: "openai",
        credential_name: "openai_gpt4_key",
        credential_type: "api_key",
        scope: ["content.write", "content.rewrite", "quality.brand_check"],
        status: "active",
        created_at: Date.now() - 1000 * 60 * 60 * 24 * 30,
        last_verified: Date.now() - 1000 * 60 * 60,
        expires_at: Date.now() + 1000 * 60 * 60 * 24 * 365,
        quota_limit: 1000,
        quota_used: 247,
        health: "healthy"
      },
      {
        credential_id: "cred_telegram_001",
        provider: "telegram",
        credential_name: "telegram_bot_token",
        credential_type: "bearer_token",
        scope: ["publishing.telegram", "analytics.collect"],
        status: "active",
        created_at: Date.now() - 1000 * 60 * 60 * 24 * 60,
        last_verified: Date.now() - 1000 * 60 * 30,
        expires_at: null,
        quota_limit: 500,
        quota_used: 89,
        health: "healthy"
      },
      {
        credential_id: "cred_tiktok_001",
        provider: "tiktok",
        credential_name: "tiktok_research_key",
        credential_type: "api_key",
        scope: ["research.trends", "research.competitors"],
        status: "active",
        created_at: Date.now() - 1000 * 60 * 60 * 24 * 15,
        last_verified: Date.now() - 1000 * 60 * 60 * 2,
        expires_at: Date.now() + 1000 * 60 * 60 * 24 * 180,
        quota_limit: 200,
        quota_used: 45,
        health: "healthy"
      }
    ];

    mockCredentials.forEach(cred => {
      this.credentials.set(cred.credential_id, cred);
    });
  }

  public getCredential(credentialId: string): CredentialMetadata | undefined {
    return this.credentials.get(credentialId);
  }

  public getCredentialByProvider(provider: string, scope: string): CredentialMetadata | undefined {
    return Array.from(this.credentials.values()).find(
      cred => cred.provider === provider && cred.scope.includes(scope) && cred.status === "active"
    );
  }

  public getAllCredentials(): CredentialMetadata[] {
    return Array.from(this.credentials.values());
  }

  public updateQuota(credentialId: string, increment: number = 1): boolean {
    const cred = this.credentials.get(credentialId);
    if (!cred) return false;

    cred.quota_used += increment;
    cred.last_verified = Date.now();

    if (cred.quota_limit && cred.quota_used >= cred.quota_limit * 0.9) {
      cred.health = "degraded";
    }

    return true;
  }

  public revokeCredential(credentialId: string): boolean {
    const cred = this.credentials.get(credentialId);
    if (!cred) return false;

    cred.status = "revoked";
    return true;
  }
}

export const credentialVault = new CredentialVault();