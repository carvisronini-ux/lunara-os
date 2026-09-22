"use client";

import { useEffect, useRef, useState } from "react";
import { osEngine } from "@/core/engine";
import { resourceManager } from "@/core/resource";
import { knowledgeManager } from "@/core/knowledge";
import { qualityManager } from "@/core/quality";
import { learningManager } from "@/core/learning";
import { orchestrator } from "@/core/orchestration/orchestrator";
import { agentRuntime } from "@/core/agents/agent-runtime"; // <-- ახალი იმპორტი: Agent Runtime
import type { EventType, TaskStatus, AgentStatus, KnowledgeId, KnowledgeDocument } from "@/core/contracts";
import type { ContentPassport, QualityScore } from "@/core/quality";
import type { LearningRecord, AgentVersion } from "@/core/learning";
import type { ActivePipelineInstance, PipelineDefinition } from "@/core/orchestration/orchestrator";

/* =========================================================
   LUNARA OS — Virtual Office (Phase 1-7 Integrated)
   Foundation §9, §10, §12, §13, §14, §15, §47, §48, §62, §65, §82, §86, §87, §104, §85, §101-102, §116
   ========================================================= */

type Department = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  level: number;
  xp: number;
  xpToNext: number;
  status: AgentStatus;
  taskId: string | null;
  accent: string;
  icon: string;
  missionsCompleted: number;
  autonomyLevel: number;
  currentTask?: string;
};

type Task = {
  id: string;
  title: string;
  agentId: string;
  status: TaskStatus;
  progress: number;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: number;
};

type ApprovalItem = {
  id: string;
  type: "content" | "publish" | "resource_access" | "policy_change" | "agent_action";
  title: string;
  description: string;
  agentId: string;
  platform?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  qaScore: number;
  preview?: string;
  status: "pending" | "approved" | "rejected" | "revised";
  createdAt: number;
  recommendedAction: "approve" | "reject" | "revise";
};

type EventLog = {
  id: string;
  timestamp: string;
  type: "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval";
  message: string;
};

type Resource = {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "unavailable";
  usage: number;
  quota: number;
};

type EmergencyState = {
  allAgentsPaused: boolean;
  publishingPaused: boolean;
  expensiveTasksStopped: boolean;
  accessRevoked: boolean;
};

/* =========================================================
   INITIAL DATA
   ========================================================= */

const departments: Department[] = [
  { id: "executive", name: "Executive Core", icon: "👑", color: "#8b5cf6", description: "Strategy & Coordination" },
  { id: "intelligence", name: "Intelligence", icon: "🔍", color: "#3b82f6", description: "Trend & Market Research" },
  { id: "strategy", name: "Strategy", icon: "🎯", color: "#a855f7", description: "Planning & Decisions" },
  { id: "content", name: "Content", icon: "✍️", color: "#f59e0b", description: "Scripts & Copy" },
  { id: "creative", name: "Creative", icon: "🎨", color: "#ec4899", description: "Visual Direction" },
  { id: "production", name: "Production", icon: "🎬", color: "#ef4444", description: "Asset Generation" },
  { id: "resources", name: "Resources", icon: "🔐", color: "#10b981", description: "Credentials & Access" },
  { id: "quality", name: "Quality Control", icon: "🛡️", color: "#06b6d4", description: "QA & Governance" },
  { id: "distribution", name: "Distribution", icon: "📡", color: "#84cc16", description: "Publishing" },
  { id: "analytics", name: "Analytics", icon: "📊", color: "#f97316", description: "Performance Data" },
  { id: "learning", name: "Learning", icon: "🧬", color: "#14b8a6", description: "Evolution & Training" },
];

const initialAgents: Agent[] = [
  { id: "astra", name: "Astra", role: "Executive Coordinator", department: "executive", level: 7, xp: 742, xpToNext: 1000, status: "idle", taskId: null, accent: "#8b5cf6", icon: "👑", missionsCompleted: 24, autonomyLevel: 4, currentTask: "Monitoring system priorities" },
  { id: "nyx", name: "Nyx", role: "Trend Intelligence", department: "intelligence", level: 5, xp: 516, xpToNext: 1000, status: "working", taskId: "task-001", accent: "#3b82f6", icon: "🔍", missionsCompleted: 18, autonomyLevel: 3, currentTask: "Analyzing TikTok trends" },
  { id: "orion", name: "Orion", role: "Competitor Intelligence", department: "intelligence", level: 4, xp: 384, xpToNext: 1000, status: "idle", taskId: null, accent: "#6366f1", icon: "👁️", missionsCompleted: 12, autonomyLevel: 3, currentTask: "Awaiting assignment" },
  { id: "sage", name: "Sage", role: "Chief Strategist", department: "strategy", level: 6, xp: 628, xpToNext: 1000, status: "waiting_for_review", taskId: "task-002", accent: "#a855f7", icon: "🎯", missionsCompleted: 20, autonomyLevel: 3, currentTask: "Strategy proposal pending approval" },
  { id: "muse", name: "Muse", role: "Head of Content", department: "content", level: 5, xp: 492, xpToNext: 1000, status: "working", taskId: "task-003", accent: "#f59e0b", icon: "✍️", missionsCompleted: 15, autonomyLevel: 3, currentTask: "Writing 3 script variants" },
  { id: "vega", name: "Vega", role: "Creative Director", department: "creative", level: 6, xp: 584, xpToNext: 1000, status: "waiting", taskId: "task-004", accent: "#ec4899", icon: "🎨", missionsCompleted: 18, autonomyLevel: 3, currentTask: "Waiting for script approval" },
  { id: "atlas", name: "Atlas", role: "Resource Director", department: "resources", level: 7, xp: 712, xpToNext: 1000, status: "working", taskId: "task-005", accent: "#10b981", icon: "🔐", missionsCompleted: 22, autonomyLevel: 2, currentTask: "Verifying API credentials" },
  { id: "cipher", name: "Cipher", role: "Credential Manager", department: "resources", level: 5, xp: 468, xpToNext: 1000, status: "idle", taskId: null, accent: "#059669", icon: "🔑", missionsCompleted: 14, autonomyLevel: 2, currentTask: "Monitoring access leases" },
  { id: "aegis", name: "Aegis", role: "Quality Director", department: "quality", level: 6, xp: 596, xpToNext: 1000, status: "working", taskId: "task-006", accent: "#06b6d4", icon: "🛡️", missionsCompleted: 19, autonomyLevel: 3, currentTask: "Reviewing 2 content items" },
  { id: "echo", name: "Echo", role: "Distribution Manager", department: "distribution", level: 5, xp: 524, xpToNext: 1000, status: "completed", taskId: "task-007", accent: "#84cc16", icon: "📡", missionsCompleted: 16, autonomyLevel: 2, currentTask: "Published to Telegram" },
  { id: "nova", name: "Nova", role: "Performance Analyst", department: "analytics", level: 4, xp: 412, xpToNext: 1000, status: "idle", taskId: null, accent: "#f97316", icon: "📊", missionsCompleted: 11, autonomyLevel: 3, currentTask: "Awaiting new data" },
  { id: "iris", name: "Iris", role: "Learning Director", department: "learning", level: 5, xp: 548, xpToNext: 1000, status: "working", taskId: "task-008", accent: "#14b8a6", icon: "🧬", missionsCompleted: 17, autonomyLevel: 3, currentTask: "Analyzing performance patterns" },
];

