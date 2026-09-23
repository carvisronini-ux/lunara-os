// ============================================================
// LUNARA OS — Nyx Agent: Trend Intelligence
// Foundation: LUNARA MASTER BIBLE v2.0, §4, §16, §24
// Purpose: Analyze raw trend signals and discover opportunities
// ============================================================

import { mockTrendSource, type TrendSignal } from '@/services/data/mock-trend-source';
import { opportunityRegistry } from '../intelligence/opportunity';
import { knowledgeManager } from '../knowledge';
import type { ChannelId } from '../media-network/channels';
import { osEngine } from '../engine';

export class NyxAgent {
  private agentId = "nyx";

  constructor() {
    console.log('[Nyx] 🧠 Trend Intelligence Agent initialized');
  }

  // Main analysis function
  public async analyzeTrends(): Promise<void> {
    console.log('[Nyx] 🔍 Starting trend analysis...');

    // 1. Fetch raw signals from mock source
    const rawSignals = await mockTrendSource.fetchSignals();
    console.log(`[Nyx] 📊 Received ${rawSignals.length} raw signals`);

    // 2. Load knowledge for context
    const brandBible = knowledgeManager.getActiveKnowledge("brand_bible");
    const contentBible = knowledgeManager.getActiveKnowledge("content_bible");

    if (!brandBible || !contentBible) {
      console.error('[Nyx] ❌ Missing knowledge documents');
      return;
    }

    console.log('[Nyx] 📚 Loaded Brand Bible and Content Bible');

    // 3. Analyze each signal
    const opportunities = rawSignals.map(signal => this.analyzeSignal(signal));

    // 4. Filter opportunities (confidence > 0.7, brand_fit > 0.7)
    const validOpportunities = opportunities.filter(opp => 
      opp.confidence > 0.7 && opp.brand_fit > 0.7
    );

    console.log(`[Nyx] ✨ Discovered ${validOpportunities.length} valid opportunities`);

    // 5. Register opportunities
    validOpportunities.forEach(opp => {
      opportunityRegistry.discoverOpportunity(
        opp.topic,
        opp.core_insight,
        opp.target_audience_problem,
        opp.source,
        opp.collection_method,
        opp.confidence,
        opp.velocity,
        opp.brand_fit,
        opp.content_pillars,
        opp.recommended_channels
      );
    });

    // 6. Emit summary event
    osEngine.emitEvent({
      event_id: `evt_nyx_analysis_${Date.now()}`,
      type: "NYX_ANALYSIS_COMPLETED" as any,
      timestamp: Date.now(),
      agent_id: this.agentId,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { 
        total_signals: rawSignals.length,
        valid_opportunities: validOpportunities.length,
        top_opportunity: validOpportunities[0]?.topic
      },
      severity: "info"
    });

    console.log('[Nyx] ✅ Trend analysis completed');
  }

  // Analyze a single signal
  private analyzeSignal(signal: TrendSignal) {
    // Calculate confidence score based on multiple factors
    const confidence = this.calculateConfidence(signal);
    
    // Calculate velocity (growth rate)
    const velocity = this.calculateVelocity(signal);
    
    // Check brand fit
    const brandFit = this.checkBrandFit(signal);
    
    // Match content pillars
    const contentPillars = this.matchContentPillars(signal);
    
    // Recommend channels
    const recommendedChannels = this.recommendChannels(signal);

    return {
      topic: signal.topic,
      core_insight: signal.core_insight,
      target_audience_problem: signal.target_audience_problem,
      source: signal.source,
      collection_method: signal.collection_method,
      confidence,
      velocity,
      brand_fit: brandFit,
      content_pillars: contentPillars,
      recommended_channels: recommendedChannels
    };
  }

  // Calculate confidence score (0-1)
  private calculateConfidence(signal: TrendSignal): number {
    // Base confidence from signal
    let confidence = signal.confidence;

    // Boost if engagement rate is high
    if (signal.raw_data.engagement_rate && signal.raw_data.engagement_rate > 0.1) {
      confidence += 0.05;
    }

    // Boost if growth is strong
    if (signal.raw_data.growth_7d && signal.raw_data.growth_7d > 30) {
      confidence += 0.03;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  // Calculate velocity (0-100)
  private calculateVelocity(signal: TrendSignal): number {
    // Use growth_7d as primary velocity indicator
    const growth7d = signal.raw_data.growth_7d || 0;
    const growth30d = signal.raw_data.growth_30d || 0;

    // Weighted average: recent growth matters more
    const velocity = (growth7d * 0.7) + (growth30d * 0.3);

    // Cap at 100
    return Math.min(velocity, 100);
  }

  // Check brand fit (0-1)
  private checkBrandFit(signal: TrendSignal): number {
    // Start with signal's brand_fit
    let brandFit = signal.brand_fit;

    // Boost if topic aligns with our content pillars
    const ourPillars = ["psychology", "relationships", "astrology", "tarot", "mystery"];
    const overlap = signal.content_pillars.filter(pillar => 
      ourPillars.includes(pillar)
    ).length;

    if (overlap > 0) {
      brandFit += (overlap * 0.05);
    }

    // Cap at 1.0
    return Math.min(brandFit, 1.0);
  }

  // Match content pillars
  private matchContentPillars(signal: TrendSignal): string[] {
    // Return signal's content pillars that match our strategy
    const ourPillars = ["psychology", "relationships", "astrology", "tarot", "mystery", "self-discovery"];
    
    return signal.content_pillars.filter(pillar => 
      ourPillars.includes(pillar)
    );
  }

  // Recommend channels based on signal
  private recommendChannels(signal: TrendSignal): ChannelId[] {
    // Use signal's recommended channels if provided
    if (signal.recommended_channels.length > 0) {
      return signal.recommended_channels;
    }

    // Otherwise, recommend based on content pillars
    const channelMapping: Record<string, ChannelId[]> = {
      "psychology": ["human_mind", "love"],
      "relationships": ["love", "human_mind"],
      "astrology": ["astrology", "love"],
      "tarot": ["tarot", "lunara"],
      "mystery": ["mystery", "human_mind"],
      "interactive": ["tarot", "lunara"]
    };

    const recommended: Set<ChannelId> = new Set();

    signal.content_pillars.forEach(pillar => {
      const channels = channelMapping[pillar];
      if (channels) {
        channels.forEach(ch => recommended.add(ch));
      }
    });

    // Always include lunara for product conversion
    recommended.add("lunara");

    return Array.from(recommended);
  }
}

export const nyxAgent = new NyxAgent();