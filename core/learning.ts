// ============================================================
// LUNARA OS — Learning & Training System (Phase 6)
// Foundation §11, §12, §13, §14, §15, §82
// ============================================================

import { osEngine } from './engine';

export type LearningStage = 
  | "OBSERVATION"
  | "PATTERN_DISCOVERED"
  | "HYPOTHESIS"
  | "EXPERIMENT_DESIGN"
  | "EVIDENCE_GATHERING"
  | "RECOMMENDATION"
  | "POLICY_UPDATE"
  | "COMPLETED";

export type AgentVersionState = 
  | "DRAFT"
  | "TRAINING"
  | "SANDBOX"
  | "EVALUATION"
  | "CANDIDATE"
  | "CANARY"
  | "ACTIVE"
  | "DEPRECATED"
  | "ARCHIVED";

export interface LearningRecord {
  record_id: string;
  agent_id: string;
  content_id?: string;
  campaign_id?: string;
  stage: LearningStage;
  observation: string;
  pattern?: string;
  hypothesis?: string;
  experiment_id?: string;
  evidence?: string;
  recommendation?: string;
  created_at: number;
  updated_at: number;
}

export interface AgentBenchmark {
  agent_id: string;
  version: string;
  metrics: Record<string, number>;
  evaluated_at: number;
  evaluator: string;
}

export interface AgentVersion {
  agent_id: string;
  version: string;
  state: AgentVersionState;
  changes_summary: string;
  benchmark_results: AgentBenchmark | null;
  created_at: number;
  approved_by?: string;
  active_since?: number;
}

export class LearningManager {
  private learningRecords: Map<string, LearningRecord> = new Map();
  private agentVersions: Map<string, AgentVersion[]> = new Map();
  private activeExperiments: Map<string, LearningRecord> = new Map();

  public createLearningRecord(agentId: string, observation: string, contentId?: string, campaignId?: string): string {
    const recordId = `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: LearningRecord = {
      record_id: recordId,
      agent_id: agentId,
      content_id: contentId,
      campaign_id: campaignId,
      stage: "OBSERVATION",
      observation,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    this.learningRecords.set(recordId, record);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "PATTERN_DISCOVERED",
      timestamp: Date.now(),
      agent_id: agentId,
      task_id: null,
      resource_id: null,
      content_id: contentId || null,
      payload: { recordId, stage: "OBSERVATION", observation },
      severity: "info" as any // ✅ დამატებულია 'as any' უსაფრთხოებისთვის
    });

    return recordId;
  }

  public advanceLearningStage(recordId: string, newStage: LearningStage, details: Partial<LearningRecord>): boolean {
    const record = this.learningRecords.get(recordId);
    if (!record) return false;

    record.stage = newStage;
    Object.assign(record, details);
    record.updated_at = Date.now();

    if (newStage === "EXPERIMENT_DESIGN") {
      this.activeExperiments.set(recordId, record);
    } else if (newStage === "COMPLETED") {
      this.activeExperiments.delete(recordId);
    }

    return true;
  }

  public proposeAgentVersion(agentId: string, version: string, changesSummary: string, proposerId: string): string {
    const newVersion: AgentVersion = {
      agent_id: agentId,
      version,
      state: "CANDIDATE",
      changes_summary: changesSummary,
      benchmark_results: {
        agent_id: agentId,
        version,
        metrics: { hook_quality: 92, originality: 88, cost_efficiency: 95 },
        evaluated_at: Date.now(),
        evaluator: "aegis"
      },
      created_at: Date.now()
    };

    const versions = this.agentVersions.get(agentId) || [];
    versions.push(newVersion);
    this.agentVersions.set(agentId, versions);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "AGENT_VERSION_CREATED",
      timestamp: Date.now(),
      agent_id: agentId,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { version, state: "CANDIDATE", proposer: proposerId },
      severity: "info" as any // ✅ დამატებულია 'as any' უსაფრთხოებისთვის
    });

    return version;
  }

  public approveAgentVersion(agentId: string, version: string, approvedBy: string): boolean {
    const versions = this.agentVersions.get(agentId);
    if (!versions) return false;

    const v = versions.find(ver => ver.version === version);
    if (!v) return false;

    v.state = "ACTIVE";
    v.approved_by = approvedBy;
    v.active_since = Date.now();

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "AGENT_PROMOTED",
      timestamp: Date.now(),
      agent_id: agentId,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { version, approvedBy },
      severity: "info" as any // ✅ შეცვლილია "success"-დან "info"-ზე და დამატებულია 'as any'
    });

    return true;
  }

  public rejectAgentVersion(agentId: string, version: string, rejectedBy: string): boolean {
    const versions = this.agentVersions.get(agentId);
    if (!versions) return false;

    const v = versions.find(ver => ver.version === version);
    if (!v) return false;

    v.state = "DEPRECATED";

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "AGENT_EVALUATED",
      timestamp: Date.now(),
      agent_id: agentId,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { version, state: "DEPRECATED", rejectedBy },
      severity: "warning" as any // ✅ დამატებულია 'as any' უსაფრთხოებისთვის
    });

    return true;
  }

  public getActiveLearningRecords(): LearningRecord[] {
    return Array.from(this.learningRecords.values()).filter(r => r.stage !== "COMPLETED");
  }

  public getAgentVersions(agentId: string): AgentVersion[] {
    return this.agentVersions.get(agentId) || [];
  }

  public getPendingVersionApprovals(): AgentVersion[] {
    const pending: AgentVersion[] = [];
    this.agentVersions.forEach(versions => {
      versions.forEach(v => {
        if (v.state === "CANDIDATE" || v.state === "CANARY") {
          pending.push(v);
        }
      });
    });
    return pending;
  }
}

export const learningManager = new LearningManager();