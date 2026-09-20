// ============================================================
// LUNARA OS — Quality Control System (Phase 5)
// Foundation §9, §10, §47, §48, §86, §87
// ============================================================

import type { KnowledgeId } from './contracts';
import { osEngine } from './engine';

export type QAPipelineStage = 
  | "CREATED"
  | "SELF_CHECK"
  | "PEER_REVIEW"
  | "FACT_CHECK"
  | "ORIGINALITY_CHECK"
  | "BRAND_CHECK"
  | "PLATFORM_CHECK"
  | "RISK_CHECK"
  | "FINAL_QUALITY_GATE"
  | "APPROVED"
  | "REVISE"
  | "REJECTED";

export type ReviewDecision = "APPROVE" | "REVISE" | "REJECT";

export interface QualityScore {
  hook: number;               // 0-100
  retentionPotential: number; // 0-100
  originality: number;        // 0-100
  clarity: number;            // 0-100
  emotionalImpact: number;    // 0-100
  shareability: number;       // 0-100
  visualStrength: number;     // 0-100
  brandFit: number;           // 0-100
  platformFit: number;        // 0-100
  cta: number;                // 0-100
  safety: number;             // 0-100
}

export interface ContentPassport {
  content_id: string;
  campaign_id: string | null;
  concept_id: string | null;
  version: string;
  creator_agent: string;
  reviewers: string[];
  knowledge_versions: KnowledgeId[];
  assets: string[];
  platforms: string[];
  status: QAPipelineStage;
  current_stage: QAPipelineStage;
  quality_scores: QualityScore | null;
  total_score: number | null;
  review_notes: string[];
  created_at: number;
  updated_at: number;
}

export class QualityManager {
  private passports: Map<string, ContentPassport> = new Map();

  // ----------------------------------------------------------
  // §49 — Content Passport Creation
  // ----------------------------------------------------------
  public createPassport(passport: ContentPassport): string {
    passport.status = "CREATED";
    passport.current_stage = "SELF_CHECK";
    passport.created_at = Date.now();
    passport.updated_at = Date.now();
    passport.reviewers = [];
    passport.quality_scores = null;
    passport.total_score = null;
    passport.review_notes = [];

    this.passports.set(passport.content_id, passport);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "CONTENT_CREATED",
      timestamp: Date.now(),
      agent_id: passport.creator_agent,
      task_id: null,
      resource_id: null,
      content_id: passport.content_id,
      payload: { title: `Content ${passport.content_id}`, stage: "CREATED" },
      severity: "info"
    });

    return passport.content_id;
  }

  // ----------------------------------------------------------
  // §47 — Quality Pipeline Progression
  // ----------------------------------------------------------
  public advanceStage(contentId: string, newStage: QAPipelineStage, agentId: string): boolean {
    const passport = this.passports.get(contentId);
    if (!passport) return false;

    const oldStage = passport.current_stage;
    passport.current_stage = newStage;
    passport.updated_at = Date.now();

    if (newStage === "APPROVED" || newStage === "REJECTED" || newStage === "REVISE") {
      passport.status = newStage;
    }

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "CONTENT_REVIEW_REQUESTED",
      timestamp: Date.now(),
      agent_id: agentId,
      task_id: null,
      resource_id: null,
      content_id: contentId,
      payload: { oldStage, newStage },
      severity: newStage === "REJECTED" ? "warning" : "info"
    });

    return true;
  }

  // ----------------------------------------------------------
  // §86 — Quality Scoring
  // ----------------------------------------------------------
  public submitScore(
    contentId: string, 
    evaluatorAgentId: string, 
    scores: QualityScore, 
    notes: string
  ): boolean {
    const passport = this.passports.get(contentId);
    if (!passport) return false;

    passport.quality_scores = scores;
    
    // Calculate weighted or simple average total score
    const values = Object.values(scores);
    passport.total_score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    
    passport.reviewers.push(evaluatorAgentId);
    passport.review_notes.push(`[${evaluatorAgentId}]: ${notes}`);
    passport.updated_at = Date.now();

    return true;
  }

  // ----------------------------------------------------------
  // §87 — Agent Council / Final Gate Decision
  // ----------------------------------------------------------
  public makeFinalDecision(
    contentId: string, 
    decision: ReviewDecision, 
    decisionMakerId: string,
    isHumanOverride: boolean = false
  ): boolean {
    const passport = this.passports.get(contentId);
    if (!passport) return false;

    passport.status = decision;
    passport.current_stage = decision;
    passport.updated_at = Date.now();
    passport.review_notes.push(`[FINAL DECISION by ${decisionMakerId}${isHumanOverride ? ' (HUMAN OVERRIDE)' : ''}]: ${decision}`);

    const eventType = decision === "APPROVE" ? "CONTENT_APPROVED" : "CONTENT_REJECTED";
    const severity = decision === "REJECT" ? "warning" : "info";

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: eventType as any,
      timestamp: Date.now(),
      agent_id: decisionMakerId,
      task_id: null,
      resource_id: null,
      content_id: contentId,
      payload: { decision, totalScore: passport.total_score, humanOverride: isHumanOverride },
      severity
    });

    return true;
  }

  // ----------------------------------------------------------
  // Retrieval
  // ----------------------------------------------------------
  public getPassport(contentId: string): ContentPassport | undefined {
    return this.passports.get(contentId);
  }

  public getPendingReviews(): ContentPassport[] {
    return Array.from(this.passports.values()).filter(
      p => p.status !== "APPROVED" && p.status !== "REJECTED" && p.status !== "REVISE"
    );
  }

  public getAllPassports(): ContentPassport[] {
    return Array.from(this.passports.values());
  }
}

// Singleton instance
export const qualityManager = new QualityManager();