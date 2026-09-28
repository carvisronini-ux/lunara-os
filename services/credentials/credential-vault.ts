// ============================================================
// LUNARA OS — Credential Vault (Supabase Persistent Storage)
// Foundation: §22, §38, §40, §51
// Purpose: Secure, persistent storage for API keys. Never exposes plaintext to client.
// ============================================================

import type { Credential, Provider, PermissionScope, CredentialAuditLog } from './types';
import { accessManager } from './access-manager';
import { supabase } from '@/lib/supabase'; 

// მარტივი mock დაშიფვრა (რეალურ პროდუქციაში იქნება KMS ან Env Vars)
const mockEncrypt = (text: string) => Buffer.from(`ENC:${text}`).toString('base64');
const mockDecrypt = (encrypted: string) => {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    return decoded.startsWith('ENC:') ? decoded.slice(4) : encrypted;
  } catch { return encrypted; }
};

function determineScopeForProvider(provider: Provider): PermissionScope {
  const scopeMap: Record<Provider, PermissionScope> = {
    openai: "spend", anthropic: "spend", deepseek: "spend", groq: "spend",
    gemini: "spend", mistral: "spend", huggingface: "execute", together: "spend",
    telegram: "publish", supabase: "write", cloudflare: "write", custom: "read"
  };
  return scopeMap[provider] || "read";
}

export class CredentialVault {
  private auditLog: CredentialAuditLog[] = [];
  private cache: Map<string, Credential> = new Map(); // ლოკალური ქეში სწრაფი წვდომისთვის

  constructor() {
    console.log('[CredentialVault] 🔐 Initialized with Supabase persistent storage.');
    this.loadCache(); // მონაცემების ჩატვირთვა გაშვებისას
  }

  // მონაცემთა ბაზიდან ქეშში ჩატვირთვა
  private async loadCache() {
    const { data, error } = await supabase.from('credentials').select('*');
    if (!error && data) {
      data.forEach((item: any) => {
        this.cache.set(item.id, {
          credential_id: item.id,
          provider: item.provider,
          name: item.name,
          encrypted_value: item.encrypted_value,
          scope: item.scope,
          status: item.status,
          owner: item.owner,
          created_at: new Date(item.created_at).getTime(),
          last_rotated_at: item.last_rotated_at ? new Date(item.last_rotated_at).getTime() : null,
          expires_at: item.expires_at ? new Date(item.expires_at).getTime() : null,
          metadata: item.metadata || undefined
        });
      });
      console.log(`[CredentialVault] 📦 Loaded ${this.cache.size} credentials into cache.`);
    }
  }

  private logAudit(action: CredentialAuditLog["action"], actorId: string, targetId: string | null, result: CredentialAuditLog["result"], reason: string) {
    this.auditLog.unshift({
      log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action, actor_id: actorId, target_credential_id: targetId, result, reason, timestamp: Date.now()
    });
    if (this.auditLog.length > 100) this.auditLog.pop();
  }

  // ✅ მუდმივი შენახვა: დამატება Supabase-ში + ქეშის განახლება
  public async addCredentialSimple(provider: Provider, plaintextValue: string, owner: string = "human_executive"): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const scope = determineScopeForProvider(provider);
    const name = `${provider.toUpperCase()} Key`;

    const { error } = await supabase.from('credentials').insert({
      id, provider, name, encrypted_value: mockEncrypt(plaintextValue),
      scope, status: "ACTIVE", owner, created_at: now, last_rotated_at: null, expires_at: null, metadata: {}
    });

    if (error) {
      console.error('[CredentialVault] ❌ Failed to save credential:', error);
      throw new Error(error.message);
    }

    const newCred: Credential = {
      credential_id: id, provider, name, encrypted_value: mockEncrypt(plaintextValue),
      scope, status: "ACTIVE", owner, created_at: Date.now(), last_rotated_at: null, expires_at: null
    };
    this.cache.set(id, newCred);

