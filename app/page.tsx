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
import { CredentialsPanel } from "@/components/credentials/CredentialsPanel";
import E2ETestPanel from "@/components/e2e/E2ETestPanel";
import DepartmentModal from "@/components/office/DepartmentModal";
import AgentDetailModal from "@/components/agents/AgentDetailModal";
import type { PipelineDefinition } from "@/core/orchestration/orchestrator";
import type { Opportunity } from "@/core/intelligence/opportunity";

// ✅ იმპორტი ახალი მოდულებიდან
import { 
  departments, initialAgents, initialTasks, initialResources, initialKnowledge, 
  type Department, type Agent, type Task, type EventLog, type Resource, type EmergencyState 
} from "@/lib/office-data";
import { formatTime, getStatusColor, getStatusLabel, mapEngineTypeToUI, generateMessageFromEvent } from "@/lib/dashboard-utils";
import { StatBadge, StatBox, EmergencyButton, EmergencyStatusItem, AnalyticsModal } from "@/components/dashboard/ui-components";

export default function HomePage() {
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

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>("astra");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedDepartmentForModal, setSelectedDepartmentForModal] = useState<Department | null>(null);
  const [selectedAgentForDetail, setSelectedAgentForDetail] = useState<Agent | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  
  const [systemStatus] = useState<"healthy" | "degraded" | "partial_outage">("healthy");
  const [simulationMode] = useState(true);
  
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
  
  // ✅ ახალი სტეიტები Instagram პანელისთვის
  const [isIgLoading, setIsIgLoading] = useState(false);
  const [igResult, setIgResult] = useState<any>(null);
  
  const [activePanel, setActivePanel] = useState<"overview" | "pipeline" | "approvals" | "quality" | "learning" | "emergency" | "knowledge" | "intelligence" | "content-family" | "distribution" | "credentials" | "e2e-test" | "telegram" | "instagram">("overview");
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
  
  const activeAgents = agents.filter(a => a.status === "WORKING" || a.status === "STARTING").length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const runningTasks = tasks.filter(t => (t.status as any) === "CLAIMED" || (t.status as any) === "RETRYING").length;
  const totalXP = agents.reduce((sum, a) => sum + a.xp, 0);

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

  // ✅ Instagram-ის პუბლიკაციის ფუნქცია
  const handleInstagramPublish = async () => {
    const topicInput = document.getElementById("ig-topic") as HTMLTextAreaElement;
    const topic = topicInput?.value || "ვერძის მთვარე, ენერგიის ახალი ტალღა და შინაგანი ცეცხლი";
    
    setIsIgLoading(true);
    setIgResult(null);
    pushEvent("system", `📸 Stella-მ დაიწყო Instagram პოსტის გენერაცია თემაზე: "${topic}"`);

    try {
      const response = await fetch(`/api/test-instagram?topic=${encodeURIComponent(topic)}`);
      const data = await response.json();
      setIgResult(data);
      if (data.success) {
        pushEvent("success", `✅ Stella-მ წარმატებით გამოაქვეყნა Instagram პოსტი (ID: ${data.postId})`);
      } else {
        pushEvent("error", `❌ Stella-ს Instagram პოსტის გამოქვეყნება ვერ მოხერხდა: ${data.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setIgResult({ success: false, error: errorMsg });
      pushEvent("error", `❌ კრიტიკული შეცდომა Instagram პუბლიკაციისას: ${errorMsg}`);
    } finally {
      setIsIgLoading(false);
    }
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
          <div className="flex flex-wrap items-center gap-2">
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
            <button onClick={() => setActivePanel("telegram")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "telegram" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              📱 Telegram
            </button>
            {/* ✅ ახალი Instagram ღილაკი */}
            <button onClick={() => setActivePanel("instagram")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "instagram" ? "bg-pink-500/20 text-pink-400 border border-pink-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              📸 Instagram
            </button>
            <button onClick={() => setActivePanel("pipeline")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "pipeline" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🔄 აქტიური პაიპლაინი</button>
            <button onClick={() => setActivePanel("learning")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "learning" ? "bg-teal-500/20 text-teal-400 border border-teal-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🧬 სწავლა</button>
            <button onClick={() => setActivePanel("knowledge")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "knowledge" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>📚 ცოდნა</button>
            <button onClick={() => setActivePanel("credentials")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "credentials" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🔐 API საცავი</button>
            <button onClick={() => setActivePanel("e2e-test")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "e2e-test" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🚀 E2E ტესტი</button>
            <button onClick={() => setActivePanel("emergency")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "emergency" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>🚨 საგანგებო</button>
            <button onClick={() => setActivePanel("approvals")} className={`rounded-xl px-5 py-2.5 text-base font-bold transition-all whitespace-nowrap ${activePanel === "approvals" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>✋ დამტკიცებები</button>
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
          
          {activePanel === "overview" && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-black mb-6 tracking-wide">🏢 ვირტუალური ოფისის რუკა</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {departments.map(dept => {
                    const deptAgents = departmentAgents(dept.id);
                    const workingCount = deptAgents.filter(a => a.status === "WORKING").length;
                    const waitingCount = deptAgents.filter(a => a.status.includes("WAITING")).length;
                    const idleCount = deptAgents.filter(a => a.status === "IDLE").length;
                    return (
                      <div key={dept.id} className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-5 transition-all hover:border-white/30 hover:shadow-2xl cursor-pointer" style={{ borderColor: selectedDepartment === dept.id ? dept.color : undefined, boxShadow: selectedDepartment === dept.id ? `0 0 30px ${dept.color}40` : undefined }} onClick={() => setSelectedDepartmentForModal(dept)}>
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
                    const activeTask = agentTasks.find(t => (t.status as any) === "CLAIMED" || (t.status as any) === "REVIEW");
                    return (
                      <div key={agent.id} className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 transition-all hover:border-white/30 hover:shadow-2xl cursor-pointer" style={{ borderColor: selectedAgentId === agent.id ? agent.accent : undefined, boxShadow: selectedAgentId === agent.id ? `0 0 40px ${agent.accent}40` : undefined }} onClick={() => setSelectedAgentForDetail(agent)}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-xl" style={{ background: `${agent.accent}30`, boxShadow: `0 0 30px ${agent.accent}40` }}>{agent.icon}</div>
                            <div>
                              <h3 className="text-2xl font-black">{agent.name}</h3>
                              <p className="text-base text-slate-400">{agent.role}</p>
                              <p className="text-xs text-slate-500 mt-1">{departments.find(d => d.id === agent.department)?.name}</p>
                            </div>
                          </div>
                          <div className={`rounded-xl border px-4 py-2 text-sm font-bold ${agent.status === "WORKING" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : agent.status === "IDLE" ? "bg-slate-500/20 border-slate-500/40 text-slate-400" : agent.status === "COMPLETED" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : agent.status === "ERROR" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-blue-500/20 border-blue-500/40 text-blue-400"}`}>
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
            </div>
          )}

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

          {/* ✅ ახალი Instagram მართვის პანელი */}
          {activePanel === "instagram" && (
            <div className="max-w-4xl mx-auto pb-12">
              <div className="mb-8">
                <h2 className="text-2xl font-black tracking-wide mb-2">📸 Instagram მართვის პანელი</h2>
                <p className="text-base text-slate-400">Foundation §4, §28 — Stella-ს მიერ AI ვიზუალის გენერაცია და ავტომატური პუბლიკაცია</p>
              </div>

              <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-6 mb-8">
                <h3 className="text-lg font-black text-white mb-4">✨ ახალი პოსტის შექმნა</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">შეიყვანე თემა ან იდეა (მაგ: "ვერძის მთვარე, ენერგიის ახალი ტალღა")</label>
                    <textarea 
                      id="ig-topic"
                      className="w-full h-32 bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-pink-500/50 resize-none"
                      placeholder="მაგალითად: სიღრმისეული კოსმოსური ენერგია და შინაგანი სიმშვიდე..."
                      defaultValue="ვერძის მთვარე, ენერგიის ახალი ტალღა და შინაგანი ცეცხლი"
                    />
                  </div>
                  <button 
                    onClick={handleInstagramPublish}
                    disabled={isIgLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-4 text-base font-black text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isIgLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        გენერაცია და ატვირთვა (შეიძლება 30-40 წმ დასჭირდეს)...
                      </>
                    ) : (
                      <>🚀 გენერირება და გამოქვეყნება</>
                    )}
                  </button>
                </div>
              </div>

              {igResult && (
                <div className={`rounded-2xl border p-6 backdrop-blur-xl ${igResult.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  <h3 className={`text-lg font-black mb-4 ${igResult.success ? "text-emerald-400" : "text-red-400"}`}>
                    {igResult.success ? "✅ წარმატებით გამოქვეყნდა!" : "❌ შეცდომა გამოქვეყნებისას"}
                  </h3>
                  {igResult.success ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <div className="text-xs font-bold text-slate-400 mb-2">AI-ის მიერ შექმნილი ვიზუალური პრომპტი:</div>
                          <p className="text-sm text-slate-300 italic">{igResult.aiGeneratedImagePrompt}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <div className="text-xs font-bold text-slate-400 mb-2">AI-ის მიერ შექმნილი კაფშენი:</div>
                          <p className="text-sm text-slate-300">{igResult.aiGeneratedCaption}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <div className="text-xs font-bold text-slate-400 mb-2">გამოქვეყნებული პოსტი:</div>
                        <a href={igResult.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-2">
                          🔗 ნახე Instagram-ზე (ID: {igResult.postId})
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <div className="text-sm text-red-300">{igResult.error}</div>
                      <div className="text-xs text-slate-500 mt-2">შეამოწმე ტერმინალის ლოგები დეტალური ინფორმაციისთვის.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activePanel === "telegram" && (
            <div className="max-w-4xl mx-auto pb-12 flex flex-col items-center justify-center min-h-[60vh]">
              <div 
                onClick={() => setIsDocModalOpen(true)}
                className="group relative w-full max-w-3xl h-72 md:h-96 rounded-3xl border border-sky-500/30 bg-gradient-to-br from-[#08070D] via-[#171127] to-[#0f0a1a] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-sky-400/60 hover:shadow-[0_0_80px_rgba(56,189,248,0.2)]"
              >
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <a 
                    href="https://t.me/lunaraOS" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 rounded-full bg-sky-500/20 border border-sky-500/40 px-4 py-2 text-sky-300 text-sm font-bold backdrop-blur-md hover:bg-sky-500/30 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.623 4.823-4.351c.192-.192-.054-.3-.297-.108l-5.965 3.759-2.568-.802c-.56-.176-.57-.56.117-.828l10.037-3.869c.466-.174.875.108.713.828z"/></svg>
                    Open Channel
                  </a>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsAnalyticsModalOpen(true); }}
                    className="flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-emerald-300 text-sm font-bold backdrop-blur-md hover:bg-emerald-500/30 transition-all"
                  >
                    📊 Analytics & Info
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsDocModalOpen(true); }}
                    className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-white text-sm font-bold backdrop-blur-md hover:bg-white/20 transition-all"
                  >
                    📄 Documentation
                  </button>
                </div>

                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-600/10 rounded-full blur-3xl group-hover:bg-sky-600/20 transition-all duration-700" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-4 py-1.5 text-sky-300 text-sm font-bold backdrop-blur-sm group-hover:bg-sky-500/20 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    CLICK TO VIEW DOCUMENTATION
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 mb-3 drop-shadow-2xl">
                    LUNARA
                  </h2>
                  <p className="text-lg md:text-xl text-slate-400 font-medium tracking-wide max-w-2xl mb-6">
                    Your daily cosmic signal. Discover the hidden geometry of the cosmos.
                  </p>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-6 py-3 text-white font-bold backdrop-blur-md group-hover:bg-sky-500/20 group-hover:border-sky-500/40 group-hover:text-sky-300 transition-all duration-300">
                    <span>📄 View Full Documentation</span>
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </div>
                </div>
              </div>
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
          
          {activePanel === "credentials" && (
            <CredentialsPanel />
          )}

          {activePanel === "e2e-test" && (
            <E2ETestPanel />
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

          {activePanel === "approvals" && (
            <div className="text-center p-12">
              <h2 className="text-2xl font-black mb-4">✋ დამტკიცებები</h2>
              <p className="text-slate-400">ამჟამად დამტკიცების მოლოდინში არაფერია.</p>
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
                {events.map((event) => (
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

      {/* ✅ Channel Analytics & Info Modal */}
      <AnalyticsModal 
        isOpen={isAnalyticsModalOpen} 
        onClose={() => setIsAnalyticsModalOpen(false)} 
      />

      {/* ✅ Full Documentation Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setIsDocModalOpen(false)}>
          <div className="relative w-full max-w-6xl max-h-[95vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  📄 LUNARA Telegram Channel — Full Documentation
                </h2>
                <p className="text-sm text-slate-400">Edit and manage the channel's strategic document</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(documentationContent);
                    pushEvent("system", "📋 Documentation copied to clipboard");
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-colors text-sm flex items-center gap-2"
                >
                  📋 Copy
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
                  className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 font-bold hover:bg-sky-500/30 transition-colors text-sm flex items-center gap-2"
                >
                  📥 Download .md
                </button>
                <button 
                  onClick={saveDocumentation}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/30 transition-colors text-sm flex items-center gap-2"
                >
                  💾 Save to File
                </button>
                <button onClick={() => setIsDocModalOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isDocLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sky-400 font-bold animate-pulse">Loading documentation from file...</div>
                </div>
              ) : (
                <textarea
                  className="w-full h-full min-h-[600px] bg-slate-950 border border-white/10 rounded-xl p-6 text-sm text-slate-300 font-mono focus:outline-none focus:border-sky-500/50 resize-none leading-relaxed"
                  value={documentationContent}
                  onChange={(e) => setDocumentationContent(e.target.value)}
                  placeholder="Documentation content will appear here..."
                />
              )}
            </div>
          </div>
        </div>
      )}

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
        .custom-scrollbar::-webkit-scrollbar { width: 6px !important; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02) !important; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1) !important; border-radius: 3px !important; }
      `}</style>
    </main>
  );
}