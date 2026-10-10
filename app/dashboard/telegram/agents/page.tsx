// /home/carvisronini-ux/lunara-os/app/dashboard/telegram/agents/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { runTelegramAgentAction } from "@/app/actions/telegram-actions"; // ✅ ახალი იმპორტი

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.agents-root{
  --ink:#090a12; --ink-2:#10121f; --ink-3:#191c2d; --ink-4:#222640;
  --line:rgba(226,226,255,.09); --line-2:rgba(226,226,255,.16);
  --moon:#f6f5ff; --mute:#a2a3bd; --violet:#c0b5ff; --violet-2:#8d79ff;
  --rose:#ff91bd; --amber:#ffd18a; --ok:#75e2b4; --blue:#80b7ff;
  font-family:"Manrope","Noto Sans Georgian",system-ui,sans-serif;
  min-height:100vh; color:var(--moon);
  background:
    radial-gradient(ellipse 800px 430px at 82% -10%,rgba(133,104,255,.17),transparent 68%),
    radial-gradient(ellipse 520px 360px at -12% 38%,rgba(90,117,255,.07),transparent 72%),
    #090a12;
  letter-spacing:-.012em;
}
.agents-root *{box-sizing:border-box}
.agents-root *:focus-visible{outline:2px solid var(--violet);outline-offset:3px;border-radius:10px}
.agents-root .custom-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(192,181,255,.32) transparent}
.agents-root .custom-scrollbar::-webkit-scrollbar{width:6px;height:6px}
.agents-root .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
.agents-root .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(192,181,255,.28);border-radius:999px}
.agents-root header{background:rgba(9,10,18,.78)!important;border-color:var(--line)!important;box-shadow:0 12px 40px rgba(0,0,0,.16)!important}
.agents-root header > div{min-height:78px}
.agents-root header h1{font-size:clamp(1.1rem,1.5vw,1.45rem);font-weight:800;letter-spacing:-.045em;color:#fff}
.agents-root header p{font-size:12px;line-height:1.6;color:#a6a5c0}
.agents-root header a{border-color:var(--line-2)!important;background:rgba(255,255,255,.035)!important;color:#c5c3d9!important;min-height:42px}
.agents-root header a:hover{background:rgba(255,255,255,.075)!important;border-color:rgba(192,181,255,.32)!important;color:white!important}
.agents-root main{max-width:1440px!important;padding-top:34px!important;padding-bottom:52px!important}
.agents-root .stat-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(24,27,47,.94),rgba(15,17,30,.97));border:1px solid var(--line)!important;border-radius:22px!important;box-shadow:0 12px 32px rgba(0,0,0,.13);transition:transform .2s ease,border-color .2s ease}
.agents-root .stat-card:hover{border-color:rgba(192,181,255,.2)!important;transform:translateY(-2px)}
.agents-root .stat-card p:first-child{font-size:11px!important;letter-spacing:.11em!important;font-weight:800!important;color:#a4a4c1!important}
.agents-root .stat-card p:nth-child(2){font-size:34px!important;line-height:1.1!important;margin-top:13px!important;font-weight:800!important;letter-spacing:-.06em!important}
.agents-root .stat-card p:nth-child(2)::after{content:"";display:block;width:34px;height:3px;margin-top:12px;border-radius:10px;background:linear-gradient(90deg,var(--violet),transparent);opacity:.8}
.agents-root .agent-card{position:relative;display:flex;flex-direction:column;min-width:0;overflow:hidden;background:linear-gradient(155deg,rgba(25,28,49,.97),rgba(14,16,29,.99) 74%);border:1px solid rgba(226,226,255,.105)!important;border-radius:24px!important;padding:23px!important;box-shadow:0 16px 42px rgba(0,0,0,.18);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
.agents-root .agent-card::before{content:"";position:absolute;top:0;left:24px;right:24px;height:1px;background:linear-gradient(90deg,transparent,rgba(192,181,255,.34),transparent);pointer-events:none}
.agents-root .agent-card:hover{transform:translateY(-4px)!important;border-color:rgba(192,181,255,.28)!important;box-shadow:0 24px 55px rgba(0,0,0,.28)!important}
.agents-root .agent-card > div:first-child{gap:15px!important;min-height:112px}
.agents-root .agent-card > div:first-child > div:first-child{gap:14px!important;min-width:0}
.agents-root .agent-card > div:first-child > div:first-child > div:first-child{width:54px!important;height:54px!important;min-width:54px;border-radius:17px!important;font-size:25px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.agents-root .agent-card h3{font-size:16px!important;line-height:1.35!important;font-weight:800!important;letter-spacing:-.035em!important;color:#fff!important;overflow-wrap:anywhere}
.agents-root .agent-card p.capitalize{font-size:10px!important;letter-spacing:.09em!important;text-transform:uppercase!important;font-weight:800!important;color:#a9a7c9!important;margin-top:5px!important;margin-bottom:9px!important}
.agents-root .agent-card p.text-xs{font-size:12px!important;line-height:1.75!important;color:#b0b0c8!important}
.agents-root .agent-card > div:first-child > div:last-child{gap:8px!important}
.agents-root .agent-card > div:first-child > div:last-child p:first-child{font-size:10px!important;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:#898aa8!important}
.agents-root .agent-card > div:first-child > div:last-child p:last-child{font-size:12px!important;font-weight:800!important;white-space:nowrap}
.agents-root .agent-card button[aria-label],.agents-root .agent-card button{cursor:pointer}
.agents-root .agent-card > div:nth-child(2){margin-top:20px!important;gap:10px!important}
.agents-root .agent-card > div:nth-child(2) > div{border:1px solid rgba(226,226,255,.075)!important;background:rgba(5,6,13,.25)!important;border-radius:15px!important;padding:13px 14px!important;min-width:0}
.agents-root .agent-card > div:nth-child(2) p:first-child{font-size:10px!important;font-weight:800!important;letter-spacing:.07em;text-transform:uppercase;color:#9292af!important}
.agents-root .agent-card > div:nth-child(2) p:last-child{font-size:13px!important;font-weight:700!important;margin-top:7px!important;overflow-wrap:anywhere}
.agents-root .agent-card > div:nth-child(3){margin-top:auto!important;padding-top:20px;gap:8px!important}
.agents-root .agent-card > div:nth-child(3) button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;border-radius:12px!important;padding:10px 13px!important;font-size:12px!important;font-weight:800!important;white-space:nowrap;transition:all .18s ease}
.agents-root .agent-card > div:nth-child(3) button:first-child{background:rgba(255,255,255,.045)!important;border-color:var(--line-2)!important;color:#e7e5f7!important}
.agents-root .agent-card > div:nth-child(3) button:first-child:hover{background:rgba(255,255,255,.09)!important}
.agents-root .agent-card > div:nth-child(3) button:nth-child(2){background:rgba(160,144,255,.1)!important;border-color:rgba(192,181,255,.25)!important;color:#d0c8ff!important}
.agents-root .agent-card > div:nth-child(3) button:nth-child(2):hover{background:rgba(160,144,255,.18)!important}
.agents-root .agent-card > div:nth-child(3) button:last-child{background:linear-gradient(135deg,#c4b8ff,#8d79ff)!important;color:#111020!important;box-shadow:0 8px 20px rgba(141,121,255,.18)!important}
.agents-root .agent-card > div:nth-child(3) button:last-child:hover{filter:brightness(1.08);transform:translateY(-1px)}
.agents-root .agent-card > div:nth-child(3) button:disabled{cursor:not-allowed;filter:grayscale(.2);transform:none}
.agents-root main > .stat-card{padding:22px!important}
.agents-root main > .stat-card h4{font-size:14px!important;font-weight:800!important;letter-spacing:-.02em}
.agents-root main > .stat-card .custom-scrollbar{background:rgba(5,6,13,.42)!important;border-color:rgba(226,226,255,.08)!important;border-radius:16px!important;padding:16px!important;font-size:12px!important;line-height:1.7}
.agents-root main > .stat-card .custom-scrollbar > div{border-color:rgba(226,226,255,.08)!important;padding-bottom:10px!important;margin-bottom:10px!important;color:#d4d2e8!important;overflow-wrap:anywhere}
.agents-root .fixed.inset-0{padding:20px!important}
.agents-root .fixed.inset-0 > div{border-radius:25px!important;border-color:rgba(226,226,255,.15)!important;background:rgba(16,18,31,.98)!important;box-shadow:0 35px 110px rgba(0,0,0,.62)!important}
.agents-root .fixed.inset-0 h3{font-size:18px!important;letter-spacing:-.035em;font-weight:800!important}
.agents-root .fixed.inset-0 label{font-size:11px!important;letter-spacing:.1em!important}
.agents-root .fixed.inset-0 textarea{background:rgba(5,6,13,.38)!important;border-color:rgba(226,226,255,.13)!important;border-radius:15px!important;color:#f6f5ff!important;font-size:13px!important;line-height:1.7!important}
.agents-root .fixed.inset-0 textarea:focus{border-color:rgba(192,181,255,.55)!important;box-shadow:0 0 0 4px rgba(160,144,255,.08)!important}
.agents-root .fixed.inset-0 textarea::placeholder{color:#777892!important}
.agents-root .fixed.inset-0 p{line-height:1.65}
.agents-root .fixed.inset-0 button{min-height:44px;border-radius:12px!important;font-size:12px!important;font-weight:800!important}
@media (min-width:1280px){.agents-root main > div:nth-child(2){grid-template-columns:repeat(3,minmax(0,1fr));gap:20px!important}}
@media (max-width:1023px){.agents-root main{padding-top:24px!important}.agents-root .agent-card{padding:20px!important}}
@media (max-width:640px){.agents-root main{padding-left:14px!important;padding-right:14px!important;padding-top:18px!important}.agents-root header > div{padding:13px 14px!important;min-height:68px}.agents-root header h1{font-size:15px!important}.agents-root header a{padding:9px 10px!important}.agents-root .agent-card{padding:17px!important;border-radius:19px!important}.agents-root .agent-card > div:first-child{flex-direction:column!important;align-items:stretch!important}.agents-root .agent-card > div:first-child > div:last-child{flex-direction:row!important;align-items:center!important;justify-content:space-between!important}.agents-root .agent-card > div:nth-child(2){grid-template-columns:repeat(2,minmax(0,1fr))!important}.agents-root .agent-card > div:nth-child(3){display:grid!important;grid-template-columns:1fr 1fr!important}.agents-root .agent-card > div:nth-child(3) button:last-child{grid-column:1 / -1}.agents-root .stat-card{padding:17px!important;border-radius:18px!important}.agents-root .stat-card p:nth-child(2){font-size:29px!important}.agents-root .fixed.inset-0{padding:10px!important}.agents-root .fixed.inset-0 > div{padding:18px!important;border-radius:20px!important}}
@media (prefers-reduced-motion:reduce){.agents-root *{transition:none!important;scroll-behavior:auto!important}}
`;

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  brain: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

interface Agent {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  description: string;
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
    description: 'ქმნის „აირჩიე ტაროს ბარათი", ასტროლოგიურ ვიქტორინებს, გამოკითხვებს და სხვა თამაშებს. მიზანია მომხმარებელი აქტიურ მონაწილედ აქციოს და გაზარდოს ჩართულობა.',
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
    description: 'ქმნის საგანმანათლებლო პოსტებს: ასტროლოგიის საფუძვლებს, ტაროს არკანების განმარტებებს, ნუმეროლოგიას და „მითი vs რეალობა" რუბრიკებს ექსპერტული იმიჯის ჩამოსაყალიბებლად.',
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
  const router = useRouter();
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
      addAgentLog(`🚀 AI იწყებს კონტენტის გენერაციას და პუბლიკაციას...`);

      // ✅ ვიყენებთ Server Action-ს, რათა უსაფრთხოდ მივმართოთ სერვერს და წავიკითხოთ .env ცვლადები
      const result = await runTelegramAgentAction({
        agentType: agentType,
        postType: nextRule.post_type,
        contentTheme: nextRule.content_theme || undefined,
        zodiacSign: nextRule.zodiac_sign || undefined,
      });

      if (!result.success) {
        addAgentLog(`❌ პუბლიკაცია ვერ მოხერხდა: ${result.error}`);
        setIsChecking(false);
        return;
      }

      addAgentLog(`✅ კონტენტი წარმატებით შეიქმნა!`);
      addAgentLog(`📝 Caption სიგრძე: ${result.caption?.length || 0} სიმბოლო`);
      addAgentLog(`📤 Telegram-ში გაიგზავნა! Message ID: ${result.messageId}`);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card rounded-2xl border border-[var(--line)] p-5 sm:p-6 transition-all duration-300">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border text-2xl ${agent.color}`}>
                    {agent.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-[var(--moon)]">{agent.name}</h3>
                    <p className="text-sm capitalize text-[var(--mute)] mb-1">{agent.type.replace(/_/g, ' ')}</p>
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
                  onClick={() => router.push(`/dashboard/telegram/agents/${agent.type.replace('_', '-')}`)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-4 py-2.5 text-sm font-semibold text-[var(--moon)] transition-colors hover:bg-white/5 sm:flex-none"
                >
                  {Icons.eye}
                  View Profile
                </button>
                <button
                  onClick={() => openConfigModal(agent.type)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--violet)]/25 bg-[var(--violet)]/[.09] px-4 py-2.5 text-sm font-semibold text-[var(--violet)] transition-colors hover:bg-[var(--violet)]/20 sm:flex-none"
                >
                  {Icons.brain}
                  Quick Config
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
                  placeholder="მაგალითად: შენ ხარ Lunara-ს Daily Anchor ექსპერტი..."
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
                  placeholder="მაგალითად: იფიქრე ნაბიჯ-ნაბიჯ..."
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
                  placeholder="მაგალითად: არასდროს გამოიყენო სიტყვები 'გარანტირებული'..."
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