// NOTE: Changed initial statuses to "queued" and progress to 0 so AgentRuntime can pick them up from the start.
const initialTasks: Task[] = [
  { id: "task-001", title: "Analyze TikTok trend signals", agentId: "nyx", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "task-002", title: "Develop Q4 content strategy", agentId: "sage", status: "queued", progress: 0, priority: "critical", createdAt: Date.now() - 1000 * 60 * 60 },
  { id: "task-003", title: "Write 3 hook variants for Love Signal", agentId: "muse", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 20 },
  { id: "task-004", title: "Create visual concept for new series", agentId: "vega", status: "queued", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 15 },
  { id: "task-005", title: "Verify OpenAI API health", agentId: "atlas", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 10 },
  { id: "task-006", title: "QA review: 2 pending posts", agentId: "aegis", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 25 },
  { id: "task-007", title: "Publish to Telegram channel", agentId: "echo", status: "queued", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 45 },
  { id: "task-008", title: "Extract patterns from last week", agentId: "iris", status: "queued", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 35 },
];

const initialApprovals: ApprovalItem[] = [
  { id: "approval-001", type: "content", title: "Love Signal Episode 12 — Hook Variant A", description: "If you're single, stop scrolling. One of these cards knows what happens next.", agentId: "muse", platform: "TikTok", riskLevel: "medium", qaScore: 87, preview: "🎴 Love Signal Ep.12", status: "pending", createdAt: Date.now() - 1000 * 60 * 15, recommendedAction: "approve" },
  { id: "approval-002", type: "publish", title: "Publish Q4 Strategy Document", description: "Strategic document outlining content pillars for Q4 2026.", agentId: "sage", platform: "Telegram", riskLevel: "high", qaScore: 92, status: "pending", createdAt: Date.now() - 1000 * 60 * 30, recommendedAction: "approve" },
  { id: "approval-003", type: "resource_access", title: "OpenAI GPT-4 Access Request", description: "Image Producer requests temporary access for visual concept generation.", agentId: "atlas", riskLevel: "low", qaScore: 95, status: "pending", createdAt: Date.now() - 1000 * 60 * 5, recommendedAction: "approve" },
  { id: "approval-004", type: "content", title: "Zodiac Unlocked — Scorpio Season", description: "Scorpio season is here. Three secrets about your sign.", agentId: "muse", platform: "Instagram Reels", riskLevel: "low", qaScore: 78, preview: "🦂 Scorpio Season", status: "pending", createdAt: Date.now() - 1000 * 60 * 45, recommendedAction: "revise" },
];

const initialResources: Resource[] = [
  { id: "res-1", name: "OpenAI GPT-4", type: "AI Provider", status: "healthy", usage: 742, quota: 1000 },
  { id: "res-2", name: "Anthropic Claude", type: "AI Provider", status: "healthy", usage: 328, quota: 1000 },
  { id: "res-3", name: "Telegram Bot API", type: "Platform", status: "healthy", usage: 156, quota: 500 },
  { id: "res-4", name: "Cloudflare R2", type: "Storage", status: "degraded", usage: 892, quota: 1000 },
  { id: "res-5", name: "Supabase OS", type: "Database", status: "healthy", usage: 234, quota: 5000 },
  { id: "res-6", name: "TikTok API", type: "Platform", status: "unavailable", usage: 0, quota: 100 },
];

const initialKnowledge: KnowledgeDocument[] = [
  {
    knowledge_id: "brand_bible" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "Executive Core",
    title: "Lunara Brand Bible",
    content: "Dark editorial, premium, mystical but modern. Restrained palette, strong typography, distinctive symbols. Avoid generic 'AI woman + galaxy' imagery.",
    confidence: 0.95,
    owner: "astra",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 7,
    expires_at: null
  },
  {
    knowledge_id: "content_bible" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "Strategy Department",
    title: "Content Strategy & Pillars",
    content: "30% Love/relationships, 20% interactive/pick-a-card, 15% zodiac psychology, 15% daily cosmic signal, 10% mystery, 10% education. Focus on originality, retention, and shareability.",
    confidence: 0.90,
    owner: "sage",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 20,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 5,
    expires_at: null
  },
  {
    knowledge_id: "platform_rules" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "Intelligence Department",
    title: "Platform-Specific Rules",
    content: "TikTok: Fast hooks, trend-native language, rawer presentation. YouTube Shorts: Clear premise, retention analysis. Instagram Reels: Visual identity, shareability. Telegram: Interaction, polls, community.",
    confidence: 0.85,
    owner: "nyx",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 15,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 3,
    expires_at: null
  },
  {
    knowledge_id: "audience_knowledge" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "Analytics Department",
    title: "Audience Insights",
    content: "Primary audience: 18-34, relationship-focused, curious about self-discovery. Peak engagement: 7-9 PM weekdays. High share motivation for identity-relevant content.",
    confidence: 0.80,
    owner: "nova",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 10,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 2,
    expires_at: null
  }
];

const initialPassports: ContentPassport[] = [
  {
    content_id: "content-001",
    campaign_id: "camp-love-signal",
    concept_id: "concept-pick-a-card",
    version: "1.0",
    creator_agent: "muse",
    reviewers: ["aegis"],
    knowledge_versions: ["brand_bible", "content_bible"],
    assets: ["asset-img-001", "asset-vid-001"],
    platforms: ["TikTok", "Instagram Reels"],
    status: "FINAL_QUALITY_GATE",
    current_stage: "FINAL_QUALITY_GATE",
    quality_scores: {
      hook: 92, retentionPotential: 88, originality: 95, clarity: 90,
      emotionalImpact: 85, shareability: 89, visualStrength: 91,
      brandFit: 94, platformFit: 93, cta: 87, safety: 100
    },
    total_score: 91,
    review_notes: ["[aegis]: Strong hook, excellent brand fit. Minor CTA tweak recommended."],
    created_at: Date.now() - 1000 * 60 * 60,
    updated_at: Date.now() - 1000 * 60 * 30
  },
  {
    content_id: "content-002",
    campaign_id: "camp-zodiac",
    concept_id: "concept-scorpio",
    version: "1.0",
    creator_agent: "muse",
    reviewers: [],
    knowledge_versions: ["brand_bible"],
    assets: ["asset-img-002"],
    platforms: ["Instagram Reels"],
    status: "BRAND_CHECK",
    current_stage: "BRAND_CHECK",
    quality_scores: {
      hook: 75, retentionPotential: 70, originality: 65, clarity: 80,
      emotionalImpact: 72, shareability: 68, visualStrength: 78,
      brandFit: 60, platformFit: 85, cta: 70, safety: 100
    },
    total_score: 75,
    review_notes: ["[aegis]: Visuals feel too generic. Needs more distinctive Lunara branding."],
    created_at: Date.now() - 1000 * 60 * 120,
    updated_at: Date.now() - 1000 * 60 * 60
  }
];

const initialLearningRecords: LearningRecord[] = [
  {
    record_id: "learn-001",
    agent_id: "iris",
    content_id: "content-001",
    campaign_id: "camp-love-signal",
    stage: "RECOMMENDATION",
    observation: "Hooks with 'stop scrolling' pattern showed 15% higher retention in first 3 seconds.",
    pattern: "Direct command + curiosity gap increases initial retention.",
    hypothesis: "Applying this pattern to Zodiac content will improve average view duration.",
    experiment_id: "exp-001",
    evidence: "A/B test showed 12% increase in completion rate for command-based hooks.",
    recommendation: "Update Muse v1.1 prompt to prioritize direct command hooks for first 3 seconds.",
    created_at: Date.now() - 1000 * 60 * 60 * 24,
    updated_at: Date.now() - 1000 * 60 * 60 * 2
  }
];

const initialAgentVersions: AgentVersion[] = [
  {
    agent_id: "muse",
    version: "1.1.0",
    state: "CANDIDATE",
    changes_summary: "Integrated direct command hook pattern. Improved originality scoring by 8%.",
    benchmark_results: {
      agent_id: "muse",
      version: "1.1.0",
      metrics: { hook_quality: 92, originality: 88, cost_efficiency: 95 },
      evaluated_at: Date.now() - 1000 * 60 * 60,
      evaluator: "aegis"
    },
    created_at: Date.now() - 1000 * 60 * 60,
    approved_by: undefined,
    active_since: undefined
  }
];

