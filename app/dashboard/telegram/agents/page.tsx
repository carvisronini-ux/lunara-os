// /home/carvisronini-ux/lunara-os/app/dashboard/telegram/agents/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

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
  --blue:#60a5fa; --purple:#a78bfa; --pink:#f472b6;
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
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  brain: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

interface Agent {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  description: string; // ✅ ახალი ველი აღწერისთვის
  status: 'active' | 'inactive';
  nextRun: string;
  lastRun: string;
  totalPosts: number;
}

interface ScheduleItem {
  id: string;
  day_of_week: number;
  time: string;
  content_category: string;
  post_type: string;
  content_type: string;
  goal: string;
  zodiac_sign: string | null;
  content_theme: string | null;
  is_active: boolean;
  priority: number;
  payload: any;
}

const TELEGRAM_AGENTS: Agent[] = [
  { 
    id: 'tg-daily', 
    name: 'Daily Anchor Agent', 
    type: 'daily_anchor', 
    icon: '☀️', 
    color: 'text-[#f6c177] bg-[#f6c177]/10 border-[#f6c177]/20', 
    description: 'ქმნის დღის საერთო ენერგიის მიმოხილვას, 12 ნიშნის დღიურ ჰოროსკოპსა და დღის ტაროს ბარათს. მიზანია ყოველდღიური დაბრუნების ჩვევის ჩამოყალიბება.',
    status: 'inactive', 
    nextRun: 'Daily 09:00', 
    lastRun: 'Never', 
    totalPosts: 0 
  },
  { 
    id: 'tg-interactive', 
    name: 'Interactive Play Agent', 
    type: 'interactive_play', 
    icon: '🎯', 
    color: 'text-[#ff7aa8] bg-[#ff7aa8]/10 border-[#ff7aa8]/20', 
    description: 'ქმნის „აირჩიე ტაროს ბარათი“, ასტროლოგიურ ვიქტორინებს, გამოკითხვებს და სხვა თამაშებს. მიზანია მომხმარებელი აქტიურ მონაწილედ აქციოს და გაზარდოს ჩართულობა.',
    status: 'inactive', 
    nextRun: 'Tue/Thu 15:00', 
    lastRun: 'Never', 
    totalPosts: 0 
  },
  { 
    id: 'tg-educational', 
    name: 'Educational Agent', 
    type: 'educational_deep_dive', 
    icon: '📚', 
    color: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20', 
    description: 'ქმნის საგანმანათლებლო პოსტებს: ასტროლოგიის საფუძვლებს, ტაროს არკანების განმარტებებს, ნუმეროლოგიას და „მითი vs რეალობა“ რუბრიკებს ექსპერტული იმიჯის ჩამოსაყალიბებლად.',
    status: 'inactive', 
    nextRun: 'Wed 13:00', 
    lastRun: 'Never', 
    totalPosts: 0 
  },
  { 
    id: 'tg-cosmic', 
    name: 'Cosmic Calendar Agent', 
    type: 'cosmic_calendar', 
    icon: '🌙', 
    color: 'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20', 
    description: 'ქმნის კვირის/თვის ასტროლოგიურ მიმოხილვებს, მთვარის ფაზების კალენდარს, დაბნელებებისა და რეტროგრადული პერიოდების გზამკვლევებს აქტუალური ინფორმაციისთვის.',
    status: 'inactive', 
    nextRun: 'Sun 16:00', 
    lastRun: 'Never', 
    totalPosts: 0 
  },
  { 
    id: 'tg-inner', 
    name: 'Inner Universe Agent', 
    type: 'inner_universe', 
    icon: '💫', 
    color: 'text-[#f472b6] bg-[#f472b6]/10 border-[#f472b6]/20', 
    description: 'ქმნის პოსტებს სიყვარულის დინამიკაზე, პირად საზღვრებზე, ემოციურ გზავნილებსა და დღიურისთვის განკუთვნილ რეფლექსიის კითხვებზე ღრმა ემოციური კავშირისთვის.',
    status: 'inactive', 
    nextRun: 'Thu 15:00', 
    lastRun: 'Never', 
    totalPosts: 0 
  },
  { 
    id: 'tg-product', 
    name: 'Product Bridge Agent', 
    type: 'product_bridge', 
    icon: '🚀', 
    color: 'text-[#5fd6a4] bg-[#5fd6a4]/10 border-[#5fd6a4]/20', 
    description: 'ქმნის პოსტებს, რომლებიც ბუნებრივად უკავშირებს არხის კონტენტს Lunara-ს Mini App-ის ფუნქციებს (პერსონალური ჰოროსკოპი, ნატალური რუკა, უფასო რესურსები) კონვერსიისთვის.',
    status: 'inactive', 
    nextRun: 'Fri 12:00', 
    lastRun: 'Never', 
    totalPosts: 0 
  },
];