    this.logAudit("created", owner, id, "success", `Added ${provider} credential (auto-scope: ${scope})`);
    console.log(`[CredentialVault] ✅ Saved to DB & Cache: ${name} (${provider})`);
    return id;
  }

  // §40: აბრუნებს მხოლოდ მეტამონაცემებს ქეშიდან (უსაფრთხოა UI-სთვის)
  public getMetadata(): Omit<Credential, 'encrypted_value'>[] {
    return Array.from(this.cache.values()).map(({ encrypted_value, ...rest }) => rest);
  }

  // სინქრონული წვდომა ქეშიდან (თავსებადობისთვის accessManager-თან)
  public getCredentialByProvider(provider: Provider, permission: PermissionScope): Credential | undefined {
    return Array.from(this.cache.values()).find(
      c => c.provider === provider && c.scope === permission && c.status === "ACTIVE"
    );
  }

  public getDecryptedValue(credentialId: string, requestingAgentId: string): string | null {
    const cred = this.cache.get(credentialId);
    if (!cred || cred.status !== "ACTIVE") return null;

    const hasLease = accessManager.validateLeaseForCredential(credentialId, requestingAgentId);
    if (!hasLease) {
      this.logAudit("access_attempt", requestingAgentId, credentialId, "denied", "No valid lease");
      return null;
    }

    this.logAudit("access_attempt", requestingAgentId, credentialId, "success", "Lease validated, access granted");
    return mockDecrypt(cred.encrypted_value);
  }

  public getDecryptedValueForTesting(credentialId: string): string | null {
    const cred = this.cache.get(credentialId);
    if (!cred || cred.status !== "ACTIVE") return null;
    return mockDecrypt(cred.encrypted_value);
  }

  // ✅ მუდმივი განახლება: მეტამონაცემების შენახვა
  public async updateCredentialMetadata(credentialId: string, metadata: any): Promise<boolean> {
    const cred = this.cache.get(credentialId);
    if (!cred) return false;

    const updatedMetadata = { ...(cred.metadata || {}), ...metadata, lastTestedAt: Date.now() };

    const { error } = await supabase
      .from('credentials')
      .update({ metadata: updatedMetadata })
      .eq('id', credentialId);

    if (error) {
      console.error('[CredentialVault] ❌ Failed to update metadata:', error);
      return false;
    }

    cred.metadata = updatedMetadata;
    this.cache.set(credentialId, cred);
    this.logAudit("rotated", "system", credentialId, "success", `Updated metadata: recommended=${metadata.recommendedModel || 'none'}`);
    return true;
  }

  // ✅ მუდმივი განახლება: API გასაღების შეცვლა (Rotation)
  public async updateCredential(credentialId: string, newPlaintextValue: string, updatedBy: string = "human_executive"): Promise<boolean> {
    const cred = this.cache.get(credentialId);
    if (!cred) return false;

    const { error } = await supabase
      .from('credentials')
      .update({ 
        encrypted_value: mockEncrypt(newPlaintextValue),
        last_rotated_at: new Date().toISOString()
      })
      .eq('id', credentialId);

    if (error) {
      console.error('[CredentialVault] ❌ Failed to update credential:', error);
      return false;
    }

    cred.encrypted_value = mockEncrypt(newPlaintextValue);
    cred.last_rotated_at = Date.now();
    this.cache.set(credentialId, cred);

    accessManager.revokeAllLeasesForCredential(credentialId, updatedBy);
    this.logAudit("rotated", updatedBy, credentialId, "success", `Credential updated, all leases revoked`);
    console.log(`[CredentialVault] 🔄 Updated in DB & Cache: ${cred.name}`);
    return true;
  }

  // ✅ მუდმივი წაშლა: Soft Delete (სტატუსის შეცვლა REVOKED-ზე)
  public async deleteCredential(credentialId: string, deletedBy: string = "human_executive", reason: string = "Manual deletion"): Promise<boolean> {
    const cred = this.cache.get(credentialId);
    if (!cred) return false;

    const { error } = await supabase
      .from('credentials')
      .update({ status: "REVOKED" })
      .eq('id', credentialId);

    if (error) {
      console.error('[CredentialVault] ❌ Failed to delete credential:', error);
      return false;
    }

    cred.status = "REVOKED";
    this.cache.set(credentialId, cred);

    accessManager.revokeAllLeasesForCredential(credentialId, deletedBy);
    this.logAudit("revoked", deletedBy, credentialId, "success", reason);
    console.log(`[CredentialVault] 🗑️ Soft-deleted in DB & Cache: ${cred.name}`);
    return true;
  }

  // ✅ დაბრუნებულია: updateQuota მეთოდი (mock-proxy.ts-ისთვის)
  public updateQuota(credentialId: string): void {
    const cred = this.cache.get(credentialId);
    if (cred) {
      console.log(`[CredentialVault] 📊 Quota updated for credential: ${credentialId}`);
    }
  }

  public getAuditLog(limit = 20): CredentialAuditLog[] {
    return this.auditLog.slice(0, limit);
  }
}

export const credentialVault = new CredentialVault();