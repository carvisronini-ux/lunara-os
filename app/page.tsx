"use client";

import { useEffect, useRef, useState } from "react";

/* =========================================================
   LUNARA OS — Virtual Office
   სრული არქიტექტურის ვიზუალიზაცია
   ========================================================= */

type AgentStatus = "offline" | "idle" | "starting" | "working" | "waiting" | "waiting_for_resource" | "waiting_for_review" | "error" | "paused" | "suspended" | "completed";

type TaskStatus = "created" | "queued" | "claimed" | "running" | "waiting" | "review" | "completed" | "failed" | "retrying" | "escalated";

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

type EventLog = {
  id: string;
  timestamp: string;
  type: "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning";
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

/* =========================================================
   DEPARTMENTS
   ========================================================= */

const departments: Department[] = [
  { id: "executive", name: "Executive Core", icon: "👑", color: "#8b5cf6", description: "Strategy & Coordination" },
  { id: "intelligence", name: "Intelligence", icon: "🔍", color: "#3b82f6", description: "Trend & Market Research" },
  { id: "strategy", name: "Strategy", icon: "🎯", color: "#a855f7", description: "Planning & Decisions" },
  { id: "content", name: "Content", icon: "️", color: "#f59e0b", description: "Scripts & Copy" },
  { id: "creative", name: "Creative", icon: "🎨", color: "#ec4899", description: "Visual Direction" },
  { id: "production", name: "Production", icon: "🎬", color: "#ef4444", description: "Asset Generation" },
  { id: "resources", name: "Resources", icon: "🔐", color: "#10b981", description: "Credentials & Access" },
  { id: "quality", name: "Quality Control", icon: "🛡️", color: "#06b6d4", description: "QA & Governance" },
  { id: "distribution", name: "Distribution", icon: "📡", color: "#84cc16", description: "Publishing" },
  { id: "analytics", name: "Analytics", icon: "📊", color: "#f97316", description: "Performance Data" },
  { id: "learning", name: "Learning", icon: "", color: "#14b8a6", description: "Evolution & Training" },
];

/* =========================================================
   INITIAL AGENTS
   ========================================================= */

const initialAgents: Agent[] = [
  { id: "astra", name: "Astra", role: "Executive Coordinator", department: "executive", level: 7, xp: 742, xpToNext: 1000, status: "idle", taskId: null, accent: "#8b5cf6", icon: "", missionsCompleted: 24, autonomyLevel: 4, currentTask: "Monitoring system priorities" },
  { id: "nyx", name: "Nyx", role: "Trend Intelligence", department: "intelligence", level: 5, xp: 516, xpToNext: 1000, status: "working", taskId: "task-001", accent: "#3b82f6", icon: "", missionsCompleted: 18, autonomyLevel: 3, currentTask: "Analyzing TikTok trends" },
  { id: "orion", name: "Orion", role: "Competitor Intelligence", department: "intelligence", level: 4, xp: 384, xpToNext: 1000, status: "idle", taskId: null, accent: "#6366f1", icon: "👁️", missionsCompleted: 12, autonomyLevel: 3, currentTask: "Awaiting assignment" },
  { id: "sage", name: "Sage", role: "Chief Strategist", department: "strategy", level: 6, xp: 628, xpToNext: 1000, status: "waiting_for_review", taskId: "task-002", accent: "#a855f7", icon: "🎯", missionsCompleted: 20, autonomyLevel: 3, currentTask: "Strategy proposal pending approval" },
  { id: "muse", name: "Muse", role: "Head of Content", department: "content", level: 5, xp: 492, xpToNext: 1000, status: "working", taskId: "task-003", accent: "#f59e0b", icon: "✍️", missionsCompleted: 15, autonomyLevel: 3, currentTask: "Writing 3 script variants" },
  { id: "vega", name: "Vega", role: "Creative Director", department: "creative", level: 6, xp: 584, xpToNext: 1000, status: "waiting", taskId: "task-004", accent: "#ec4899", icon: "🎨", missionsCompleted: 18, autonomyLevel: 3, currentTask: "Waiting for script approval" },
  { id: "atlas", name: "Atlas", role: "Resource Director", department: "resources", level: 7, xp: 712, xpToNext: 1000, status: "working", taskId: "task-005", accent: "#10b981", icon: "", missionsCompleted: 22, autonomyLevel: 2, currentTask: "Verifying API credentials" },
  { id: "cipher", name: "Cipher", role: "Credential Manager", department: "resources", level: 5, xp: 468, xpToNext: 1000, status: "idle", taskId: null, accent: "#059669", icon: "", missionsCompleted: 14, autonomyLevel: 2, currentTask: "Monitoring access leases" },
  { id: "aegis", name: "Aegis", role: "Quality Director", department: "quality", level: 6, xp: 596, xpToNext: 1000, status: "working", taskId: "task-006", accent: "#06b6d4", icon: "️", missionsCompleted: 19, autonomyLevel: 3, currentTask: "Reviewing 2 content items" },
  { id: "echo", name: "Echo", role: "Distribution Manager", department: "distribution", level: 5, xp: 524, xpToNext: 1000, status: "completed", taskId: "task-007", accent: "#84cc16", icon: "📡", missionsCompleted: 16, autonomyLevel: 2, currentTask: "Published to Telegram" },
  { id: "nova", name: "Nova", role: "Performance Analyst", department: "analytics", level: 4, xp: 412, xpToNext: 1000, status: "idle", taskId: null, accent: "#f97316", icon: "", missionsCompleted: 11, autonomyLevel: 3, currentTask: "Awaiting new data" },
  { id: "iris", name: "Iris", role: "Learning Director", department: "learning", level: 5, xp: 548, xpToNext: 1000, status: "working", taskId: "task-008", accent: "#14b8a6", icon: "", missionsCompleted: 17, autonomyLevel: 3, currentTask: "Analyzing performance patterns" },
];

/* =========================================================
   INITIAL TASKS
   ========================================================= */

const initialTasks: Task[] = [
  { id: "task-001", title: "Analyze TikTok trend signals", agentId: "nyx", status: "running", progress: 65, priority: "high", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "task-002", title: "Develop Q4 content strategy", agentId: "sage", status: "review", progress: 90, priority: "critical", createdAt: Date.now() - 1000 * 60 * 60 },
  { id: "task-003", title: "Write 3 hook variants for Love Signal", agentId: "muse", status: "running", progress: 45, priority: "high", createdAt: Date.now() - 1000 * 60 * 20 },
  { id: "task-004", title: "Create visual concept for new series", agentId: "vega", status: "waiting", progress: 20, priority: "normal", createdAt: Date.now() - 1000 * 60 * 15 },
  { id: "task-005", title: "Verify OpenAI API health", agentId: "atlas", status: "running", progress: 80, priority: "high", createdAt: Date.now() - 1000 * 60 * 10 },
  { id: "task-006", title: "QA review: 2 pending posts", agentId: "aegis", status: "running", progress: 55, priority: "high", createdAt: Date.now() - 1000 * 60 * 25 },
  { id: "task-007", title: "Publish to Telegram channel", agentId: "echo", status: "completed", progress: 100, priority: "normal", createdAt: Date.now() - 1000 * 60 * 45 },
  { id: "task-008", title: "Extract patterns from last week", agentId: "iris", status: "running", progress: 70, priority: "normal", createdAt: Date.now() - 1000 * 60 * 35 },
];

/* =========================================================
   INITIAL RESOURCES
   ========================================================= */

const initialResources: Resource[] = [
  { id: "res-1", name: "OpenAI GPT-4", type: "AI Provider", status: "healthy", usage: 742, quota: 1000 },
  { id: "res-2", name: "Anthropic Claude", type: "AI Provider", status: "healthy", usage: 328, quota: 1000 },
  { id: "res-3", name: "Telegram Bot API", type: "Platform", status: "healthy", usage: 156, quota: 500 },
  { id: "res-4", name: "Cloudflare R2", type: "Storage", status: "degraded", usage: 892, quota: 1000 },
  { id: "res-5", name: "Supabase OS", type: "Database", status: "healthy", usage: 234, quota: 5000 },
  { id: "res-6", name: "TikTok API", type: "Platform", status: "unavailable", usage: 0, quota: 100 },
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
    case "waiting_for_resource": return "🔐 WAITING RESOURCE";
    case "waiting_for_review": return "🔍 WAITING REVIEW";
    case "completed": return "✅ COMPLETED";
    case "error": return "❌ ERROR";
    case "paused": return "⏸️ PAUSED";
    case "suspended": return "🚫 SUSPENDED";
    case "starting": return "🚀 STARTING";
    case "offline": return " OFFLINE";
    default: return status.toUpperCase();
  }
}

