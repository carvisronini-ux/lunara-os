"use client";

import { useEffect, useRef, useState } from "react";
import { osEngine } from "@/core/engine";
import { resourceManager } from "@/core/resource";
import { knowledgeManager } from "@/core/knowledge";
import { orchestrator } from "@/core/orchestration/orchestrator";
import { agentRuntime } from "@/core/agents/agent-runtime";
import { opportunityRegistry } from "@/core/intelligence/opportunity";
import { nyxAgent } from "@/core/agents/nyx";
import { generateContentFamily, type ContentFamily } from "@/core/content/content-family";
import { aegisAgent, type QualityReview } from "@/core/agents/aegis";
import { echoAgent, type DistributionPlan } from "@/core/agents/echo";
import type { EventType, TaskStatus, AgentStatus, KnowledgeId, KnowledgeDocument } from "@/core/contracts";
import type { PipelineDefinition } from "@/core/orchestration/orchestrator";
import type { Opportunity } from "@/core/intelligence/opportunity";

/* =========================================================
   LUNARA OS — ვირტუალური ოფისი (ფაზა 1-8 ინტეგრირებული)
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
  { id: "astra", name: "Astra", role: "აღმასრულებელი კოორდინატორი", department: "executive", level: 7, xp: 742, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#8b5cf6", icon: "👑", missionsCompleted: 24, autonomyLevel: 4, currentTask: "სისტემის პრიორიტეტების მონიტორინგი" },
  { id: "nyx", name: "Nyx", role: "ტრენდების დაზვერვა", department: "intelligence", level: 5, xp: 516, xpToNext: 1000, status: "WORKING", taskId: "task-001", accent: "#3b82f6", icon: "🔍", missionsCompleted: 18, autonomyLevel: 3, currentTask: "TikTok-ის ტრენდების ანალიზი" },
  { id: "orion", name: "Orion", role: "კონკურენტების დაზვერვა", department: "intelligence", level: 4, xp: 384, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#6366f1", icon: "👁️", missionsCompleted: 12, autonomyLevel: 3, currentTask: "დანაწილების მოლოდინში" },
  { id: "sage", name: "Sage", role: "მთავარი სტრატეგი", department: "strategy", level: 6, xp: 628, xpToNext: 1000, status: "WAITING_FOR_REVIEW", taskId: "task-002", accent: "#a855f7", icon: "🎯", missionsCompleted: 20, autonomyLevel: 3, currentTask: "სტრატეგიის წინადადება დამტკიცების მოლოდინში" },
  { id: "muse", name: "Muse", role: "კონტენტის ხელმძღვანელი", department: "content", level: 5, xp: 492, xpToNext: 1000, status: "WORKING", taskId: "task-003", accent: "#f59e0b", icon: "✍️", missionsCompleted: 15, autonomyLevel: 3, currentTask: "3 სცენარის ვარიანტის წერა" },
  { id: "vega", name: "Vega", role: "კრეატიული დირექტორი", department: "creative", level: 6, xp: 584, xpToNext: 1000, status: "WAITING", taskId: "task-004", accent: "#ec4899", icon: "🎨", missionsCompleted: 18, autonomyLevel: 3, currentTask: "სცენარის დამტკიცების მოლოდინში" },
  { id: "atlas", name: "Atlas", role: "რესურსების დირექტორი", department: "resources", level: 7, xp: 712, xpToNext: 1000, status: "WORKING", taskId: "task-005", accent: "#10b981", icon: "🔐", missionsCompleted: 22, autonomyLevel: 2, currentTask: "API მონაცემების გადამოწმება" },
  { id: "cipher", name: "Cipher", role: "მონაცემების მენეჯერი", department: "resources", level: 5, xp: 468, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#059669", icon: "🔑", missionsCompleted: 14, autonomyLevel: 2, currentTask: "წვდომის ლიზინგების მონიტორინგი" },
  { id: "aegis", name: "Aegis", role: "ხარისხის დირექტორი", department: "quality", level: 6, xp: 596, xpToNext: 1000, status: "WORKING", taskId: "task-006", accent: "#06b6d4", icon: "🛡️", missionsCompleted: 19, autonomyLevel: 3, currentTask: "2 კონტენტის ელემენტის გადახედვა" },
  { id: "echo", name: "Echo", role: "გავრცელების მენეჯერი", department: "distribution", level: 5, xp: 524, xpToNext: 1000, status: "COMPLETED", taskId: "task-007", accent: "#84cc16", icon: "📡", missionsCompleted: 16, autonomyLevel: 2, currentTask: "გამოქვეყნებულია Telegram-ზე" },
  { id: "nova", name: "Nova", role: "ეფექტურობის ანალიტიკოსი", department: "analytics", level: 4, xp: 412, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#f97316", icon: "📊", missionsCompleted: 11, autonomyLevel: 3, currentTask: "ახალი მონაცემების მოლოდინში" },
  { id: "iris", name: "Iris", role: "სწავლების დირექტორი", department: "learning", level: 5, xp: 548, xpToNext: 1000, status: "WORKING", taskId: "task-008", accent: "#14b8a6", icon: "🧬", missionsCompleted: 17, autonomyLevel: 3, currentTask: "ეფექტურობის კანონზომიერებების ანალიზი" },
];

const initialTasks: Task[] = [
  { id: "task-001", title: "TikTok-ის ტრენდების სიგნალების ანალიზი", agentId: "nyx", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "task-002", title: "Q4 კონტენტის სტრატეგიის შემუშავება", agentId: "sage", status: "QUEUED", progress: 0, priority: "critical", createdAt: Date.now() - 1000 * 60 * 60 },
  { id: "task-003", title: "Love Signal-ისთვის 3 ჰუკის ვარიანტის დაწერა", agentId: "muse", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 20 },
  { id: "task-004", title: "ახალი სერიის ვიზუალური კონცეფციის შექმნა", agentId: "vega", status: "QUEUED", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 15 },
  { id: "task-005", title: "OpenAI API-ის ჯანმრთელობის გადამოწმება", agentId: "atlas", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 10 },
  { id: "task-006", title: "QA გადახედვა: 2 მოლოდინში მყოფი პოსტი", agentId: "aegis", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 25 },
  { id: "task-007", title: "Telegram არხზე გამოქვეყნება", agentId: "echo", status: "QUEUED", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 45 },
  { id: "task-008", title: "გასული კვირის კანონზომიერებების ამოღება", agentId: "iris", status: "QUEUED", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 35 },
];

const initialApprovals: ApprovalItem[] = [];
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

/* =========================================================
   დამხმარე ფუნქციები
   ========================================================= */