export default function TelegramAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(TELEGRAM_AGENTS);
  const [isChecking, setIsChecking] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configAgentType, setConfigAgentType] = useState<string>('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [thinkingStyle, setThinkingStyle] = useState('');
  const [skills, setSkills] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    try {
      const savedStatuses = localStorage.getItem('tg_agent_statuses');
      if (savedStatuses) {
        const parsed = JSON.parse(savedStatuses) as Record<string, 'active' | 'inactive'>;
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: parsed[agent.type] || agent.status
        })));
      }
    } catch (e) {
      console.error('Failed to load agent statuses', e);
    }
  }, []);

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

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading config:', error);
      addAgentLog(`❌ კონფიგურაციის ჩატვირთვის შეცდომა: ${error.message}`);
      return;
    }

    if (data) {
      setMasterPrompt(data.master_prompt || '');
      setThinkingStyle(data.thinking_style || '');
      setSkills(data.skills_constraints || ''); 
      addAgentLog(`✅ ${agentType} კონფიგურაცია ჩაიტვირთა`);
    } else {
      setMasterPrompt('');
      setThinkingStyle('');
      setSkills('');
      addAgentLog(`ℹ️ ${agentType}-ისთვის ახალი კონფიგურაცია იქმნება`);
    }
  };

  const openConfigModal = (agentType: string) => {
    setConfigAgentType(agentType);
    loadAgentConfig(agentType);
    setShowConfigModal(true);
  };

  const saveAgentConfig = async () => {
    setIsSavingConfig(true);
    addAgentLog(`💾 ${configAgentType} კონფიგურაციის შენახვა...`);
    
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
    } else {
      addAgentLog(`✅ ${configAgentType} კონფიგურაცია წარმატებით შეინახა!`);
      setShowConfigModal(false);
    }

    setIsSavingConfig(false);
  };

  const toggleAgent = (type: string) => {
    setAgents(prev => {
      const newAgents = prev.map(agent => 
        agent.type === type 
          ? { ...agent, status: (agent.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' } 
          : agent
      );
      
      const statusesToSave: Record<string, 'active' | 'inactive'> = {};
      newAgents.forEach(a => { statusesToSave[a.type] = a.status; });
      localStorage.setItem('tg_agent_statuses', JSON.stringify(statusesToSave));
      
      const newStatus = newAgents.find(a => a.type === type)?.status === 'active';
      supabase.from('telegram_schedule').update({ is_active: newStatus }).eq('content_category', type);
      
      addAgentLog(`🔄 ${type} აგენტი ${newStatus ? 'ჩაირთო' : 'გაითიშა'}. განრიგი განახლდა.`);
      return newAgents;
    });
  };

  const checkAndRunAgent = async (agentType: string) => {
    if (isChecking) return;
    setIsChecking(true);
    const agentName = agents.find(a => a.type === agentType)?.name || agentType;
    addAgentLog(`🔍 ${agentName} ამოწმებს განრიგს...`);

    try {
      const { data: rules, error } = await supabase
        .from('telegram_schedule')
        .select('*')
        .eq('content_category', agentType)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('time', { ascending: true });

      if (error || !rules || rules.length === 0) {
        addAgentLog(`⚠️ ${agentType}-ისთვის აქტიური წესი ვერ მოიძებნა.`);
        setIsChecking(false);
        return;
      }

      const now = new Date();
      const currentDayJs = now.getDay();
      const currentDayCustom = currentDayJs === 0 ? 6 : currentDayJs - 1;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeVal = currentHour * 60 + currentMinute;

      const nextRule = rules.find((rule: ScheduleItem) => {
        if (rule.day_of_week === currentDayCustom) {
          const [h, m] = rule.time.split(':').map(Number);
          const ruleTimeVal = h * 60 + m;
          return ruleTimeVal <= currentTimeVal;
        }
        return false;
      });

      if (!nextRule) {
        addAgentLog(`⏳ ${agentType}-ის დრო ჯერ არ მოსულა.`);
        setIsChecking(false);
        return;
      }

      addAgentLog(`🎯 წესი ნაპოვნია: ${nextRule.content_theme || nextRule.post_type}`);
      addAgentLog(`🧠 იტვირთება ${agentType} კონფიგურაცია...`);

      const { data: config } = await supabase
        .from('agent_config')
        .select('*')
        .eq('agent_type', agentType)
        .single();

      if (!config || !config.master_prompt) {
        addAgentLog(`❌ შეცდომა: ${agentType}-ს არ აქვს მითითებული Master Prompt. გთხოვთ, ჯერ დააკონფიგურიროთ.`);
        setIsChecking(false);
        return;
      }

      addAgentLog(`✅ კონფიგურაცია წარმატებით ჩაიტვირთა.`);
      addAgentLog(`🚀 AI იწყებს კონტენტის გენერაციას... (Demo Mode)`);
      
      addAgentLog(`🎉 ${agentName}-მა წარმატებით დაასრულა ციკლი!`);
      
      setAgents(prev => prev.map(a => a.type === agentType ? { ...a, lastRun: 'Just now', totalPosts: a.totalPosts + 1 } : a));

    } catch (error) {
      addAgentLog(`❌ კრიტიკული შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsChecking(false);
    }
  };

  const activeAgentsCount = agents.filter(a => a.status === 'active').length;
  const totalPostsCount = agents.reduce((sum, a) => sum + a.totalPosts, 0);

  return (
    <div className="agents-root min-h-screen">
      <style>{STYLES}</style>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/80 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,.16)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/telegram" className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-3.5 py-2 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]">
              {Icons.back}
              <span className="hidden sm:inline">Back to Telegram</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Telegram Agents Control Center</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block mt-0.5">მართე სპეციალიზებული AI აგენტები თითოეული კონტენტის კატეგორიისთვის</p>
            </div>
          </div>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card rounded-2xl border border-[var(--line)] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[0_22px_55px_rgba(0,0,0,.2)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border text-2xl ${agent.color}`}>
                    {agent.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-[var(--moon)]">{agent.name}</h3>
                    <p className="text-sm capitalize text-[var(--mute)] mb-1">{agent.type.replace(/_/g, ' ')}</p>
                    {/* ✅ ახალი აღწერილობის ბლოკი */}
                    <p className="text-xs text-[var(--mute)] leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <p className="text-xs text-[var(--mute)]">Status</p>
                    <p className={`text-sm font-semibold ${agent.status === 'active' ? 'text-[var(--ok)]' : 'text-[var(--mute)]'}`}>
                      {agent.status === 'active' ? '● Active' : '○ Inactive'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAgent(agent.type)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-300 ${
                      agent.status === 'active' ? 'bg-[var(--ok)]' : 'bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]'
                    }`}
                  >
                    <span className={`absolute top-1.5 h-4 w-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.35)] transition-all duration-300 ${agent.status === 'active' ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5">
                  <p className="text-xs text-[var(--mute)]">Next Run</p>
                  <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.nextRun}</p>
                </div>
                <div className="rounded-xl border border-white/[.035] bg-black/20 p-3.5">
                  <p className="text-xs text-[var(--mute)]">Total Published</p>
                  <p className="mt-1 text-sm font-medium text-[var(--moon)]">{agent.totalPosts}</p>
                </div>
              </div>
              
              <div className="mt-6 flex flex-wrap gap-2">
                <button 
                  onClick={() => openConfigModal(agent.type)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--violet)]/25 bg-[var(--violet)]/[.09] px-4 py-2.5 text-sm font-semibold shadow-[0_8px_25px_rgba(128,108,246,.08)] text-[var(--violet)] transition-colors hover:bg-[var(--violet)]/20 sm:flex-none"
                >
                  {Icons.brain}
                  Configure
                </button>
                <button 
                  onClick={() => checkAndRunAgent(agent.type)}
                  disabled={isChecking || agent.status === 'inactive'}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--violet-2)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(128,108,246,.22)] transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-none"
                >
                  {isChecking ? 'Running...' : 'Run Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="stat-card rounded-2xl border border-[var(--line)] p-5">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isChecking ? 'bg-[var(--amber)] animate-pulse' : 'bg-[var(--ok)]'}`} />
            Live Execution Logs
          </h4>
          <div className="h-64 overflow-y-auto rounded-xl border border-white/[.035] bg-black/20 p-3.5 font-mono text-xs space-y-1 custom-scrollbar">
            {agentLogs.length === 0 ? (
              <p className="text-[var(--mute)]">ლოგები გამოჩნდება აქ, როცა რომელიმე აგენტი ამოქმედდება...</p>
            ) : (
              agentLogs.map((log, i) => (
                <div key={i} className="text-[var(--moon)] border-b border-[var(--line)] pb-2 mb-2 last:border-0">
                  {log}
                </div>
              ))
            )}
          </div>
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
                  <h3 className="text-lg font-semibold">Configure {configAgentType.replace(/_/g, ' ').toUpperCase()} Agent</h3>
                  <p className="text-xs text-[var(--mute)]">მართე ამ სპეციფიკური აგენტის ქცევა, აზროვნება და შეზღუდვები</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="rounded-full p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
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
                  placeholder="მაგალითად: შენ ხარ Lunara-ს Daily Anchor ექსპერტი. შენი მიზანია შექმნა მოკლე, შთამაგონებელი და პერსონალიზებული ჰოროსკოპი..."
                  className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--violet)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--violet)]/5 min-h-[150px] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--mute)]">
                  ეს არის აგენტის მთავარი პიროვნება, როლი და საბოლოო მიზანი.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--amber)]">
                   🧠 Thinking Style
                </label>
                <textarea
                  value={thinkingStyle}
                  onChange={(e) => setThinkingStyle(e.target.value)}
                  placeholder="მაგალითად: იფიქრე ნაბიჯ-ნაბიჯ. ჯერ განსაზღვრე დღის ენერგია, შემდეგ დაუკავშირე ის კონკრეტულ ზოდიაქოს ნიშანს. გამოიყენე ემპათიური, მაგრამ არა ზედმეტად დრამატული ტონი."
                  className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--violet)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--violet)]/5 min-h-[125px] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--mute)]">
                  როგორ უნდა მიუდგეს აგენტი ამოცანას (Chain of Thought, ტონალობა, სტილი).
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ok)]">
                   🛡️ Skills & Constraints
                </label>
                <textarea
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="მაგალითად: არასდროს გამოიყენო სიტყვები 'გარანტირებული', 'აუცილებლად'. ყოველთვის დაამატე 3-5 შესაბამისი ჰეშთეგი. ტექსტი არ უნდა აღემატებოდეს 150 სიტყვას."
                  className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--violet)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--violet)]/5 min-h-[125px] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--mute)]">
                  მკაცრი წესები, რისი გაკეთება შეუძლია და რისი კატეგორიულად არა.
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