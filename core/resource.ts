// ============================================================
// LUNARA OS — Resource & Credential Manager (Phase 3)
// Foundation §36-45, §88-91
// ============================================================

import type { 
  AccessLease, CostRecord, AuditEntry, 
  ProviderHealth, AccessLeaseStatus 
} from './contracts';
import { osEngine } from './engine';

// ლოკალური ტიპის განსაზღვრა, რადგან Resource არ არის ექსპორტირებული contracts-დან
export interface Resource {
  resource_id: string;
  name: string;
  type: string;
  health: ProviderHealth;
  last_health_check: number;
  [key: string]: any; // ნებისმიერი დამატებითი ველის დასაშვებად
}

export class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private leases: Map<string, AccessLease> = new Map();
  private costRecords: CostRecord[] = [];
  private auditLog: AuditEntry[] = [];

  // ----------------------------------------------------------
  // §36-37 — Resource Registry
  // ----------------------------------------------------------
  public registerResource(resource: Resource) {
    this.resources.set(resource.resource_id, resource);
    this.addAuditLog('SYSTEM', 'RESOURCE_REGISTERED', 'success', `Registered resource: ${resource.name}`, null, resource.resource_id);
  }

  public getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  public getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  public updateResourceHealth(resourceId: string, health: ProviderHealth) {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.health = health;
      resource.last_health_check = Date.now();
      osEngine.emitEvent({
        event_id: `evt_${Date.now()}_${Math.random()}`,
        type: "SYSTEM_HEALTH_CHANGED" as any,
        timestamp: Date.now(),
        agent_id: null,
        task_id: null,
        resource_id: resourceId,
        content_id: null,
        payload: { health },
        severity: health === "unavailable" ? "critical" : "info"
      });
    }
  }

  // ----------------------------------------------------------
  // §38-39 — Access Lease Management
  // ----------------------------------------------------------
  public requestAccess(
    agentId: string,
    resourceId: string,
    permission: string,
    purpose: string,
    taskId: string | null,
    durationSeconds: number = 300
  ): string {
    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const now = Date.now();
    const lease: AccessLease = {
      lease_id: leaseId,
      request_id: requestId,
      agent_id: agentId,
      resource_id: resourceId as any,
      permission,
      purpose,
      task_id: taskId,
      status: "requested",
      created_at: now,
      approved_at: null,
      activated_at: null,
      expires_at: now + (durationSeconds * 1000),
      revoked_at: null,
      approved_by: null,
      audit_log: []
    };

    this.leases.set(leaseId, lease);
    this.addAuditLog(agentId, 'ACCESS_REQUESTED', 'success', `Requested access to ${resourceId} for ${purpose}`, taskId, resourceId);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "RESOURCE_REQUESTED" as any,
      timestamp: now,
      agent_id: agentId,
      task_id: taskId,
      resource_id: resourceId,
      content_id: null,
      payload: { requestId, permission, purpose, durationSeconds },
      severity: "info" as any
    });

    return leaseId;
  }

  public approveLease(leaseId: string, approvedBy: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease || lease.status !== "requested") return false;

    // Check resource health before approving
    const resource = this.resources.get(lease.resource_id);
    if (!resource || resource.health === "unavailable") {
      this.rejectLease(leaseId, approvedBy, "Resource unavailable or unhealthy");
      return false;
    }

    lease.status = "approved"; // Will transition to ACTIVE upon first use in real implementation
    lease.approved_at = Date.now();
    lease.approved_by = approvedBy;
    lease.activated_at = Date.now();
    
    this.addAuditLog(approvedBy, 'ACCESS_APPROVED', 'success', `Approved lease ${leaseId} for ${lease.agent_id}`, lease.task_id, lease.resource_id);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "RESOURCE_GRANTED" as any,
      timestamp: Date.now(),
      agent_id: lease.agent_id,
      task_id: lease.task_id,
      resource_id: lease.resource_id,
      content_id: null,
      payload: { leaseId, approvedBy },
      severity: "info" as any
    });

    return true;
  }

  public rejectLease(leaseId: string, rejectedBy: string, reason: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease || lease.status !== "requested") return false;

    lease.status = "revoked";
    lease.revoked_at = Date.now();
    
    this.addAuditLog(rejectedBy, 'ACCESS_DENIED', 'failure', `Denied lease ${leaseId}: ${reason}`, lease.task_id, lease.resource_id);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "ACCESS_DENIED" as any, // Mapped to system event for now
      timestamp: Date.now(),
      agent_id: lease.agent_id,
      task_id: lease.task_id,
      resource_id: lease.resource_id,
      content_id: null,
      payload: { leaseId, rejectedBy, reason },
      severity: "warning" as any
    });

    return true;
  }

  public revokeLease(leaseId: string, revokedBy: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease || (lease.status !== "approved" && lease.status !== "active")) return false;

    lease.status = "revoked";
    lease.revoked_at = Date.now();
    
    this.addAuditLog(revokedBy, 'ACCESS_REVOKED', 'success', `Revoked active lease ${leaseId}`, lease.task_id, lease.resource_id);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "RESOURCE_REVOKED" as any,
      timestamp: Date.now(),
      agent_id: lease.agent_id,
      task_id: lease.task_id,
      resource_id: lease.resource_id,
      content_id: null,
      payload: { leaseId, revokedBy },
      severity: "warning" as any
    });

    return true;
  }

  public getPendingLeases(): AccessLease[] {
    return Array.from(this.leases.values()).filter(l => l.status === "requested");
  }

  // ----------------------------------------------------------
  // §44 — Cost Controller
  // ----------------------------------------------------------
  public recordCost(record: CostRecord) {
    this.costRecords.push(record);
    this.addAuditLog(record.agent_id, 'RESOURCE_USED', 'success', `Used ${record.model} on ${record.provider}`, record.task_id, null);
    
    // Optional: Emit budget warning if cost is high
    if (record.actual_cost > 1.0) { // Example threshold
      osEngine.emitEvent({
        event_id: `evt_${Date.now()}_${Math.random()}`,
        type: "SYSTEM_HEALTH_CHANGED" as any, // Using existing type for budget alert
        timestamp: Date.now(),
        agent_id: record.agent_id,
        task_id: record.task_id,
        resource_id: null,
        content_id: record.content_id,
        payload: { alert: "HIGH_COST", cost: record.actual_cost },
        severity: "warning" as any
      });
    }
  }

  public getTotalCost(): number {
    return this.costRecords.reduce((sum, record) => sum + record.actual_cost, 0);
  }

  // ----------------------------------------------------------
  // §45, §106 — Audit Trail
  // ----------------------------------------------------------
  private addAuditLog(
    actor: string,
    action: string,
    result: "success" | "failure" | "denied",
    reason: string,
    taskId: string | null,
    resourceId: string | null
  ) {
    const entry: AuditEntry = {
      audit_id: `audit_${Date.now()}_${Math.random()}`,
      actor,
      action,
      target: resourceId || taskId || "system",
      result,
      reason,
      timestamp: Date.now(),
      task_id: taskId,
      resource_id: resourceId
    };
    this.auditLog.unshift(entry);
    if (this.auditLog.length > 200) this.auditLog.pop();
  }

  public getRecentAuditLogs(limit = 20): AuditEntry[] {
    return this.auditLog.slice(0, limit);
  }
}

// Singleton instance
export const resourceManager = new ResourceManager();