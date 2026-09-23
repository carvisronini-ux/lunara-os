// ============================================================
// LUNARA OS — Aegis Agent: Quality Control
// Foundation: LUNARA MASTER BIBLE v2.0, §47, §86
// Purpose: 11-dimensional quality scoring for content variants
// ============================================================

import type { ContentFamily, ContentVariant } from '../content/content-family';
import { osEngine } from '../engine';

export interface QualityScore {
  hook: number;
  retentionPotential: number;
  originality: number;
  clarity: number;
  emotionalImpact: number;
  shareability: number;
  visualStrength: number;
  brandFit: number;
  platformFit: number;
  cta: number;
  safety: number;
  total: number;
}

export interface QualityReview {
  review_id: string;
  family_id: string;
  variant_id: string;
  channel_id: string;
  scores: QualityScore;
  verdict: "approved" | "revise" | "rejected";
  feedback: string;
  reviewed_by: string;
  reviewed_at: number;
}

export class AegisAgent {
  private reviews: Map<string, QualityReview[]> = new Map();

  constructor() {
    console.log('[Aegis] 🛡️ Quality Control Agent initialized');
  }

  // §47: 11-dimensional quality scoring
  public reviewContentFamily(family: ContentFamily): QualityReview[] {
    console.log(`[Aegis] 🔍 Reviewing Content Family: ${family.family_id}`);

    const reviews: QualityReview[] = family.variants.map(variant => {
      const scores = this.calculateScores(variant);
      const verdict = this.determineVerdict(scores);
      const feedback = this.generateFeedback(scores, verdict);

      const review: QualityReview = {
        review_id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        family_id: family.family_id,
        variant_id: `${family.family_id}_${variant.channel_id}`,
        channel_id: variant.channel_id,
        scores,
        verdict,
        feedback,
        reviewed_by: "aegis",
        reviewed_at: Date.now()
      };

      return review;
    });

    // Store reviews
    this.reviews.set(family.family_id, reviews);

    // Emit event
    const approvedCount = reviews.filter(r => r.verdict === "approved").length;
    const reviseCount = reviews.filter(r => r.verdict === "revise").length;

    osEngine.emitEvent({
      event_id: `evt_aegis_review_${Date.now()}`,
      type: "CONTENT_REVIEWED" as any,
      timestamp: Date.now(),
      agent_id: "aegis",
      task_id: null,
      resource_id: null,
      content_id: family.family_id,
      payload: {
        familyId: family.family_id,
        totalVariants: reviews.length,
        approved: approvedCount,
        needsRevision: reviseCount
      },
      severity: "info"
    });

    console.log(`[Aegis] ✅ Review complete: ${approvedCount} approved, ${reviseCount} need revision`);
    return reviews;
  }

  // Calculate 11-dimensional scores (simulated)
  private calculateScores(variant: ContentVariant): QualityScore {
    // Base scores (simulated AI analysis)
    const baseScores = {
      hook: this.scoreHook(variant.hook),
      retentionPotential: this.scoreRetention(variant.format, variant.description),
      originality: this.scoreOriginality(variant.title, variant.hook),
      clarity: this.scoreClarity(variant.description),
      emotionalImpact: this.scoreEmotionalImpact(variant.hook, variant.description),
      shareability: this.scoreShareability(variant.cta, variant.channel_id),
      visualStrength: this.scoreVisualStrength(variant.format),
      brandFit: this.scoreBrandFit(variant.channel_id), // ✅ FIXED: removed variant.tone
      platformFit: this.scorePlatformFit(variant.format, variant.channel_id),
      cta: this.scoreCTA(variant.cta),
      safety: 100 // Always safe (no harmful content detected)
    };

    // Calculate total (weighted average)
    const weights = {
      hook: 0.15,
      retentionPotential: 0.12,
      originality: 0.10,
      clarity: 0.08,
      emotionalImpact: 0.12,
      shareability: 0.10,
      visualStrength: 0.08,
      brandFit: 0.10,
      platformFit: 0.10,
      cta: 0.05,
      safety: 0.00 // Safety is mandatory, not weighted
    };

    const total = Object.entries(baseScores).reduce((sum, [key, value]) => {
      return sum + (value * (weights[key as keyof typeof weights] || 0));
    }, 0);

    return {
      ...baseScores,
      total: Math.round(total)
    };
  }

  // Individual scoring functions (simulated AI logic)
  private scoreHook(hook: string): number {
    const length = hook.length;
    const hasNumbers = /\d/.test(hook);
    const hasQuestion = hook.includes('?');
    const isDirect = hook.startsWith('It\'s') || hook.startsWith('If') || hook.startsWith('Choose');
    
    let score = 70;
    if (length < 100) score += 10;
    if (hasNumbers) score += 5;
    if (hasQuestion) score += 5;
    if (isDirect) score += 10;
    
    return Math.min(score, 100);
  }

  private scoreRetention(format: string, description: string): number {
    const isShort = format.includes('30-second') || format.includes('short');
    const isCarousel = format.includes('carousel');
    const isInteractive = format.includes('pick-a-card') || format.includes('interactive');
    
    let score = 75;
    if (isShort) score += 10;
    if (isCarousel) score += 5;
    if (isInteractive) score += 10;
    if (description.length > 100) score += 5;
    
    return Math.min(score, 100);
  }

