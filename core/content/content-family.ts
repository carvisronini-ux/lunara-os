// ============================================================
// LUNARA OS — Content Family Engine
// Foundation: LUNARA MASTER BIBLE v2.0, §10, §24
// Purpose: Transform one Content Atom (Opportunity) into 6 native channel variants
// ============================================================

import type { Opportunity } from '../intelligence/opportunity';
import type { ChannelId } from '../media-network/channels';

export interface ContentVariant {
  channel_id: ChannelId;
  title: string;
  hook: string;
  description: string;
  format: string;
  cta: string;
  language: string;
}

export interface ContentFamily {
  family_id: string;
  opportunity_id: string;
  core_insight: string;
  variants: ContentVariant[];
  status: "draft" | "approved" | "rejected";
  created_at: number;
  created_by: string; // Usually "muse"
}

// §10: Channel Adaptation Rules (Guides the generation of native variants)
export const CHANNEL_ADAPTATION_RULES: Record<ChannelId, { 
  tone: string; 
  format: string; 
  cta_style: string;
}> = {
  human_mind: {
    tone: "analytical, expert, deep, psychological",
    format: "carousel or long-form text with data points",
    cta_style: "psychological test or article link"
  },
  love: {
    tone: "emotional, personal, relatable, shareable",
    format: "short video (Reels/TikTok) or image with strong text overlay",
    cta_style: "share with someone who needs to hear this"
  },
  astrology: {
    tone: "identity-focused, habit-forming, cosmic",
    format: "daily horoscope style or zodiac ranking carousel",
    cta_style: "check your sign / save for later"
  },
  tarot: {
    tone: "interactive, mystical, intriguing, direct",
    format: "Pick-a-card video or interactive post",
    cta_style: "pick a card in Lunara App for your personal reading"
  },
  mystery: {
    tone: "story-driven, curiosity-expanding, unexplained",
    format: "thread or long-form story with a cliffhanger",
    cta_style: "learn more / next episode"
  },
  lunara: {
    tone: "product-focused, CTA-driven, premium",
    format: "Mini App link, premium offer showcase",
    cta_style: "open Lunara / get your personalized reading"
  }
};

// Simulated AI Generation Function (In production, this calls an LLM with the rules)
export function generateContentFamily(opportunity: Opportunity): ContentFamily {
  const variants: ContentVariant[] = [
    {
      channel_id: "human_mind",
      title: "The psychology behind why people pull away when intimacy begins",
      hook: "It's not you. It's a psychological defense mechanism that 73% of people experience.",
      description: "An expert breakdown of avoidant attachment triggers when relationships get serious.",
      format: "5-slide carousel with psychological data points",
      cta: "Take the attachment style test in our bio",
      language: "en"
    },
    {
      channel_id: "love",
      title: "5 subtle signs someone is emotionally distancing themselves",
      hook: "If you notice 3 of these, they are already pulling away.",
      description: "Early warning signs of emotional unavailability in modern dating.",
      format: "30-second short video with text overlay",
      cta: "Share this with someone who needs to hear it 💕",
      language: "en"
    },
    {
      channel_id: "astrology",
      title: "How each zodiac sign reacts when they start losing interest",
      hook: "Aries will tell you directly. Pisces will just vanish. What does your sign do?",
      description: "A cosmic breakdown of how the 12 zodiac signs handle emotional withdrawal.",
      format: "12-slide zodiac ranking carousel",
      cta: "Save this and check your sign ♈",
      language: "en"
    },
    {
      channel_id: "tarot",
      title: "Pick a card: Why did they really pull away?",
      hook: "Choose pile 1, 2, or 3. The cards know the answer they won't tell you.",
      description: "An interactive tarot reading uncovering the hidden reasons behind their distance.",
      format: "60-second pick-a-card video",
      cta: "Get your personalized reading in the Lunara App 🎴",
      language: "en"
    },
    {
      channel_id: "mystery",
      title: "The strange, unspoken reason people vanish when things get serious",
      hook: "In 1987, a psychologist discovered something that explains why people disappear without a trace.",
      description: "A story-driven exploration of the 'phantom ex' phenomenon and avoidance.",
      format: "Long-form thread with a cliffhanger",
      cta: "Read the full story →",
      language: "en"
    },
    {
      channel_id: "lunara",
      title: "Get your personalized relationship reading and uncover the truth",
      hook: "Why do they pull away? The answer is in your unique cosmic blueprint.",
      description: "Unlock deep insights about your relationship patterns with a premium Lunara reading.",
      format: "Mini App deep-link with premium offer",
      cta: "Open Lunara and get your reading ✨",
      language: "en"
    }
  ];

  return {
    family_id: `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    opportunity_id: opportunity.opportunity_id,
    core_insight: opportunity.core_insight,
    variants,
    status: "draft",
    created_at: Date.now(),
    created_by: "muse"
  };
}

export function getVariantByChannel(family: ContentFamily, channelId: ChannelId): ContentVariant | undefined {
  return family.variants.find(v => v.channel_id === channelId);
}