function formatTime(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "IDLE": return "#94a3b8";
    case "WORKING": return "#facc15";
    case "WAITING": return "#60a5fa";
    case "WAITING_FOR_RESOURCE": return "#f97316";
    case "WAITING_FOR_REVIEW": return "#a855f7";
    case "COMPLETED": return "#34d399";
    case "ERROR": return "#f87171";
    case "PAUSED": return "#fbbf24";
    case "SUSPENDED": return "#ef4444";
    case "STARTING": return "#c084fc";
    case "OFFLINE": return "#475569";
    default: return "#94a3b8";
  }
}

function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case "IDLE": return "⏸️ უმოქმედო";
    case "WORKING": return "⚡ მუშაობს";
    case "WAITING": return "⏳ მოლოდინში";
    case "WAITING_FOR_RESOURCE": return "🔐 რესურსის მოლოდინში";
    case "WAITING_FOR_REVIEW": return "🔍 გადახედვის მოლოდინში";
    case "COMPLETED": return "✅ დასრულებული";
    case "ERROR": return "❌ შეცდომა";
    case "PAUSED": return "⏸️ შეჩერებული";
    case "SUSPENDED": return "🚫 შეწყვეტილი";
    case "STARTING": return "🚀 იწყება";
    case "OFFLINE": return "⚫ ოფლაინ";
    default: return status;
  }
}

function mapEngineTypeToUI(type: EventType): EventLog["type"] {
  if (type.includes("TASK")) return "task";
  if (type.includes("AGENT")) return "agent";
  if (type.includes("EMERGENCY")) return "emergency";
  if (type.includes("RESOURCE")) return "resource";
  if (type.includes("KNOWLEDGE")) return "learning";
  if (type.includes("CONTENT")) return "quality";
  if (type.includes("PATTERN") || type.includes("LEARNING") || type.includes("OPPORTUNITY")) return "learning";
  return "system";
}

function generateMessageFromEvent(event: any): string {
  switch (event.type) {
    case "TASK_CREATED": return `📋 ამოცანა შექმნილია: ${event.payload?.title}`;
    case "TASK_STARTED": return `⚡ ამოცანა დაიწყო აგენტმა ${event.agent_id}`;
    case "TASK_COMPLETED": return `✅ ამოცანა დაასრულა აგენტმა ${event.agent_id}`;
    case "TASK_FAILED": return `❌ ამოცანა ჩავარდა აგენტისთვის ${event.agent_id}`;
    default: return `სისტემური მოვლენა: ${event.type}`;
  }
}