/* =========================================================
   HELPERS
   ========================================================= */

function formatTime(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "idle": return "#94a3b8";
    case "working": return "#facc15";
    case "waiting": return "#60a5fa";
    case "queued": return "#60a5fa"; // Added for initial state
    case "waiting_for_resource": return "#f97316";
    case "waiting_for_review": return "#a855f7";
    case "completed": return "#34d399";
    case "error": return "#f87171";
    case "paused": return "#fbbf24";
    case "suspended": return "#ef4444";
    case "starting": return "#c084fc";
    case "offline": return "#475569";
    default: return "#94a3b8";
  }
}

function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case "idle": return "⏸️ IDLE";
    case "working": return "⚡ WORKING";
    case "waiting": return "⏳ WAITING";
    case "queued": return "⏳ QUEUED"; // Added for initial state
    case "waiting_for_resource": return "🔐 WAITING RESOURCE";
    case "waiting_for_review": return "🔍 WAITING REVIEW";
    case "completed": return "✅ COMPLETED";
    case "error": return "❌ ERROR";
    case "paused": return "⏸️ PAUSED";
    case "suspended": return "🚫 SUSPENDED";
    case "starting": return "🚀 STARTING";
    case "offline": return "⚫ OFFLINE";
    default: return status.toUpperCase();
  }
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/40";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    default: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  }
}

function getQAScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-yellow-400";
  if (score >= 60) return "text-orange-400";
  return "text-red-400";
}

function mapEngineTypeToUI(type: EventType): EventLog["type"] {
  if (type.includes("TASK")) return "task";
  if (type.includes("AGENT")) return "agent";
  if (type.includes("EMERGENCY")) return "emergency";
  if (type.includes("RESOURCE")) return "resource";
  if (type.includes("KNOWLEDGE")) return "learning";
  if (type.includes("CONTENT")) return "quality";
  if (type.includes("PATTERN") || type.includes("LEARNING")) return "learning";
  return "system";
}

