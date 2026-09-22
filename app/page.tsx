"use client";

import { useEffect, useRef, useState } from "react";
import { osEngine } from "@/core/engine";
import { resourceManager } from "@/core/resource";
import { knowledgeManager } from "@/core/knowledge";
import { qualityManager } from "@/core/quality";
import { learningManager } from "@/core/learning";
import { orchestrator } from "@/core/orchestration/orchestrator";
import { agentRuntime } from "@/core/agents/agent-runtime";
import type { EventType, TaskStatus, AgentStatus, KnowledgeId, KnowledgeDocument } from "@/core/contracts";
import type { ContentPassport, QualityScore } from "@/core/quality";
import type { LearningRecord, AgentVersion } from "@/core/learning";
import type { ActivePipelineInstance, PipelineDefinition } from "@/core/orchestration/orchestrator";

/* =========================================================
   LUNARA OS — ვირტუალური ოფისი (ფაზა 1-7 ინტეგრირებული)
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
   საწყისი მონაცემები
   ========================================================= */

const departments: Department[] = [
  { id: "executive", name: "აღმასრულებელი ცენტრი", icon: "👑", color: "#8b5cf6", description: "სტრატეგია და კოორდინაცია" },
  { id: "intelligence", name: "დაზვერვა", icon: "🔍", color: "#3b82f6", description: "ტრენდების და ბაზრის კვლევა" },
  { id: "strategy", name: "სტრატეგია", icon: "🎯", color: "#a855f7", description: "დაგეგმვა და გადაწყვეტილებები" },
  { id: "content", name: "კონტენტი", icon: "✍️", color: "#f59e0b", description: "სცენარები და ტექსტები" },
  { id: "creative", name: "კრეატივი", icon: "🎨", color: "#ec4899", description: "ვიზუალური მიმართულება" },
  { id: "production", name: "წარმოება", icon: "🎬", color: "#ef4444", description: "აქტივების გენერაცია" },
  { id: "resources", name: "რესურსები", icon: "🔐", color: "#10b981", description: "მონაცემები და წვდომა" },
  { id: "quality", name: "ხარისხის კონტროლი", icon: "🛡️", color: "#06b6d4", description: "QA და მმართველობა" },
  { id: "distribution", name: "გავრცელება", icon: "📡", color: "#84cc16", description: "გამოქვეყნება" },
  { id: "analytics", name: "ანალიტიკა", icon: "📊", color: "#f97316", description: "ეფექტურობის მონაცემები" },
  { id: "learning", name: "სწავლა", icon: "🧬", color: "#14b8a6", description: "ევოლუცია და ტრენინგი" },
];

const initialAgents: Agent[] = [
  { id: "astra", name: "Astra", role: "აღმასრულებელი კოორდინატორი", department: "executive", level: 7, xp: 742, xpToNext: 1000, status: "idle", taskId: null, accent: "#8b5cf6", icon: "👑", missionsCompleted: 24, autonomyLevel: 4, currentTask: "სისტემის პრიორიტეტების მონიტორინგი" },
  { id: "nyx", name: "Nyx", role: "ტრენდების დაზვერვა", department: "intelligence", level: 5, xp: 516, xpToNext: 1000, status: "working", taskId: "task-001", accent: "#3b82f6", icon: "🔍", missionsCompleted: 18, autonomyLevel: 3, currentTask: "TikTok-ის ტრენდების ანალიზი" },
  { id: "orion", name: "Orion", role: "კონკურენტების დაზვერვა", department: "intelligence", level: 4, xp: 384, xpToNext: 1000, status: "idle", taskId: null, accent: "#6366f1", icon: "👁️", missionsCompleted: 12, autonomyLevel: 3, currentTask: "დანაწილების მოლოდინში" },
  { id: "sage", name: "Sage", role: "მთავარი სტრატეგი", department: "strategy", level: 6, xp: 628, xpToNext: 1000, status: "waiting_for_review", taskId: "task-002", accent: "#a855f7", icon: "🎯", missionsCompleted: 20, autonomyLevel: 3, currentTask: "სტრატეგიის წინადადება დამტკიცების მოლოდინში" },
  { id: "muse", name: "Muse", role: "კონტენტის ხელმძღვანელი", department: "content", level: 5, xp: 492, xpToNext: 1000, status: "working", taskId: "task-003", accent: "#f59e0b", icon: "✍️", missionsCompleted: 15, autonomyLevel: 3, currentTask: "3 სცენარის ვარიანტის წერა" },
  { id: "vega", name: "Vega", role: "კრეატიული დირექტორი", department: "creative", level: 6, xp: 584, xpToNext: 1000, status: "waiting", taskId: "task-004", accent: "#ec4899", icon: "🎨", missionsCompleted: 18, autonomyLevel: 3, currentTask: "სცენარის დამტკიცების მოლოდინში" },
  { id: "atlas", name: "Atlas", role: "რესურსების დირექტორი", department: "resources", level: 7, xp: 712, xpToNext: 1000, status: "working", taskId: "task-005", accent: "#10b981", icon: "🔐", missionsCompleted: 22, autonomyLevel: 2, currentTask: "API მონაცემების გადამოწმება" },
  { id: "cipher", name: "Cipher", role: "მონაცემების მენეჯერი", department: "resources", level: 5, xp: 468, xpToNext: 1000, status: "idle", taskId: null, accent: "#059669", icon: "🔑", missionsCompleted: 14, autonomyLevel: 2, currentTask: "წვდომის ლიზინგების მონიტორინგი" },
  { id: "aegis", name: "Aegis", role: "ხარისხის დირექტორი", department: "quality", level: 6, xp: 596, xpToNext: 1000, status: "working", taskId: "task-006", accent: "#06b6d4", icon: "🛡️", missionsCompleted: 19, autonomyLevel: 3, currentTask: "2 კონტენტის ელემენტის გადახედვა" },
  { id: "echo", name: "Echo", role: "გავრცელების მენეჯერი", department: "distribution", level: 5, xp: 524, xpToNext: 1000, status: "completed", taskId: "task-007", accent: "#84cc16", icon: "📡", missionsCompleted: 16, autonomyLevel: 2, currentTask: "გამოქვეყნებულია Telegram-ზე" },
  { id: "nova", name: "Nova", role: "ეფექტურობის ანალიტიკოსი", department: "analytics", level: 4, xp: 412, xpToNext: 1000, status: "idle", taskId: null, accent: "#f97316", icon: "📊", missionsCompleted: 11, autonomyLevel: 3, currentTask: "ახალი მონაცემების მოლოდინში" },
  { id: "iris", name: "Iris", role: "სწავლების დირექტორი", department: "learning", level: 5, xp: 548, xpToNext: 1000, status: "working", taskId: "task-008", accent: "#14b8a6", icon: "🧬", missionsCompleted: 17, autonomyLevel: 3, currentTask: "ეფექტურობის კანონზომიერებების ანალიზი" },
];

