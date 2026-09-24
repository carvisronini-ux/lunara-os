// ============================================================
// LUNARA OS — Credential Vault
// Foundation: §22, §40, §51
// Purpose: Secure storage for API keys. Never exposes plaintext to client.
// ============================================================

import type { Credential, Provider, PermissionScope, CredentialAuditLog } from './types';
import { accessManager } from './access-manager';

// მარტივი mock დაშიფვრა (რეალურ პროდუქციაში იქნება KMS ან Env Vars)
const mockEncrypt = (text: string) => Buffer.from(`ENC:${text}`).toString('base64');
const mockDecrypt = (encrypted: string) => {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    return decoded.startsWith('ENC:') ? decoded.slice(4) : encrypted;
  } catch { return encrypted; }
};

export class CredentialVault {
  private credentials: Map<string, Credential> = new Map();
  private auditLog: CredentialAuditLog[] = [];

  constructor() {
    console.log('[CredentialVault] 🔐 Initialized. Secrets isolated.');
  }

  public addCredential(
    provider: Provider,
    name: string,
    plaintextValue: string,
    scope: PermissionScope,
    owner: string = "human_executive"
  ): string {
    const id = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const cred: Credential = {
      credential_id: id,
      provider,
      name,
      encrypted_value: mockEncrypt(plaintextValue),
      scope,
      status: "ACTIVE",
      owner,
      created_at: now,
      last_rotated_at: null,
      expires_at: null
    };

    this.credentials.set(id, cred);
    this.logAudit("created", owner, id, "success", `Added ${provider} credential: ${name}`);
    console.log(`[CredentialVault] ✅ Added: ${name} (${provider})`);
    return id;
  }

  // §40: აბრუნებს მხოლოდ მეტამონაცემებს (უსაფრთხოა UI-სთვის)
  public getMetadata(): Omit<Credential, 'encrypted_value'>[] {
    return Array.from(this.credentials.values()).map(({ encrypted_value, ...rest }) => rest);
  }

  public getCredentialByProvider(provider: Provider, permission: PermissionScope): Credential | undefined {
    return Array.from(this.credentials.values()).find(
      c => c.provider === provider && c.scope === permission && c.status === "ACTIVE"
    );
  }

  // მხოლოდ AccessManager-ს შეუძლია ამის გამოძახება ვალიდური Lease-ით
  public getDecryptedValue(credentialId: string, requestingAgentId: string): string | null {
    const cred = this.credentials.get(credentialId);
    if (!cred || cred.status !== "ACTIVE") return null;

    // შეამოწმე აქვს თუ არა აგენტს ვალიდური ლიზინგი
    const hasLease = accessManager.validateLeaseForCredential(credentialId, requestingAgentId);
    if (!hasLease) {
      this.logAudit("access_attempt", requestingAgentId, credentialId, "denied", "No valid lease");
      return null;
    }

    this.logAudit("access_attempt", requestingAgentId, credentialId, "success", "Lease validated, access granted");
    return mockDecrypt(cred.encrypted_value);
  }

  public rotateCredential(credentialId: string, newPlaintextValue: string, rotatedBy: string): boolean {
    const cred = this.credentials.get(credentialId);
    if (!cred) return false;

    cred.encrypted_value = mockEncrypt(newPlaintextValue);
    cred.last_rotated_at = Date.now();
    
    // §21: Secret rotation - ანულირებს ყველა არსებულ ლიზინგს უსაფრთხოებისთვის
    accessManager.revokeAllLeasesForCredential(credentialId, rotatedBy);
    
    this.logAudit("rotated", rotatedBy, credentialId, "success", "Credential rotated, all leases revoked");
    return true;
  }

  public revokeCredential(credentialId: string, revokedBy: string, reason: string): boolean {
    const cred = this.credentials.get(credentialId);
    if (!cred) return false;

    cred.status = "REVOKED";
    accessManager.revokeAllLeasesForCredential(credentialId, revokedBy);
    this.logAudit("revoked", revokedBy, credentialId, "success", reason);
    return true;
  }

  private logAudit(
    action: CredentialAuditLog["action"],
    actorId: string,
    targetId: string | null,
    result: CredentialAuditLog["result"],
    reason: string
  ) {
    this.auditLog.unshift({
      log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      actor_id: actorId,
      target_credential_id: targetId,
      result,
      reason,
      timestamp: Date.now()
    });
    if (this.auditLog.length > 100) this.auditLog.pop();
  }

  public getAuditLog(limit = 20): CredentialAuditLog[] {
    return this.auditLog.slice(0, limit);
  }
}

export const credentialVault = new CredentialVault();