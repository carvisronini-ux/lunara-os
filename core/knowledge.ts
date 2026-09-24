// ============================================================
// LUNARA OS — Knowledge Management System (Phase 4)
// Foundation §29-30, §45
// ============================================================

import type { 
  KnowledgeDocument, KnowledgeId, KnowledgeStatus 
} from './contracts';
import { osEngine } from './engine';

export class KnowledgeManager {
  private documents: Map<string, KnowledgeDocument[]> = new Map(); // knowledge_id -> versions[]
  private activeVersions: Map<string, string> = new Map(); // knowledge_id -> active_version

  // ----------------------------------------------------------
  // §29 — Knowledge Registry
  // ----------------------------------------------------------
  public registerKnowledge(doc: KnowledgeDocument) {
    const existing = this.documents.get(doc.knowledge_id) || [];
    existing.push(doc);
    this.documents.set(doc.knowledge_id, existing);

    // If this is the first version or marked as active, set it
    if (doc.status === "active" || existing.length === 1) {
      this.activeVersions.set(doc.knowledge_id, doc.version);
    }

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "KNOWLEDGE_VERSION_CREATED" as any,
      timestamp: Date.now(),
      agent_id: doc.owner,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { 
        knowledge_id: doc.knowledge_id, 
        version: doc.version,
        title: doc.title,
        status: doc.status
      },
      severity: "info" as any
    });
  }

  public getActiveKnowledge(knowledgeId: KnowledgeId): KnowledgeDocument | undefined {
    const versions = this.documents.get(knowledgeId);
    if (!versions || versions.length === 0) return undefined;

    const activeVersion = this.activeVersions.get(knowledgeId);
    if (!activeVersion) return versions[versions.length - 1]; // Fallback to latest

    return versions.find(v => v.version === activeVersion && v.status === "active");
  }

  public getKnowledgeVersion(knowledgeId: KnowledgeId, version: string): KnowledgeDocument | undefined {
    const versions = this.documents.get(knowledgeId);
    return versions?.find(v => v.version === version);
  }

  public getAllVersions(knowledgeId: KnowledgeId): KnowledgeDocument[] {
    return this.documents.get(knowledgeId) || [];
  }

  public getAllActiveKnowledge(): KnowledgeDocument[] {
    const active: KnowledgeDocument[] = [];
    // ✅ გასწორებულია: დამატებულია _version
    this.activeVersions.forEach((_version, knowledgeId) => {
      const doc = this.getActiveKnowledge(knowledgeId as KnowledgeId);
      if (doc) active.push(doc);
    });
    return active;
  }

  // ----------------------------------------------------------
  // §30 — Knowledge Versioning & Freshness
  // ----------------------------------------------------------
  public updateKnowledgeStatus(
    knowledgeId: KnowledgeId, 
    version: string, 
    newStatus: KnowledgeStatus,
    updatedBy: string
  ): boolean {
    const versions = this.documents.get(knowledgeId);
    if (!versions) return false;

    const doc = versions.find(v => v.version === version);
    if (!doc) return false;

    const oldStatus = doc.status;
    doc.status = newStatus;
    doc.updated_at = Date.now();

    // If marking as active, deactivate others
    if (newStatus === "active") {
      versions.forEach(v => {
        if (v.version !== version && v.status === "active") {
          v.status = "outdated";
        }
      });
      this.activeVersions.set(knowledgeId, version);
    }

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "KNOWLEDGE_UPDATED" as any,
      timestamp: Date.now(),
      agent_id: updatedBy,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { 
        knowledge_id: knowledgeId, 
        version,
        oldStatus,
        newStatus
      },
      severity: "info" as any
    });

    return true;
  }

  public isKnowledgeFresh(knowledgeId: KnowledgeId, maxAgeDays: number = 30): boolean {
    const doc = this.getActiveKnowledge(knowledgeId);
    if (!doc) return false;

    const ageMs = Date.now() - doc.updated_at;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    return ageMs < maxAgeMs;
  }

  // ----------------------------------------------------------
  // §45 — Knowledge Access for Agents
  // ----------------------------------------------------------
  public getKnowledgeForAgent(
    _agentId: string, // ✅ გასწორებულია: დამატებულია ქვედატირე
    allowedKnowledgeIds: KnowledgeId[]
  ): KnowledgeDocument[] {
    const accessible: KnowledgeDocument[] = [];

    allowedKnowledgeIds.forEach(knowledgeId => {
      const doc = this.getActiveKnowledge(knowledgeId);
      if (doc) {
        accessible.push(doc);
      }
    });

    return accessible;
  }

  // ----------------------------------------------------------
  // Search & Discovery
  // ----------------------------------------------------------
  public searchKnowledge(query: string): KnowledgeDocument[] {
    const results: KnowledgeDocument[] = [];
    const lowerQuery = query.toLowerCase();

    this.documents.forEach((versions) => {
      const activeDoc = versions.find(v => v.status === "active");
      if (activeDoc) {
        const matchesTitle = activeDoc.title.toLowerCase().includes(lowerQuery);
        const matchesContent = activeDoc.content.toLowerCase().includes(lowerQuery);
        const matchesId = activeDoc.knowledge_id.toLowerCase().includes(lowerQuery);

        if (matchesTitle || matchesContent || matchesId) {
          results.push(activeDoc);
        }
      }
    });

    return results;
  }

  // ----------------------------------------------------------
  // Statistics
  // ----------------------------------------------------------
  public getKnowledgeStats(): {
    totalDocuments: number;
    activeDocuments: number;
    outdatedDocuments: number;
    draftDocuments: number;
  } {
    let total = 0;
    let active = 0;
    let outdated = 0;
    let draft = 0;

    this.documents.forEach((versions) => {
      versions.forEach(v => {
        total++;
        if (v.status === "active") active++;
        if (v.status === "outdated") outdated++;
        if (v.status === "draft") draft++;
      });
    });

    return { totalDocuments: total, activeDocuments: active, outdatedDocuments: outdated, draftDocuments: draft };
  }
}

// Singleton instance
export const knowledgeManager = new KnowledgeManager();