const initialTasks: Task[] = [
  { id: "task-001", title: "TikTok-ის ტრენდების სიგნალების ანალიზი", agentId: "nyx", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "task-002", title: "Q4 კონტენტის სტრატეგიის შემუშავება", agentId: "sage", status: "queued", progress: 0, priority: "critical", createdAt: Date.now() - 1000 * 60 * 60 },
  { id: "task-003", title: "Love Signal-ისთვის 3 ჰუკის ვარიანტის დაწერა", agentId: "muse", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 20 },
  { id: "task-004", title: "ახალი სერიის ვიზუალური კონცეფციის შექმნა", agentId: "vega", status: "queued", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 15 },
  { id: "task-005", title: "OpenAI API-ის ჯანმრთელობის გადამოწმება", agentId: "atlas", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 10 },
  { id: "task-006", title: "QA გადახედვა: 2 მოლოდინში მყოფი პოსტი", agentId: "aegis", status: "queued", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 25 },
  { id: "task-007", title: "Telegram არხზე გამოქვეყნება", agentId: "echo", status: "queued", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 45 },
  { id: "task-008", title: "გასული კვირის კანონზომიერებების ამოღება", agentId: "iris", status: "queued", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 35 },
];

const initialApprovals: ApprovalItem[] = [
  { id: "approval-001", type: "content", title: "Love Signal ეპიზოდი 12 — ჰუკის ვარიანტი A", description: "თუ მარტოხელა ხარ, გაჩერდი. ამ ბარათებიდან ერთმა იცის, რა მოხდება შემდეგ შენს სასიყვარულო ისტორიაში.", agentId: "muse", platform: "TikTok", riskLevel: "medium", qaScore: 87, preview: "🎴 Love Signal ეპ.12", status: "pending", createdAt: Date.now() - 1000 * 60 * 15, recommendedAction: "approve" },
  { id: "approval-002", type: "publish", title: "Q4 სტრატეგიის დოკუმენტის გამოქვეყნება", description: "სტრატეგიული დოკუმენტი, რომელიც აღწერს 2026 წლის Q4 კონტენტის ბურჯებს.", agentId: "sage", platform: "Telegram", riskLevel: "high", qaScore: 92, status: "pending", createdAt: Date.now() - 1000 * 60 * 30, recommendedAction: "approve" },
  { id: "approval-003", type: "resource_access", title: "OpenAI GPT-4 წვდომის მოთხოვნა", description: "ვიზუალური კონცეფციის გენერაციისთვის გამოსახულების შემქმნელი ითხოვს დროებით წვდომას.", agentId: "atlas", riskLevel: "low", qaScore: 95, status: "pending", createdAt: Date.now() - 1000 * 60 * 5, recommendedAction: "approve" },
  { id: "approval-004", type: "content", title: "ზოდიაქო განბლოკილი — მორიელის სეზონი", description: "მორიელის სეზონი აქ არის. სამი საიდუმლო შენი ნიშნის შესახებ.", agentId: "muse", platform: "Instagram Reels", riskLevel: "low", qaScore: 78, preview: "🦂 მორიელის სეზონი", status: "pending", createdAt: Date.now() - 1000 * 60 * 45, recommendedAction: "revise" },
];

const initialResources: Resource[] = [
  { id: "res-1", name: "OpenAI GPT-4", type: "AI პროვაიდერი", status: "healthy", usage: 742, quota: 1000 },
  { id: "res-2", name: "Anthropic Claude", type: "AI პროვაიდერი", status: "healthy", usage: 328, quota: 1000 },
  { id: "res-3", name: "Telegram Bot API", type: "პლატფორმა", status: "healthy", usage: 156, quota: 500 },
  { id: "res-4", name: "Cloudflare R2", type: "საცავი", status: "degraded", usage: 892, quota: 1000 },
  { id: "res-5", name: "Supabase OS", type: "მონაცემთა ბაზა", status: "healthy", usage: 234, quota: 5000 },
  { id: "res-6", name: "TikTok API", type: "პლატფორმა", status: "unavailable", usage: 0, quota: 100 },
];