function generateMessageFromEvent(event: any): string {
  switch (event.type) {
    case "TASK_CREATED": return `📋 Task created: ${event.payload?.title}`;
    case "TASK_STARTED": return `⚡ Task started by agent ${event.agent_id}`;
    case "TASK_COMPLETED": return `✅ Task completed by agent ${event.agent_id}`;
    case "TASK_FAILED": return `❌ Task failed for agent ${event.agent_id}`;
    case "AGENT_REGISTERED": return `🤖 Agent ${event.payload?.name} registered in ${event.payload?.department}`;
    case "EMERGENCY_ACTIVATED": return `🚨 Emergency protocol activated by Human Executive`;
    case "RESOURCE_REQUESTED": return `🔐 Access requested for ${event.resource_id} by ${event.agent_id}`;
    case "RESOURCE_GRANTED": return `✅ Access granted to ${event.resource_id}`;
    case "KNOWLEDGE_VERSION_CREATED": return `📚 Knowledge updated: ${event.payload?.title} (v${event.payload?.version})`;
    case "KNOWLEDGE_UPDATED": return `🔄 Knowledge status changed: ${event.payload?.knowledge_id} → ${event.payload?.newStatus}`;
    case "CONTENT_REVIEW_REQUESTED": return `🛡️ Content ${event.content_id} entered ${event.payload?.newStage} stage`;
    case "CONTENT_APPROVED": return `✅ Content ${event.content_id} APPROVED for publication (Score: ${event.payload?.totalScore})`;
    case "CONTENT_REJECTED": return `❌ Content ${event.content_id} REJECTED by ${event.agent_id}`;
    case "PATTERN_DISCOVERED": return `🧬 Iris discovered pattern: ${event.payload?.observation?.substring(0, 50)}...`;
    case "AGENT_VERSION_CREATED": return `⚙️ New agent version proposed: ${event.agent_id} v${event.payload?.version}`;
    case "AGENT_PROMOTED": return `✅ ${event.agent_id} promoted to v${event.payload?.version} by ${event.payload?.approvedBy}`;
    case "AGENT_EVALUATED": return `⚠️ ${event.agent_id} v${event.payload?.version} evaluation completed (State: ${event.payload?.state})`;
    default: return `System event: ${event.type}`;
  }
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  const [passports, setPassports] = useState<ContentPassport[]>(initialPassports);
  const [learningRecords, setLearningRecords] = useState<LearningRecord[]>(initialLearningRecords);
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>(initialAgentVersions);
  
  // Phase 7 State
  const [activePipelines, setActivePipelines] = useState<ActivePipelineInstance[]>([]);
  const [pipelineDef, setPipelineDef] = useState<PipelineDefinition | null>(null);
  
  const [events, setEvents] = useState<EventLog[]>([
    { id: "e1", timestamp: "--:--:--", type: "system", message: "🟢 Lunara OS Core Engine initialized" },
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>("astra");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "degraded" | "partial_outage">("healthy");
  const [simulationMode, setSimulationMode] = useState(true);
  
  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    allAgentsPaused: false,
    publishingPaused: false,
    expensiveTasksStopped: false,
    accessRevoked: false,
  });
  
  const [activePanel, setActivePanel] = useState<"overview" | "pipeline" | "approvals" | "quality" | "learning" | "emergency" | "knowledge">("overview");
  const timersRef = useRef<number[]>([]);

  /* =====================================================
     CORE ENGINE, RESOURCE, KNOWLEDGE, QUALITY, LEARNING & ORCHESTRATION
     ===================================================== */

  useEffect(() => {
    const currentTime = formatTime();
    setClock(currentTime);

    // 1. Register Agents & Tasks into Core Engine AND Agent Runtime
    initialAgents.forEach(agent => {
      osEngine.registerAgent(
        {
          agent_id: agent.id,
          display_name: agent.name,
          version: "1.0.0",
          department: agent.department as any,
          mission: agent.currentTask || "Operational duties",
          responsibilities: [agent.role],
          inputs: [], outputs: [], capabilities: [], allowed_tools: [],
          allowed_resources: [], knowledge_sources: [], rules: [],
          forbidden_actions: [], quality_criteria: [], kpis: [],
          supervisor: "astra", controller: "astra", reviewer: "aegis",
          escalation_path: ["astra"],
          autonomy_level: agent.autonomyLevel as any,
          failure_policy: { max_retries: 3, retry_delay_ms: 5000, escalation_path: ["astra"], notify_human: true }
        },
        {
          agent_id: agent.id,
          status: agent.status as any,
          current_task_id: agent.taskId,
          last_heartbeat: Date.now(),
          health_score: 100
        }
      );
      
      // Register agent in the Runtime so it can "work" on assigned tasks
      agentRuntime.registerAgent(agent.id);
    });

    initialTasks.forEach(task => {
      osEngine.createTask({
        task_id: task.id,
        idempotency_key: `task_${task.id}`,
        title: task.title,
        description: task.title,
        status: task.status as TaskStatus,
        priority: task.priority,
        creator_agent_id: "astra",
        assigned_agent_id: task.agentId,
        department: "executive" as any,
        required_capability: "research.trends" as any,
        payload: {}, expected_outputs: [], depends_on: [],
        progress: task.progress, retry_count: 0, max_retries: 3,
        error_category: null, error_message: null,
        created_at: task.createdAt,
        started_at: task.status === "running" ? task.createdAt : null,
        completed_at: task.status === "completed" ? task.createdAt : null,
        deadline: null
      });
    });

    // 2. Register Resources into Resource Manager (Phase 3)
    initialResources.forEach(res => {
      resourceManager.registerResource({
        provider_id: res.id as any,
        name: res.name,
        type: res.type as any,
        health: res.status === "healthy" ? "HEALTHY" : res.status === "degraded" ? "DEGRADED" : "UNAVAILABLE",
        capabilities: [],
        quota_limit: res.quota,
        quota_used: res.usage,
        cost_per_unit: 0.001,
        last_health_check: Date.now()
      });
    });

    // 3. Register Knowledge Documents (Phase 4)
    initialKnowledge.forEach(knowledge => {
      knowledgeManager.registerKnowledge(knowledge);
    });

    // 4. Register Content Passports (Phase 5)
    initialPassports.forEach(passport => {
      qualityManager.createPassport(passport);
    });

    // 5. Register Learning Records & Agent Versions (Phase 6)
    initialLearningRecords.forEach(record => {
      learningManager.createLearningRecord(record.agent_id, record.observation, record.content_id, record.campaign_id);
      learningManager.advanceLearningStage(record.record_id, "RECOMMENDATION", {
        pattern: record.pattern,
        hypothesis: record.hypothesis,
        recommendation: record.recommendation
      });
    });

    initialAgentVersions.forEach(version => {
      learningManager.proposeAgentVersion(version.agent_id, version.version, version.changes_summary, "iris");
    });

    // 6. Initialize Orchestrator (Phase 7)
    setPipelineDef(orchestrator.getPipelineDefinition());
    setActivePipelines(orchestrator.getActivePipelines());

    // 7. Subscribe to Engine Events
    const eventTypes: EventType[] = [
      "TASK_CREATED", "TASK_STARTED", "TASK_COMPLETED", "TASK_FAILED",
      "TASK_RETRIED", "TASK_ESCALATED", "AGENT_REGISTERED", "EMERGENCY_ACTIVATED",
      "RESOURCE_REQUESTED", "RESOURCE_GRANTED", "RESOURCE_REVOKED",
      "KNOWLEDGE_VERSION_CREATED", "KNOWLEDGE_UPDATED",
      "CONTENT_CREATED", "CONTENT_REVIEW_REQUESTED", "CONTENT_APPROVED", "CONTENT_REJECTED",
      "PATTERN_DISCOVERED", "AGENT_VERSION_CREATED", "AGENT_PROMOTED", "AGENT_EVALUATED"
    ];

    eventTypes.forEach(type => {
      osEngine.onEvent(type, (event) => {
        setEvents(prev => [
          {
            id: event.event_id,
            timestamp: new Date(event.timestamp).toLocaleTimeString(),
            type: mapEngineTypeToUI(event.type),
            message: generateMessageFromEvent(event),
          },
          ...prev
        ].slice(0, 50));
        
        // Update pipeline UI when tasks change
        if (type === "TASK_CREATED" || type === "TASK_COMPLETED" || type === "TASK_FAILED") {
          setActivePipelines([...orchestrator.getActivePipelines()]);
        }
      });
    });

    // NOTE: The blind random `simTimer` has been REMOVED. 
    // Tasks are now executed realistically by the `agentRuntime` based on agent assignment and duration.

    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
    };
  }, [emergencyState.allAgentsPaused]);

  /* =====================================================
     DERIVED DATA
     ===================================================== */

  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;
  const selectedDept = departments.find(d => d.id === selectedDepartment);
  
  const activeAgents = agents.filter(a => a.status === "working" || a.status === "starting").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const runningTasks = tasks.filter(t => t.status === "running").length;
  const totalXP = agents.reduce((sum, a) => sum + a.xp, 0);
  const pendingApprovals = approvals.filter(a => a.status === "pending").length;

  const filteredAgents = selectedDepartment ? agents.filter(a => a.department === selectedDepartment) : agents;
  const departmentAgents = (deptId: string) => agents.filter(a => a.department === deptId);

  /* =====================================================
     ACTIONS
     ===================================================== */

  const pauseAllAgents = () => {
    setAgents(prev => prev.map(a => a.status === "working" || a.status === "starting" ? { ...a, status: "paused" as AgentStatus } : a));
    setEmergencyState(prev => ({ ...prev, allAgentsPaused: true }));
    pushEvent("emergency", "🚨 EMERGENCY: All agents paused by Human Executive");
  };

  const resumeAllAgents = () => {
    setAgents(prev => prev.map(a => a.status === "paused" ? { ...a, status: "idle" as AgentStatus } : a));
    setEmergencyState(prev => ({ ...prev, allAgentsPaused: false }));
    pushEvent("system", "✅ All agents resumed by Human Executive");
  };

  const pausePublishing = () => {
    setEmergencyState(prev => ({ ...prev, publishingPaused: true }));
    pushEvent("emergency", "⚠️ Publishing paused by Human Executive");
  };

  const resumePublishing = () => {
    setEmergencyState(prev => ({ ...prev, publishingPaused: false }));
    pushEvent("system", "✅ Publishing resumed by Human Executive");
  };

  const stopExpensiveTasks = () => {
    setTasks(prev => prev.map(t => t.priority === "critical" || t.priority === "high" ? { ...t, status: "failed" as TaskStatus } : t));
    setEmergencyState(prev => ({ ...prev, expensiveTasksStopped: true }));
    pushEvent("emergency", "🛑 Expensive tasks stopped by Human Executive");
  };

  const revokeAccess = () => {
    setEmergencyState(prev => ({ ...prev, accessRevoked: true }));
    pushEvent("emergency", "🔐 Temporary access revoked by Human Executive");
  };

  const approveItem = (approvalId: string) => {
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "approved" } : a));
    const item = approvals.find(a => a.id === approvalId);
    if (item) pushEvent("approval", `✅ Approved: ${item.title} by Human Executive`);
  };

  const rejectItem = (approvalId: string) => {
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "rejected" } : a));
    const item = approvals.find(a => a.id === approvalId);
    if (item) pushEvent("approval", `❌ Rejected: ${item.title} by Human Executive`);
  };

  const reviseItem = (approvalId: string) => {
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "revised" } : a));
    const item = approvals.find(a => a.id === approvalId);
    if (item) pushEvent("approval", `🔄 Revision requested: ${item.title} by Human Executive`);
  };

  const pushEvent = (type: EventLog["type"], message: string) => {
    setEvents((previous) => [
      { id: `event-${Date.now()}-${Math.random()}`, timestamp: formatTime(), type, message },
      ...previous,
    ].slice(0, 50));
  };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <main className="lunara-readable min-h-screen w-full bg-slate-950 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-black shadow-2xl" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 0 40px rgba(139,92,246,0.5)" }}>◈</div>
              <div>
                <h1 className="text-4xl font-black tracking-tight lg:text-[42px]">LUNARA OS</h1>
                <p className="text-base font-medium text-slate-400 tracking-wide">VIRTUAL OFFICE — Autonomous Digital Organization</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatBadge label="Agents" value={agents.length} icon="👥" color="blue" />
              <StatBadge label="Active" value={activeAgents} icon="⚡" color="yellow" />
              <StatBadge label="Tasks" value={runningTasks} icon="🚀" color="purple" />
              <StatBadge label="Done" value={completedTasks} icon="✅" color="emerald" />
              <StatBadge label="XP" value={totalXP} icon="⭐" color="pink" />

              {simulationMode && (
                <div className="flex items-center gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/20 px-4 py-2">
                  <span className="text-xl">🧪</span>
                  <span className="text-base font-black tracking-wide text-yellow-400">SIMULATION</span>
                </div>
              )}

              <div className="ml-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 animate-pulse rounded-full ${systemStatus === "healthy" ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" : systemStatus === "degraded" ? "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]" : "bg-red-400 shadow-[0_0_15px_rgba(248,113,113,0.8)]"}`} />
                  <span className={`text-base font-bold tracking-wide ${systemStatus === "healthy" ? "text-emerald-400" : systemStatus === "degraded" ? "text-yellow-400" : "text-red-400"}`}>
                    {systemStatus === "healthy" ? "ONLINE" : systemStatus === "degraded" ? "DEGRADED" : "OUTAGE"}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="font-mono text-xl font-bold">{clock || "--:--:--"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-white/5 bg-slate-900/50">
          <div className="flex items-center gap-3 overflow-x-auto">
            <button onClick={() => setActivePanel("overview")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "overview" ? "bg-purple-500/20 text-purple-400 border border-purple-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🏢 Overview</button>
            <button onClick={() => setActivePanel("pipeline")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "pipeline" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🔄 Active Pipeline</button>
            <button onClick={() => setActivePanel("approvals")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap relative ${activePanel === "approvals" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              ✋ Approvals
              {pendingApprovals > 0 && <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">{pendingApprovals}</span>}
            </button>
            <button onClick={() => setActivePanel("quality")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "quality" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🛡️ Quality Review</button>
            <button onClick={() => setActivePanel("learning")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "learning" ? "bg-teal-500/20 text-teal-400 border border-teal-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🧬 Learning</button>
            <button onClick={() => setActivePanel("knowledge")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "knowledge" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>📚 Knowledge</button>
            <button onClick={() => setActivePanel("emergency")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "emergency" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🚨 Emergency</button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex">
        <aside className="w-[340px] border-r border-white/10 bg-slate-900/50 backdrop-blur-xl min-h-[calc(100vh-140px)] hidden lg:block">
          <div className="p-6">
            <h2 className="text-2xl font-black mb-6 tracking-wide">📂 DEPARTMENTS</h2>
            <div className="space-y-2">
              <button onClick={() => setSelectedDepartment(null)} className={`w-full rounded-xl border p-3 text-left transition-all ${!selectedDepartment ? "border-white/30 bg-white/10" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">🏢 All Departments</span>
                  <span className="text-sm text-slate-400">{agents.length}</span>
                </div>
              </button>
              {departments.map(dept => {
                const deptAgents = departmentAgents(dept.id);
                const activeCount = deptAgents.filter(a => a.status === "working").length;
                return (
                  <button key={dept.id} onClick={() => setSelectedDepartment(dept.id)} className={`w-full rounded-xl border p-3 text-left transition-all ${selectedDepartment === dept.id ? "border-white/30 bg-white/10" : "border-white/5 bg-white/5 hover:bg-white/10"}`} style={{ borderColor: selectedDepartment === dept.id ? dept.color : undefined }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: `${dept.color}30` }}>{dept.icon}</div>
                      <div className="flex-1">
                        <div className="text-base font-bold">{dept.name}</div>
                        <div className="text-xs text-slate-400">{dept.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{deptAgents.length}</div>
                        {activeCount > 0 && <div className="text-xs text-emerald-400">{activeCount} active</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-black mb-4">💚 SYSTEM HEALTH</h3>
              <div className="space-y-3">
                {[{ name: "Agent Bus", value: 100, color: "bg-emerald-500" }, { name: "Task Engine", value: 100, color: "bg-emerald-500" }, { name: "Event Bus", value: 98, color: "bg-blue-500" }, { name: "Quality Gate", value: 100, color: "bg-emerald-500" }, { name: "Learning Loop", value: 95, color: "bg-purple-500" }].map(item => (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-300">{item.name}</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">{item.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 p-8 lg:p-10 overflow-y-auto min-h-[calc(100vh-140px)]">
          {activePanel === "overview" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black mb-6 tracking-wide">🏢 VIRTUAL OFFICE MAP</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {departments.map(dept => {
                    const deptAgents = departmentAgents(dept.id);
                    const workingCount = deptAgents.filter(a => a.status === "working").length;
                    const waitingCount = deptAgents.filter(a => a.status.includes("waiting")).length;
                    const idleCount = deptAgents.filter(a => a.status === "idle").length;
                    return (
                      <div key={dept.id} className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-5 transition-all hover:border-white/30 hover:shadow-2xl cursor-pointer" style={{ borderColor: selectedDepartment === dept.id ? dept.color : undefined, boxShadow: selectedDepartment === dept.id ? `0 0 30px ${dept.color}40` : undefined }} onClick={() => setSelectedDepartment(dept.id)}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: `${dept.color}30` }}>{dept.icon}</div>
                          <div>
                            <div className="text-lg font-black">{dept.name}</div>
                            <div className="text-xs text-slate-400">{dept.description}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Working</span><span className="font-bold text-yellow-400">{workingCount}</span></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Waiting</span><span className="font-bold text-blue-400">{waitingCount}</span></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Idle</span><span className="font-bold text-slate-400">{idleCount}</span></div>
                        </div>
                        <div className="mt-4 flex -space-x-2">
                          {deptAgents.slice(0, 4).map(agent => (
                            <div key={agent.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 text-sm" style={{ background: `${agent.accent}40` }} title={agent.name}>{agent.icon}</div>
                          ))}
                          {deptAgents.length > 4 && <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-xs font-bold">+{deptAgents.length - 4}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-black mb-6 tracking-wide">👥 AGENTS <span className="text-lg font-medium text-slate-400 ml-3">({filteredAgents.length} agents{selectedDepartment ? ` in ${selectedDept?.name}` : ""})</span></h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredAgents.map(agent => {
                    const agentTasks = tasks.filter(t => t.agentId === agent.id);
                    const activeTask = agentTasks.find(t => t.status === "running" || t.status === "review");
                    return (
                      <div key={agent.id} className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 transition-all hover:border-white/30 hover:shadow-2xl cursor-pointer" style={{ borderColor: selectedAgentId === agent.id ? agent.accent : undefined, boxShadow: selectedAgentId === agent.id ? `0 0 40px ${agent.accent}40` : undefined }} onClick={() => setSelectedAgentId(agent.id)}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-xl" style={{ background: `${agent.accent}30`, boxShadow: `0 0 30px ${agent.accent}40` }}>{agent.icon}</div>
                            <div>
                              <h3 className="text-2xl font-black">{agent.name}</h3>
                              <p className="text-base text-slate-400">{agent.role}</p>
                              <p className="text-xs text-slate-500 mt-1">{departments.find(d => d.id === agent.department)?.name}</p>
                            </div>
                          </div>
                          <div className={`rounded-xl border px-4 py-2 text-sm font-bold ${agent.status === "working" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : agent.status === "idle" ? "bg-slate-500/20 border-slate-500/40 text-slate-400" : agent.status === "completed" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : agent.status === "error" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-blue-500/20 border-blue-500/40 text-blue-400"}`}>
                            {getStatusLabel(agent.status)}
                          </div>
                        </div>
                        {agent.currentTask && (
                          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs font-bold text-slate-400 mb-1">CURRENT ACTIVITY</div>
                            <div className="text-base font-bold">{agent.currentTask}</div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <StatBox label="LEVEL" value={agent.level} color={agent.accent} />
                          <StatBox label="XP" value={agent.xp} color={agent.accent} />
                          <StatBox label="DONE" value={agent.missionsCompleted} color={agent.accent} />
                          <StatBox label="AUTO" value={`L${agent.autonomyLevel}`} color={agent.accent} />
                        </div>
                        <div className="mb-4">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-400">EXPERIENCE</span>
                            <span className="text-sm font-mono font-bold">{agent.xp} / {agent.xpToNext}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(agent.xp / agent.xpToNext) * 100}%`, background: `linear-gradient(90deg, ${agent.accent}, ${agent.accent}80)`, boxShadow: `0 0 15px ${agent.accent}` }} />
                          </div>
                        </div>
                        {activeTask && (
                          <div className="rounded-xl border p-3" style={{ borderColor: `${agent.accent}40`, background: `${agent.accent}10` }}>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-bold">🎯 {activeTask.title}</span>
                              <span className="text-lg font-mono font-black">{activeTask.progress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${activeTask.progress}%`, background: agent.accent }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activePanel === "pipeline" && pipelineDef && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-wide">🔄 ACTIVE PIPELINE</h2>
                  <p className="text-base text-slate-400 mt-1">
                    Foundation §116 — First End-to-End Demonstration
                  </p>
                </div>
                <button
                  onClick={() => {
                    orchestrator.triggerFirstPipeline({ campaign: "Love Signal Ep.12" });
                    setActivePipelines([...orchestrator.getActivePipelines()]);
                    pushEvent("system", "🚀 Human Executive triggered End-to-End Pipeline");
                  }}
                  className="rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-6 py-3 text-base font-bold text-indigo-400 transition hover:bg-indigo-500/30"
                >
                  ▶️ START NEW PIPELINE
                </button>
              </div>

              <div className="space-y-6">
                {activePipelines.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">⏸️</div>
                    <h3 className="text-xl font-black text-white mb-2">No Active Pipelines</h3>
                    <p className="text-slate-400 mb-6">Click "START NEW PIPELINE" to initiate the end-to-end content creation flow.</p>
                  </div>
                ) : (
                  activePipelines.map(instance => {
                    const currentStage = pipelineDef.stages[instance.currentStageIndex];
                    const progress = Math.round((instance.currentStageIndex / pipelineDef.stages.length) * 100);
                    
                    return (
                      <div key={instance.instanceId} className="rounded-2xl border border-indigo-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-black text-white">Instance: {instance.instanceId}</h3>
                            <p className="text-sm text-slate-400">Campaign: {(instance.context.campaign as string) || "Unknown"}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-indigo-400">{progress}%</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Overall Progress</div>
                          </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="h-3 overflow-hidden rounded-full bg-slate-700 mb-8">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Stages Visualization */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {pipelineDef.stages.map((stage, index) => {
                            const agent = agents.find(a => a.id === stage.agentId);
                            const isCompleted = index < instance.currentStageIndex;
                            const isCurrent = index === instance.currentStageIndex;

                            return (
                              <div 
                                key={stage.name} 
                                className={`rounded-xl border p-4 transition-all ${
                                  isCompleted ? "border-emerald-500/30 bg-emerald-500/10" :
                                  isCurrent ? "border-indigo-500/50 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)]" :
                                  "border-white/5 bg-white/5 opacity-50"
                                }`}
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                                    isCompleted ? "bg-emerald-500 text-white" :
                                    isCurrent ? "bg-indigo-500 text-white animate-pulse" :
                                    "bg-slate-700 text-slate-400"
                                  }`}>
                                    {isCompleted ? "✓" : index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{stage.name}</div>
                                    <div className="text-sm font-bold text-white">{agent?.name}</div>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{stage.description}</p>
                                
                                {isCurrent && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                                    <span className="text-xs font-bold text-indigo-400">EXECUTING...</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activePanel === "learning" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">🧬 LEARNING & EVOLUTION</h2>
              <p className="text-base text-slate-400 mb-6">
                Foundation §12, §82 — Evidence-based agent improvement and version control
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Active Learning Records */}
                <div className="rounded-2xl border border-teal-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                  <h3 className="text-lg font-black mb-4 text-teal-400">🔍 Active Learning Records</h3>
                  <div className="space-y-4">
                    {learningManager.getActiveLearningRecords().map(record => {
                      const agent = agents.find(a => a.id === record.agent_id);
                      return (
                        <div key={record.record_id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-white">{agent?.name} ({agent?.role})</span>
                            <span className="text-xs font-mono text-teal-400">{record.stage.replace(/_/g, " ")}</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-3">{record.observation}</p>
                          {record.recommendation && (
                            <div className="rounded-lg bg-teal-500/10 p-3 border border-teal-500/20">
                              <div className="text-xs font-bold text-teal-400 mb-1">RECOMMENDATION</div>
                              <p className="text-sm text-slate-300">{record.recommendation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {learningManager.getActiveLearningRecords().length === 0 && (
                      <div className="text-center text-slate-500 py-8">No active learning records.</div>
                    )}
                  </div>
                </div>

                {/* Pending Agent Version Approvals */}
                <div className="rounded-2xl border border-purple-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                  <h3 className="text-lg font-black mb-4 text-purple-400">⚙️ Pending Agent Upgrades</h3>
                  <div className="space-y-4">
                    {learningManager.getPendingVersionApprovals().map(version => {
                      const agent = agents.find(a => a.id === version.agent_id);
                      return (
                        <div key={`${version.agent_id}-${version.version}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{agent?.icon}</span>
                              <span className="text-base font-bold text-white">{agent?.name} <span className="text-purple-400">v{version.version}</span></span>
                            </div>
                            <span className="text-xs font-mono text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">CANDIDATE</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-3">{version.changes_summary}</p>
                          
                          {version.benchmark_results && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {Object.entries(version.benchmark_results.metrics).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="rounded-lg bg-white/5 p-2 text-center">
                                  <div className="text-[10px] uppercase text-slate-400">{key.replace(/_/g, " ")}</div>
                                  <div className="text-lg font-black text-emerald-400">{value}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button 
                              onClick={() => {
                                learningManager.approveAgentVersion(version.agent_id, version.version, "human_executive");
                                setAgentVersions([...learningManager.getAgentVersions(version.agent_id)]);
                                pushEvent("learning", `✅ Human Executive APPROVED ${agent?.name} v${version.version}`);
                              }}
                              className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/30"
                            >
                              ✅ APPROVE & DEPLOY
                            </button>
                            <button 
                              onClick={() => {
                                learningManager.rejectAgentVersion(version.agent_id, version.version, "human_executive");
                                setAgentVersions([...learningManager.getAgentVersions(version.agent_id)]);
                                pushEvent("learning", `❌ Human Executive REJECTED ${agent?.name} v${version.version}`);
                              }}
                              className="flex-1 rounded-lg border border-red-500/40 bg-red-500/20 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/30"
                            >
                              ❌ REJECT
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {learningManager.getPendingVersionApprovals().length === 0 && (
                      <div className="text-center text-slate-500 py-8">No pending agent upgrades.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === "quality" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">🛡️ QUALITY REVIEW QUEUE</h2>
              <p className="text-base text-slate-400 mb-6">
                Foundation §47, §86 — Multi-stage QA pipeline and 11-dimensional scoring
              </p>

              <div className="space-y-6">
                {qualityManager.getPendingReviews().map(passport => {
                  const creator = agents.find(a => a.id === passport.creator_agent);
                  return (
                    <div key={passport.content_id} className="rounded-2xl border border-cyan-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-black text-white">Content ID: {passport.content_id}</h3>
                          <p className="text-sm text-slate-400 mt-1">
                            Creator: <span className="font-bold text-white">{creator?.name || passport.creator_agent}</span> • 
                            Platforms: <span className="text-cyan-400">{passport.platforms.join(", ")}</span> • 
                            Version: <span className="font-mono text-cyan-400">{passport.version}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="rounded-lg bg-cyan-500/20 px-4 py-2 text-center">
                            <div className="text-xs font-bold text-cyan-400">TOTAL SCORE</div>
                            <div className="text-3xl font-black text-white">{passport.total_score ?? "N/A"}</div>
                          </div>
                          <div className={`rounded-lg px-3 py-1 text-xs font-black ${
                            passport.current_stage === "FINAL_QUALITY_GATE" ? "bg-yellow-500/20 text-yellow-400" :
                            passport.current_stage === "REJECTED" ? "bg-red-500/20 text-red-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {passport.current_stage.replace(/_/g, " ")}
                          </div>
                        </div>
                      </div>

                      {passport.quality_scores && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                          {Object.entries(passport.quality_scores).map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className={`text-2xl font-black ${
                                value >= 90 ? "text-emerald-400" : value >= 75 ? "text-yellow-400" : "text-red-400"
                              }`}>
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
                        <div className="text-xs font-bold text-slate-400 mb-2">REVIEW NOTES</div>
                        <ul className="space-y-2">
                          {passport.review_notes.map((note, idx) => (
                            <li key={idx} className="text-sm text-slate-300 flex gap-2">
                              <span className="text-cyan-400">▸</span> {note}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            qualityManager.makeFinalDecision(passport.content_id, "APPROVE", "human_executive", true);
                            setPassports([...qualityManager.getAllPassports()]);
                            pushEvent("quality", `✅ Human Executive APPROVED content ${passport.content_id}`);
                          }}
                          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-3 text-base font-bold text-emerald-400 transition hover:bg-emerald-500/30"
                        >
                          ✅ APPROVE & PUBLISH
                        </button>
                        <button 
                          onClick={() => {
                            qualityManager.makeFinalDecision(passport.content_id, "REVISE", "human_executive", true);
                            setPassports([...qualityManager.getAllPassports()]);
                            pushEvent("quality", `🔄 Human Executive requested REVISION for ${passport.content_id}`);
                          }}
                          className="flex-1 rounded-xl border border-blue-500/40 bg-blue-500/20 py-3 text-base font-bold text-blue-400 transition hover:bg-blue-500/30"
                        >
                          🔄 REQUEST REVISION
                        </button>
                        <button 
                          onClick={() => {
                            qualityManager.makeFinalDecision(passport.content_id, "REJECT", "human_executive", true);
                            setPassports([...qualityManager.getAllPassports()]);
                            pushEvent("quality", `❌ Human Executive REJECTED content ${passport.content_id}`);
                          }}
                          className="flex-1 rounded-xl border border-red-500/40 bg-red-500/20 py-3 text-base font-bold text-red-400 transition hover:bg-red-500/30"
                        >
                          ❌ REJECT
                        </button>
                      </div>
                    </div>
                  );
                })}

                {qualityManager.getPendingReviews().length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-black text-white mb-2">All Clear!</h3>
                    <p className="text-slate-400">No content is currently pending quality review.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === "knowledge" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">📚 KNOWLEDGE BASE</h2>
              <p className="text-base text-slate-400 mb-6">
                Foundation §29-30 — Centralized, versioned organizational memory
              </p>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatBox label="TOTAL" value={knowledgeManager.getKnowledgeStats().totalDocuments} color="#06b6d4" />
                <StatBox label="ACTIVE" value={knowledgeManager.getKnowledgeStats().activeDocuments} color="#10b981" />
                <StatBox label="OUTDATED" value={knowledgeManager.getKnowledgeStats().outdatedDocuments} color="#f59e0b" />
                <StatBox label="DRAFT" value={knowledgeManager.getKnowledgeStats().draftDocuments} color="#64748b" />
              </div>

              <div className="space-y-4">
                {knowledgeManager.getAllActiveKnowledge().map(doc => (
                  <div key={`${doc.knowledge_id}-${doc.version}`} className="rounded-2xl border border-cyan-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-black">{doc.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          ID: <span className="font-mono text-cyan-400">{doc.knowledge_id}</span> • 
                          Version: <span className="font-mono text-cyan-400">{doc.version}</span> • 
                          Owner: <span className="font-bold text-white">{agents.find(a => a.id === doc.owner)?.name || doc.owner}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg px-3 py-1 text-xs font-black ${
                          doc.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                          doc.status === "outdated" ? "bg-yellow-500/20 text-yellow-400" :
                          doc.status === "draft" ? "bg-slate-500/20 text-slate-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {doc.status.toUpperCase()}
                        </div>
                        <div className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs font-black text-cyan-400">
                          {Math.round(doc.confidence * 100)}% CONFIDENCE
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
                      <div className="text-xs font-bold text-slate-400 mb-2">CONTENT</div>
                      <p className="text-base text-slate-300 leading-relaxed">{doc.content}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">SOURCE</div>
                        <div className="text-base font-bold text-white">{doc.source}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">CREATED</div>
                        <div className="text-base font-bold text-white">{formatTime(doc.created_at)}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">UPDATED</div>
                        <div className="text-base font-bold text-white">{formatTime(doc.updated_at)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                          style={{ width: `${doc.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-400">FRESHNESS</span>
                      <div className={`rounded-lg px-2 py-1 text-xs font-black ${
                        knowledgeManager.isKnowledgeFresh(doc.knowledge_id) 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {knowledgeManager.isKnowledgeFresh(doc.knowledge_id) ? "FRESH" : "AGING"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === "approvals" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">✋ HUMAN APPROVAL QUEUE</h2>
              <p className="text-base text-slate-400 mb-6">Foundation §85 — All high-risk actions require Human Executive approval</p>
              <div className="space-y-4">
                {approvals.map(item => {
                  const agent = agents.find(a => a.id === item.agentId);
                  if (!agent) return null;
                  return (
                    <div key={item.id} className={`rounded-2xl border bg-slate-900/50 backdrop-blur-xl p-6 transition-all ${item.status === "pending" ? "border-yellow-500/30" : item.status === "approved" ? "border-emerald-500/30" : item.status === "rejected" ? "border-red-500/30" : "border-blue-500/30"}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: `${agent.accent}30` }}>{agent.icon}</div>
                          <div>
                            <h3 className="text-xl font-black">{item.title}</h3>
                            <p className="text-sm text-slate-400">Requested by <span className="font-bold text-white">{agent.name}</span> • {formatTime(item.createdAt)}</p>
                          </div>
                        </div>
                        <div className={`rounded-xl border px-4 py-2 text-sm font-black ${getRiskColor(item.riskLevel)}`}>{item.riskLevel.toUpperCase()} RISK</div>
                      </div>
                      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-bold text-slate-400 mb-2">DESCRIPTION</div>
                        <p className="text-base text-slate-300">{item.description}</p>
                        {item.preview && (
                          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                            <div className="text-xs font-bold text-slate-400 mb-1">PREVIEW</div>
                            <div className="text-base font-bold text-white">{item.preview}</div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400">TYPE</div>
                          <div className="text-base font-bold text-white">{item.type.toUpperCase()}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400">PLATFORM</div>
                          <div className="text-base font-bold text-white">{item.platform || "N/A"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400">QA SCORE</div>
                          <div className={`text-2xl font-black ${getQAScoreColor(item.qaScore)}`}>{item.qaScore}</div>
                        </div>
                      </div>
                      {item.status === "pending" ? (
                        <div className="flex items-center gap-3">
                          <button onClick={() => approveItem(item.id)} className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-3 text-base font-bold text-emerald-400 transition hover:bg-emerald-500/30">✅ APPROVE</button>
                          <button onClick={() => reviseItem(item.id)} className="flex-1 rounded-xl border border-blue-500/40 bg-blue-500/20 py-3 text-base font-bold text-blue-400 transition hover:bg-blue-500/30">🔄 REQUEST REVISION</button>
                          <button onClick={() => rejectItem(item.id)} className="flex-1 rounded-xl border border-red-500/40 bg-red-500/20 py-3 text-base font-bold text-red-400 transition hover:bg-red-500/30">❌ REJECT</button>
                        </div>
                      ) : (
                        <div className={`rounded-xl border px-4 py-3 text-center text-base font-black ${item.status === "approved" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : item.status === "rejected" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-blue-500/20 border-blue-500/40 text-blue-400"}`}>
                          {item.status === "approved" ? "✅ APPROVED" : item.status === "rejected" ? "❌ REJECTED" : "🔄 REVISION REQUESTED"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activePanel === "emergency" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide text-red-400">🚨 EMERGENCY CONTROLS</h2>
              <p className="text-base text-slate-400 mb-6">Foundation §104 — Global emergency controls for Human Executive override</p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <EmergencyButton label="PAUSE ALL AGENTS" description="Immediately pause all working agents" icon="⏸️" active={emergencyState.allAgentsPaused} onActivate={pauseAllAgents} onDeactivate={resumeAllAgents} color="red" />
                <EmergencyButton label="PAUSE PUBLISHING" description="Stop all publishing operations" icon="📡" active={emergencyState.publishingPaused} onActivate={pausePublishing} onDeactivate={resumePublishing} color="orange" />
                <EmergencyButton label="STOP EXPENSIVE TASKS" description="Halt all high-priority resource-intensive tasks" icon="🛑" active={emergencyState.expensiveTasksStopped} onActivate={stopExpensiveTasks} onDeactivate={() => setEmergencyState(prev => ({ ...prev, expensiveTasksStopped: false }))} color="yellow" />
                <EmergencyButton label="REVOKE TEMPORARY ACCESS" description="Revoke all active access leases" icon="🔐" active={emergencyState.accessRevoked} onActivate={revokeAccess} onDeactivate={() => setEmergencyState(prev => ({ ...prev, accessRevoked: false }))} color="purple" />
              </div>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                <h3 className="text-xl font-black text-red-400 mb-4">⚠️ EMERGENCY STATE</h3>
                <div className="space-y-3">
                  <EmergencyStatusItem label="All Agents Paused" active={emergencyState.allAgentsPaused} />
                  <EmergencyStatusItem label="Publishing Paused" active={emergencyState.publishingPaused} />
                  <EmergencyStatusItem label="Expensive Tasks Stopped" active={emergencyState.expensiveTasksStopped} />
                  <EmergencyStatusItem label="Access Revoked" active={emergencyState.accessRevoked} />
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="w-96 border-l border-white/10 bg-slate-900/50 backdrop-blur-xl min-h-[calc(100vh-140px)] hidden xl:block">
          <div className="p-6">
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-wide">📡 EVENT FEED</h2>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">LIVE</span>
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {events.map((event, index) => (
                  <div key={event.id} className="rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10" style={{ animation: index === 0 ? "slideIn 0.4s ease-out" : undefined }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider" style={{ color: event.type === "success" ? "#34d399" : event.type === "warning" ? "#fbbf24" : event.type === "error" ? "#f87171" : event.type === "agent" ? "#60a5fa" : event.type === "task" ? "#c084fc" : event.type === "resource" ? "#f97316" : event.type === "quality" ? "#06b6d4" : event.type === "learning" ? "#14b8a6" : event.type === "emergency" ? "#ef4444" : event.type === "approval" ? "#fbbf24" : "#94a3b8" }}>
                        {event.type.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{event.timestamp}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{event.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 tracking-wide">🔐 RESOURCES</h2>
              <div className="space-y-3">
                {resources.map(resource => (
                  <div key={resource.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-base font-bold">{resource.name}</div>
                        <div className="text-xs text-slate-400">{resource.type}</div>
                      </div>
                      <div className={`rounded-lg px-3 py-1 text-xs font-black ${resource.status === "healthy" ? "bg-emerald-500/20 text-emerald-400" : resource.status === "degraded" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {resource.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-400">Usage</span>
                      <span className="font-mono font-bold">{resource.usage} / {resource.quota}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div className={`h-full rounded-full ${resource.usage / resource.quota > 0.9 ? "bg-red-500" : resource.usage / resource.quota > 0.7 ? "bg-yellow-500" : "bg-emerald-500"}`} style={{ width: `${(resource.usage / resource.quota) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {selectedAgent && (
        <div className="fixed bottom-6 right-6 z-[1000] w-[450px] rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: `${selectedAgent.accent}30` }}>{selectedAgent.icon}</div>
                <div>
                  <h3 className="text-2xl font-black">{selectedAgent.name}</h3>
                  <p className="text-sm text-slate-400">{selectedAgent.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgentId(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl hover:bg-white/10">×</button>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold text-slate-400 mb-2">STATUS</div>
              <div className="text-xl font-black" style={{ color: getStatusColor(selectedAgent.status) }}>{getStatusLabel(selectedAgent.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs font-bold text-slate-400">LEVEL</div>
                <div className="text-2xl font-black">{selectedAgent.level}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs font-bold text-slate-400">AUTONOMY</div>
                <div className="text-2xl font-black">L{selectedAgent.autonomyLevel}</div>
              </div>
            </div>
            {selectedAgent.currentTask && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-bold text-slate-400 mb-2">CURRENT ACTIVITY</div>
                <div className="text-base font-bold">{selectedAgent.currentTask}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* =====================================================
           LUNARA OS — READABILITY SYSTEM
           The original information architecture remains intact.
           This layer increases legibility without flattening density.
           ===================================================== */
        .lunara-readable .text-xs {
          font-size: 0.8125rem !important;
          line-height: 1.35 !important;
        }
        .lunara-readable .text-sm {
          font-size: 0.9375rem !important;
          line-height: 1.5 !important;
        }
        .lunara-readable .text-base {
          font-size: 1rem !important;
          line-height: 1.55 !important;
        }
        .lunara-readable [class*="text-[10px]"] {
          font-size: 0.75rem !important;
          line-height: 1.3 !important;
        }
        .lunara-readable p {
          line-height: 1.6;
        }
        .lunara-readable h2 {
          line-height: 1.15;
        }
        .lunara-readable h3 {
          line-height: 1.2;
        }
        .lunara-readable button {
          line-height: 1.35;
        }

        ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05) !important; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15) !important; border-radius: 4px !important; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25) !important; }
      `}</style>
    </main>
  );
}

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

function StatBadge({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = { blue: "from-blue-500 to-blue-600", yellow: "from-yellow-500 to-yellow-600", purple: "from-purple-500 to-purple-600", emerald: "from-emerald-500 to-emerald-600", pink: "from-pink-500 to-pink-600" };
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${colors[color]} px-5 py-3 shadow-xl`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-bold text-white/80 tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="text-xs font-bold text-slate-400 tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function EmergencyButton({ label, description, icon, active, onActivate, onDeactivate, color }: { label: string; description: string; icon: string; active: boolean; onActivate: () => void; onDeactivate: () => void; color: "red" | "orange" | "yellow" | "purple" }) {
  const colors = {
    red: active ? "bg-red-500/30 border-red-500/60 text-red-400" : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20",
    orange: active ? "bg-orange-500/30 border-orange-500/60 text-orange-400" : "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20",
    yellow: active ? "bg-yellow-500/30 border-yellow-500/60 text-yellow-400" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20",
    purple: active ? "bg-purple-500/30 border-purple-500/60 text-purple-400" : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
  };
  return (
    <button onClick={active ? onDeactivate : onActivate} className={`rounded-2xl border p-6 text-left transition-all ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div className="text-xl font-black">{label}</div>
      </div>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      <div className={`rounded-xl px-4 py-2 text-sm font-black ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}>
        {active ? "✅ ACTIVE" : "⏸️ INACTIVE"}
      </div>
    </button>
  );
}

function EmergencyStatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-base font-bold text-white">{label}</span>
      <div className={`rounded-lg px-3 py-1 text-sm font-black ${active ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
        {active ? "ACTIVE" : "INACTIVE"}
      </div>
    </div>
  );
}