/* =========================================================
   მთავარი კომპონენტი
   ========================================================= */

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [resources] = useState<Resource[]>(initialResources);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  
  const [pipelineDef, setPipelineDef] = useState<PipelineDefinition | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contentFamilies, setContentFamilies] = useState<ContentFamily[]>([]);
  const [qualityReviews, setQualityReviews] = useState<QualityReview[]>([]);
  const [distributionPlans, setDistributionPlans] = useState<DistributionPlan[]>([]);
  
  const [nyxLogs, setNyxLogs] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  const [events, setEvents] = useState<EventLog[]>([
    { id: "e1", timestamp: "--:--:--", type: "system", message: "🟢 Lunara OS ძირითადი ძრავა ინიციალიზებულია" },
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>("astra");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  
  // ✅ გასწორებულია: წაშლილია გამოუყენებელი setter ფუნქციები
  const [systemStatus] = useState<"healthy" | "degraded" | "partial_outage">("healthy");
  const [simulationMode] = useState(true);
  
  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    allAgentsPaused: false,
    publishingPaused: false,
    expensiveTasksStopped: false,
    accessRevoked: false,
  });
  
  const [activePanel, setActivePanel] = useState<"overview" | "pipeline" | "approvals" | "quality" | "learning" | "emergency" | "knowledge" | "intelligence" | "content-family" | "distribution">("overview");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const currentTime = formatTime();
    setClock(currentTime);

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
        started_at: task.status === "RUNNING" ? task.createdAt : null,
        completed_at: task.status === "COMPLETED" ? task.createdAt : null,
        deadline: null
      });
    });

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

    initialKnowledge.forEach(knowledge => {
      knowledgeManager.registerKnowledge(knowledge);
    });

    setPipelineDef(orchestrator.getPipelineDefinition());

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
      });
    });

    osEngine.onEvent("OPPORTUNITY_DISCOVERED" as any, () => {
      setOpportunities([...opportunityRegistry.getAllOpportunities()]);
    });

    osEngine.onEvent("OPPORTUNITY_VALIDATED" as any, () => {
      setOpportunities([...opportunityRegistry.getAllOpportunities()]);
    });

    osEngine.onEvent("OPPORTUNITY_APPROVED" as any, (event: any) => {
      setOpportunities([...opportunityRegistry.getAllOpportunities()]);
      
      const opportunity = opportunityRegistry.getOpportunity(event.payload?.opportunityId);
      if (opportunity && opportunity.status === "approved") {
        const family = generateContentFamily(opportunity);
        setContentFamilies(prev => [...prev, family]);
        pushEvent("system", `✨ Muse-მ შექმნა Content Family: ${opportunity.topic}`);
        
        setTimeout(() => {
          const reviews = aegisAgent.reviewContentFamily(family);
          setQualityReviews(prev => [...prev, ...reviews]);
          pushEvent("quality", `🛡️ Aegis-მა დაასრულა QA: ${reviews.filter(r => r.verdict === "approved").length} დამტკიცებული`);
          
          setTimeout(() => {
            const plans = echoAgent.scheduleDistribution(family, reviews);
            setDistributionPlans(prev => [...prev, ...plans]);
            if (plans.length > 0) {
              pushEvent("system", `📡 Echo-მ დაგეგმა ${plans.length} პოსტის გამოქვეყნება`);
            }
          }, 1000);
        }, 1000);
      }
    });

    osEngine.onEvent("NYX_ANALYSIS_COMPLETED" as any, (event: any) => {
      setOpportunities([...opportunityRegistry.getAllOpportunities()]);
      setEvents(prev => [
        {
          id: event.event_id,
          timestamp: new Date(event.timestamp).toLocaleTimeString(),
          type: "learning",
          message: `🔍 Nyx-მა დაასრულა ანალიზი: ${event.payload?.valid_opportunities} შესაძლებლობა აღმოჩენილია ${event.payload?.total_signals} სიგნალიდან`,
        },
        ...prev
      ].slice(0, 50));
    });

    osEngine.onEvent("CONTENT_REVIEWED" as any, () => {
      setQualityReviews([...aegisAgent.getAllReviews()]);
    });

    osEngine.onEvent("DISTRIBUTION_SCHEDULED" as any, () => {
      setDistributionPlans([...echoAgent.getAllPlans()]);
    });

    osEngine.onEvent("CONTENT_PUBLISHED" as any, () => {
      setDistributionPlans([...echoAgent.getAllPlans()]);
    });

    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
    };
  }, [emergencyState.allAgentsPaused]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;
  const selectedDept = departments.find(d => d.id === selectedDepartment);
  
  const activeAgents = agents.filter(a => a.status === "WORKING" || a.status === "STARTING").length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const runningTasks = tasks.filter(t => t.status === "RUNNING").length;
  const totalXP = agents.reduce((sum, a) => sum + a.xp, 0);
  const pendingApprovals = approvals.filter(a => a.status === "pending").length;

  const filteredAgents = selectedDepartment ? agents.filter(a => a.department === selectedDepartment) : agents;
  const departmentAgents = (deptId: string) => agents.filter(a => a.department === deptId);

  const runNyxAnalysis = () => {
    setNyxLogs([]);
    pushEvent("system", "🔍 Nyx-მა დაიწყო ტრენდების ანალიზი");
    
    const steps = [
      "[Nyx] 🔍 იწყებს ტრენდების ანალიზს...",
      "[MockTrendSource] 📊 იღებს 5 ნედელ სიგნალს (TGStat, TikTok)...",
      "[Nyx] 📚 ტვირთავს Brand Bible და Content Bible-ს კონტექსტისთვის...",
      "[Nyx] 🧠 აანალიზებს სიგნალებს: სანდოობა, სიჩქარე, ბრენდის შესაბამისობა...",
      `[Nyx] ✨ აღმოაჩინა 5 ვალიდური შესაძლებლობა`,
      "[Nyx] 💾 ინახავს შესაძლებლობებს Opportunity Registry-ში...",
      "[Nyx] ✅ ანალიზი წარმატებით დასრულდა."
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setNyxLogs(prev => [...prev, step]);
      }, i * 500);
    });

    nyxAgent.analyzeTrends();
  };

  const copyNyxResults = () => {
    setIsCopying(true);
    
    const reportText = `🔍 LUNARA OS - Nyx Trend Analysis Report
📅 თარიღი: ${new Date().toLocaleString('ka-GE')}

📊 შესრულების ლოგები:
${nyxLogs.length > 0 ? nyxLogs.join('\n') : '[ლოგები არ არის ჩაწერილი]'}

🎯 აღმოჩენილი შესაძლებლობები (${opportunities.length}):
${opportunities.map(opp => `
- [${opp.priority === 'critical' ? 'კრიტიკული' : opp.priority === 'high' ? 'მაღალი' : opp.priority === 'medium' ? 'საშუალო' : 'დაბალი'}] ${opp.topic}
  • სანდოობა: ${Math.round(opp.confidence * 100)}% | სიჩქარე: ${Math.round(opp.velocity)}
  • ბრენდის შესაბამისობა: ${Math.round(opp.brand_fit * 100)}%
  • არხები: ${opp.recommended_channels.join(', ')}
  • სტატუსი: ${opp.status === 'discovered' ? 'აღმოჩენილი' : opp.status === 'validated' ? 'ვალიდირებული' : opp.status === 'approved' ? 'დამტკიცებული' : 'უარყოფილი'}
`).join('\n')}

---
Generated by Lunara OS Intelligence Layer (§4, §11, §24)`;

    navigator.clipboard.writeText(reportText).then(() => {
      setTimeout(() => {
        setIsCopying(false);
      }, 2000);
    });
  };

  const pushEvent = (type: EventLog["type"], message: string) => {
    setEvents((previous) => [
      { id: `event-${Date.now()}-${Math.random()}`, timestamp: formatTime(), type, message },
      ...previous,
    ].slice(0, 50));
  };

  const pauseAllAgents = () => {
    setAgents(prev => prev.map(a => a.status === "WORKING" || a.status === "STARTING" ? { ...a, status: "PAUSED" as AgentStatus } : a));
    setEmergencyState(prev => ({ ...prev, allAgentsPaused: true }));
    pushEvent("emergency", "🚨 საგანგებო: ყველა აგენტი შეაჩერა ადამიანმა აღმასრულებელმა");
  };

  const resumeAllAgents = () => {
    setAgents(prev => prev.map(a => a.status === "PAUSED" ? { ...a, status: "IDLE" as AgentStatus } : a));
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
    setTasks(prev => prev.map(t => t.priority === "critical" || t.priority === "high" ? { ...t, status: "FAILED" as TaskStatus } : t));
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
            <button onClick={() => setActivePanel("intelligence")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "intelligence" ? "bg-blue-500/20 text-blue-400 border border-blue-400/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              🔍 შესაძლებლობები
              {opportunities.filter(o => o.status === "discovered").length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  {opportunities.filter(o => o.status === "discovered").length}
                </span>
              )}
            </button>
            <button onClick={() => setActivePanel("content-family")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "content-family" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              ✍️ Content Family
              {contentFamilies.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
                  {contentFamilies.length}
                </span>
              )}
            </button>
            <button onClick={() => setActivePanel("quality")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "quality" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              🛡️ ხარისხის გადახედვა
              {qualityReviews.filter(r => r.verdict === "approved").length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-black text-white">
                  {qualityReviews.filter(r => r.verdict === "approved").length}
                </span>
              )}
            </button>
            <button onClick={() => setActivePanel("distribution")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "distribution" ? "bg-lime-500/20 text-lime-400 border border-lime-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              📡 გავრცელება
              {distributionPlans.filter(p => p.status === "scheduled").length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-500 text-xs font-black text-white">
                  {distributionPlans.filter(p => p.status === "scheduled").length}
                </span>
              )}
            </button>
            <button onClick={() => setActivePanel("pipeline")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "pipeline" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🔄 აქტიური პაიპლაინი</button>
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
                const activeCount = deptAgents.filter(a => a.status === "WORKING").length;
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
          
          {activePanel === "intelligence" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-wide">🔍 ინტელექტის ლენტა</h2>
                  <p className="text-base text-slate-400 mt-1">Foundation §4, §11, §24 — Nyx-ის აღმოჩენილი შესაძლებლობები</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={copyNyxResults} disabled={opportunities.length === 0 && nyxLogs.length === 0} className={`rounded-xl border px-6 py-3 text-base font-bold transition-all flex items-center gap-2 ${isCopying ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"}`}>
                    {isCopying ? "✅ დაკოპირდა!" : "📋 კოპირება"}
                  </button>
                  <button onClick={runNyxAnalysis} className="rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-6 py-3 text-base font-bold text-indigo-400 transition hover:bg-indigo-500/30">🔍 Nyx-ის გაშვება</button>
                </div>
              </div>

              {nyxLogs.length > 0 && (
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 mb-8 font-mono text-sm shadow-2xl">
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                    <span className="ml-2 text-xs text-slate-500">nyx-agent-execution.log</span>
                  </div>
                  <div className="space-y-1">
                    {nyxLogs.map((log, index) => (
                      <div key={index} className="text-emerald-400">
                        <span className="text-slate-500">[{formatTime(Date.now() - (nyxLogs.length - index) * 500)}]</span> {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatBox label="აღმოჩენილი" value={opportunities.filter(o => o.status === "discovered").length} color="#3b82f6" />
                <StatBox label="ვალიდირებული" value={opportunities.filter(o => o.status === "validated").length} color="#a855f7" />
                <StatBox label="დამტკიცებული" value={opportunities.filter(o => o.status === "approved").length} color="#10b981" />
                <StatBox label="უარყოფილი" value={opportunities.filter(o => o.status === "rejected").length} color="#ef4444" />
              </div>

              <div className="space-y-6">
                {opportunities.length === 0 && nyxLogs.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-xl font-black text-white mb-2">შესაძლებლობები ჯერ არ არის</h3>
                    <p className="text-slate-400 mb-6">დააჭირე "Nyx-ის გაშვებას" ტრენდების ანალიზის დასაწყებად.</p>
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <h3 className="text-xl font-black text-white mb-2">ანალიზი მიმდინარეობს...</h3>
                    <p className="text-slate-400">შეამოწმე ლოგების ფანჯარა ზემოთ.</p>
                  </div>
                ) : (
                  opportunities.map(opp => (
                    <div key={opp.opportunity_id} className={`rounded-2xl border bg-slate-900/50 backdrop-blur-xl p-6 transition-all ${opp.status === "discovered" ? "border-blue-500/30" : opp.status === "validated" ? "border-purple-500/30" : opp.status === "approved" ? "border-emerald-500/30" : "border-red-500/30"}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-white mb-2">{opp.topic}</h3>
                          <p className="text-sm text-slate-300 mb-3">{opp.core_insight}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <div className={`rounded-lg px-3 py-1 text-xs font-black ${opp.priority === "critical" ? "bg-red-500/20 text-red-400" : opp.priority === "high" ? "bg-orange-500/20 text-orange-400" : opp.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-500/20 text-slate-400"}`}>
                            {opp.priority === "critical" ? "კრიტიკული" : opp.priority === "high" ? "მაღალი" : opp.priority === "medium" ? "საშუალო" : "დაბალი"} პრიორიტეტი
                          </div>
                          <div className={`rounded-lg px-3 py-1 text-xs font-black ${opp.status === "discovered" ? "bg-blue-500/20 text-blue-400" : opp.status === "validated" ? "bg-purple-500/20 text-purple-400" : opp.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {opp.status === "discovered" ? "აღმოჩენილი" : opp.status === "validated" ? "ვალიდირებული" : opp.status === "approved" ? "დამტკიცებული" : "უარყოფილი"}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400 mb-1">სანდოობა</div>
                          <div className={`text-2xl font-black ${opp.confidence >= 0.8 ? "text-emerald-400" : opp.confidence >= 0.7 ? "text-yellow-400" : "text-orange-400"}`}>{Math.round(opp.confidence * 100)}%</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400 mb-1">სიჩქარე</div>
                          <div className="text-2xl font-black text-blue-400">{Math.round(opp.velocity)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400 mb-1">ბრენდის შესაბამისობა</div>
                          <div className={`text-2xl font-black ${opp.brand_fit >= 0.9 ? "text-emerald-400" : opp.brand_fit >= 0.8 ? "text-yellow-400" : "text-orange-400"}`}>{Math.round(opp.brand_fit * 100)}%</div>
                        </div>
                      </div>
                      {opp.status === "discovered" && (
                        <div className="flex gap-3">
                          <button onClick={() => { opportunityRegistry.validateOpportunity(opp.opportunity_id); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `✅ Orion-მა დაადასტურა: ${opp.topic}`); }} className="flex-1 rounded-xl border border-purple-500/40 bg-purple-500/20 py-3 text-base font-bold text-purple-400 transition hover:bg-purple-500/30">✅ Orion-ისთვის გადაცემა</button>
                          <button onClick={() => { opportunityRegistry.rejectOpportunity(opp.opportunity_id, "human_executive"); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `❌ ადამიანმა უარყო: ${opp.topic}`); }} className="flex-1 rounded-xl border border-red-500/40 bg-red-500/20 py-3 text-base font-bold text-red-400 transition hover:bg-red-500/30">❌ უარყოფა</button>
                        </div>
                      )}
                      {opp.status === "validated" && (
                        <div className="flex gap-3">
                          <button onClick={() => { opportunityRegistry.approveOpportunity(opp.opportunity_id); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `🎯 Sage-მ დაამტკიცა: ${opp.topic}`); }} className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-3 text-base font-bold text-emerald-400 transition hover:bg-emerald-500/30">🎯 Sage-სთვის გადაცემა</button>
                          <button onClick={() => { opportunityRegistry.rejectOpportunity(opp.opportunity_id, "human_executive"); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `❌ ადამიანმა უარყო: ${opp.topic}`); }} className="flex-1 rounded-xl border border-red-500/40 bg-red-500/20 py-3 text-base font-bold text-red-400 transition hover:bg-red-500/30">❌ უარყოფა</button>
                        </div>
                      )}
                      {opp.status === "approved" && (
                        <div className="rounded-xl border px-4 py-3 text-center text-base font-black bg-emerald-500/20 border-emerald-500/40 text-emerald-400">✅ დამტკიცებულია — Muse ამუშავებს Content Family-ს</div>
                      )}
                      {opp.status === "rejected" && (
                        <div className="rounded-xl border px-4 py-3 text-center text-base font-black bg-red-500/20 border-red-500/40 text-red-400">❌ უარყოფილია</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel === "content-family" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-wide">✍️ Content Family</h2>
                  <p className="text-base text-slate-400 mt-1">Foundation §10, §24 — Muse-ის მიერ შექმნილი ნატიური ვარიანტები</p>
                </div>
              </div>
              <div className="space-y-6">
                {contentFamilies.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">✍️</div>
                    <h3 className="text-xl font-black text-white mb-2">Content Family ჯერ არ არის</h3>
                    <p className="text-slate-400 mb-6">დაამტკიცე Opportunity "შესაძლებლობები" პანელზე, რომ Muse-მ შექმნას Content Family.</p>
                  </div>
                ) : (
                  contentFamilies.map(family => {
                    const familyReviews = qualityReviews.filter(r => r.family_id === family.family_id);
                    return (
                      <div key={family.family_id} className="rounded-2xl border border-amber-500/30 bg-slate-900/50 backdrop-blur-xl p-6">
                        <div className="mb-6">
                          <h3 className="text-xl font-black text-white mb-2">Family ID: {family.family_id}</h3>
                          <p className="text-sm text-slate-300 mb-3">{family.core_insight}</p>
                          <div className="text-xs text-slate-500">შექმნილია: {formatTime(family.created_at)} | ავტორი: {family.created_by}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {family.variants.map(variant => {
                            const review = familyReviews.find(r => r.channel_id === variant.channel_id);
                            return (
                              <div key={variant.channel_id} className={`rounded-xl border p-4 ${review?.verdict === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : review?.verdict === "revise" ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/10 bg-white/5"}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="text-2xl">{variant.channel_id === "human_mind" ? "🧠" : variant.channel_id === "love" ? "💕" : variant.channel_id === "astrology" ? "♈" : variant.channel_id === "tarot" ? "🎴" : variant.channel_id === "mystery" ? "🌙" : "✨"}</div>
                                    <div className="text-sm font-bold text-white uppercase">{variant.channel_id.replace('_', ' ')}</div>
                                  </div>
                                  {review && (
                                    <div className={`rounded-lg px-2 py-1 text-xs font-black ${review.verdict === "approved" ? "bg-emerald-500/20 text-emerald-400" : review.verdict === "revise" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                                      {review.scores.total}/100
                                    </div>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">{variant.title}</h4>
                                <p className="text-xs text-slate-400 mb-2 italic">"{variant.hook}"</p>
                                <p className="text-xs text-slate-300 mb-3">{variant.description}</p>
                                <div className="text-xs text-slate-500 mb-2">ფორმატი: {variant.format}</div>
                                <div className="text-xs text-emerald-400 font-bold mb-3">CTA: {variant.cta}</div>
                                {review && (
                                  <div className="border-t border-white/10 pt-3 mt-3">
                                    <div className="text-xs font-bold text-slate-400 mb-1">🛡️ Aegis QA:</div>
                                    <div className="text-xs text-slate-300">{review.feedback}</div>
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

          {activePanel === "quality" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-wide">🛡️ ხარისხის გადახედვა</h2>
                  <p className="text-base text-slate-400 mt-1">Foundation §47, §86 — Aegis-ის 11-განზომილებიანი QA შეფასება</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <StatBox label="დამტკიცებული" value={qualityReviews.filter(r => r.verdict === "approved").length} color="#10b981" />
                <StatBox label="საჭიროებს შესწორებას" value={qualityReviews.filter(r => r.verdict === "revise").length} color="#f59e0b" />
                <StatBox label="უარყოფილი" value={qualityReviews.filter(r => r.verdict === "rejected").length} color="#ef4444" />
              </div>
              <div className="space-y-6">
                {qualityReviews.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">🛡️</div>
                    <h3 className="text-xl font-black text-white mb-2">QA შეფასებები ჯერ არ არის</h3>
                    <p className="text-slate-400 mb-6">დაამტკიცე Opportunity, რომ Aegis-მ შეაფასოს Content Family.</p>
                  </div>
                ) : (
                  qualityReviews.map(review => (
                    <div key={review.review_id} className={`rounded-2xl border bg-slate-900/50 backdrop-blur-xl p-6 ${review.verdict === "approved" ? "border-emerald-500/30" : review.verdict === "revise" ? "border-yellow-500/30" : "border-red-500/30"}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-black text-white mb-1">
                            {review.channel_id === "human_mind" ? "🧠 Human Mind" : review.channel_id === "love" ? "💕 Love" : review.channel_id === "astrology" ? "♈ Astrology" : review.channel_id === "tarot" ? "🎴 Tarot" : review.channel_id === "mystery" ? "🌙 Mystery" : "✨ Lunara"}
                          </h3>
                          <p className="text-xs text-slate-500">Family: {review.family_id}</p>
                        </div>
                        <div className={`rounded-lg px-4 py-2 text-center ${review.verdict === "approved" ? "bg-emerald-500/20 border border-emerald-500/40" : review.verdict === "revise" ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
                          <div className="text-2xl font-black text-white">{review.scores.total}</div>
                          <div className="text-xs font-bold text-slate-400">/100</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {Object.entries(review.scores).filter(([key]) => key !== 'total').map(([key, value]) => (
                          <div key={key} className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div className={`text-lg font-black ${value >= 85 ? "text-emerald-400" : value >= 70 ? "text-yellow-400" : "text-red-400"}`}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="text-xs font-bold text-slate-400 mb-1">💬 Aegis-ის შენიშვნა:</div>
                        <p className="text-sm text-slate-300">{review.feedback}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel === "distribution" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-wide">📡 გავრცელება</h2>
                  <p className="text-base text-slate-400 mt-1">Foundation §48, §116 — Echo-ს მიერ დაგეგმილი და გამოქვეყნებული კონტენტი</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <StatBox label="დაგეგმილი" value={distributionPlans.filter(p => p.status === "scheduled").length} color="#3b82f6" />
                <StatBox label="გამოქვეყნებული" value={distributionPlans.filter(p => p.status === "published").length} color="#10b981" />
                <StatBox label="შეცდომა" value={distributionPlans.filter(p => p.status === "failed").length} color="#ef4444" />
              </div>
              <div className="space-y-6">
                {distributionPlans.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <div className="text-4xl mb-4">📡</div>
                    <h3 className="text-xl font-black text-white mb-2">გამოქვეყნებები ჯერ არ არის</h3>
                    <p className="text-slate-400 mb-6">დაამტკიცე Opportunity, რომ Echo-მ დაგეგმოს გამოქვეყნება.</p>
                  </div>
                ) : (
                  distributionPlans.map(plan => (
                    <div key={plan.plan_id} className={`rounded-2xl border bg-slate-900/50 backdrop-blur-xl p-6 ${plan.status === "published" ? "border-emerald-500/30" : plan.status === "scheduled" ? "border-blue-500/30" : "border-red-500/30"}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-black text-white mb-1">
                            {plan.channel_id === "human_mind" ? "🧠 Human Mind" : plan.channel_id === "love" ? "💕 Love" : plan.channel_id === "astrology" ? "♈ Astrology" : plan.channel_id === "tarot" ? "🎴 Tarot" : plan.channel_id === "mystery" ? "🌙 Mystery" : "✨ Lunara"}
                          </h3>
                          <p className="text-xs text-slate-500">Family: {plan.family_id}</p>
                        </div>
                        <div className={`rounded-lg px-3 py-1 text-xs font-black ${plan.status === "published" ? "bg-emerald-500/20 text-emerald-400" : plan.status === "scheduled" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                          {plan.status === "published" ? "გამოქვეყნებული" : plan.status === "scheduled" ? "დაგეგმილი" : "შეცდომა"}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400 mb-1">პლატფორმა</div>
                          <div className="text-base font-bold text-white">{plan.platform}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs font-bold text-slate-400 mb-1">დაგეგმილი დრო</div>
                          <div className="text-base font-bold text-white">{formatTime(plan.scheduled_time)}</div>
                        </div>
                      </div>
                      {plan.status === "published" && plan.post_id && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                          <div className="text-xs font-bold text-emerald-400 mb-1">Post ID:</div>
                          <p className="text-sm text-emerald-300 font-mono">{plan.post_id}</p>
                        </div>
                      )}
                      {plan.status === "scheduled" && (
                        <button
                          onClick={() => {
                            echoAgent.publishPost(plan.plan_id);
                            setDistributionPlans([...echoAgent.getAllPlans()]);
                            pushEvent("system", `📡 Echo-მ მყისიერად გამოაქვეყნა: ${plan.channel_id}`);
                          }}
                          className="w-full rounded-xl border border-blue-500/40 bg-blue-500/20 py-3 text-base font-bold text-blue-400 transition hover:bg-blue-500/30 mt-2"
                        >
                          ▶️ მყისიერი გამოქვეყნება
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activePanel === "overview" && (
            <div className="text-center p-12">
              <h2 className="text-2xl font-black mb-4">🏢 მიმოხილვა</h2>
              <p className="text-slate-400">აირჩიე პანელი ნავიგაციიდან</p>
            </div>
          )}
          {activePanel === "pipeline" && pipelineDef && (
            <div className="text-center p-12">
              <h2 className="text-2xl font-black mb-4">🔄 აქტიური პაიპლაინი</h2>
              <p className="text-slate-400">Pipeline პანელი</p>
            </div>
          )}
          {activePanel === "learning" && <div className="text-center p-12 text-slate-400">Learning პანელი</div>}
          {activePanel === "knowledge" && <div className="text-center p-12 text-slate-400">Knowledge პანელი</div>}
          {activePanel === "emergency" && <div className="text-center p-12 text-slate-400">Emergency პანელი</div>}

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
                  <div key={event.id} className="rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider text-slate-400">{event.type.toUpperCase()}</span>
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
        .lunara-readable .text-xs { font-size: 0.8125rem !important; line-height: 1.35 !important; }
        .lunara-readable .text-sm { font-size: 0.9375rem !important; line-height: 1.5 !important; }
        .lunara-readable .text-base { font-size: 1rem !important; line-height: 1.55 !important; }
        .lunara-readable [class*="text-[10px]"] { font-size: 0.75rem !important; line-height: 1.3 !important; }
        .lunara-readable p { line-height: 1.6; }
        .lunara-readable h2 { line-height: 1.15; }
        .lunara-readable h3 { line-height: 1.2; }
        .lunara-readable button { line-height: 1.35; }
        ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05) !important; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15) !important; border-radius: 4px !important; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25) !important; }
      `}</style>
    </main>
  );
}

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