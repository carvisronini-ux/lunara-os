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
  --ink:#070812; --ink-2:#0d1020; --ink-3:#15192d; --ink-4:#1b2038;
  --line:rgba(236,233,247,.075); --line-2:rgba(236,233,247,.14); --line-3:rgba(155,140,255,.22);
  --moon:#f4f1fb; --mute:#8f8da8; --mute-2:#68667e;
  --violet:#a99cff; --violet-2:#806cf6; --rose:#ff83ad; --amber:#f6c177; --ok:#65dfab;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:
    radial-gradient(900px 420px at 78% -8%, rgba(128,108,246,.12), transparent 62%),
    radial-gradient(700px 360px at 4% 26%, rgba(255,131,173,.055), transparent 64%),
    var(--ink);
  color:var(--moon);
}
.agents-root *{box-sizing:border-box}
.agents-root *:focus-visible{outline:2px solid var(--violet);outline-offset:3px;border-radius:10px}
.agents-root ::selection{background:rgba(169,156,255,.25);color:#fff}
.agents-root .custom-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(169,156,255,.28) transparent}
.agents-root .custom-scrollbar::-webkit-scrollbar{width:6px;height:6px}
.agents-root .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
.agents-root .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(169,156,255,.24);border-radius:999px}
.agents-root .glass{background:linear-gradient(180deg,rgba(20,24,44,.88),rgba(11,14,29,.88));box-shadow:0 18px 55px rgba(0,0,0,.18)}
.agents-root .soft-shadow{box-shadow:0 12px 35px rgba(0,0,0,.18)}
.agents-root .agent-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(19,23,43,.96),rgba(10,13,27,.96));box-shadow:0 18px 45px rgba(0,0,0,.16)}
.agents-root .agent-card:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(169,156,255,.34),transparent);opacity:.8}
.agents-root .stat-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(18,22,41,.94),rgba(10,13,27,.94));box-shadow:0 14px 35px rgba(0,0,0,.14)}
.agents-root .stat-card:after{content:"";position:absolute;width:120px;height:120px;right:-55px;top:-65px;border-radius:999px;background:rgba(169,156,255,.07);filter:blur(2px)}
.agents-root textarea{line-height:1.65}
@media(max-width:640px){.agents-root .mobile-tight{padding:16px!important}}
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
  brain: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
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

