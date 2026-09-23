// ============================================================
// LUNARA OS — Media Network: Channel Registry
// Foundation: LUNARA MASTER BIBLE v2.0, §8, §9, §10
// Purpose: Define the 6 independent media brands and their graph
// NOTE: All content and configuration in English
// ============================================================

export type ChannelId = 
  | "human_mind" 
  | "love" 
  | "astrology" 
  | "tarot" 
  | "mystery" 
  | "lunara";

export interface Channel {
  channel_id: ChannelId;
  name: string;
  icon: string;
  color: string;
  function: string;          // §8: Discovery, Emotion+sharing, etc.
  audience_job: string;      // §8: What the audience comes for
  content_identity: string;  // What makes this channel unique
  primary_kpi: string;       // §8: The one metric that matters most
  topics: string[];          // Content pillars for this channel
  status: "active" | "planned" | "paused";
}

export interface NetworkEdge {
  from: ChannelId;
  to: ChannelId;
  type: "primary" | "secondary";  // §9: Primary vs secondary routes
  description: string;
}

// §8: The 6 independent media brands (all in English)
export const CHANNELS: Channel[] = [
  {
    channel_id: "human_mind",
    name: "Human Mind",
    icon: "🧠",
    color: "#6366f1",
    function: "Discovery",
    audience_job: "Psychology, human behavior, personality",
    content_identity: "Deep psychological insights that explain why we do what we do",
    primary_kpi: "Qualified joins",
    topics: ["psychology", "behavioral science", "personality types", "emotional intelligence", "habits"],
    status: "active"
  },
  {
    channel_id: "love",
    name: "Love",
    icon: "💕",
    color: "#ec4899",
    function: "Emotion + sharing",
    audience_job: "Relationships, dating, attachment",
    content_identity: "Emotionally powerful, shareable content about relationships",
    primary_kpi: "Shares / 1K views",
    topics: ["love", "relationships", "attachment styles", "dating", "breakups"],
    status: "active"
  },
  {
    channel_id: "astrology",
    name: "Astrology",
    icon: "♈",
    color: "#a855f7",
    function: "Identity + habit",
    audience_job: "Zodiac, astrology, zodiac psychology",
    content_identity: "Daily zodiac content that creates habit and identity",
    primary_kpi: "Returning audience",
    topics: ["zodiac", "horoscope", "zodiac psychology", "cosmic signals", "seasons"],
    status: "active"
  },
  {
    channel_id: "tarot",
    name: "Tarot",
    icon: "🎴",
    color: "#f59e0b",
    function: "Interaction + intent",
    audience_job: "Pick-a-card, readings, mystery",
    content_identity: "Interactive pick-a-card content that sends to Lunara App",
    primary_kpi: "Interactions / Lunara clicks",
    topics: ["tarot", "pick-a-card", "readings", "symbolism", "intuition"],
    status: "active"
  },
  {
    channel_id: "mystery",
    name: "Mystery",
    icon: "🌙",
    color: "#14b8a6",
    function: "Curiosity expansion",
    audience_job: "Strange stories, symbolism, unexplained behavior",
    content_identity: "Mysterious, story-format content about strange facts and psychology",
    primary_kpi: "Shares / discovery",
    topics: ["mystery", "strange psychology", "symbolism", "dreams", "paranormal"],
    status: "planned"
  },
  {
    channel_id: "lunara",
    name: "Lunara",
    icon: "✨",
    color: "#8b5cf6",
    function: "Product destination",
    audience_job: "App, community, premium experiences",
    content_identity: "Lunara App product content, CTAs to Mini App",
    primary_kpi: "Mini App activation",
    topics: ["Lunara App", "premium readings", "community", "new features", "offers"],
    status: "active"
  }
];

// §9: Network Traffic Graph
export const NETWORK_EDGES: NetworkEdge[] = [
  // Primary routes
  { from: "human_mind", to: "love", type: "primary", description: "Psychology to relationships transition" },
  { from: "love", to: "astrology", type: "primary", description: "Relationships to zodiac identity" },
  { from: "astrology", to: "tarot", type: "primary", description: "Zodiac to interactive tarot" },
  { from: "tarot", to: "lunara", type: "primary", description: "Tarot to Lunara App activation" },
  // Secondary routes
  { from: "mystery", to: "human_mind", type: "secondary", description: "Mystery to psychology" },
  { from: "mystery", to: "tarot", type: "secondary", description: "Mystery to tarot" },
  { from: "love", to: "astrology", type: "secondary", description: "Love to astrology (bidirectional)" },
  { from: "astrology", to: "love", type: "secondary", description: "Astrology to love (bidirectional)" },
  { from: "astrology", to: "tarot", type: "secondary", description: "Astrology to tarot (alternative)" }
];

export function getChannel(channelId: ChannelId): Channel | undefined {
  return CHANNELS.find(c => c.channel_id === channelId);
}

export function getActiveChannels(): Channel[] {
  return CHANNELS.filter(c => c.status === "active");
}

export function getEdgesFromChannel(channelId: ChannelId): NetworkEdge[] {
  return NETWORK_EDGES.filter(e => e.from === channelId);
}

export function getEdgesToChannel(channelId: ChannelId): NetworkEdge[] {
  return NETWORK_EDGES.filter(e => e.to === channelId);
}