const initialKnowledge: KnowledgeDocument[] = [
  {
    knowledge_id: "brand_bible" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "აღმასრულებელი ცენტრი",
    title: "Lunara ბრენდის ბიბლია",
    content: "მუქი ედიტორიალი, პრემიუმ, მისტიკური მაგრამ თანამედროვე. შეკავებული პალიტრა, ძლიერი ტიპოგრაფია, გამორჩეული სიმბოლოები. თავიდან აიცილეთ ზოგადი 'AI ქალი + გალაქტიკა' გამოსახულებები.",
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
    source: "სტრატეგიის დეპარტამენტი",
    title: "კონტენტის სტრატეგია და ბურჯები",
    content: "30% სიყვარული/ურთიერთობები, 20% ინტერაქტიული/აირჩიე ბარათი, 15% ზოდიაქოს ფსიქოლოგია, 15% ყოველდღიური კოსმოსური სიგნალი, 10% მისტიკა, 10% განათლება. ფოკუსი ორიგინალობაზე, შენარჩუნებასა და გაზიარებადობაზე.",
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
    source: "დაზვერვის დეპარტამენტი",
    title: "პლატფორმის სპეციფიკური წესები",
    content: "TikTok: სწრაფი ჰუკები, ტრენდებზე მორგებული ენა, უფრო ნედლი პრეზენტაცია. YouTube Shorts: ნათელი პრემისა, შენარჩუნების ანალიზი. Instagram Reels: ვიზუალური იდენტობა, გაზიარებადობა. Telegram: ინტერაქცია, გამოკითხვები, საზოგადოება.",
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
    source: "ანალიტიკის დეპარტამენტი",
    title: "აუდიტორიის შეხედულებები",
    content: "ძირითადი აუდიტორია: 18-34, ურთიერთობებზე ორიენტირებული, დაინტერესებული თვითაღმოჩენით. პიკური ჩართულობა: 19:00-21:00 სამუშაო დღეებში. მაღალი გაზიარების მოტივაცია იდენტობასთან დაკავშირებული კონტენტისთვის.",
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
    review_notes: ["[aegis]: ძლიერი ჰუკი, შესანიშნავი ბრენდის შესაბამისობა. რეკომენდებულია მცირე CTA კორექტირება."],
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
    review_notes: ["[aegis]: ვიზუალი ზედმეტად ზოგადია. საჭიროებს უფრო გამორჩეულ Lunara ბრენდინგს."],
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
    observation: "ჰუკებმა 'გაჩერდი სქროლვა' პატერნით აჩვენა 15%-ით მაღალი შენარჩუნება პირველ 3 წამში.",
    pattern: "პირდაპირი ბრძანება + ცნობისმოყვარეობის სიცარიელე ზრდის საწყის შენარჩუნებას.",
    hypothesis: "ამ პატერნის ზოდიაქოს კონტენტზე გამოყენება გააუმჯობესებს საშუალო ნახვის ხანგრძლივობას.",
    experiment_id: "exp-001",
    evidence: "A/B ტესტმა აჩვენა 12%-იანი ზრდა დასრულების მაჩვენებელში ბრძანებაზე დაფუძნებული ჰუკებისთვის.",
    recommendation: "განაახლეთ Muse v1.1 პრომპტი, რათა პრიორიტეტი მიანიჭოს პირდაპირი ბრძანების ჰუკებს პირველი 3 წამისთვის.",
    created_at: Date.now() - 1000 * 60 * 60 * 24,
    updated_at: Date.now() - 1000 * 60 * 60 * 2
  }
];

