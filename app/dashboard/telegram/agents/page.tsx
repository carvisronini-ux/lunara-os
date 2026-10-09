// /home/carvisronini-ux/lunara-os/app/dashboard/telegram/agents/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import TelegramPanel, { TelegramPanelRef } from "@/components/telegram/TelegramPanel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.agents-root{
  --ink:#070812; --ink-2:#0d1020; --ink-3:#15192d; --ink-4:#1b2038;
  --line:rgba(236,233,247,.075); --line-2:rgba(236,233,247,.14);
  --moon:#f4f1fb; --mute:#8f8da8; --violet:#a99cff; --violet-2:#806cf6; --rose:#ff83ad; --amber:#f6c177; --ok:#65dfab;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background: radial-gradient(900px 420px at 78% -8%, rgba(128,108,246,.12), transparent 62%), var(--ink);
  color:var(--moon);
}
.agents-root *{box-sizing:border-box}
.agents-root *:focus-visible{outline:2px solid var(--violet);outline-offset:3px;border-radius:10px}
.agents-root .custom-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(169,156,255,.28) transparent}
.agents-root .custom-scrollbar::-webkit-scrollbar{width:6px;height:6px}
.agents-root .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
.agents-root .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(169,156,255,.24);border-radius:999px}
.agents-root .stat-card{background:linear-gradient(145deg,rgba(18,22,41,.94),rgba(10,13,27,.94));box-shadow:0 14px 35px rgba(0,0,0,.14)}
.agents-root .agent-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(19,23,43,.96),rgba(10,13,27,.96));box-shadow:0 18px 45px rgba(0,0,0,.16)}
`;

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  telegram: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

interface Agent {
  id: string;
  name: string;
  type: 'telegram';
  status: 'active' | 'inactive';
  nextRun: string;
  lastRun: string;
  totalPosts: number;
}

interface NextPostInfo {
  rule: any;
  nextDate: Date;
  timeRemaining: string;
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'telegram-agent', name: 'TelegramAgent', type: 'telegram', status: 'inactive', nextRun: 'Daily 09:00', lastRun: 'Never', totalPosts: 0 },
];

const DAY_NAMES = ["ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];

export default function TelegramAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isChecking, setIsChecking] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  
  const [lastPostTime, setLastPostTime] = useState<string>('არ არის');
  const [nextPostInfo, setNextPostInfo] = useState<NextPostInfo | null>(null);
  
  const panelRef = useRef<TelegramPanelRef>(null);

  const getNextOccurrence = (ruleDay: number, ruleTime: string, afterDate: Date): Date => {
    const [hours, minutes] = ruleTime.split(':').map(Number);
    const target = new Date(afterDate);
    target.setHours(hours, minutes, 0, 0);
    const currentDayJs = afterDate.getDay();
    const currentDayCustom = currentDayJs === 0 ? 6 : currentDayJs - 1;
    let daysToAdd = (ruleDay - currentDayCustom + 7) % 7;
    target.setDate(afterDate.getDate() + daysToAdd);
    if (target.getTime() <= afterDate.getTime()) target.setDate(target.getDate() + 7);
    return target;
  };

  const formatTimeRemaining = (diffMs: number): string => {
    if (diffMs <= 0) return 'ახლავე';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours >= 24) return `${Math.floor(diffHours / 24)} დღე ${diffHours % 24}სთ`;
    if (diffHours > 0) return `${diffHours}სთ ${diffMinutes}წთ`;
    return `${diffMinutes} წუთი`;
  };

  const fetchTimelineData = async () => {
    const { data: lastPostData } = await supabase.from('published_content').select('published_at').eq('content_type', 'telegram').eq('status', 'published').order('published_at', { ascending: false }).limit(1);
    if (lastPostData && lastPostData.length > 0) {
      setLastPostTime(new Date(lastPostData[0].published_at).toLocaleString('ka-GE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    } else {
      setLastPostTime('არ არის');
    }

    const { data: rules } = await supabase.from('content_schedule').select('*').eq('content_type', 'telegram').eq('is_active', true).order('day_of_week', { ascending: true }).order('time', { ascending: true });
    if (!rules || rules.length === 0) { setNextPostInfo(null); return; }

    const now = new Date();
    let nextRule: any = null;
    let closestTime = Infinity;
    
    for (const rule of rules) {
      const occurrence = getNextOccurrence(rule.day_of_week, rule.time, now);
      if (occurrence.getTime() > now.getTime()) {
        const timeDiff = occurrence.getTime() - now.getTime();
        if (timeDiff < closestTime) {
          closestTime = timeDiff;
          nextRule = { ...rule, nextDate: occurrence };
        }
      }
    }

    if (nextRule) {
      const diffMs = nextRule.nextDate.getTime() - now.getTime();
      setNextPostInfo({ rule: nextRule, nextDate: nextRule.nextDate, timeRemaining: formatTimeRemaining(diffMs) });
    } else {
      setNextPostInfo(null);
    }
  };

  useEffect(() => {
    fetchTimelineData();
    const liveInterval = setInterval(fetchTimelineData, 60000);
    const runInterval = setInterval(() => {
      setAgents(currentAgents => {
        const agent = currentAgents.find(a => a.id === 'telegram-agent');
        if (agent?.status === 'active') checkAndRunTelegramAgent(false);
        return currentAgents;
      });
    }, 60000);
    return () => { clearInterval(liveInterval); clearInterval(runInterval); };
  }, []);

  const addAgentLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAgentLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const checkAndRunTelegramAgent = async (forceRun: boolean = false) => {
    if (isChecking) return;
    setIsChecking(true);
    addAgentLog("🔍 ვამოწმებ Telegram Master Schedule-ს...");

    try {
      const { data: lastPostData } = await supabase.from('published_content').select('published_at').eq('content_type', 'telegram').eq('status', 'published').order('published_at', { ascending: false }).limit(1);
      const lastPostDate = lastPostData && lastPostData.length > 0 ? new Date(lastPostData[0].published_at) : null;

      const { data: rules, error } = await supabase.from('content_schedule').select('*').eq('content_type', 'telegram').eq('is_active', true).order('day_of_week', { ascending: true }).order('time', { ascending: true });
      if (error || !rules || rules.length === 0) {
        addAgentLog(`⚠️ telegram ტიპის წესი არ არის.`);
        setIsChecking(false);
        return;
      }

      const referenceDate = lastPostDate || new Date();
      let nextRule: any = null;
      let closestTime = Infinity;
      
      for (const rule of rules) {
        const occurrence = getNextOccurrence(rule.day_of_week, rule.time, referenceDate);
        if (occurrence.getTime() > referenceDate.getTime()) {
          const timeDiff = occurrence.getTime() - referenceDate.getTime();
          if (timeDiff < closestTime) {
            closestTime = timeDiff;
            nextRule = { ...rule, nextDate: occurrence };
          }
        }
      }

      if (!nextRule) {
        addAgentLog(`⚠️ შემდეგი წესი ვერ მოიძებნა.`);
        setIsChecking(false);
        return;
      }

      const now = new Date();
      const dayName = DAY_NAMES[nextRule.day_of_week];
      addAgentLog(`📋 შემდეგი წესი: ${dayName} ${nextRule.time} - ${nextRule.content_theme || 'AI will generate theme'}`);

      const isTimeReached = nextRule.nextDate.getTime() <= now.getTime();
      if (!isTimeReached && !forceRun) {
        const diffMinutes = Math.floor((nextRule.nextDate.getTime() - now.getTime()) / (1000 * 60));
        addAgentLog(`⏳ დრო ჯერ არ მოსულა. დარჩენილია: ${diffMinutes} წუთი`);
        setIsChecking(false);
        return;
      }

      const zodiacToPost = nextRule.zodiac_sign || 'ALL';
      addAgentLog(`🌟 არჩეული ზოდიაქო: ${zodiacToPost}`);
      addAgentLog(`🚀 ვრთავ TelegramAgent-ს...`);
      
      if (panelRef.current) {
        const success = await panelRef.current.executeAutoPostSequence(zodiacToPost);
        if (success) {
          addAgentLog("🎉 TelegramAgent-მა წარმატებით დაასრულა ციკლი!");
          setAgents(prev => prev.map(a => a.id === 'telegram-agent' ? { ...a, lastRun: 'Just now', totalPosts: a.totalPosts + 1 } : a));
          fetchTimelineData();
        } else {
          addAgentLog("❌ TelegramAgent-ის ციკლი ვერ დასრულდა წარმატებით.");
        }
      } else {
        addAgentLog("⚠️ TelegramPanel კომპონენტი ვერ მოიძებნა.");
      }
    } catch (error) {
      addAgentLog(`❌ კრიტიკული შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsChecking(false);
    }
  };

  const toggleAgent = (id: string) => {
    setAgents(prev => {
      const newAgents = prev.map(agent => {
        if (agent.id === id) {
          const newStatus: 'active' | 'inactive' = agent.status === 'active' ? 'inactive' : 'active';
          
          supabase.from('content_schedule').update({ is_active: newStatus === 'active' }).eq('content_type', 'telegram');
          addAgentLog(`🔄 TelegramAgent ${newStatus === 'active' ? 'ჩაირთო' : 'გაითიშა'}.`);
          
          return { ...agent, status: newStatus };
        }
        return agent;
      });
      return newAgents;
    });
  };

  return (
    <div className="agents-root min-h-screen">
      <style>{STYLES}</style>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-3.5 py-2 text-sm text-[var(--mute)] transition-colors hover:text-[var(--moon)]">
              {Icons.back} <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Telegram Control Center</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block mt-0.5">Manage automated Telegram channel posting</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="agent-card rounded-2xl border border-[var(--line)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--violet)]/20">
                      {Icons.telegram}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--moon)]">{agent.name}</h3>
                      <p className="text-sm capitalize text-[var(--mute)]">{agent.type} Agent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-[var(--mute)]">Status</p>
                      <p className={`text-sm font-semibold ${agent.status === 'active' ? 'text-[var(--ok)]' : 'text-[var(--mute)]'}`}>
                        {agent.status === 'active' ? '● Active' : '○ Inactive'}
                      </p>
                    </div>
                    <button onClick={() => toggleAgent(agent.id)} className={`relative h-7 w-12 shrink-0 rounded-full transition-all ${agent.status === 'active' ? 'bg-[var(--ok)]' : 'bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]'}`}>
                      <span className={`absolute top-1.5 h-4 w-4 rounded-full bg-white transition-all ${agent.status === 'active' ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5">
                    <p className="text-xs text-[var(--mute)]">Next Run</p>
                    <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.nextRun}</p>
                  </div>
                  <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5">
                    <p className="text-xs text-[var(--mute)]">Last Run</p>
                    <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.lastRun}</p>
                  </div>
                  <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5">
                    <p className="text-xs text-[var(--mute)]">Total Published</p>
                    <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.totalPosts}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button onClick={() => checkAndRunTelegramAgent(true)} disabled={isChecking} className="flex-1 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--violet-2)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-50">
                    {isChecking ? 'Running...' : 'Run Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mute)] mb-3">Telegram Timeline</h4>
              <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[var(--ok)]">{Icons.check}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)]">ბოლო პოსტი</span>
                </div>
                <p className="text-sm font-medium text-[var(--moon)]">{lastPostTime}</p>
              </div>
              {nextPostInfo ? (
                <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--amber)]">{Icons.clock}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)]">შემდეგი პოსტი</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--amber)]">{nextPostInfo.timeRemaining}</span>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--mute)] w-16">დრო:</span>
                      <span className="text-xs font-medium text-[var(--moon)]">{DAY_NAMES[nextPostInfo.rule.day_of_week]} {nextPostInfo.rule.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--mute)] w-16">ნიშანი:</span>
                      <span className="text-xs font-medium text-[var(--violet)]">{nextPostInfo.rule.zodiac_sign || 'Random'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-[var(--mute)] w-16 shrink-0">თემა:</span>
                      <span className="text-xs font-medium text-[var(--moon)] break-words">{nextPostInfo.rule.content_theme || 'AI will generate'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5">
                  <p className="text-sm font-medium text-[var(--mute)]">—</p>
                </div>
              )}
            </div>

            <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isChecking ? 'bg-[var(--amber)] animate-pulse' : 'bg-[var(--ok)]'}`} />
                Telegram Live Logs
              </h4>
              <div className="h-96 overflow-y-auto rounded-xl border border-white/[.035] bg-black/20 p-3.5 font-mono text-xs space-y-1 custom-scrollbar">
                {agentLogs.length === 0 ? (
                  <p className="text-[var(--mute)]">ლოგები გამოჩნდება აქ, როცა აგენტი ამოქმედდება...</p>
                ) : (
                  agentLogs.map((log, i) => (
                    <div key={i} className="text-[var(--moon)] border-b border-[var(--line)] pb-2 mb-2 last:border-0">{log}</div>
                  ))
                )}
              </div>
            </div>

            <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
              <h4 className="text-sm font-semibold mb-3">Agent Engine (Hidden)</h4>
              <p className="text-xs text-[var(--mute)] mb-3">ეს კომპონენტი ასრულებს რეალურ სამუშაოს ფონზე.</p>
              <div className="opacity-30 pointer-events-none scale-75 origin-top-left">
                <TelegramPanel ref={panelRef} pushEvent={addAgentLog} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}