// ============================================================
// LUNARA OS — Echo Agent: Distribution Manager
// Foundation: LUNARA MASTER BIBLE v2.0, §48, §116
// Purpose: Schedule and distribute approved content to platforms
// ============================================================

import type { ContentFamily } from '../content/content-family';
import type { QualityReview } from './aegis';
import { osEngine } from '../engine';

export interface DistributionPlan {
  plan_id: string;
  family_id: string;
  variant_id: string;
  channel_id: string;
  platform: string;
  scheduled_time: number;
  status: "scheduled" | "published" | "failed";
  post_id?: string;
  published_at?: number;
}

export class EchoAgent {
  private distributionPlans: Map<string, DistributionPlan[]> = new Map();

  constructor() {
    console.log('[Echo] 📡 Distribution Manager initialized');
  }

  // Schedule approved variants for distribution
  public scheduleDistribution(family: ContentFamily, reviews: QualityReview[]): DistributionPlan[] {
    console.log(`[Echo] 📅 Scheduling distribution for family: ${family.family_id}`);

    const approvedVariants = family.variants.filter(variant => {
      const review = reviews.find(r => r.channel_id === variant.channel_id);
      return review?.verdict === "approved";
    });

    if (approvedVariants.length === 0) {
      console.log('[Echo] ⚠️ No approved variants to schedule');
      return [];
    }

    const plans: DistributionPlan[] = approvedVariants.map(variant => {
      const platform = this.getPlatformForChannel(variant.channel_id);
      const scheduledTime = this.calculateOptimalTime(variant.channel_id);

      const plan: DistributionPlan = {
        plan_id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        family_id: family.family_id,
        variant_id: `${family.family_id}_${variant.channel_id}`,
        channel_id: variant.channel_id,
        platform,
        scheduled_time: scheduledTime,
        status: "scheduled"
      };

      return plan;
    });

    // Store plans
    this.distributionPlans.set(family.family_id, plans);

    // Emit event
    osEngine.emitEvent({
      event_id: `evt_echo_schedule_${Date.now()}`,
      type: "DISTRIBUTION_SCHEDULED" as any,
      timestamp: Date.now(),
      agent_id: "echo",
      task_id: null,
      resource_id: null,
      content_id: family.family_id,
      payload: {
        familyId: family.family_id,
        totalScheduled: plans.length,
        platforms: Array.from(new Set(plans.map(p => p.platform)))
      },
      severity: "info"
    });

    console.log(`[Echo] ✅ Scheduled ${plans.length} variants across ${Array.from(new Set(plans.map(p => p.platform))).length} platforms`);
    return plans;
  }

  // Map channel to platform
  private getPlatformForChannel(channelId: string): string {
    const channelPlatformMap: Record<string, string> = {
      human_mind: "Instagram",
      love: "TikTok",
      astrology: "Instagram",
      tarot: "Telegram",
      mystery: "Twitter/X",
      lunara: "Telegram"
    };

    return channelPlatformMap[channelId] || "Instagram";
  }

  // Calculate optimal posting time based on channel
  private calculateOptimalTime(channelId: string): number {
    const now = Date.now();
    const hour = new Date().getHours();

    // Peak engagement times by channel
    const optimalHours: Record<string, number> = {
      human_mind: 19, // 7 PM
      love: 20,       // 8 PM
      astrology: 7,   // 7 AM
      tarot: 21,      // 9 PM
      mystery: 22,    // 10 PM
      lunara: 18      // 6 PM
    };

    const targetHour = optimalHours[channelId] || 19;
    const targetDate = new Date(now);
    targetDate.setHours(targetHour, 0, 0, 0);

    // If target time has passed today, schedule for tomorrow
    if (targetDate.getTime() < now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return targetDate.getTime();
  }

  // Publish a scheduled post (simulated)
  public publishPost(planId: string): boolean {
    let targetPlan: DistributionPlan | undefined;
    let targetFamilyId: string | undefined;

    // Find the plan
    for (const [familyId, plans] of this.distributionPlans.entries()) {
      const plan = plans.find(p => p.plan_id === planId);
      if (plan) {
        targetPlan = plan;
        targetFamilyId = familyId;
        break;
      }
    }

    if (!targetPlan || !targetFamilyId) {
      console.log(`[Echo] ❌ Plan not found: ${planId}`);
      return false;
    }

    // Simulate publication
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    targetPlan.status = "published";
    targetPlan.post_id = postId;
    targetPlan.published_at = Date.now();

    console.log(`[Echo] ✅ Published to ${targetPlan.platform}: ${postId}`);

    // Emit event
    osEngine.emitEvent({
      event_id: `evt_echo_publish_${Date.now()}`,
      type: "CONTENT_PUBLISHED" as any,
      timestamp: Date.now(),
      agent_id: "echo",
      task_id: null,
      resource_id: null,
      content_id: targetPlan.variant_id,
      payload: {
        familyId: targetFamilyId,
        channelId: targetPlan.channel_id,
        platform: targetPlan.platform,
        postId: postId
      },
      severity: "success"
    });

    return true;
  }

  // Get all distribution plans
  public getAllPlans(): DistributionPlan[] {
    return Array.from(this.distributionPlans.values()).flat();
  }

  // Get plans for a specific family
  public getPlans(familyId: string): DistributionPlan[] {
    return this.distributionPlans.get(familyId) || [];
  }
}

export const echoAgent = new EchoAgent();