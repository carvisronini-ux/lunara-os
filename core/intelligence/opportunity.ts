// ============================================================
// LUNARA OS — Opportunity Registry
// Foundation: LUNARA MASTER BIBLE v2.0, §11, §19, §24
// Purpose: Define and manage content opportunities discovered by Nyx
// ============================================================

import type { ChannelId } from '../media-network/channels';
import { osEngine } from '../engine';

export type OpportunityStatus = 
  | "discovered"    // Nyx-მა აღმოაჩინა
  | "validated"     // Orion-მა დაადასტურა
  | "approved"      // Sage-მ დაამტკიცა
  | "rejected"      // უარყოფილი
  | "in_progress"   // მუშავდება
  | "completed";    // დასრულებული

export type OpportunityPriority = "low" | "medium" | "high" | "critical";

export interface Opportunity {
  opportunity_id: string;
  
  // Nyx-ის აღმოჩენა
  topic: string;              // რა არის თემა
  core_insight: string;       // რა არის ძირითადი ინსაითი
  target_audience_problem: string; // რა პრობლემას წყვეტს
  
  // მონაცემების წყარო (§11)
  source: string;             // TGStat, TikTok, etc.
  collection_method: string;  // როგორ შეგროვდა
  collected_at: number;       // როდის
  
  // შეფასება
  confidence: number;         // 0-1
  velocity: number;           // growth rate (0-100)
  brand_fit: number;          // 0-1
  content_pillar_match: string[]; // რომელ content pillars-ს ემთხვევა
  
  // რეკომენდაცია
  recommended_channels: ChannelId[]; // რომელ არხებზე მუშაობს
  priority: OpportunityPriority;
  
  // სტატუსი
  status: OpportunityStatus;
  discovered_by: string;      // agent ID (nyx)
  validated_by: string | null; // agent ID (orion)
  approved_by: string | null;  // agent ID (sage)
  
  // timestamps
  created_at: number;
  updated_at: number;
}

export class OpportunityRegistry {
  private opportunities: Map<string, Opportunity> = new Map();

  constructor() {
    console.log('[OpportunityRegistry] Initialized');
  }

  // Nyx აღმოაჩენს ახალ შესაძლებლობას
  public discoverOpportunity(
    topic: string,
    coreInsight: string,
    targetProblem: string,
    source: string,
    collectionMethod: string,
    confidence: number,
    velocity: number,
    brandFit: number,
    contentPillars: string[],
    recommendedChannels: ChannelId[]
  ): Opportunity {
    const opportunityId = `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const priority = this.calculatePriority(confidence, velocity, brandFit);
    
    const opportunity: Opportunity = {
      opportunity_id: opportunityId,
      topic,
      core_insight: coreInsight,
      target_audience_problem: targetProblem,
      source,
      collection_method: collectionMethod,
      collected_at: Date.now(),
      confidence,
      velocity,
      brand_fit: brandFit,
      content_pillar_match: contentPillars,
      recommended_channels: recommendedChannels,
      priority,
      status: "discovered",
      discovered_by: "nyx",
      validated_by: null,
      approved_by: null,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    this.opportunities.set(opportunityId, opportunity);

    osEngine.emitEvent({
      event_id: `evt_opp_${Date.now()}`,
      type: "OPPORTUNITY_DISCOVERED" as any,
      timestamp: Date.now(),
      agent_id: "nyx",
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { 
        opportunityId, 
        topic, 
        confidence, 
        priority 
      },
      severity: "info"
    });

    console.log(`[OpportunityRegistry] ✨ Nyx discovered: "${topic}" (confidence: ${confidence}, priority: ${priority})`);
    return opportunity;
  }

  // Orion ამოწმებს შესაძლებლობას
  public validateOpportunity(opportunityId: string, validatedBy: string = "orion"): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;

    opp.status = "validated";
    opp.validated_by = validatedBy;
    opp.updated_at = Date.now();

    osEngine.emitEvent({
      event_id: `evt_opp_val_${Date.now()}`,
      type: "OPPORTUNITY_VALIDATED" as any,
      timestamp: Date.now(),
      agent_id: validatedBy,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { opportunityId },
      severity: "info"
    });

    console.log(`[OpportunityRegistry] ✅ Orion validated: "${opp.topic}"`);
    return true;
  }

  // Sage ამტკიცებს შესაძლებლობას
  public approveOpportunity(opportunityId: string, approvedBy: string = "sage"): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;

    opp.status = "approved";
    opp.approved_by = approvedBy;
    opp.updated_at = Date.now();

    osEngine.emitEvent({
      event_id: `evt_opp_app_${Date.now()}`,
      type: "OPPORTUNITY_APPROVED" as any,
      timestamp: Date.now(),
      agent_id: approvedBy,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { opportunityId },
      severity: "success"
    });

    console.log(`[OpportunityRegistry] 🎯 Sage approved: "${opp.topic}"`);
    return true;
  }

  // უარყოფა
  public rejectOpportunity(opportunityId: string, rejectedBy: string): boolean {
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return false;

    opp.status = "rejected";
    opp.updated_at = Date.now();

    console.log(`[OpportunityRegistry] ❌ Rejected: "${opp.topic}" by ${rejectedBy}`);
    return true;
  }

  // მიღება სტატუსით
  public getOpportunitiesByStatus(status: OpportunityStatus): Opportunity[] {
    return Array.from(this.opportunities.values()).filter(opp => opp.status === status);
  }

  // ყველა შესაძლებლობა
  public getAllOpportunities(): Opportunity[] {
    return Array.from(this.opportunities.values());
  }

  // კონკრეტული შესაძლებლობა
  public getOpportunity(opportunityId: string): Opportunity | undefined {
    return this.opportunities.get(opportunityId);
  }

  // Priority-ის გამოთვლა (§19)
  private calculatePriority(confidence: number, velocity: number, brandFit: number): OpportunityPriority {
    const score = (confidence * 0.4) + (velocity / 100 * 0.3) + (brandFit * 0.3);
    
    if (score >= 0.85) return "critical";
    if (score >= 0.70) return "high";
    if (score >= 0.50) return "medium";
    return "low";
  }
}

export const opportunityRegistry = new OpportunityRegistry();