function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case "running": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    case "completed": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    case "failed": return "bg-red-500/20 text-red-400 border-red-500/40";
    case "review": return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    case "waiting": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "text-red-400";
    case "high": return "text-orange-400";
    case "normal": return "text-blue-400";
    default: return "text-slate-400";
  }
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [resources] = useState<Resource[]>(initialResources);
  const [events, setEvents] = useState<EventLog[]>([
    { id: "e1", timestamp: formatTime(), type: "system", message: "🟢 Lunara OS initialized — all systems operational" },
    { id: "e2", timestamp: formatTime(), type: "agent", message: "👤 Nyx started analyzing TikTok trends" },
    { id: "e3", timestamp: formatTime(), type: "task", message: "📋 Task #002 moved to review stage" },
    { id: "e4", timestamp: formatTime(), type: "resource", message: "⚠️ Cloudflare R2 usage at 89%" },
    { id: "e5", timestamp: formatTime(), type: "quality", message: "️ Aegis reviewing 2 content items" },
    { id: "e6", timestamp: formatTime(), type: "success", message: "✅ Echo published to Telegram successfully" },
    { id: "e7", timestamp: formatTime(), type: "learning", message: "🧬 Iris discovered new pattern in retention data" },
  ]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>("astra");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "degraded" | "partial_outage">("healthy");

  const timersRef = useRef<number[]>([]);

  /* =====================================================
     CLOCK & SIMULATION
     ===================================================== */

  useEffect(() => {
    setClock(formatTime());
    const clockTimer = window.setInterval(() => setClock(formatTime()), 1000);

    // Simulation: periodic status updates
    const simTimer = window.setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.status === "working" && Math.random() > 0.7) {
          const task = tasks.find(t => t.id === agent.taskId);
          if (task) {
            setTasks(prevTasks => prevTasks.map(t =>
              t.id === task.id ? { ...t, progress: Math.min(100, t.progress + Math.floor(Math.random() * 15)) } : t
            ));
          }
        }
        return agent;
      }));
    }, 3000);

    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(simTimer);
      timersRef.current.forEach(t => window.clearTimeout(t));
    };
  }, [tasks]);

  /* =====================================================
     DERIVED DATA
     ===================================================== */

  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;
  const selectedDept = departments.find(d => d.id === selectedDepartment);
  
  const activeAgents = agents.filter(a => a.status === "working" || a.status === "starting").length;
  const waitingAgents = agents.filter(a => a.status === "waiting" || a.status === "waiting_for_resource" || a.status === "waiting_for_review").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const runningTasks = tasks.filter(t => t.status === "running").length;
  const totalXP = agents.reduce((sum, a) => sum + a.xp, 0);

  const filteredAgents = selectedDepartment
    ? agents.filter(a => a.department === selectedDepartment)
    : agents;

  const departmentAgents = (deptId: string) => agents.filter(a => a.department === deptId);

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* TOP NAVIGATION */}
      <nav className="relative z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-black shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  boxShadow: "0 0 40px rgba(139,92,246,0.5)",
                }}
              >
                ◈
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">LUNARA OS</h1>
                <p className="text-sm font-medium text-slate-400 tracking-wide">VIRTUAL OFFICE — Autonomous Digital Organization</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <StatBadge label="Agents" value={agents.length} icon="👥" color="blue" />
              <StatBadge label="Active" value={activeAgents} icon="⚡" color="yellow" />
              <StatBadge label="Tasks" value={runningTasks} icon="" color="purple" />
              <StatBadge label="Done" value={completedTasks} icon="✅" color="emerald" />
              <StatBadge label="XP" value={totalXP} icon="⭐" color="pink" />

              <div className="ml-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 animate-pulse rounded-full ${
                    systemStatus === "healthy" ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" :
                    systemStatus === "degraded" ? "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]" :
                    "bg-red-400 shadow-[0_0_15px_rgba(248,113,113,0.8)]"
                  }`} />
                  <span className={`text-base font-bold tracking-wide ${
                    systemStatus === "healthy" ? "text-emerald-400" :
                    systemStatus === "degraded" ? "text-yellow-400" :
                    "text-red-400"
                  }`}>
                    {systemStatus === "healthy" ? "ONLINE" : systemStatus === "degraded" ? "DEGRADED" : "OUTAGE"}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="font-mono text-xl font-bold">{clock || "--:--:--"}</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div className="relative z-10 flex">
        {/* LEFT SIDEBAR — Departments */}
        <aside className="w-80 border-r border-white/10 bg-slate-900/50 backdrop-blur-xl min-h-[calc(100vh-88px)]">
          <div className="p-6">
            <h2 className="text-2xl font-black mb-6 tracking-wide">📂 DEPARTMENTS</h2>
            
            <div className="space-y-2">
              <button
                onClick={() => setSelectedDepartment(null)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  !selectedDepartment ? "border-white/30 bg-white/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold"> All Departments</span>
                  <span className="text-sm text-slate-400">{agents.length}</span>
                </div>
              </button>

              {departments.map(dept => {
                const deptAgents = departmentAgents(dept.id);
                const activeCount = deptAgents.filter(a => a.status === "working").length;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selectedDepartment === dept.id ? "border-white/30 bg-white/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                    }`}
                    style={{
                      borderColor: selectedDepartment === dept.id ? dept.color : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                        style={{ background: `${dept.color}30` }}
                      >
                        {dept.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-bold">{dept.name}</div>
                        <div className="text-xs text-slate-400">{dept.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{deptAgents.length}</div>
                        {activeCount > 0 && (
                          <div className="text-xs text-emerald-400">{activeCount} active</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* System Health */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-black mb-4">💚 SYSTEM HEALTH</h3>
              <div className="space-y-3">
                {[
                  { name: "Agent Bus", value: 100, color: "bg-emerald-500" },
                  { name: "Task Engine", value: 100, color: "bg-emerald-500" },
                  { name: "Event Bus", value: 98, color: "bg-blue-500" },
                  { name: "Quality Gate", value: 100, color: "bg-emerald-500" },
                  { name: "Learning Loop", value: 95, color: "bg-purple-500" },
                ].map(item => (
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

        {/* CENTER — Virtual Office Map + Agents */}
        <section className="flex-1 p-6 overflow-y-auto min-h-[calc(100vh-88px)]">
          {/* Virtual Office Map */}
          <div className="mb-8">
            <h2 className="text-2xl font-black mb-6 tracking-wide">🏢 VIRTUAL OFFICE MAP</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {departments.map(dept => {
                const deptAgents = departmentAgents(dept.id);
                const workingCount = deptAgents.filter(a => a.status === "working").length;
                const waitingCount = deptAgents.filter(a => a.status.includes("waiting")).length;
                const idleCount = deptAgents.filter(a => a.status === "idle").length;
                
                return (
                  <div
                    key={dept.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-5 transition-all hover:border-white/30 hover:shadow-2xl cursor-pointer"
                    style={{
                      borderColor: selectedDepartment === dept.id ? dept.color : undefined,
                      boxShadow: selectedDepartment === dept.id ? `0 0 30px ${dept.color}40` : undefined,
                    }}
                    onClick={() => setSelectedDepartment(dept.id)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                        style={{ background: `${dept.color}30` }}
                      >
                        {dept.icon}
                      </div>
                      <div>
                        <div className="text-lg font-black">{dept.name}</div>
                        <div className="text-xs text-slate-400">{dept.description}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Working</span>
                        <span className="font-bold text-yellow-400">{workingCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Waiting</span>
                        <span className="font-bold text-blue-400">{waitingCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Idle</span>
                        <span className="font-bold text-slate-400">{idleCount}</span>
                      </div>
                    </div>

                    {/* Mini agent avatars */}
                    <div className="mt-4 flex -space-x-2">
                      {deptAgents.slice(0, 4).map(agent => (
                        <div
                          key={agent.id}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 text-sm"
                          style={{ background: `${agent.accent}40` }}
                          title={agent.name}
                        >
                          {agent.icon}
                        </div>
                      ))}
                      {deptAgents.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-xs font-bold">
                          +{deptAgents.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Agents Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-black mb-6 tracking-wide">
              👥 AGENTS
              <span className="text-lg font-medium text-slate-400 ml-3">
                ({filteredAgents.length} agents{selectedDepartment ? ` in ${selectedDept?.name}` : ""})
              </span>
            </h2>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredAgents.map(agent => {
                const agentTasks = tasks.filter(t => t.agentId === agent.id);
                const activeTask = agentTasks.find(t => t.status === "running" || t.status === "review");

                return (
                  <div
                    key={agent.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 transition-all hover:border-white/30 hover:shadow-2xl cursor-pointer"
                    style={{
                      borderColor: selectedAgentId === agent.id ? agent.accent : undefined,
                      boxShadow: selectedAgentId === agent.id ? `0 0 40px ${agent.accent}40` : undefined,
                    }}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-xl"
                          style={{
                            background: `${agent.accent}30`,
                            boxShadow: `0 0 30px ${agent.accent}40`,
                          }}
                        >
                          {agent.icon}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black">{agent.name}</h3>
                          <p className="text-base text-slate-400">{agent.role}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {departments.find(d => d.id === agent.department)?.name}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                          agent.status === "working" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" :
                          agent.status === "idle" ? "bg-slate-500/20 border-slate-500/40 text-slate-400" :
                          agent.status === "completed" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                          agent.status === "error" ? "bg-red-500/20 border-red-500/40 text-red-400" :
                          "bg-blue-500/20 border-blue-500/40 text-blue-400"
                        }`}
                      >
                        {getStatusLabel(agent.status)}
                      </div>
                    </div>

                    {/* Current Task */}
                    {agent.currentTask && (
                      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-bold text-slate-400 mb-1">CURRENT ACTIVITY</div>
                        <div className="text-base font-bold">{agent.currentTask}</div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <StatBox label="LEVEL" value={agent.level} color={agent.accent} />
                      <StatBox label="XP" value={agent.xp} color={agent.accent} />
                      <StatBox label="DONE" value={agent.missionsCompleted} color={agent.accent} />
                      <StatBox label="AUTO" value={`L${agent.autonomyLevel}`} color={agent.accent} />
                    </div>

                    {/* XP Bar */}
                    <div className="mb-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-400">EXPERIENCE</span>
                        <span className="text-sm font-mono font-bold">{agent.xp} / {agent.xpToNext}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(agent.xp / agent.xpToNext) * 100}%`,
                            background: `linear-gradient(90deg, ${agent.accent}, ${agent.accent}80)`,
                            boxShadow: `0 0 15px ${agent.accent}`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Active Task Progress */}
                    {activeTask && (
                      <div className="rounded-xl border p-3" style={{ borderColor: `${agent.accent}40`, background: `${agent.accent}10` }}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-bold">🎯 {activeTask.title}</span>
                          <span className="text-lg font-mono font-black">{activeTask.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${activeTask.progress}%`, background: agent.accent }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Queue */}
          <div>
            <h2 className="text-2xl font-black mb-6 tracking-wide">📋 TASK QUEUE</h2>
            <div className="space-y-3">
              {tasks.map(task => {
                const agent = agents.find(a => a.id === task.agentId);
                if (!agent) return null;

                return (
                  <div key={task.id} className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                          style={{ background: `${agent.accent}30` }}
                        >
                          {agent.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold">{task.title}</h3>
                            <span className={`rounded-lg border px-2 py-1 text-xs font-black ${getTaskStatusColor(task.status)}`}>
                              {task.status.toUpperCase()}
                            </span>
                            <span className={`text-xs font-bold ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400">
                            Agent: <span className="font-bold text-white">{agent.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono font-black">{task.progress}%</div>
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-700 mt-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${task.progress}%`, background: agent.accent }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR — Events + Resources */}
        <aside className="w-96 border-l border-white/10 bg-slate-900/50 backdrop-blur-xl min-h-[calc(100vh-88px)]">
          <div className="p-6">
            {/* Event Feed */}
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
                  <div
                    key={event.id}
                    className="rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10"
                    style={{ animation: index === 0 ? "slideIn 0.4s ease-out" : undefined }}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className="text-xs font-black tracking-wider"
                        style={{
                          color:
                            event.type === "success" ? "#34d399" :
                            event.type === "warning" ? "#fbbf24" :
                            event.type === "error" ? "#f87171" :
                            event.type === "agent" ? "#60a5fa" :
                            event.type === "task" ? "#c084fc" :
                            event.type === "resource" ? "#f97316" :
                            event.type === "quality" ? "#06b6d4" :
                            event.type === "learning" ? "#14b8a6" :
                            "#94a3b8",
                        }}
                      >
                        {event.type.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{event.timestamp}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{event.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
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
                      <div className={`rounded-lg px-3 py-1 text-xs font-black ${
                        resource.status === "healthy" ? "bg-emerald-500/20 text-emerald-400" :
                        resource.status === "degraded" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {resource.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-400">Usage</span>
                      <span className="font-mono font-bold">{resource.usage} / {resource.quota}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full ${
                          resource.usage / resource.quota > 0.9 ? "bg-red-500" :
                          resource.usage / resource.quota > 0.7 ? "bg-yellow-500" :
                          "bg-emerald-500"
                        }`}
                        style={{ width: `${(resource.usage / resource.quota) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Selected Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed bottom-6 right-6 z-[1000] w-[450px] rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: `${selectedAgent.accent}30` }}
                >
                  {selectedAgent.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-black">{selectedAgent.name}</h3>
                  <p className="text-sm text-slate-400">{selectedAgent.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl hover:bg-white/10"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold text-slate-400 mb-2">STATUS</div>
              <div className="text-xl font-black" style={{ color: getStatusColor(selectedAgent.status) }}>
                {getStatusLabel(selectedAgent.status)}
              </div>
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
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    yellow: "from-yellow-500 to-yellow-600",
    purple: "from-purple-500 to-purple-600",
    emerald: "from-emerald-500 to-emerald-600",
    pink: "from-pink-500 to-pink-600",
  };

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