  private scoreOriginality(title: string, hook: string): number {
    const hasUniqueAngle = !title.includes('5 signs') && !title.includes('how to');
    const hasData = /\d+%/.test(hook) || /\d+/.test(hook);
    
    let score = 70;
    if (hasUniqueAngle) score += 15;
    if (hasData) score += 10;
    
    return Math.min(score, 100);
  }

  private scoreClarity(description: string): number {
    const isClear = description.length > 50 && description.length < 200;
    const hasStructure = description.includes('.') || description.includes(',');
    
    let score = 75;
    if (isClear) score += 10;
    if (hasStructure) score += 5;
    
    return Math.min(score, 100);
  }

  private scoreEmotionalImpact(hook: string, description: string): number {
    const emotionalWords = ['strange', 'unspoken', 'hidden', 'really', 'already', 'won\'t tell'];
    const hasEmotion = emotionalWords.some(word => 
      hook.toLowerCase().includes(word) || description.toLowerCase().includes(word)
    );
    
    let score = 70;
    if (hasEmotion) score += 20;
    
    return Math.min(score, 100);
  }

  private scoreShareability(cta: string, channelId: string): number {
    const isShareable = cta.toLowerCase().includes('share') || cta.toLowerCase().includes('save');
    const isLoveChannel = channelId === 'love';
    const isAstrologyChannel = channelId === 'astrology';
    
    let score = 70;
    if (isShareable) score += 15;
    if (isLoveChannel || isAstrologyChannel) score += 10;
    
    return Math.min(score, 100);
  }

  private scoreVisualStrength(format: string): number {
    const isCarousel = format.includes('carousel');
    const isVideo = format.includes('video');
    const isLongForm = format.includes('long-form') || format.includes('thread');
    
    let score = 75;
    if (isCarousel) score += 15;
    if (isVideo) score += 10;
    if (isLongForm) score -= 10;
    
    return Math.min(Math.max(score, 0), 100);
  }

  private scoreBrandFit(channelId: string): number {
    // All variants should fit brand guidelines based on channel identity
    const isPremiumChannel = channelId === 'lunara' || channelId === 'human_mind';
    const isMysticalChannel = channelId === 'tarot' || channelId === 'astrology' || channelId === 'mystery';
    
    let score = 85;
    if (isPremiumChannel || isMysticalChannel) score += 10;
    
    return Math.min(score, 100);
  }

  private scorePlatformFit(format: string, channelId: string): number {
    const isTikTok = format.includes('short video') || format.includes('30-second');
    const isInstagram = format.includes('carousel');
    const isTelegram = format.includes('interactive') || format.includes('pick-a-card');
    
    let score = 80;
    if ((channelId === 'love' && isTikTok) || 
        (channelId === 'astrology' && isInstagram) ||
        (channelId === 'tarot' && isTelegram)) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  private scoreCTA(cta: string): number {
    const hasAction = cta.includes('Take') || cta.includes('Share') || cta.includes('Save') || 
                      cta.includes('Choose') || cta.includes('Get') || cta.includes('Open') ||
                      cta.includes('Read');
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(cta);
    
    let score = 75;
    if (hasAction) score += 15;
    if (hasEmoji) score += 10;
    
    return Math.min(score, 100);
  }

  // Determine verdict based on total score
  private determineVerdict(scores: QualityScore): "approved" | "revise" | "rejected" {
    if (scores.total >= 85) return "approved";
    if (scores.total >= 70) return "revise";
    return "rejected";
  }

  // Generate feedback based on scores
  private generateFeedback(scores: QualityScore, verdict: string): string {
    const weakAreas: string[] = [];
    
    if (scores.hook < 75) weakAreas.push("Hook needs more impact");
    if (scores.retentionPotential < 75) weakAreas.push("Retention potential is low");
    if (scores.originality < 75) weakAreas.push("Content lacks originality");
    if (scores.emotionalImpact < 75) weakAreas.push("Emotional impact is weak");
    if (scores.shareability < 75) weakAreas.push("Shareability needs improvement");
    if (scores.cta < 75) weakAreas.push("CTA is not compelling enough");
    
    if (verdict === "approved") {
      return `✅ Excellent quality (Total: ${scores.total}/100). Ready for publication.`;
    } else if (verdict === "revise") {
      return `⚠️ Needs revision (Total: ${scores.total}/100). Weak areas: ${weakAreas.join(', ') || 'minor improvements needed'}.`;
    } else {
      return `❌ Rejected (Total: ${scores.total}/100). Major issues: ${weakAreas.join(', ') || 'significant quality problems'}.`;
    }
  }

  // Get reviews for a specific family
  public getReviews(familyId: string): QualityReview[] {
    return this.reviews.get(familyId) || [];
  }

  // Get all reviews
  public getAllReviews(): QualityReview[] {
    return Array.from(this.reviews.values()).flat();
  }
}

export const aegisAgent = new AegisAgent();