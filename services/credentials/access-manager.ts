// ============================================================
// LUNARA OS — Access Manager (Lease Lifecycle)
// Foundation: §22, §38-39, §68-69
// Purpose: Manage temporary access leases for credentials
// ============================================================

import { credentialVault } from './credential-vault';
import type { AccessLease, Provider, PermissionScope } from './types';
import { osEngine } from '../../core/engine';

export class AccessManager {
  private leases: Map<string, AccessLease> = new Map();

  constructor() {
    console.log('[AccessManager] 🔑 Lease manager initialized');
  }

  public requestAccess(
    agentId: string,
    provider: Provider,
    permission: PermissionScope,
    purpose: string,
    taskId: string | null,
    durationSeconds: number = 300
  ): string {
    const credential = credentialVault.getCredentialByProvider(provider, permission);
    
    if (!credential) {
      console.error(`[AccessManager] ❌ No active credential found for ${provider} with scope ${permission}`);
      return "";
    }

    if (credential.status !== "ACTIVE") {
      console.error(`[AccessManager] ❌ Credential ${credential.credential_id} is not active`);
      return "";
    }

    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const lease: AccessLease = {
      lease_id: leaseId,
      agent_id: agentId,
      credential_id: credential.credential_id,
      provider,
      permission,
      purpose,
      task_id: taskId,
      status: "APPROVED",
      created_at: now,
      approved_at: now,
      activated_at: now,
      expires_at: now + (durationSeconds * 1000),
      revoked_at: null,
      approved_by: "policy_engine"
    };

    this.leases.set(leaseId, lease);

    osEngine.emitEvent({
      event_id: `evt_lease_${Date.now()}`,
      type: "LEASE_CREATED" as any,
      timestamp: now,
      agent_id: agentId,
      task_id: taskId,
      resource_id: credential.credential_id,
      content_id: null,
      payload: { leaseId, provider, permission, durationSeconds },
      severity: "info" as any
    });

    console.log(`[AccessManager] ✅ Lease created: ${leaseId} for ${agentId} → ${provider}`);
    return leaseId;
  }

  // ✅ ეს მეთოდი აუცილებელია mock-proxy.ts-ისთვის
  public validateLease(leaseId: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease) return false;

    if (lease.status !== "ACTIVE" && lease.status !== "APPROVED") return false;
    if (Date.now() > lease.expires_at) {
      lease.status = "EXPIRED";
      return false;
    }

    return true;
  }

  // ✅ ეს მეთოდი აუცილებელია credential-vault.ts-ისთვის
  public validateLeaseForCredential(credentialId: string, agentId: string): boolean {
    const activeLease = Array.from(this.leases.values()).find(
      l => l.credential_id === credentialId && 
           l.agent_id === agentId && 
           (l.status === "ACTIVE" || l.status === "APPROVED") &&
           Date.now() <= l.expires_at &&
           l.revoked_at === null
    );
    return !!activeLease;
  }

  public revokeLease(leaseId: string, revokedBy: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease) return false;

    lease.status = "REVOKED";
    lease.revoked_at = Date.now();

    osEngine.emitEvent({
      event_id: `evt_lease_revoked_${Date.now()}`,
      type: "LEASE_REVOKED" as any,
      timestamp: Date.now(),
      agent_id: lease.agent_id,
      task_id: lease.task_id,
      resource_id: lease.credential_id,
      content_id: null,
      payload: { leaseId, revokedBy },
      severity: "warning" as any
    });

    return true;
  }

  public revokeAllLeasesForCredential(credentialId: string, revokedBy: string): number {
    let count = 0;
    this.leases.forEach(lease => {
      if (lease.credential_id === credentialId && lease.status !== "REVOKED" && lease.status !== "EXPIRED") {
        this.revokeLease(lease.lease_id, revokedBy);
        count++;
      }
    });
    return count;
  }

  public revokeAllLeasesGlobally(revokedBy: string): number {
    let count = 0;
    this.leases.forEach(lease => {
      if (lease.status === "ACTIVE" || lease.status === "APPROVED") {
        this.revokeLease(lease.lease_id, revokedBy);
        count++;
      }
    });
    return count;
  }

  public getActiveLeases(): AccessLease[] {
    return Array.from(this.leases.values()).filter(
      l => (l.status === "ACTIVE" || l.status === "APPROVED") && Date.now() <= l.expires_at
    );
  }

  public getAllLeases(): AccessLease[] {
    return Array.from(this.leases.values());
  }
}

export const accessManager = new AccessManager();