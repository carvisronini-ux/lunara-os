"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
// ✅ წაშლილია: import { CredentialsPanel } from "@/components/credentials/CredentialsPanel";
import E2ETestPanel from "@/components/e2e/E2ETestPanel";
import DepartmentModal from "@/components/office/DepartmentModal";
import AgentDetailModal from "@/components/agents/AgentDetailModal";
import type { AgentStatus } from "@/core/contracts";
import type { PipelineDefinition } from "@/core/orchestration/orchestrator";
import type { Opportunity } from "@/core/intelligence/opportunity";

import { 
  departments, initialAgents, initialTasks, initialResources, initialKnowledge, 
  type Department, type Agent, type Task, type EventLog, type Resource, type EmergencyState
} from "@/lib/office-data";
import { formatTime, getStatusColor, getStatusLabel, mapEngineTypeToUI, generateMessageFromEvent } from "@/lib/dashboard-utils";
import { StatBox, EmergencyButton, EmergencyStatusItem, AnalyticsModal } from "@/components/dashboard/ui-components";

/* =====================================================================
   DESIGN LAYER (presentation only — no business logic below this block)
   ===================================================================== */

// ✅ განახლებულია: "credentials" შეცვლილია "api"-თი
type PanelId =
  | "overview" | "pipeline" | "approvals" | "quality" | "learning" | "emergency" | "knowledge"
  | "intelligence" | "content-family" | "distribution" | "e2e-test" | "telegram" | "api";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
.os-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.09); --line-2:rgba(236,233,247,.17);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon);
}
.os-root .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.os-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
.os-scroll{scrollbar-width:none}
.os-scroll::-webkit-scrollbar{display:none}
.t-ok{color:#5fd6a4;background:rgba(95,214,164,.12);border:1px solid rgba(95,214,164,.28)}
.t-warn{color:#f6c177;background:rgba(246,193,119,.12);border:1px solid rgba(246,193,119,.28)}
.t-bad{color:#ff7aa8;background:rgba(255,122,168,.12);border:1px solid rgba(255,122,168,.28)}
.t-info{color:#b3a8ff;background:rgba(155,140,255,.14);border:1px solid rgba(155,140,255,.3)}
.t-mute{color:#9d9bbd;background:rgba(157,155,189,.1);border:1px solid rgba(157,155,189,.2)}
@keyframes os-in{from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none}}
.os-in{animation:os-in .22s ease-out}
@media (prefers-reduced-motion:reduce){
  .os-in{animation:none}
  .os-root *{transition:none !important; animation:none !important}
}
`;

const NAV_ICONS: Record<string, string> = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  intelligence: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  "content-family": "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  quality: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  distribution: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  telegram: "M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z",
  instagram: "M3 7a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 17a4 4 0 100-8 4 4 0 000 8z",
  pipeline: "M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a3 3 0 013 3v4",
  learning: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  knowledge: "M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2zM4 19V5M8 7h6",
  credentials: "M6 11h12v9H6zM8 11V8a4 4 0 118 0v3", // გამოიყენება API ღილაკისთვისაც
  "e2e-test": "M6 4l14 8-14 8z",
  emergency: "M12 3l10 18H2zM12 10v5M12 18h.01",
  approvals: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l3 3 5-6",
};

function NavIcon({ id, size = 18 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={NAV_ICONS[id] ?? NAV_ICONS.overview} />
    </svg>
  );
}

const card = "rounded-2xl border border-[var(--line)] bg-[var(--ink-2)]";

const channelMeta = (id: string) =>
  id === "human_mind" ? { icon: "🧠", label: "Human Mind" }
  : id === "love" ? { icon: "💕", label: "Love" }
  : id === "astrology" ? { icon: "♈", label: "Astrology" }
  : id === "tarot" ? { icon: "🎴", label: "Tarot" }
  : id === "mystery" ? { icon: "🌙", label: "Mystery" }
  : { icon: "✨", label: "Lunara" };

const priorityLabel = (p: string) => p === "critical" ? "კრიტიკული" : p === "high" ? "მაღალი" : p === "medium" ? "საშუალო" : "დაბალი";
const priorityTone = (p: string) => p === "critical" ? "t-bad" : p === "high" ? "t-warn" : p === "medium" ? "t-info" : "t-mute";
const oppStatusLabel = (s: string) => s === "discovered" ? "აღმოჩენილი" : s === "validated" ? "ვალიდირებული" : s === "approved" ? "დამტკიცებული" : "უარყოფილი";
const oppStatusTone = (s: string) => s === "discovered" ? "t-info" : s === "validated" ? "t-warn" : s === "approved" ? "t-ok" : "t-bad";
const agentStatusTone = (s: string) => s === "WORKING" ? "t-warn" : s === "IDLE" ? "t-mute" : s === "COMPLETED" ? "t-ok" : s === "ERROR" ? "t-bad" : "t-info";
const verdictTone = (v: string) => v === "approved" ? "t-ok" : v === "revise" ? "t-warn" : "t-bad";
const scoreColor = (v: number) => v >= 85 ? "text-[#5fd6a4]" : v >= 70 ? "text-[#f6c177]" : "text-[#ff7aa8]";

function Chip({ tone, children, className = "" }: { tone: string; children: React.ReactNode; className?: string }) {
  return <span className={`${tone} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

function Bar({ value, color = "var(--violet)", thin = false }: { value: number; color?: string; thin?: boolean }) {
  return (
    <div className={`${thin ? "h-1" : "h-1.5"} overflow-hidden rounded-full bg-white/10`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

function PanelHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight lg:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--mute)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--line-2)] px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--mute)]">{text}</p>
    </div>
  );
}

