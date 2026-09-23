// ============================================================
// LUNARA OS — Mock Trend Source
// Foundation: LUNARA MASTER BIBLE v2.0, §11, §18, §101
// Purpose: Simulate raw trend signals for Nyx to analyze
// NOTE: In production, this would be replaced with real API calls
// (TGStat, TikTok Creative Center, YouTube Trends, etc.)
// ============================================================

import type { ChannelId } from '../../core/media-network/channels';

export interface TrendSignal {
  signal_id: string;
  topic: string;
  core_insight: string;
  target_audience_problem: string;
  source: string;              // TGStat, TikTok, YouTube, etc.
  collection_method: string;   // How data was collected
  confidence: number;          // 0-1
  velocity: number;            // growth rate 0-100
  brand_fit: number;           // 0-1
  content_pillars: string[];   // Which content pillars match
  recommended_channels: ChannelId[];
  raw_data: {
    views?: number;
    engagement_rate?: number;
    growth_7d?: number;
    growth_30d?: number;
    reach_per_subscriber?: number;
  };
  collected_at: number;
}

export class MockTrendSource {
  constructor() {
    console.log('[MockTrendSource] Initialized (simulation mode)');
  }

  // Fetch simulated trend signals
  public async fetchSignals(): Promise<TrendSignal[]> {
    // Simulate API latency
    await this.delay(500);

    const signals: TrendSignal[] = [
      {
        signal_id: `signal_${Date.now()}_001`,
        topic: "Why people disappear when they start caring",
        core_insight: "Psychological defense mechanism activates when intimacy begins",
        target_audience_problem: "Why do people pull away when relationships get serious?",
        source: "TGStat + TikTok Creative Center",
        collection_method: "Trend analysis + engagement pattern detection",
        confidence: 0.87,
        velocity: 78,
        brand_fit: 0.92,
        content_pillars: ["psychology", "relationships", "attachment"],
        recommended_channels: ["human_mind", "love", "astrology", "tarot", "mystery", "lunara"],
        raw_data: {
          views: 2400000,
          engagement_rate: 0.12,
          growth_7d: 45,
          growth_30d: 120,
          reach_per_subscriber: 0.34
        },
        collected_at: Date.now()
      },
      {
        signal_id: `signal_${Date.now()}_002`,
        topic: "Scorpio season psychology",
        core_insight: "Scorpio energy intensifies emotional depth and transformation themes",
        target_audience_problem: "How does Scorpio season affect relationships and self-discovery?",
        source: "TGStat",
        collection_method: "Seasonal trend tracking + zodiac engagement analysis",
        confidence: 0.82,
        velocity: 65,
        brand_fit: 0.88,
        content_pillars: ["astrology", "zodiac", "seasons", "psychology"],
        recommended_channels: ["astrology", "love", "tarot", "lunara"],
        raw_data: {
          views: 1800000,
          engagement_rate: 0.09,
          growth_7d: 38,
          growth_30d: 95,
          reach_per_subscriber: 0.28
        },
        collected_at: Date.now()
      },
      {
        signal_id: `signal_${Date.now()}_003`,
        topic: "Pick-a-card mechanic revival",
        core_insight: "Interactive tarot content shows 3x higher engagement than passive posts",
        target_audience_problem: "How to create engaging interactive content that drives app activation?",
        source: "TikTok Creative Center + Internal Analytics",
        collection_method: "Format performance analysis + A/B test results",
        confidence: 0.79,
        velocity: 52,
        brand_fit: 0.95,
        content_pillars: ["tarot", "interactive", "pick-a-card"],
        recommended_channels: ["tarot", "lunara"],
        raw_data: {
          views: 950000,
          engagement_rate: 0.18,
          growth_7d: 28,
          growth_30d: 67,
          reach_per_subscriber: 0.41
        },
        collected_at: Date.now()
      },
      {
        signal_id: `signal_${Date.now()}_004`,
        topic: "Attachment styles in modern dating",
        core_insight: "Anxious-avoidant trap content resonates strongly with 18-34 demographic",
        target_audience_problem: "Why do I attract partners who pull away when I get close?",
        source: "TGStat + YouTube Trends",
        collection_method: "Audience sentiment analysis + comment pattern detection",
        confidence: 0.85,
        velocity: 71,
        brand_fit: 0.89,
        content_pillars: ["psychology", "relationships", "attachment", "dating"],
        recommended_channels: ["human_mind", "love", "astrology"],
        raw_data: {
          views: 3200000,
          engagement_rate: 0.11,
          growth_7d: 52,
          growth_30d: 134,
          reach_per_subscriber: 0.31
        },
        collected_at: Date.now()
      },
      {
        signal_id: `signal_${Date.now()}_005`,
        topic: "Dream interpretation symbolism",
        core_insight: "Recurring dream themes correlate with emotional processing needs",
        target_audience_problem: "What do my recurring dreams mean about my emotional state?",
        source: "TGStat",
        collection_method: "Niche trend monitoring + engagement quality scoring",
        confidence: 0.73,
        velocity: 44,
        brand_fit: 0.76,
        content_pillars: ["mystery", "psychology", "symbolism", "dreams"],
        recommended_channels: ["mystery", "human_mind", "tarot"],
        raw_data: {
          views: 680000,
          engagement_rate: 0.08,
          growth_7d: 22,
          growth_30d: 58,
          reach_per_subscriber: 0.25
        },
        collected_at: Date.now()
      }
    ];

    console.log(`[MockTrendSource] 📊 Fetched ${signals.length} trend signals`);
    return signals;
  }

  // Helper: simulate async delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockTrendSource = new MockTrendSource();