const ALL_ZODIAC_SIGNS = [
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isChecking, setIsChecking] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configAgentType, setConfigAgentType] = useState<string>('post');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [thinkingStyle, setThinkingStyle] = useState('');
  const [skills, setSkills] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  const panelRef = useRef<any>(null);

  // ✅ ფონური ტაიმერი: მუშაობს მხოლოდ მაშინ, თუ სტატუსი არის 'active'
  useEffect(() => {
    const interval = setInterval(() => {
      const postAgent = agents.find(a => a.id === 'post-agent');
      if (postAgent?.status === 'active') {
        // false ნიშნავს: მკაცრად შეამოწმე დღე და საათი განრიგის მიხედვით
        checkAndRunPostAgent(false);
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, [agents]);

  const addAgentLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAgentLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const loadAgentConfig = async (agentType: string) => {
    const { data, error } = await supabase
      .from('agent_config')
      .select('*')
      .eq('agent_type', agentType)
      .single();

    if (error) {
      console.error('Error loading config:', error);
      addAgentLog(`❌ კონფიგურაციის ჩატვირთვის შეცდომა: ${error.message}`);
      return;
    }

    if (data) {
      setMasterPrompt(data.master_prompt || '');
      setThinkingStyle(data.thinking_style || '');
      setSkills(data.skills_constraints || ''); 
      addAgentLog(`✅ ${agentType.toUpperCase()} კონფიგურაცია ჩაიტვირთა`);
    }
  };

  const openConfigModal = (agentType: string) => {
    setConfigAgentType(agentType);
    loadAgentConfig(agentType);
    setShowConfigModal(true);
  };

  const saveAgentConfig = async () => {
    setIsSavingConfig(true);
    addAgentLog(`💾 ${configAgentType.toUpperCase()} კონფიგურაციის შენახვა...`);
    
    const { error } = await supabase
      .from('agent_config')
      .upsert({
        agent_type: configAgentType,
        master_prompt: masterPrompt,
        thinking_style: thinkingStyle,
        skills_constraints: skills, 
        updated_at: new Date().toISOString()
      }, { onConflict: 'agent_type' });

    if (error) {
      addAgentLog(`❌ შეცდომა კონფიგურაციის შენახვისას: ${error.message}`);
      console.error('Save error:', error);
    } else {
      addAgentLog(`✅ ${configAgentType.toUpperCase()} კონფიგურაცია წარმატებით შეინახა!`);
      setShowConfigModal(false);
    }

    setIsSavingConfig(false);
  };

  const chooseSmartZodiac = (ruleZodiac: string | null): string => {
    if (ruleZodiac && ruleZodiac !== 'ALL' && ALL_ZODIAC_SIGNS.includes(ruleZodiac)) {
      return ruleZodiac;
    }
    const randomIndex = Math.floor(Math.random() * ALL_ZODIAC_SIGNS.length);
    return ALL_ZODIAC_SIGNS[randomIndex];
  };

  // ✅ განახლებული ლოგიკა: forceRun პარამეტრით
  const checkAndRunPostAgent = async (forceRun: boolean = false) => {
    if (isChecking) return;
    setIsChecking(true);
    addAgentLog("🔍 ვამოწმებ Master Schedule-ს...");

    try {
      const now = new Date();
      const jsDay = now.getDay();
      const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0=Monday, 6=Sunday
      const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:MM" ფორმატში

      // 1. ვიღებთ მხოლოდ დღევანდელი დღის post წესებს
      const { data: rules, error } = await supabase
        .from('content_schedule')
        .select('*')
        .eq('content_type', 'post')
        .eq('is_active', true)
        .eq('day_of_week', currentDayIndex) // მკაცრი შემოწმება: მხოლოდ დღევანდელი დღე
        .order('time', { ascending: true });

      if (error) {
        addAgentLog(`❌ შეცდომა ბაზის წაკითხვისას: ${error.message}`);
        setIsChecking(false);
        return;
      }

      if (!rules || rules.length === 0) {
        addAgentLog(`⚠️ დღეს (${currentDayIndex}-ე დღე) post ტიპის წესი არ არის.`);
        setIsChecking(false);
        return;
      }

      // 2. ვეძებთ პირველ წესს, რომლის დროც უკვე მოვიდა (ან ვაიძულებთ forceRun-ით)
      const matchingRule = rules.find((r: any) => forceRun || r.time <= currentTimeStr);

      if (!matchingRule) {
        addAgentLog(`⏳ დღეს არის ${rules.length} post წესი, მაგრამ დრო ჯერ არ მოსულა. უახლოესი: ${rules[0].time}`);
        setIsChecking(false);
        return;
      }

      addAgentLog(`📋 ნაპოვნია დროისთვის შესაფერისი წესი: ${matchingRule.time} - ${matchingRule.content_theme}`);
      addAgentLog(`🎯 მიზანი: ${matchingRule.goal} | ნიშანი: ${matchingRule.zodiac_sign || 'ALL/Random'}`);

      // 3. ვამოწმებთ, დღეს უკვე გამოქვეყნდა თუ არა ეს კონკრეტული პოსტი
      const today = now.toISOString().split('T')[0];
      const { data: published, error: pubError } = await supabase
        .from('published_content')
        .select('id')
        .eq('content_type', 'post')
        .eq('status', 'published') 
        .gte('published_at', `${today}T00:00:00`)
        .limit(1);

      if (pubError) {
        addAgentLog(`⚠️ შეცდომა შემოწმებისას: ${pubError.message}`);
        setIsChecking(false);
        return;
      }

      if (published && published.length > 0) {
        addAgentLog("✅ დღევანდელი პოსტი უკვე წარმატებით გამოქვეყნებულია. ვტოვებ.");
        setIsChecking(false);
        return;
      }

      // 4. ვრთავთ აგენტს
      const zodiacToPost = chooseSmartZodiac(matchingRule.zodiac_sign);
      addAgentLog(`🌟 არჩეული ზოდიაქო: ${zodiacToPost}`);
      addAgentLog(`🚀 ვრთავ PostAgent-ს...`);
      
      if (panelRef.current) {
        const success = await panelRef.current.executeAutoPostSequence(zodiacToPost);
        if (success) {
          addAgentLog("🎉 PostAgent-მა წარმატებით დაასრულა ციკლი!");
          setAgents(prev => prev.map(a => a.id === 'post-agent' ? { ...a, lastRun: 'Just now', totalPosts: a.totalPosts + 1 } : a));
        } else {
          addAgentLog("❌ PostAgent-ის ციკლი ვერ დასრულდა წარმატებით.");
        }
      } else {
        addAgentLog("⚠️ InstagramPanel კომპონენტი ვერ მოიძებნა.");
      }

    } catch (error) {
      addAgentLog(`❌ კრიტიკული შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`);
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

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/80 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,.16)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/instagram" className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-3.5 py-2 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]">
              {Icons.back}
              <span className="hidden sm:inline">Back to Instagram</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Agents Control Center</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block mt-0.5">Manage all automated posting agents</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl border border-[var(--line-2)] bg-white/[.035] px-4 py-2.5 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,.12)] text-[var(--moon)] transition-colors hover:bg-[var(--ink-3)]">
            {Icons.settings}
            <span className="hidden sm:inline">Global Settings</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Total Agents</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--moon)]">{agents.length}</p>
          </div>
          <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Active Agents</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--ok)]">{activeAgentsCount}</p>
          </div>
          <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Total Posts Published</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--moon)]">{totalPostsCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {agents.map((agent) => {
              const TypeIcon = TYPE_ICONS[agent.type];
              const colorClass = TYPE_COLORS[agent.type];
              return (
                <div key={agent.id} className="agent-card rounded-2xl border border-[var(--line)] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[0_22px_55px_rgba(0,0,0,.2)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border ${colorClass}`}>
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
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-300 ${
                          agent.status === 'active' ? 'bg-[var(--ok)]' : 'bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]'
                        }`}
                      >
                        <span className={`absolute top-1.5 h-4 w-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.35)] transition-all duration-300 ${agent.status === 'active' ? 'left-6' : 'left-1'}`} />
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
                  
                  {agent.id === 'post-agent' && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button 
                        onClick={() => openConfigModal('post')}
                        className="flex items-center gap-2 rounded-xl border border-[var(--violet)]/25 bg-[var(--violet)]/[.09] px-4 py-2.5 text-sm font-semibold shadow-[0_8px_25px_rgba(128,108,246,.08)] text-[var(--violet)] transition-colors hover:bg-[var(--violet)]/20 sm:flex-none"
                      >
                        {Icons.brain}
                        Configure PostAgent
                      </button>
                      <button 
                        // ✅ true ნიშნავს: აიძულე გაშვება ტესტირების მიზნით, დროის მიუხედავად
                        onClick={() => checkAndRunPostAgent(true)}
                        disabled={isChecking}
                        className="flex-1 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--violet-2)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(128,108,246,.22)] transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-none"
                      >
                        {isChecking ? 'Running...' : 'Run Now'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isChecking ? 'bg-[var(--amber)] animate-pulse' : 'bg-[var(--ok)]'}`} />
                PostAgent Live Logs
              </h4>
              <div className="h-96 overflow-y-auto rounded-xl border border-white/[.035] bg-black/20 p-3.5 font-mono text-xs space-y-1 custom-scrollbar">
                {agentLogs.length === 0 ? (
                  <p className="text-[var(--mute)]">ლოგები გამოჩნდება აქ, როცა აგენტი ამოქმედდება...</p>
                ) : (
                  agentLogs.map((log, i) => (
                    <div key={i} className="text-[var(--moon)] border-b border-[var(--line)] pb-2 mb-2 last:border-0">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
              <h4 className="text-sm font-semibold mb-3">Agent Engine (Hidden)</h4>
              <p className="text-xs text-[var(--mute)] mb-3">ეს კომპონენტი ასრულებს რეალურ სამუშაოს ფონზე.</p>
              <div className="opacity-30 pointer-events-none scale-75 origin-top-left">
                <InstagramPanel 
                  ref={panelRef} 
                  profileUsername="@lunaraosapp" 
                  pushEvent={(type, msg) => addAgentLog(`[${type}] ${msg}`)} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--violet)]/15 bg-gradient-to-r from-[var(--violet)]/[.07] via-transparent to-[var(--rose)]/[.04] p-5 text-center shadow-[0_14px_35px_rgba(0,0,0,.12)]">
          <p className="text-sm text-[var(--violet)]">
            💡 <span className="font-semibold">How it works:</span> PostAgent ყოველდღე ამოწმებს Master Schedule-ს, ირჩევს ზოდიაქოს ბაზიდან (ან random-ს თუ ALL/NULL), ქმნის კონტენტს და აქვეყნებს Instagram-ზე.
          </p>
        </div>
      </main>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={() => setShowConfigModal(false)}>
          <div className="w-full max-w-3xl rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)]/98 p-5 sm:p-7 shadow-[0_35px_100px_rgba(0,0,0,.55)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--violet)]/20 text-[var(--violet)]">
                  {Icons.brain}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Configure {configAgentType.toUpperCase()} Agent</h3>
                  <p className="text-xs text-[var(--mute)]">მართე აგენტის ქცევა და აზროვნება</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="rounded-full p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-5 max-h-[68vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--violet)]">
                  🧠 Master Prompt
                </label>
                <textarea
                  value={masterPrompt}
                  onChange={(e) => setMasterPrompt(e.target.value)}
                  placeholder="მთავარი ინსტრუქცია აგენტისთვის..."
                  className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute-2)] focus:border-[var(--violet)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--violet)]/5 min-h-[150px] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--mute)]">
                  ეს არის აგენტის მთავარი პიროვნება და მიზანი
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--amber)]">
                   Thinking Style
                </label>
                <textarea
                  value={thinkingStyle}
                  onChange={(e) => setThinkingStyle(e.target.value)}
                  placeholder="როგორ ფიქრობს აგენტი..."
                  className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute-2)] focus:border-[var(--violet)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--violet)]/5 min-h-[125px] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--mute)]">
                  აზროვნების სტილი და მიდგომა
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ok)]">
                   Skills & Constraints
                </label>
                <textarea
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="უნარები და შეზღუდვები..."
                  className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute-2)] focus:border-[var(--violet)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--violet)]/5 min-h-[125px] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--mute)]">
                  რა შეუძლია და რა არ შეუძლია აგენტს
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-[var(--line)] pt-4">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 rounded-xl border border-[var(--line-2)] bg-white/[.025] py-3 text-sm font-semibold transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={saveAgentConfig}
                disabled={isSavingConfig}
                className="flex-1 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--violet-2)] py-3 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(128,108,246,.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}