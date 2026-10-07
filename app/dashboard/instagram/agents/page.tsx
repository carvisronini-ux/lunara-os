// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/agents/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import InstagramPanel from "@/components/instagram/InstagramPanel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.agents-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.1); --line-2:rgba(236,233,247,.18);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon);
}
.agents-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
`;

const Icons = {
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  post: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  ),
  story: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
    </svg>
  ),
  carousel: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>
    </svg>
  ),
  reel: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
    </svg>
  ),
};

interface Agent {
  id: string;
  name: string;
  type: 'post' | 'story' | 'carousel' | 'reel';
  status: 'active' | 'inactive';
  nextRun: string;
  lastRun: string;
  totalPosts: number;
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'post-agent', name: 'PostAgent', type: 'post', status: 'inactive', nextRun: 'Monday 19:00', lastRun: 'Never', totalPosts: 0 },
  { id: 'story-agent', name: 'StoryAgent', type: 'story', status: 'inactive', nextRun: 'Tuesday 10:00', lastRun: 'Never', totalPosts: 0 },
  { id: 'carousel-agent', name: 'CarouselAgent', type: 'carousel', status: 'inactive', nextRun: 'Wednesday 12:00', lastRun: 'Never', totalPosts: 0 },
  { id: 'reel-agent', name: 'ReelAgent', type: 'reel', status: 'inactive', nextRun: 'Tuesday 19:00', lastRun: 'Never', totalPosts: 0 },
];

const TYPE_ICONS: Record<string, any> = {
  post: Icons.post, story: Icons.story, carousel: Icons.carousel, reel: Icons.reel,
};

const TYPE_COLORS: Record<string, string> = {
  post: 'text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--violet)]/20',
  story: 'text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20',
  carousel: 'text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/20',
  reel: 'text-[var(--rose)] bg-[var(--rose)]/10 border-[var(--rose)]/20',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isChecking, setIsChecking] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  
  const panelRef = useRef<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const postAgent = agents.find(a => a.id === 'post-agent');
      if (postAgent?.status === 'active') {
        checkAndRunPostAgent();
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, [agents]);

  const addAgentLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAgentLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const checkAndRunPostAgent = async () => {
    if (isChecking) return;
    setIsChecking(true);
    addAgentLog("ვამოწმებ Master Schedule-ს...");

    try {
      const now = new Date();
      const jsDay = now.getDay();
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; 
      const currentTime = now.toTimeString().slice(0, 5); 

      const { data: rules, error } = await supabase
        .from('content_schedule')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('content_type', 'post')
        .eq('is_active', true);

      if (error) {
        addAgentLog(`შეცდომა ბაზის წაკითხვისას: ${error.message}`);
        setIsChecking(false);
        return;
      }

      // ✅ აქ დავამატეთ (r: any) TypeScript-ის შეცდომის აღმოსაფხვრელად
      const matchingRule = rules?.find((r: any) => r.time <= currentTime);

      if (!matchingRule) {
        addAgentLog("ამ წუთას დაგეგმილი პოსტი არ არის.");
        setIsChecking(false);
        return;
      }

      const today = now.toISOString().split('T')[0];
      const { data: published, error: pubError } = await supabase
        .from('published_content')
        .select('id')
        .eq('content_type', 'post')
        .gte('published_at', `${today}T00:00:00`)
        .limit(1);

      if (pubError) {
        addAgentLog(`შეცდომა გამოქვეყნებულის შემოწმებისას: ${pubError.message}`);
        setIsChecking(false);
        return;
      }

      if (published && published.length > 0) {
        addAgentLog("დღევანდელი პოსტი უკვე გამოქვეყნებულია. ვტოვებ.");
        setIsChecking(false);
        return;
      }

      addAgentLog(`🚀 დრო მოვიდა! ვრთავ PostAgent-ს წესისთვის: ${matchingRule.time}`);
      
      const zodiacToPost = "ARIES"; 
      addAgentLog(`ავირჩიე ზოდიაქო: ${zodiacToPost}`);
      
      if (panelRef.current) {
        const success = await panelRef.current.executeAutoPostSequence(zodiacToPost);
        if (success) {
          addAgentLog("✅ PostAgent-მა წარმატებით დაასრულა ციკლი!");
          setAgents(prev => prev.map(a => a.id === 'post-agent' ? { ...a, lastRun: 'Just now', totalPosts: a.totalPosts + 1 } : a));
        } else {
          addAgentLog("❌ PostAgent-ის ციკლი ვერ დასრულდა წარმატებით.");
        }
      }

    } catch (error) {
      addAgentLog(`❌ შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsChecking(false);
    }
  };

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, status: agent.status === 'active' ? 'inactive' : 'active' } : agent
    ));
  };

  const activeAgentsCount = agents.filter(a => a.status === 'active').length;
  const totalPostsCount = agents.reduce((sum, a) => sum + a.totalPosts, 0);

  return (
    <div className="agents-root min-h-screen">
      <style>{STYLES}</style>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/instagram" className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]">
              {Icons.back}
              <span className="hidden sm:inline">Back to Instagram</span>
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Agents Control Center</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block">Manage all automated posting agents</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--ink-2)] px-4 py-2 text-sm font-medium text-[var(--moon)] transition-colors hover:bg-[var(--ink-3)]">
            {Icons.settings}
            <span className="hidden sm:inline">Global Settings</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
            <p className="text-xs font-medium text-[var(--mute)]">Total Agents</p>
            <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{agents.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
            <p className="text-xs font-medium text-[var(--mute)]">Active Agents</p>
            <p className="mt-1 text-2xl font-bold text-[var(--ok)]">{activeAgentsCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
            <p className="text-xs font-medium text-[var(--mute)]">Total Posts Published</p>
            <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{totalPostsCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {agents.map((agent) => {
              const TypeIcon = TYPE_ICONS[agent.type];
              const colorClass = TYPE_COLORS[agent.type];
              return (
                <div key={agent.id} className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-6 transition-all hover:border-[var(--line-2)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                        {TypeIcon}
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
                      <button
                        onClick={() => toggleAgent(agent.id)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          agent.status === 'active' ? 'bg-[var(--ok)]' : 'bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]'
                        }`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${agent.status === 'active' ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-[var(--ink)] p-3">
                      <p className="text-xs text-[var(--mute)]">Next Run</p>
                      <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.nextRun}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--ink)] p-3">
                      <p className="text-xs text-[var(--mute)]">Last Run</p>
                      <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.lastRun}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--ink)] p-3">
                      <p className="text-xs text-[var(--mute)]">Total Published</p>
                      <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.totalPosts}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isChecking ? 'bg-[var(--amber)] animate-pulse' : 'bg-[var(--ok)]'}`} />
                PostAgent Live Logs
              </h4>
              <div className="h-64 overflow-y-auto rounded-xl bg-[var(--ink)] p-3 font-mono text-xs space-y-1 custom-scrollbar">
                {agentLogs.length === 0 ? (
                  <p className="text-[var(--mute)]">ლოგები გამოჩნდება აქ, როცა აგენტი ამოქმედდება...</p>
                ) : (
                  agentLogs.map((log, i) => (
                    <div key={i} className="text-[var(--moon)] border-b border-[var(--line)] pb-1 mb-1 last:border-0">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
              <h4 className="text-sm font-semibold mb-3">Agent Engine (Hidden)</h4>
              <p className="text-xs text-[var(--mute)] mb-3">ეს კომპონენტი ასრულებს რეალურ სამუშაოს ფონზე.</p>
              <div className="opacity-30 pointer-events-none scale-75 origin-top-left">
                <InstagramPanel 
                  ref={panelRef} 
                  profileUsername="@lunaraosapp" 
                  pushEvent={(type, msg) => addAgentLog(`[Panel] ${msg}`)} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--violet)]/20 bg-[var(--violet)]/5 p-4 text-center">
          <p className="text-sm text-[var(--violet)]">
            💡 <span className="font-semibold">How it works:</span> When enabled, agents automatically check the Master Schedule and publish content at the scheduled times. Keep your browser open for client-side execution.
          </p>
        </div>
      </main>
    </div>
  );
}