const initialAgentVersions: AgentVersion[] = [
  {
    agent_id: "muse",
    version: "1.1.0",
    state: "CANDIDATE",
    changes_summary: "ინტეგრირებული პირდაპირი ბრძანების ჰუკის პატერნი. ორიგინალობის ქულის გაუმჯობესება 8%-ით.",
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
   დამხმარე ფუნქციები
   ========================================================= */

function formatTime(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "idle": return "#94a3b8";
    case "working": return "#facc15";
    case "waiting": return "#60a5fa";
    case "queued": return "#60a5fa";
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
    case "idle": return "⏸️ უმოქმედო";
    case "working": return "⚡ მუშაობს";
    case "waiting": return "⏳ მოლოდინში";
    case "queued": return "⏳ რიგში";
    case "waiting_for_resource": return "🔐 რესურსის მოლოდინში";
    case "waiting_for_review": return "🔍 გადახედვის მოლოდინში";
    case "completed": return "✅ დასრულებული";
    case "error": return "❌ შეცდომა";
    case "paused": return "⏸️ შეჩერებული";
    case "suspended": return "🚫 შეწყვეტილი";
    case "starting": return "🚀 იწყება";
    case "offline": return "⚫ ოფლაინ";
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
    case "TASK_CREATED": return `📋 ამოცანა შექმნილია: ${event.payload?.title}`;
    case "TASK_STARTED": return `⚡ ამოცანა დაიწყო აგენტმა ${event.agent_id}`;
    case "TASK_COMPLETED": return `✅ ამოცანა დაასრულა აგენტმა ${event.agent_id}`;
    case "TASK_FAILED": return `❌ ამოცანა ჩავარდა აგენტისთვის ${event.agent_id}`;
    case "AGENT_REGISTERED": return `🤖 აგენტი ${event.payload?.name} დარეგისტრირდა ${event.payload?.department}-ში`;
    case "EMERGENCY_ACTIVATED": return `🚨 საგანგებო პროტოკოლი გაააქტიურა ადამიანმა აღმასრულებელმა`;
    case "RESOURCE_REQUESTED": return `🔐 წვდომა მოითხოვა აგენტმა ${event.agent_id} რესურსისთვის ${event.resource_id}`;
    case "RESOURCE_GRANTED": return `✅ წვდომა მინიჭებულია ${event.resource_id}`;
    case "KNOWLEDGE_VERSION_CREATED": return `📚 ცოდნა განახლდა: ${event.payload?.title} (v${event.payload?.version})`;
    case "KNOWLEDGE_UPDATED": return `🔄 ცოდნის სტატუსი შეიცვალა: ${event.payload?.knowledge_id} → ${event.payload?.newStatus}`;
    case "CONTENT_REVIEW_REQUESTED": return `🛡️ კონტენტი ${event.content_id} შევიდა ეტაპზე ${event.payload?.newStage}`;
    case "CONTENT_APPROVED": return `✅ კონტენტი ${event.content_id} დამტკიცებულია გამოქვეყნებისთვის (ქულა: ${event.payload?.totalScore})`;
    case "CONTENT_REJECTED": return `❌ კონტენტი ${event.content_id} უარყოფილია აგენტის მიერ ${event.agent_id}`;
    case "PATTERN_DISCOVERED": return `🧬 Iris-მა აღმოაჩინა კანონზომიერება: ${event.payload?.observation?.substring(0, 50)}...`;
    case "AGENT_VERSION_CREATED": return `⚙️ შემოთავაზებულია აგენტის ახალი ვერსია: ${event.agent_id} v${event.payload?.version}`;
    case "AGENT_PROMOTED": return `✅ აგენტი ${event.agent_id} დაწინაურდა ვერსიაზე ${event.payload?.version} ადამიანის მიერ ${event.payload?.approvedBy}`;
    case "AGENT_EVALUATED": return `⚠️ შეფასება დასრულდა: ${event.agent_id} v${event.payload?.version} (მდგომარეობა: ${event.payload?.state})`;
    default: return `სისტემური მოვლენა: ${event.type}`;
  }
}

/* =========================================================
   მთავარი კომპონენტი
   ========================================================= */

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  const [passports, setPassports] = useState<ContentPassport[]>(initialPassports);
  const [learningRecords, setLearningRecords] = useState<LearningRecord[]>(initialLearningRecords);
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>(initialAgentVersions);
  
  // ფაზა 7 მდგომარეობა
  const [activePipelines, setActivePipelines] = useState<ActivePipelineInstance[]>([]);
  const [pipelineDef, setPipelineDef] = useState<PipelineDefinition | null>(null);
  
  const [events, setEvents] = useState<EventLog[]>([
    { id: "e1", timestamp: "--:--:--", type: "system", message: "🟢 Lunara OS ძირითადი ძრავა ინიციალიზებულია" },
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
     ძირითადი ძრავა, რესურსები, ცოდნა, ხარისხი, სწავლა და ორკესტრაცია
     ===================================================== */

  useEffect(() => {
    const currentTime = formatTime();
    setClock(currentTime);

    // 1. აგენტებისა და ამოცანების რეგისტრაცია ძირითად ძრავში და Agent Runtime-ში
    initialAgents.forEach(agent => {
      osEngine.registerAgent(
        {
          agent_id: agent.id,
          display_name: agent.name,
          version: "1.0.0",
          department: agent.department as any,
          mission: agent.currentTask || "ოპერაციული მოვალეობები",
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
      
      // აგენტის რეგისტრაცია Runtime-ში, რათა მან შეძლოს მისთვის განკუთვნილი ამოცანების აღება
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
        last_error_category: null, last_error_message: null,
        created_at: task.createdAt,
        started_at: task.status === "running" ? task.createdAt : null,
        completed_at: task.status === "completed" ? task.createdAt : null,
        deadline: null
      });
    });

    // 2. რესურსების რეგისტრაცია რესურსების მენეჯერში (ფაზა 3)
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

    // 3. ცოდნის დოკუმენტების რეგისტრაცია (ფაზა 4)
    initialKnowledge.forEach(knowledge => {
      knowledgeManager.registerKnowledge(knowledge);
    });

    // 4. კონტენტის პასპორტების რეგისტრაცია (ფაზა 5)
    initialPassports.forEach(passport => {
      qualityManager.createPassport(passport);
    });

    // 5. სწავლის ჩანაწერებისა და აგენტის ვერსიების რეგისტრაცია (ფაზა 6)
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

    // 6. ორკესტრატორის ინიციალიზაცია (ფაზა 7)
    setPipelineDef(orchestrator.getPipelineDefinition());
    setActivePipelines(orchestrator.getActivePipelines());

    // 7. ძრავის მოვლენებზე გამოწერა
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
        
        // პაიპლაინის UI-ის განახლება ამოცანების ცვლილებისას
        if (type === "TASK_CREATED" || type === "TASK_COMPLETED" || type === "TASK_FAILED") {
          setActivePipelines([...orchestrator.getActivePipelines()]);
        }
      });
    });

    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
    };
  }, [emergencyState.allAgentsPaused]);

  /* =====================================================
     წარმოებული მონაცემები
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
     მოქმედებები
     ===================================================== */

  const pauseAllAgents = () => {
    setAgents(prev => prev.map(a => a.status === "working" || a.status === "starting" ? { ...a, status: "paused" as AgentStatus } : a));
    setEmergencyState(prev => ({ ...prev, allAgentsPaused: true }));
    pushEvent("emergency", "🚨 საგანგებო: ყველა აგენტი შეაჩერა ადამიანმა აღმასრულებელმა");
  };

  const resumeAllAgents = () => {
    setAgents(prev => prev.map(a => a.status === "paused" ? { ...a, status: "idle" as AgentStatus } : a));
    setEmergencyState(prev => ({ ...prev, allAgentsPaused: false }));
    pushEvent("system", "✅ ყველა აგენტი აღადგინა ადამიანმა აღმასრულებელმა");
  };

  const pausePublishing = () => {
    setEmergencyState(prev => ({ ...prev, publishingPaused: true }));
    pushEvent("emergency", "⚠️ გამოქვეყნება შეაჩერა ადამიანმა აღმასრულებელმა");
  };

  const resumePublishing = () => {
    setEmergencyState(prev => ({ ...prev, publishingPaused: false }));
    pushEvent("system", "✅ გამოქვეყნება აღადგინა ადამიანმა აღმასრულებელმა");
  };

  const stopExpensiveTasks = () => {
    setTasks(prev => prev.map(t => t.priority === "critical" || t.priority === "high" ? { ...t, status: "failed" as TaskStatus } : t));
    setEmergencyState(prev => ({ ...prev, expensiveTasksStopped: true }));
    pushEvent("emergency", "🛑 ძვირადღირებული ამოცანები შეაჩერა ადამიანმა აღმასრულებელმა");
  };

  const revokeAccess = () => {
    setEmergencyState(prev => ({ ...prev, accessRevoked: true }));
    pushEvent("emergency", "🔐 დროებითი წვდომა გააუქმა ადამიანმა აღმასრულებელმა");
  };

  const approveItem = (approvalId: string) => {
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "approved" } : a));
    const item = approvals.find(a => a.id === approvalId);
    if (item) pushEvent("approval", `✅ დამტკიცებულია: ${item.title} ადამიანის მიერ`);
  };

  const rejectItem = (approvalId: string) => {
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "rejected" } : a));
    const item = approvals.find(a => a.id === approvalId);
    if (item) pushEvent("approval", `❌ უარყოფილია: ${item.title} ადამიანის მიერ`);
  };

  const reviseItem = (approvalId: string) => {
    setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "revised" } : a));
    const item = approvals.find(a => a.id === approvalId);
    if (item) pushEvent("approval", `🔄 შესწორება მოთხოვნილია: ${item.title} ადამიანის მიერ`);
  };

  const pushEvent = (type: EventLog["type"], message: string) => {
    setEvents((previous) => [
      { id: `event-${Date.now()}-${Math.random()}`, timestamp: formatTime(), type, message },
      ...previous,
    ].slice(0, 50));
  };

  /* =====================================================
     ვიზუალიზაცია (Render)
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
                <p className="text-base font-medium text-slate-400 tracking-wide">ვირტუალური ოფისი — ავტონომიური ციფრული ორგანიზაცია</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatBadge label="აგენტები" value={agents.length} icon="👥" color="blue" />
              <StatBadge label="აქტიური" value={activeAgents} icon="⚡" color="yellow" />
              <StatBadge label="ამოცანები" value={runningTasks} icon="🚀" color="purple" />
              <StatBadge label="დასრულებული" value={completedTasks} icon="✅" color="emerald" />
              <StatBadge label="გამოცდილება" value={totalXP} icon="⭐" color="pink" />

              {simulationMode && (
                <div className="flex items-center gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/20 px-4 py-2">
                  <span className="text-xl">🧪</span>
                  <span className="text-base font-black tracking-wide text-yellow-400">სიმულაცია</span>
                </div>
              )}

              <div className="ml-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 animate-pulse rounded-full ${systemStatus === "healthy" ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" : systemStatus === "degraded" ? "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]" : "bg-red-400 shadow-[0_0_15px_rgba(248,113,113,0.8)]"}`} />
                  <span className={`text-base font-bold tracking-wide ${systemStatus === "healthy" ? "text-emerald-400" : systemStatus === "degraded" ? "text-yellow-400" : "text-red-400"}`}>
                    {systemStatus === "healthy" ? "ონლაინ" : systemStatus === "degraded" ? "გაუარესებული" : "გათიშვა"}
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
            <button onClick={() => setActivePanel("overview")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "overview" ? "bg-purple-500/20 text-purple-400 border border-purple-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🏢 მიმოხილვა</button>
            <button onClick={() => setActivePanel("pipeline")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "pipeline" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🔄 აქტიური პაიპლაინი</button>
            <button onClick={() => setActivePanel("approvals")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap relative ${activePanel === "approvals" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              ✋ დამტკიცებები
              {pendingApprovals > 0 && <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">{pendingApprovals}</span>}
            </button>
            <button onClick={() => setActivePanel("quality")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "quality" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🛡️ ხარისხის გადახედვა</button>
            <button onClick={() => setActivePanel("learning")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "learning" ? "bg-teal-500/20 text-teal-400 border border-teal-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🧬 სწავლა</button>
            <button onClick={() => setActivePanel("knowledge")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "knowledge" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>📚 ცოდნა</button>
            <button onClick={() => setActivePanel("emergency")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "emergency" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🚨 საგანგებო</button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex">
        <aside className="w-[340px] border-r border-white/10 bg-slate-900/50 backdrop-blur-xl min-h-[calc(100vh-140px)] hidden lg:block">
          <div className="p-6">
            <h2 className="text-2xl font-black mb-6 tracking-wide">📂 დეპარტამენტები</h2>
            <div className="space-y-2">
              <button onClick={() => setSelectedDepartment(null)} className={`w-full rounded-xl border p-3 text-left transition-all ${!selectedDepartment ? "border-white/30 bg-white/10" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">🏢 ყველა დეპარტამენტი</span>
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
                        {activeCount > 0 && <div className="text-xs text-emerald-400">{activeCount} აქტიური</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-black mb-4">💚 სისტემის ჯანმრთელობა</h3>
              <div className="space-y-3">
                {[{ name: "აგენტების ბუსი", value: 100, color: "bg-emerald-500" }, { name: "ამოცანების ძრავა", value: 100, color: "bg-emerald-500" }, { name: "მოვლენების ბუსი", value: 98, color: "bg-blue-500" }, { name: "ხარისხის კარიბჭე", value: 100, color: "bg-emerald-500" }, { name: "სწავლის ციკლი", value: 95, color: "bg-purple-500" }].map(item => (
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
                <h2 className="text-2xl font-black mb-6 tracking-wide">🏢 ვირტუალური ოფისის რუკა</h2>
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
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">მუშაობს</span><span className="font-bold text-yellow-400">{workingCount}</span></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">მოლოდინში</span><span className="font-bold text-blue-400">{waitingCount}</span></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">უმოქმედო</span><span className="font-bold text-slate-400">{idleCount}</span></div>
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
                <h2 className="text-2xl font-black mb-6 tracking-wide">👥 აგენტები <span className="text-lg font-medium text-slate-400 ml-3">({filteredAgents.length} აგენტი{selectedDepartment ? ` დეპარტამენტში ${selectedDept?.name}` : ""})</span></h2>
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
                            <div className="text-xs font-bold text-slate-400 mb-1">მიმდინარე აქტივობა</div>
                            <div className="text-base font-bold">{agent.currentTask}</div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <StatBox label="დონე" value={agent.level} color={agent.accent} />
                          <StatBox label="გამოცდილება" value={agent.xp} color={agent.accent} />
                          <StatBox label="დასრულებული" value={agent.missionsCompleted} color={agent.accent} />
                          <StatBox label="ავტო" value={`L${agent.autonomyLevel}`} color={agent.accent} />
                        </div>
                        <div className="mb-4">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-400">გამოცდილება</span>
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
                  <h2 className="text-2xl font-black tracking-wide">🔄 აქტიური პაიპლაინი</h2>
                  <p className="text-base text-slate-400 mt-1">
                    Foundation §116 — პირველი ბოლომდე მიყვანილი დემონსტრაცია
                  </p>
                </div>
                <button
                  onClick={() => {
                    orchestrator.triggerFirstPipeline({ campaign: "Love Signal ეპ.12" });
                    setActivePipelines([...orchestrator.getActivePipelines()]);
                    pushEvent("system", "🚀 ადამიანმა აღმასრულებელმა გაუშვა ბოლომდე მიყვანილი პაიპლაინი");
                  }}
                  className="rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-6 py-3 text-base font-bold text-indigo-400 transition hover:bg-indigo-500/30"
                >
                  ▶️ ახალი პაიპლაინის დაწყება
                </button>
              </div>

              <div className="space-y-6">
                {activePipelines.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">⏸️</div>
                    <h3 className="text-xl font-black text-white mb-2">აქტიური პაიპლაინი არ არის</h3>
                    <p className="text-slate-400 mb-6">დააჭირეთ 'ახალი პაიპლაინის დაწყებას' ბოლომდე მიყვანილი კონტენტის შექმნის ნაკადის დასაწყებად.</p>
                  </div>
                ) : (
                  activePipelines.map(instance => {
                    const currentStage = pipelineDef.stages[instance.currentStageIndex];
                    const progress = Math.round((instance.currentStageIndex / pipelineDef.stages.length) * 100);
                    
                    return (
                      <div key={instance.instanceId} className="rounded-2xl border border-indigo-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-black text-white">ინსტანცია: {instance.instanceId}</h3>
                            <p className="text-sm text-slate-400">კამპანია: {(instance.context.campaign as string) || "უცნობი"}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-indigo-400">{progress}%</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">საერთო პროგრესი</div>
                          </div>
                        </div>

                        {/* საერთო პროგრესის ზოლი */}
                        <div className="h-3 overflow-hidden rounded-full bg-slate-700 mb-8">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* ეტაპების ვიზუალიზაცია */}
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
                                    <span className="text-xs font-bold text-indigo-400">სრულდება...</span>
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
              <h2 className="text-2xl font-black mb-6 tracking-wide">🧬 სწავლა და ევოლუცია</h2>
              <p className="text-base text-slate-400 mb-6">
                Foundation §12, §82 — მტკიცებულებებზე დაფუძნებული აგენტების გაუმჯობესება და ვერსიების კონტროლი
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* აქტიური სწავლის ჩანაწერები */}
                <div className="rounded-2xl border border-teal-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                  <h3 className="text-lg font-black mb-4 text-teal-400">🔍 აქტიური სწავლის ჩანაწერები</h3>
                  <div className="space-y-4">
                    {learningManager.getActiveLearningRecords().map(record => {
                      const agent = agents.find(a => a.id === record.agent_id);
                      return (
                        <div key={record.record_id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-white">{agent?.name} ({agent?.role})</span>
                            <span className="text-xs font-mono text-teal-400">{record.stage === "RECOMMENDATION" ? "რეკომენდაცია" : record.stage}</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-3">{record.observation}</p>
                          {record.recommendation && (
                            <div className="rounded-lg bg-teal-500/10 p-3 border border-teal-500/20">
                              <div className="text-xs font-bold text-teal-400 mb-1">რეკომენდაცია</div>
                              <p className="text-sm text-slate-300">{record.recommendation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {learningManager.getActiveLearningRecords().length === 0 && (
                      <div className="text-center text-slate-500 py-8">აქტიური სწავლის ჩანაწერი არ არის.</div>
                    )}
                  </div>
                </div>

                {/* ლოდინში მყოფი აგენტის განახლებები */}
                <div className="rounded-2xl border border-purple-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                  <h3 className="text-lg font-black mb-4 text-purple-400">⚙️ ლოდინში მყოფი აგენტის განახლებები</h3>
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
                            <span className="text-xs font-mono text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">კანდიდატი</span>
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
                                pushEvent("learning", `✅ ადამიანმა აღმასრულებელმა დაამტკიცა ${agent?.name} v${version.version}`);
                              }}
                              className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/30"
                            >
                              ✅ დამტკიცება და განთავსება
                            </button>
                            <button 
                              onClick={() => {
                                learningManager.rejectAgentVersion(version.agent_id, version.version, "human_executive");
                                setAgentVersions([...learningManager.getAgentVersions(version.agent_id)]);
                                pushEvent("learning", `❌ ადამიანმა აღმასრულებელმა უარყო ${agent?.name} v${version.version}`);
                              }}
                              className="flex-1 rounded-lg border border-red-500/40 bg-red-500/20 py-2 text-sm font-bold text-red-400 transition hover:bg-red-500/30"
                            >
                              ❌ უარყოფა
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {learningManager.getPendingVersionApprovals().length === 0 && (
                      <div className="text-center text-slate-500 py-8">ლოდინში მყოფი აგენტის განახლება არ არის.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === "quality" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">🛡️ ხარისხის გადახედვის რიგი</h2>
              <p className="text-base text-slate-400 mb-6">
                Foundation §47, §86 — მრავალეტაპიანი QA პაიპლაინი და 11-განზომილებიანი ქულების სისტემა
              </p>

              <div className="space-y-6">
                {qualityManager.getPendingReviews().map(passport => {
                  const creator = agents.find(a => a.id === passport.creator_agent);
                  return (
                    <div key={passport.content_id} className="rounded-2xl border border-cyan-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-black text-white">კონტენტის ID: {passport.content_id}</h3>
                          <p className="text-sm text-slate-400 mt-1">
                            შემქმნელი: <span className="font-bold text-white">{creator?.name || passport.creator_agent}</span> • 
                            პლატფორმები: <span className="text-cyan-400">{passport.platforms.join(", ")}</span> • 
                            ვერსია: <span className="font-mono text-cyan-400">{passport.version}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="rounded-lg bg-cyan-500/20 px-4 py-2 text-center">
                            <div className="text-xs font-bold text-cyan-400">საერთო ქულა</div>
                            <div className="text-3xl font-black text-white">{passport.total_score ?? "N/A"}</div>
                          </div>
                          <div className={`rounded-lg px-3 py-1 text-xs font-black ${
                            passport.current_stage === "FINAL_QUALITY_GATE" ? "bg-yellow-500/20 text-yellow-400" :
                            passport.current_stage === "REJECTED" ? "bg-red-500/20 text-red-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {passport.current_stage === "FINAL_QUALITY_GATE" ? "საბოლოო ხარისხის კარიბჭე" : passport.current_stage === "REJECTED" ? "უარყოფილი" : passport.current_stage}
                          </div>
                        </div>
                      </div>

                      {passport.quality_scores && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                          {Object.entries(passport.quality_scores).map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                {key === "hook" ? "ჰუკი" : key === "retentionPotential" ? "შენარჩუნება" : key === "originality" ? "ორიგინალობა" : key === "clarity" ? "სიცხადე" : key === "emotionalImpact" ? "ემოციური გავლენა" : key === "shareability" ? "გაზიარებადობა" : key === "visualStrength" ? "ვიზუალური სიძლიერე" : key === "brandFit" ? "ბრენდის შესაბამისობა" : key === "platformFit" ? "პლატფორმის შესაბამისობა" : key === "cta" ? "CTA" : key === "safety" ? "უსაფრთხოება" : key}
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
                        <div className="text-xs font-bold text-slate-400 mb-2">გადახედვის შენიშვნები</div>
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
                            pushEvent("quality", `✅ ადამიანმა აღმასრულებელმა დაამტკიცა კონტენტი ${passport.content_id}`);
                          }}
                          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-3 text-base font-bold text-emerald-400 transition hover:bg-emerald-500/30"
                        >
                          ✅ დამტკიცება და გამოქვეყნება
                        </button>
                        <button 
                          onClick={() => {
                            qualityManager.makeFinalDecision(passport.content_id, "REVISE", "human_executive", true);
                            setPassports([...qualityManager.getAllPassports()]);
                            pushEvent("quality", `🔄 ადამიანმა აღმასრულებელმა მოითხოვა შესწორება ${passport.content_id}-ისთვის`);
                          }}
                          className="flex-1 rounded-xl border border-blue-500/40 bg-blue-500/20 py-3 text-base font-bold text-blue-400 transition hover:bg-blue-500/30"
                        >
                          🔄 შესწორების მოთხოვნა
                        </button>
                        <button 
                          onClick={() => {
                            qualityManager.makeFinalDecision(passport.content_id, "REJECT", "human_executive", true);
                            setPassports([...qualityManager.getAllPassports()]);
                            pushEvent("quality", `❌ ადამიანმა აღმასრულებელმა უარყო კონტენტი ${passport.content_id}`);
                          }}
                          className="flex-1 rounded-xl border border-red-500/40 bg-red-500/20 py-3 text-base font-bold text-red-400 transition hover:bg-red-500/30"
                        >
                          ❌ უარყოფა
                        </button>
                      </div>
                    </div>
                  );
                })}

                {qualityManager.getPendingReviews().length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-black text-white mb-2">ყველაფერი რიგზეა!</h3>
                    <p className="text-slate-400">ამჟამად კონტენტი ხარისხის გადახედვის მოლოდინში არ არის.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === "knowledge" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">📚 ცოდნის ბაზა</h2>
              <p className="text-base text-slate-400 mb-6">
                Foundation §29-30 — ცენტრალიზებული, ვერსიებზე დაფუძნებული ორგანიზაციული მეხსიერება
              </p>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatBox label="სულ" value={knowledgeManager.getKnowledgeStats().totalDocuments} color="#06b6d4" />
                <StatBox label="აქტიური" value={knowledgeManager.getKnowledgeStats().activeDocuments} color="#10b981" />
                <StatBox label="მოძველებული" value={knowledgeManager.getKnowledgeStats().outdatedDocuments} color="#f59e0b" />
                <StatBox label="მონახაზი" value={knowledgeManager.getKnowledgeStats().draftDocuments} color="#64748b" />
              </div>

              <div className="space-y-4">
                {knowledgeManager.getAllActiveKnowledge().map(doc => (
                  <div key={`${doc.knowledge_id}-${doc.version}`} className="rounded-2xl border border-cyan-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-black">{doc.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          ID: <span className="font-mono text-cyan-400">{doc.knowledge_id}</span> • 
                          ვერსია: <span className="font-mono text-cyan-400">{doc.version}</span> • 
                          მფლობელი: <span className="font-bold text-white">{agents.find(a => a.id === doc.owner)?.name || doc.owner}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg px-3 py-1 text-xs font-black ${
                          doc.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                          doc.status === "outdated" ? "bg-yellow-500/20 text-yellow-400" :
                          doc.status === "draft" ? "bg-slate-500/20 text-slate-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {doc.status === "active" ? "აქტიური" : doc.status === "outdated" ? "მოძველებული" : doc.status === "draft" ? "მონახაზი" : "უარყოფილი"}
                        </div>
                        <div className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs font-black text-cyan-400">
                          {Math.round(doc.confidence * 100)}% სანდოობა
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
                      <div className="text-xs font-bold text-slate-400 mb-2">შინაარსი</div>
                      <p className="text-base text-slate-300 leading-relaxed">{doc.content}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">წყარო</div>
                        <div className="text-base font-bold text-white">{doc.source}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">შექმნილი</div>
                        <div className="text-base font-bold text-white">{formatTime(doc.created_at)}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400">განახლებული</div>
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
                      <span className="text-xs font-bold text-slate-400">სიახლე</span>
                      <div className={`rounded-lg px-2 py-1 text-xs font-black ${
                        knowledgeManager.isKnowledgeFresh(doc.knowledge_id) 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {knowledgeManager.isKnowledgeFresh(doc.knowledge_id) ? "ახალი" : "ძველდება"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === "approvals" && (
            <div>
              <h2 className="text-2xl font-black mb-6 tracking-wide">✋ ადამიანის დამტკიცების რიგი</h2>
              <p className="text-base text-slate-400 mb-6">Foundation §85 — ყველა მაღალი რისკის მოქმედებას სჭირდება ადამიანი აღმასრულებლის დამტკიცება</p>
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
                            <p className="text-sm text-slate-400">მოითხოვა <span className="font-bold text-white">{agent.name}</span> • {formatTime(item.createdAt)}</p>
                          </div>
                        </div>
                        <div className={`rounded-xl border px-4 py-2 text-sm font-black ${getRiskColor(item.riskLevel)}`}>{item.riskLevel === "critical" ? "კრიტიკული" : item.riskLevel === "high" ? "მაღალი" : item.riskLevel === "medium" ? "საშუალო" : "დაბალი"} რისკი</div>
                      </div>
                      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-bold text-slate-400 mb-2">აღწერა</div>
                        <p className="text-base text-slate-300">{item.description}</p>
                        {item.preview && (
                          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                            <div className="text-xs font-bold text-slate-400 mb-1">წინასწარი ნახვა</div>
                            <div className="text-base font-bold text-white">{item.preview}</div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400">ტიპი</div>
                          <div className="text-base font-bold text-white">{item.type === "content" ? "კონტენტი" : item.type === "publish" ? "გამოქვეყნება" : item.type === "resource_access" ? "რესურსის წვდომა" : item.type === "policy_change" ? "პოლიტიკის ცვლილება" : "აგენტის მოქმედება"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400">პლატფორმა</div>
                          <div className="text-base font-bold text-white">{item.platform || "N/A"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400">QA ქულა</div>
                          <div className={`text-2xl font-black ${getQAScoreColor(item.qaScore)}`}>{item.qaScore}</div>
                        </div>
                      </div>
                      {item.status === "pending" ? (
                        <div className="flex items-center gap-3">
                          <button onClick={() => approveItem(item.id)} className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-3 text-base font-bold text-emerald-400 transition hover:bg-emerald-500/30">✅ დამტკიცება</button>
                          <button onClick={() => reviseItem(item.id)} className="flex-1 rounded-xl border border-blue-500/40 bg-blue-500/20 py-3 text-base font-bold text-blue-400 transition hover:bg-blue-500/30">🔄 შესწორების მოთხოვნა</button>
                          <button onClick={() => rejectItem(item.id)} className="flex-1 rounded-xl border border-red-500/40 bg-red-500/20 py-3 text-base font-bold text-red-400 transition hover:bg-red-500/30">❌ უარყოფა</button>
                        </div>
                      ) : (
                        <div className={`rounded-xl border px-4 py-3 text-center text-base font-black ${item.status === "approved" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : item.status === "rejected" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-blue-500/20 border-blue-500/40 text-blue-400"}`}>
                          {item.status === "approved" ? "✅ დამტკიცებული" : item.status === "rejected" ? "❌ უარყოფილი" : "🔄 შესწორება მოთხოვნილია"}
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
              <h2 className="text-2xl font-black mb-6 tracking-wide text-red-400">🚨 საგანგებო კონტროლი</h2>
              <p className="text-base text-slate-400 mb-6">Foundation §104 — გლობალური საგანგებო კონტროლი ადამიანი აღმასრულებლის გადაფარვისთვის</p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <EmergencyButton label="ყველა აგენტის შეჩერება" description="მყისიერად შეაჩერე ყველა მომუშავე აგენტი" icon="⏸️" active={emergencyState.allAgentsPaused} onActivate={pauseAllAgents} onDeactivate={resumeAllAgents} color="red" />
                <EmergencyButton label="გამოქვეყნების შეჩერება" description="შეაჩერე ყველა გამოქვეყნების ოპერაცია" icon="📡" active={emergencyState.publishingPaused} onActivate={pausePublishing} onDeactivate={resumePublishing} color="orange" />
                <EmergencyButton label="ძვირადღირებული ამოცანების შეჩერება" description="შეაჩერე ყველა მაღალი პრიორიტეტის რესურსზე მომთხოვნი ამოცანა" icon="🛑" active={emergencyState.expensiveTasksStopped} onActivate={stopExpensiveTasks} onDeactivate={() => setEmergencyState(prev => ({ ...prev, expensiveTasksStopped: false }))} color="yellow" />
                <EmergencyButton label="დროებითი წვდომის გაუქმება" description="გააუქმე ყველა აქტიური წვდომის ლიზინგი" icon="🔐" active={emergencyState.accessRevoked} onActivate={revokeAccess} onDeactivate={() => setEmergencyState(prev => ({ ...prev, accessRevoked: false }))} color="purple" />
              </div>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                <h3 className="text-xl font-black text-red-400 mb-4">⚠️ საგანგებო მდგომარეობა</h3>
                <div className="space-y-3">
                  <EmergencyStatusItem label="ყველა აგენტი შეჩერებულია" active={emergencyState.allAgentsPaused} />
                  <EmergencyStatusItem label="გამოქვეყნება შეჩერებულია" active={emergencyState.publishingPaused} />
                  <EmergencyStatusItem label="ძვირადღირებული ამოცანები შეჩერებულია" active={emergencyState.expensiveTasksStopped} />
                  <EmergencyStatusItem label="წვდომა გაუქმებულია" active={emergencyState.accessRevoked} />
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="w-96 border-l border-white/10 bg-slate-900/50 backdrop-blur-xl min-h-[calc(100vh-140px)] hidden xl:block">
          <div className="p-6">
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-wide">📡 მოვლენების ნაკადი</h2>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">პირდაპირი</span>
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {events.map((event, index) => (
                  <div key={event.id} className="rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10" style={{ animation: index === 0 ? "slideIn 0.4s ease-out" : undefined }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider" style={{ color: event.type === "success" ? "#34d399" : event.type === "warning" ? "#fbbf24" : event.type === "error" ? "#f87171" : event.type === "agent" ? "#60a5fa" : event.type === "task" ? "#c084fc" : event.type === "resource" ? "#f97316" : event.type === "quality" ? "#06b6d4" : event.type === "learning" ? "#14b8a6" : event.type === "emergency" ? "#ef4444" : event.type === "approval" ? "#fbbf24" : "#94a3b8" }}>
                        {event.type === "system" ? "სისტემა" : event.type === "task" ? "ამოცანა" : event.type === "agent" ? "აგენტი" : event.type === "success" ? "წარმატება" : event.type === "warning" ? "გაფრთხილება" : event.type === "error" ? "შეცდომა" : event.type === "resource" ? "რესურსი" : event.type === "quality" ? "ხარისხი" : event.type === "learning" ? "სწავლა" : event.type === "emergency" ? "საგანგებო" : event.type === "approval" ? "დამტკიცება" : event.type}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{event.timestamp}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{event.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 tracking-wide">🔐 რესურსები</h2>
              <div className="space-y-3">
                {resources.map(resource => (
                  <div key={resource.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-base font-bold">{resource.name}</div>
                        <div className="text-xs text-slate-400">{resource.type}</div>
                      </div>
                      <div className={`rounded-lg px-3 py-1 text-xs font-black ${resource.status === "healthy" ? "bg-emerald-500/20 text-emerald-400" : resource.status === "degraded" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {resource.status === "healthy" ? "ჯანმრთელი" : resource.status === "degraded" ? "გაუარესებული" : "მიუწვდომელი"}
                      </div>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-400">გამოყენება</span>
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
              <div className="text-xs font-bold text-slate-400 mb-2">სტატუსი</div>
              <div className="text-xl font-black" style={{ color: getStatusColor(selectedAgent.status) }}>{getStatusLabel(selectedAgent.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs font-bold text-slate-400">დონე</div>
                <div className="text-2xl font-black">{selectedAgent.level}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs font-bold text-slate-400">ავტონომია</div>
                <div className="text-2xl font-black">L{selectedAgent.autonomyLevel}</div>
              </div>
            </div>
            {selectedAgent.currentTask && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-bold text-slate-400 mb-2">მიმდინარე აქტივობა</div>
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
           LUNARA OS — წაკითხვადობის სისტემა
           ორიგინალური ინფორმაციული არქიტექტურა უცვლელი რჩება.
           ეს შრე ზრდის წაკითხვადობას სიმკვრივის დაკარგვის გარეშე.
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
   ქვე-კომპონენტები
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
        {active ? "✅ აქტიური" : "⏸️ არააქტიური"}
      </div>
    </button>
  );
}

function EmergencyStatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-base font-bold text-white">{label}</span>
      <div className={`rounded-lg px-3 py-1 text-sm font-black ${active ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
        {active ? "აქტიური" : "არააქტიური"}
      </div>
    </div>
  );
}