const btnBase = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost = `${btnBase} border border-[var(--line-2)] hover:bg-white/5`;
const btnPrimary = `${btnBase} bg-[var(--violet)] text-[var(--ink)] hover:opacity-90`;

/* =====================================================================
   PAGE
   ===================================================================== */

export default function HomePage() {
  const router = useRouter();
  
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [resources] = useState<Resource[]>(initialResources);
  
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

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedDepartmentForModal, setSelectedDepartmentForModal] = useState<Department | null>(null);
  const [selectedAgentForDetail, setSelectedAgentForDetail] = useState<Agent | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  
  const [systemStatus] = useState<"healthy" | "degraded" | "partial_outage">("healthy");
  
  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    allAgentsPaused: false,
    publishingPaused: false,
    expensiveTasksStopped: false,
    accessRevoked: false,
  });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [documentationContent, setDocumentationContent] = useState('');
  const [isDocLoading, setIsDocLoading] = useState(false);
  
  const [activePanel, setActivePanel] = useState<PanelId>("overview");
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
          supervisor: "astra" as any,
          controller: "astra" as any,
          reviewer: "aegis" as any,
          escalation_path: ["astra"] as any,
          autonomy_level: agent.autonomyLevel as any,
          failure_policy: { max_retries: 3, retry_delay_ms: 5000, escalation_path: ["astra"] as any, notify_human: true }
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
        status: task.status as any,
        priority: task.priority,
        creator_agent_id: "astra",
        assigned_agent_id: task.agentId,
        department: "executive" as any,
        required_capability: "research.trends" as any,
        payload: {}, expected_outputs: [], depends_on: [],
        progress: task.progress, retry_count: 0, max_retries: 3,
        error_category: null,
        error_message: null,
        created_at: task.createdAt,
        started_at: (task.status as any) === "CLAIMED" ? task.createdAt : null,
        completed_at: (task.status as any) === "COMPLETED" ? task.createdAt : null,
        deadline: null
      } as any);
    });

    initialResources.forEach(res => {
      resourceManager.registerResource({
        resource_id: res.id as any,
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

    const eventTypes = [
      "TASK_CREATED", "TASK_STARTED", "TASK_COMPLETED", "TASK_FAILED",
      "TASK_RETRIED", "TASK_ESCALATED", "AGENT_REGISTERED", "EMERGENCY_ACTIVATED",
      "RESOURCE_REQUESTED", "RESOURCE_GRANTED", "RESOURCE_REVOKED",
      "KNOWLEDGE_VERSION_CREATED", "KNOWLEDGE_UPDATED",
      "CONTENT_CREATED", "CONTENT_REVIEW_REQUESTED", "CONTENT_APPROVED", "CONTENT_REJECTED",
      "PATTERN_DISCOVERED", "AGENT_VERSION_CREATED", "AGENT_PROMOTED", "AGENT_EVALUATED"
    ] as any;

    eventTypes.forEach((type: any) => {
      osEngine.onEvent(type, (event: any) => {
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
          type: "learning" as EventLog["type"],
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

  useEffect(() => {
    if (isDocModalOpen && !documentationContent) {
      setIsDocLoading(true);
      fetch('/api/docs')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDocumentationContent(data.content);
          } else {
            console.error('Failed to load documentation:', data.error);
          }
          setIsDocLoading(false);
        })
        .catch(err => {
          console.error('Failed to load documentation:', err);
          setIsDocLoading(false);
        });
    }
  }, [isDocModalOpen, documentationContent]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;
  const selectedDept = departments.find(d => d.id === selectedDepartment);
  
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
    setTasks(prev => prev.map(t => t.priority === "critical" || t.priority === "high" ? { ...t, status: "FAILED" as any } : t));
    setEmergencyState(prev => ({ ...prev, expensiveTasksStopped: true }));
    pushEvent("emergency", "🛑 ძვირადღირებული ამოცანები შეაჩერა ადამიანმა აღმასრულებელმა");
  };

  const revokeAccess = () => {
    setEmergencyState(prev => ({ ...prev, accessRevoked: true }));
    pushEvent("emergency", "🔐 დროებითი წვდომა გააუქმა ადამიანმა აღმასრულებელმა");
  };

  const saveDocumentation = async () => {
    try {
      const res = await fetch('/api/docs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: documentationContent })
      });
      const data = await res.json();
      if (data.success) {
        pushEvent("system", "💾 Documentation saved successfully to file");
        setIsDocModalOpen(false);
      } else {
        pushEvent("error", "❌ Failed to save documentation");
      }
    } catch (error) {
      console.error('Failed to save documentation:', error);
      pushEvent("error", "❌ Failed to save documentation");
    }
  };

  /* ---------- presentation-only derived data ---------- */
  const navGroups: { title: string; items: { id: PanelId; label: string; badge?: number }[] }[] = [
    {
      title: "ოპერაციები",
      items: [
        { id: "overview", label: "მიმოხილვა" },
        { id: "pipeline", label: "პაიპლაინი" },
        { id: "approvals", label: "დამტკიცებები" },
        { id: "emergency", label: "საგანგებო" },
      ],
    },
    {
      title: "კონტენტი",
      items: [
        { id: "intelligence", label: "შესაძლებლობები", badge: opportunities.filter(o => o.status === "discovered").length },
        { id: "content-family", label: "Content Family", badge: contentFamilies.length },
        { id: "quality", label: "ხარისხის გადახედვა", badge: qualityReviews.filter(r => r.verdict === "approved").length },
        { id: "distribution", label: "გავრცელება", badge: distributionPlans.filter(p => p.status === "scheduled").length },
        { id: "telegram", label: "Telegram" },
      ],
    },
    {
      title: "სისტემა",
      items: [
        { id: "learning", label: "სწავლა" },
        { id: "knowledge", label: "ცოდნა" },
        { id: "api", label: "API საცავი" }, // ✅ განახლებულია
        { id: "e2e-test", label: "E2E ტესტი" },
      ],
    },
  ];

  const statusTone = systemStatus === "healthy" ? "t-ok" : systemStatus === "degraded" ? "t-warn" : "t-bad";
  const statusDot = systemStatus === "healthy" ? "#5fd6a4" : systemStatus === "degraded" ? "#f6c177" : "#ff7aa8";
  const statusText = systemStatus === "healthy" ? "ონლაინ" : systemStatus === "degraded" ? "გაუარესებული" : "გათიშვა";

  const navButton = (item: { id: PanelId; label: string; badge?: number }, compact = false) => {
    // ✅ სპეციალური დამუშავება Telegram-ისა და API-სთვის: პირდაპირ გადადის ცალკე გვერდზე
    if (item.id === "telegram" || item.id === "api") {
      const route = item.id === "telegram" ? "/dashboard/telegram" : "/dashboard/api";
      const iconId = item.id === "api" ? "credentials" : item.id; // API-სთვის ვიყენებთ credentials აიქონს
      
      return (
        <button
          key={item.id}
          onClick={() => router.push(route)}
          className={`flex items-center gap-3 whitespace-nowrap rounded-xl text-sm font-medium transition-colors ${
            compact ? "px-3 py-2" : "w-full px-3 py-2.5"
          } text-[var(--mute)] hover:bg-white/5 hover:text-[var(--moon)]`}
        >
          <span><NavIcon id={iconId} size={compact ? 16 : 18} /></span>
          <span className="flex-1 text-left">{item.label}</span>
          {!!item.badge && item.badge > 0 && (
            <span className="t-info rounded-full px-2 py-0.5 text-xs font-semibold">{item.badge}</span>
          )}
        </button>
      );
    }

    const selected = activePanel === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActivePanel(item.id)}
        aria-current={selected ? "page" : undefined}
        className={`flex items-center gap-3 whitespace-nowrap rounded-xl text-sm font-medium transition-colors ${
          compact ? "px-3 py-2" : "w-full px-3 py-2.5"
        } ${
          selected
            ? "bg-[var(--ink-3)] text-[var(--moon)] shadow-[inset_0_0_0_1px_rgba(155,140,255,.45)]"
            : "text-[var(--mute)] hover:bg-white/5 hover:text-[var(--moon)]"
        } ${item.id === "emergency" && !selected ? "hover:text-[#ff7aa8]" : ""}`}
      >
        <span className={selected ? "text-[var(--violet)]" : ""}><NavIcon id={item.id} size={compact ? 16 : 18} /></span>
        <span className="flex-1 text-left">{item.label}</span>
        {!!item.badge && item.badge > 0 && (
          <span className="t-info rounded-full px-2 py-0.5 text-xs font-semibold">{item.badge}</span>
        )}
      </button>
    );
  };

  return (
    <main className="os-root min-h-screen w-full overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ================= TOP BAR ================= */}
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[#0b0d1c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "radial-gradient(circle at 66% 32%, #1a1e3a 0 20%, transparent 21%), radial-gradient(circle at 56% 40%, #f6c177 0 34%, transparent 35%), #1a1640" }}
              aria-hidden
            />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight tracking-tight lg:text-xl">LUNARA OS</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">ვირტუალური ოფისი — ავტონომიური ციფრული ორგანიზაცია</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/instagram")}
              className="hidden items-center gap-2 rounded-full border border-[var(--line-2)] px-3.5 py-1.5 text-sm font-medium text-[var(--moon)] transition-colors hover:bg-white/5 sm:flex"
            >
              <NavIcon id="instagram" size={16} /> Instagram
            </button>
            <div className={`${statusTone} flex items-center gap-2.5 rounded-full px-3.5 py-1.5`}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: statusDot }} />
              <span className="text-sm font-semibold">{statusText}</span>
              <span className="mono hidden border-l pl-2.5 text-sm sm:inline" style={{ borderColor: "rgba(255,255,255,.15)" }}>{clock || "--:--:--"}</span>
            </div>
          </div>
        </div>

        {/* mobile / tablet nav */}
        <nav aria-label="Sections" className="os-scroll flex gap-1 overflow-x-auto border-t border-[var(--line)] px-4 py-2 lg:hidden">
          {navGroups.flatMap(g => g.items).map(item => navButton(item, true))}
          <button
            onClick={() => router.push("/dashboard/instagram")}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-[var(--mute)] hover:bg-white/5 hover:text-[var(--moon)]"
          >
            <NavIcon id="instagram" size={16} /> Instagram
          </button>
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1680px]">
        {/* ================= SIDEBAR ================= */}
        <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-[250px] shrink-0 overflow-y-auto border-r border-[var(--line)] p-4 lg:block">
          <nav aria-label="Sections" className="space-y-6">
            {navGroups.map(group => (
              <div key={group.title}>
                <p className="mb-2 px-3 text-xs font-semibold text-[var(--mute)]">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => navButton(item))}
                  {group.title === "კონტენტი" && (
                    <button
                      onClick={() => router.push("/dashboard/instagram")}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]"
                    >
                      <NavIcon id="instagram" />
                      <span className="flex-1 text-left">Instagram</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* ================= MAIN ================= */}
        <section className="min-w-0 flex-1 p-4 lg:p-6">

          {/* ---------- OVERVIEW ---------- */}
          {activePanel === "overview" && (
            <div className="os-in space-y-6">
              {/* departments */}
              <div>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-lg font-semibold tracking-tight lg:text-xl">ვირტუალური ოფისის რუკა</h2>
                  <p className="flex items-center gap-3 text-xs text-[var(--mute)]">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f6c177]" />მუშაობს</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b3a8ff]" />მოლოდინში</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#9d9bbd]" />უმოქმედო</span>
                  </p>
                </div>

                <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by department">
                  <button
                    onClick={() => setSelectedDepartment(null)}
                    aria-pressed={!selectedDepartment}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      !selectedDepartment ? "border-[var(--moon)] bg-[var(--moon)] text-[var(--ink)]" : "border-[var(--line-2)] text-[var(--mute)] hover:text-[var(--moon)]"
                    }`}
                  >
                    ყველა · {agents.length}
                  </button>
                  {departments.map(dept => {
                    const on = selectedDepartment === dept.id;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDepartment(dept.id)}
                        aria-pressed={on}
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors"
                        style={{
                          borderColor: on ? dept.color : "var(--line-2)",
                          background: on ? `${dept.color}22` : "transparent",
                          color: on ? "var(--moon)" : "var(--mute)",
                        }}
                      >
                        <span>{dept.icon}</span>{dept.name} · {departmentAgents(dept.id).length}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                  {departments.map(dept => {
                    const deptAgents = departmentAgents(dept.id);
                    const workingCount = deptAgents.filter(a => a.status === "WORKING").length;
                    const waitingCount = deptAgents.filter(a => a.status.includes("WAITING")).length;
                    const idleCount = deptAgents.filter(a => a.status === "IDLE").length;
                    const on = selectedDepartment === dept.id;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDepartmentForModal(dept)}
                        className={`${card} p-3 text-left transition-colors hover:border-[var(--line-2)]`}
                        style={{ borderColor: on ? dept.color : undefined }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: `${dept.color}26` }}>{dept.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold leading-tight">{dept.name}</div>
                            <div className="mono mt-1 flex items-center gap-2.5 text-xs">
                              <span className="flex items-center gap-1 text-[#f6c177]" title="მუშაობს"><span className="h-1.5 w-1.5 rounded-full bg-[#f6c177]" />{workingCount}</span>
                              <span className="flex items-center gap-1 text-[#b3a8ff]" title="მოლოდინში"><span className="h-1.5 w-1.5 rounded-full bg-[#b3a8ff]" />{waitingCount}</span>
                              <span className="flex items-center gap-1 text-[var(--mute)]" title="უმოქმედო"><span className="h-1.5 w-1.5 rounded-full bg-[#9d9bbd]" />{idleCount}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* agents */}
              <div>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
                  <h2 className="text-lg font-semibold tracking-tight lg:text-xl">აგენტები</h2>
                  <p className="text-xs text-[var(--mute)]">
                    {filteredAgents.length} აგენტი{selectedDepartment ? ` · ${selectedDept?.name}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredAgents.map(agent => {
                    const agentTasks = tasks.filter(t => t.agentId === agent.id);
                    const activeTask = agentTasks.find(t => (t.status as any) === "CLAIMED" || (t.status as any) === "REVIEW");
                    return (
                      <article
                        key={agent.id}
                        onClick={() => setSelectedAgentForDetail(agent)}
                        className={`${card} cursor-pointer p-3.5 transition-colors hover:border-[var(--line-2)]`}
                        style={{ borderColor: selectedAgentId === agent.id ? agent.accent : undefined }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `${agent.accent}2e` }}>{agent.icon}</div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-base font-semibold leading-tight">{agent.name}</h3>
                            <p className="truncate text-xs text-[var(--mute)]">{agent.role}</p>
                          </div>
                          <Chip tone={agentStatusTone(agent.status)} className="shrink-0">{getStatusLabel(agent.status)}</Chip>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--mute)]">
                              <span>დონე {agent.level}</span>
                              <span className="mono">{agent.xp} / {agent.xpToNext}</span>
                            </div>
                            <Bar value={(agent.xp / agent.xpToNext) * 100} color={agent.accent} thin />
                          </div>
                          <div className="mono flex shrink-0 items-center gap-2 text-xs text-[var(--mute)]">
                            <span title="დასრულებული მისიები">✓ {agent.missionsCompleted}</span>
                            <span title="ავტონომია" className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[var(--moon)]">L{agent.autonomyLevel}</span>
                          </div>
                        </div>

                        {(activeTask || agent.currentTask) && (
                          <div className="mt-2.5 rounded-lg px-2.5 py-1.5" style={{ background: activeTask ? `${agent.accent}14` : "rgba(255,255,255,.04)" }}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-medium">{activeTask ? activeTask.title : agent.currentTask}</span>
                              {activeTask && <span className="mono shrink-0 text-xs">{activeTask.progress}%</span>}
                            </div>
                            {activeTask && <div className="mt-1.5"><Bar value={activeTask.progress} color={agent.accent} thin /></div>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ---------- INTELLIGENCE ---------- */}
          {activePanel === "intelligence" && (
            <div className="os-in">
              <PanelHeader
                title="შესაძლებლობები"
                subtitle="Foundation §4, §11, §24 — Nyx-ის აღმოჩენილი შესაძლებლობები"
                actions={
                  <>
                    <button
                      onClick={copyNyxResults}
                      disabled={opportunities.length === 0 && nyxLogs.length === 0}
                      className={isCopying ? `${btnBase} t-ok` : btnGhost}
                    >
                      {isCopying ? "დაკოპირდა" : "კოპირება"}
                    </button>
                    <button onClick={runNyxAnalysis} className={btnPrimary}>Nyx-ის გაშვება</button>
                  </>
                }
              />

              {nyxLogs.length > 0 && (
                <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[#080a16]">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff7aa8]/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f6c177]/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#5fd6a4]/60" />
                    <span className="mono ml-2 text-xs text-[var(--mute)]">nyx-agent-execution.log</span>
                  </div>
                  <div className="mono max-h-64 space-y-1 overflow-y-auto p-4 text-xs">
                    {nyxLogs.map((log, index) => (
                      <div key={index} className="text-[#5fd6a4]">
                        <span className="text-[var(--mute)]">[{formatTime(Date.now() - (nyxLogs.length - index) * 500)}]</span> {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatBox label="აღმოჩენილი" value={opportunities.filter(o => o.status === "discovered").length} color="#3b82f6" />
                <StatBox label="ვალიდირებული" value={opportunities.filter(o => o.status === "validated").length} color="#a855f7" />
                <StatBox label="დამტკიცებული" value={opportunities.filter(o => o.status === "approved").length} color="#10b981" />
                <StatBox label="უარყოფილი" value={opportunities.filter(o => o.status === "rejected").length} color="#ef4444" />
              </div>

              <div className="space-y-4">
                {opportunities.length === 0 && nyxLogs.length === 0 ? (
                  <EmptyState title="შესაძლებლობები ჯერ არ არის" text={'დააჭირე „Nyx-ის გაშვებას“ ტრენდების ანალიზის დასაწყებად.'} />
                ) : opportunities.length === 0 ? (
                  <EmptyState title="ანალიზი მიმდინარეობს…" text="შეამოწმე ლოგების ფანჯარა ზემოთ." />
                ) : (
                  opportunities.map(opp => (
                    <article key={opp.opportunity_id} className={`${card} p-5`}>
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1.5 text-lg font-semibold">{opp.topic}</h3>
                          <p className="line-clamp-2 max-w-3xl text-sm text-[var(--mute)]">{opp.core_insight}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Chip tone={priorityTone(opp.priority)}>{priorityLabel(opp.priority)}</Chip>
                          <Chip tone={oppStatusTone(opp.status)}>{oppStatusLabel(opp.status)}</Chip>
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/[0.04] p-3">
                          <p className="text-xs text-[var(--mute)]">სანდოობა</p>
                          <p className={`mono text-xl ${opp.confidence >= 0.8 ? "text-[#5fd6a4]" : opp.confidence >= 0.7 ? "text-[#f6c177]" : "text-[#ff7aa8]"}`}>{Math.round(opp.confidence * 100)}%</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] p-3">
                          <p className="text-xs text-[var(--mute)]">სიჩქარე</p>
                          <p className="mono text-xl text-[#b3a8ff]">{Math.round(opp.velocity)}</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] p-3">
                          <p className="text-xs text-[var(--mute)]">ბრენდის შესაბამისობა</p>
                          <p className={`mono text-xl ${opp.brand_fit >= 0.9 ? "text-[#5fd6a4]" : opp.brand_fit >= 0.8 ? "text-[#f6c177]" : "text-[#ff7aa8]"}`}>{Math.round(opp.brand_fit * 100)}%</p>
                        </div>
                      </div>

                      {opp.status === "discovered" && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button onClick={() => { opportunityRegistry.validateOpportunity(opp.opportunity_id); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `✅ Orion-მა დაადასტურა: ${opp.topic}`); }} className={`${btnPrimary} flex-1`}>Orion-ისთვის გადაცემა</button>
                          <button onClick={() => { opportunityRegistry.rejectOpportunity(opp.opportunity_id, "human_executive"); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `❌ ადამიანმა უარყო: ${opp.topic}`); }} className={`${btnBase} t-bad flex-1`}>უარყოფა</button>
                        </div>
                      )}
                      {opp.status === "validated" && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button onClick={() => { opportunityRegistry.approveOpportunity(opp.opportunity_id); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `🎯 Sage-მ დაამტკიცა: ${opp.topic}`); }} className={`${btnPrimary} flex-1`}>Sage-სთვის გადაცემა</button>
                          <button onClick={() => { opportunityRegistry.rejectOpportunity(opp.opportunity_id, "human_executive"); setOpportunities([...opportunityRegistry.getAllOpportunities()]); pushEvent("approval", `❌ ადამიანმა უარყო: ${opp.topic}`); }} className={`${btnBase} t-bad flex-1`}>უარყოფა</button>
                        </div>
                      )}
                      {opp.status === "approved" && (
                        <div className="t-ok rounded-xl px-4 py-2.5 text-center text-sm font-semibold">დამტკიცებულია — Muse ამუშავებს Content Family-ს</div>
                      )}
                      {opp.status === "rejected" && (
                        <div className="t-bad rounded-xl px-4 py-2.5 text-center text-sm font-semibold">უარყოფილია</div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ---------- CONTENT FAMILY ---------- */}
          {activePanel === "content-family" && (
            <div className="os-in">
              <PanelHeader title="Content Family" subtitle="Foundation §10, §24 — Muse-ის მიერ შექმნილი ნატიური ვარიანტები" />
              <div className="space-y-5">
                {contentFamilies.length === 0 ? (
                  <EmptyState title="Content Family ჯერ არ არის" text={'დაამტკიცე Opportunity „შესაძლებლობები“ პანელზე, რომ Muse-მ შექმნას Content Family.'} />
                ) : (
                  contentFamilies.map(family => {
                    const familyReviews = qualityReviews.filter(r => r.family_id === family.family_id);
                    return (
                      <article key={family.family_id} className={`${card} p-5 lg:p-6`}>
                        <div className="mb-5">
                          <h3 className="mono mb-1.5 text-sm text-[var(--mute)]">{family.family_id}</h3>
                          <p className="max-w-3xl text-base">{family.core_insight}</p>
                          <p className="mt-2 text-xs text-[var(--mute)]">შექმნილია: {formatTime(family.created_at)} · ავტორი: {family.created_by}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {family.variants.map(variant => {
                            const review = familyReviews.find(r => r.channel_id === variant.channel_id);
                            const meta = channelMeta(variant.channel_id);
                            return (
                              <div key={variant.channel_id} className={`rounded-xl border p-4 ${review ? `${verdictTone(review.verdict)}` : "border-[var(--line)] bg-white/[0.03]"}`} style={{ color: "inherit" }}>
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{meta.icon}</span>
                                    <span className="text-sm font-semibold">{variant.channel_id.replace('_', ' ')}</span>
                                  </div>
                                  {review && <Chip tone={verdictTone(review.verdict)}><span className="mono">{review.scores.total}/100</span></Chip>}
                                </div>
                                <h4 className="mb-2 font-semibold text-[var(--moon)]">{variant.title}</h4>
                                <p className="mb-2 line-clamp-2 text-sm italic text-[var(--mute)]">&quot;{variant.hook}&quot;</p>
                                <p className="mb-3 line-clamp-3 text-sm text-[#ece9f7]/80">{variant.description}</p>
                                <p className="mb-1 text-xs text-[var(--mute)]">ფორმატი: {variant.format}</p>
                                <p className="text-xs font-semibold text-[#5fd6a4]">CTA: {variant.cta}</p>
                                {review && (
                                  <div className="mt-3 border-t border-[var(--line)] pt-3">
                                    <p className="mb-1 text-xs font-semibold text-[var(--mute)]">Aegis QA</p>
                                    <p className="line-clamp-2 text-xs text-[#ece9f7]/80">{review.feedback}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ---------- QUALITY ---------- */}
          {activePanel === "quality" && (
            <div className="os-in">
              <PanelHeader title="ხარისხის გადახედვა" subtitle="Foundation §47, §86 — Aegis-ის 11-განზომილებიანი QA შეფასება" />
              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatBox label="დამტკიცებული" value={qualityReviews.filter(r => r.verdict === "approved").length} color="#10b981" />
                <StatBox label="საჭიროებს შესწორებას" value={qualityReviews.filter(r => r.verdict === "revise").length} color="#f59e0b" />
                <StatBox label="უარყოფილი" value={qualityReviews.filter(r => r.verdict === "rejected").length} color="#ef4444" />
              </div>
              <div className="space-y-4">
                {qualityReviews.length === 0 ? (
                  <EmptyState title="QA შეფასებები ჯერ არ არის" text="დაამტკიცე Opportunity, რომ Aegis-მ შეაფასოს Content Family." />
                ) : (
                  qualityReviews.map(review => {
                    const meta = channelMeta(review.channel_id);
                    return (
                      <article key={review.review_id} className={`${card} p-5`}>
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-1 truncate text-lg font-semibold">{meta.icon} {meta.label}</h3>
                            <p className="mono truncate text-xs text-[var(--mute)]">{review.family_id}</p>
                          </div>
                          <div className={`${verdictTone(review.verdict)} shrink-0 rounded-xl px-4 py-2 text-center`}>
                            <div className="mono text-2xl leading-none">{review.scores.total}</div>
                            <div className="text-xs opacity-80">/100</div>
                          </div>
                        </div>
                        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                          {Object.entries(review.scores).filter(([key]) => key !== 'total').map(([key, value]) => (
                            <div key={key} className="rounded-lg bg-white/[0.04] p-2 text-center">
                              <div className="truncate text-[11px] text-[var(--mute)]">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                              <div className={`mono text-lg ${scoreColor(value as number)}`}>{value as number}</div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl bg-white/[0.04] p-3">
                          <p className="mb-1 text-xs font-semibold text-[var(--mute)]">Aegis-ის შენიშვნა</p>
                          <p className="line-clamp-3 text-sm text-[#ece9f7]/90">{review.feedback}</p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ---------- DISTRIBUTION ---------- */}
          {activePanel === "distribution" && (
            <div className="os-in">
              <PanelHeader title="გავრცელება" subtitle="Foundation §48, §116 — Echo-ს მიერ დაგეგმილი და გამოქვეყნებული კონტენტი" />
              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatBox label="დაგეგმილი" value={distributionPlans.filter(p => p.status === "scheduled").length} color="#3b82f6" />
                <StatBox label="გამოქვეყნებული" value={distributionPlans.filter(p => p.status === "published").length} color="#10b981" />
                <StatBox label="შეცდომა" value={distributionPlans.filter(p => p.status === "failed").length} color="#ef4444" />
              </div>
              <div className="space-y-4">
                {distributionPlans.length === 0 ? (
                  <EmptyState title="გამოქვეყნებები ჯერ არ არის" text="დაამტკიცე Opportunity, რომ Echo-მ დაგეგმოს გამოქვეყნება." />
                ) : (
                  distributionPlans.map(plan => {
                    const meta = channelMeta(plan.channel_id);
                    return (
                      <article key={plan.plan_id} className={`${card} p-5`}>
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-1 truncate text-lg font-semibold">{meta.icon} {meta.label}</h3>
                            <p className="mono truncate text-xs text-[var(--mute)]">{plan.family_id}</p>
                          </div>
                          <Chip tone={plan.status === "published" ? "t-ok" : plan.status === "scheduled" ? "t-info" : "t-bad"}>
                            {plan.status === "published" ? "გამოქვეყნებული" : plan.status === "scheduled" ? "დაგეგმილი" : "შეცდომა"}
                          </Chip>
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white/[0.04] p-3">
                            <p className="text-xs text-[var(--mute)]">პლატფორმა</p>
                            <p className="truncate font-semibold">{plan.platform}</p>
                          </div>
                          <div className="rounded-xl bg-white/[0.04] p-3">
                            <p className="text-xs text-[var(--mute)]">დაგეგმილი დრო</p>
                            <p className="mono truncate">{formatTime(plan.scheduled_time)}</p>
                          </div>
                        </div>
                        {plan.status === "published" && plan.post_id && (
                          <div className="t-ok rounded-xl p-3">
                            <p className="mb-0.5 text-xs font-semibold">Post ID</p>
                            <p className="mono truncate text-sm">{plan.post_id}</p>
                          </div>
                        )}
                        {plan.status === "scheduled" && (
                          <button
                            onClick={() => {
                              echoAgent.publishPost(plan.plan_id);
                              setDistributionPlans([...echoAgent.getAllPlans()]);
                              pushEvent("system", `📡 Echo-მ მყისიერად გამოაქვეყნა: ${plan.channel_id}`);
                            }}
                            className={`${btnPrimary} w-full`}
                          >
                            მყისიერი გამოქვეყნება
                          </button>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ---------- PLACEHOLDER PANELS ---------- */}
          {activePanel === "pipeline" && pipelineDef && (
            <div className="os-in">
              <PanelHeader title="აქტიური პაიპლაინი" />
              <EmptyState title="Pipeline პანელი" text="პაიპლაინის ვიზუალიზაცია მალე დაემატება." />
            </div>
          )}
          {activePanel === "learning" && (
            <div className="os-in">
              <PanelHeader title="სწავლა" />
              <EmptyState title="Learning პანელი" text="სწავლის ციკლის მონაცემები მალე დაემატება." />
            </div>
          )}
          {activePanel === "knowledge" && (
            <div className="os-in">
              <PanelHeader title="ცოდნა" />
              <EmptyState title="Knowledge პანელი" text="ცოდნის ბაზა მალე დაემატება." />
            </div>
          )}

          {/* ✅ წაშლილია: {activePanel === "credentials" && (<CredentialsPanel />)} */}

          {activePanel === "e2e-test" && (
            <E2ETestPanel />
          )}

          {/* ---------- EMERGENCY ---------- */}
          {activePanel === "emergency" && (
            <div className="os-in">
              <PanelHeader title="საგანგებო კონტროლი" subtitle="Foundation §104 — გლობალური საგანგებო კონტროლი ადამიანი აღმასრულებლის გადაფარვისთვის" />
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                <EmergencyButton label="ყველა აგენტის შეჩერება" description="მყისიერად შეაჩერე ყველა მომუშავე აგენტი" icon="⏸️" active={emergencyState.allAgentsPaused} onActivate={pauseAllAgents} onDeactivate={resumeAllAgents} color="red" />
                <EmergencyButton label="გამოქვეყნების შეჩერება" description="შეაჩერე ყველა გამოქვეყნების ოპერაცია" icon="📡" active={emergencyState.publishingPaused} onActivate={pausePublishing} onDeactivate={resumePublishing} color="orange" />
                <EmergencyButton label="ძვირადღირებული ამოცანების შეჩერება" description="შეაჩერე ყველა მაღალი პრიორიტეტის რესურსზე მომთხოვნი ამოცანა" icon="🛑" active={emergencyState.expensiveTasksStopped} onActivate={stopExpensiveTasks} onDeactivate={() => setEmergencyState(prev => ({ ...prev, expensiveTasksStopped: false }))} color="yellow" />
                <EmergencyButton label="დროებითი წვდომის გაუქმება" description="გააუქმე ყველა აქტიური წვდომის ლიზინგი" icon="🔐" active={emergencyState.accessRevoked} onActivate={revokeAccess} onDeactivate={() => setEmergencyState(prev => ({ ...prev, accessRevoked: false }))} color="purple" />
              </div>
              <div className="t-bad rounded-2xl p-5">
                <h3 className="mb-4 text-lg font-semibold">საგანგებო მდგომარეობა</h3>
                <div className="space-y-2">
                  <EmergencyStatusItem label="ყველა აგენტი შეჩერებულია" active={emergencyState.allAgentsPaused} />
                  <EmergencyStatusItem label="გამოქვეყნება შეჩერებულია" active={emergencyState.publishingPaused} />
                  <EmergencyStatusItem label="ძვირადღირებული ამოცანები შეჩერებულია" active={emergencyState.expensiveTasksStopped} />
                  <EmergencyStatusItem label="წვდომა გაუქმებულია" active={emergencyState.accessRevoked} />
                </div>
              </div>
            </div>
          )}

          {/* ---------- APPROVALS ---------- */}
          {activePanel === "approvals" && (
            <div className="os-in">
              <PanelHeader title="დამტკიცებები" />
              <EmptyState title="ყველაფერი დამუშავებულია" text="ამჟამად დამტკიცების მოლოდინში არაფერია." />
            </div>
          )}

        </section>

        {/* ================= RIGHT RAIL ================= */}
        <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-[340px] shrink-0 overflow-y-auto border-l border-[var(--line)] p-5 xl:block">
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">მოვლენების ნაკადი</h2>
              <span className="flex items-center gap-2 text-xs font-medium text-[#5fd6a4]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#5fd6a4]" /> პირდაპირი
              </span>
            </div>
            <ol className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {events.map((event) => (
                <li key={event.id} className="rounded-xl border border-[var(--line)] bg-[var(--ink-2)] p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="t-mute rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize">{event.type}</span>
                    <span className="mono text-[11px] text-[var(--mute)]">{event.timestamp}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#ece9f7]/90">{event.message}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold">რესურსები</h2>
            <div className="space-y-2.5">
              {resources.map(resource => {
                const ratio = resource.usage / resource.quota;
                return (
                  <div key={resource.id} className={`${card} p-3.5`}>
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{resource.name}</div>
                        <div className="truncate text-xs text-[var(--mute)]">{resource.type}</div>
                      </div>
                      <Chip tone={resource.status === "healthy" ? "t-ok" : resource.status === "degraded" ? "t-warn" : "t-bad"} className="shrink-0">
                        {resource.status === "healthy" ? "ჯანმრთელი" : resource.status === "degraded" ? "გაუარესებული" : "მიუწვდომელი"}
                      </Chip>
                    </div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--mute)]">
                      <span>გამოყენება</span>
                      <span className="mono">{resource.usage} / {resource.quota}</span>
                    </div>
                    <Bar value={ratio * 100} color={ratio > 0.9 ? "#ff7aa8" : ratio > 0.7 ? "#f6c177" : "#5fd6a4"} thin />
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <AnalyticsModal 
        isOpen={isAnalyticsModalOpen} 
        onClose={() => setIsAnalyticsModalOpen(false)} 
      />

      {/* ================= DOCUMENTATION MODAL ================= */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setIsDocModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="LUNARA Telegram Channel documentation"
            className="os-in relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4 lg:p-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold lg:text-xl">LUNARA Telegram Channel — Full Documentation</h2>
                <p className="hidden text-sm text-[var(--mute)] sm:block">Edit and manage the channel&apos;s strategic document</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(documentationContent);
                    pushEvent("system", "📋 Documentation copied to clipboard");
                  }}
                  className={btnGhost}
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([documentationContent], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'LUNARA_Telegram_Channel.md';
                    a.click();
                    pushEvent("system", "📥 Documentation downloaded");
                  }}
                  className={`${btnGhost} hidden sm:inline-flex`}
                >
                  Download .md
                </button>
                <button onClick={saveDocumentation} className={btnPrimary}>Save</button>
                <button onClick={() => setIsDocModalOpen(false)} aria-label="Close" className="rounded-xl p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 lg:p-5">
              {isDocLoading ? (
                <div className="flex h-full items-center justify-center py-20">
                  <div className="animate-pulse text-sm font-medium text-[var(--violet)]">Loading documentation from file…</div>
                </div>
              ) : (
                <textarea
                  className="mono h-full min-h-[400px] w-full resize-none rounded-xl border border-[var(--line-2)] bg-[#080a16] p-4 text-sm leading-relaxed text-[#ece9f7]/90 outline-none transition-colors placeholder:text-[#9d9bbd]/60 focus:border-[var(--violet)] lg:min-h-[600px] lg:p-6"
                  value={documentationContent}
                  onChange={(e) => setDocumentationContent(e.target.value)}
                  placeholder="Documentation content will appear here..."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING AGENT CARD ================= */}
      {selectedAgent && (
        <div className="fixed bottom-4 right-4 z-[1000] max-h-[80vh] w-[320px] overflow-y-auto rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] shadow-2xl lg:bottom-6 lg:right-6 lg:w-[420px]">
          <div className="border-b border-[var(--line)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${selectedAgent.accent}30` }}>{selectedAgent.icon}</div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{selectedAgent.name}</h3>
                  <p className="truncate text-sm text-[var(--mute)]">{selectedAgent.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAgentId(null)} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">×</button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="mb-1 text-xs text-[var(--mute)]">სტატუსი</p>
              <p className="text-lg font-semibold" style={{ color: getStatusColor(selectedAgent.status) }}>{getStatusLabel(selectedAgent.status)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs text-[var(--mute)]">დონე</p>
                <p className="mono text-2xl">{selectedAgent.level}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs text-[var(--mute)]">ავტონომია</p>
                <p className="mono text-2xl">L{selectedAgent.autonomyLevel}</p>
              </div>
            </div>
            {selectedAgent.currentTask && (
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="mb-1 text-xs text-[var(--mute)]">მიმდინარე აქტივობა</p>
                <p className="text-sm font-medium">{selectedAgent.currentTask}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDepartmentForModal && (
        <DepartmentModal
          department={selectedDepartmentForModal}
          agents={agents}
          onClose={() => setSelectedDepartmentForModal(null)}
          onAgentClick={(agent) => {
            setSelectedDepartmentForModal(null);
            setSelectedAgentForDetail(agent);
          }}
        />
      )}

      {selectedAgentForDetail && (
        <AgentDetailModal
          agent={selectedAgentForDetail}
          onClose={() => setSelectedAgentForDetail(null)}
        />
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03) !important; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.14) !important; border-radius: 4px !important; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25) !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px !important; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02) !important; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1) !important; border-radius: 3px !important; }
      `}</style>
    </main>
  );
}