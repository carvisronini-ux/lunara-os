// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/master-schedule/page.tsx
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
.ig-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.1); --line-2:rgba(236,233,247,.18);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon);
}
.ig-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
@keyframes ig-pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(155, 140, 255, 0.3); }
  50% { box-shadow: 0 0 20px 2px rgba(155, 140, 255, 0.15); }
}
.ig-today-glow { animation: ig-pulse-glow 3s ease-in-out infinite; }
`;

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  post: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  story: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>,
  carousel: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>,
  reel: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>,
  clock: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  calendar: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pause: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  skip: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>,
  x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TYPE_COLORS: Record<string, string> = {
  post: "text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--violet)]/20",
  story: "text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20",
  carousel: "text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/20",
  reel: "text-[var(--rose)] bg-[var(--rose)]/10 border-[var(--rose)]/20",
};

const TYPE_ICONS: Record<string, any> = {
  post: Icons.post,
  story: Icons.story,
  carousel: Icons.carousel,
  reel: Icons.reel,
};

// ✅ ახალი: დროის ფორმატირების helper ფუნქცია
const formatTime = (time: string): string => {
  if (!time) return '';
  // თუ არის მიკროწამები (მაგ. "13:30:50.171035"), ვიღებთ მხოლოდ HH:MM:SS
  if (time.includes('.')) {
    return time.split('.')[0];
  }
  // თუ არის HH:MM:SS, ვაბრუნებთ როგორც არის
  if (time.length >= 8) {
    return time.substring(0, 8);
  }
  // თუ არის HH:MM, ვაბრუნებთ როგორც არის
  return time;
};

// განრიგის სტატუსები (ავტომატური + Override)
const STATUS_STYLES: Record<string, any> = {
  pending: { bg: "bg-[var(--amber)]/10", border: "border-[var(--amber)]/30", text: "text-[var(--amber)]", label: "Pending", icon: Icons.clock },
  done: { bg: "bg-[var(--ok)]/10", border: "border-[var(--ok)]/30", text: "text-[var(--ok)]", label: "Done", icon: Icons.check },
  upcoming: { bg: "bg-[var(--ink-3)]", border: "border-[var(--line-2)]", text: "text-[var(--mute)]", label: "Upcoming", icon: Icons.calendar },
  past: { bg: "bg-[var(--ink-3)]/50", border: "border-[var(--line)]", text: "text-[var(--mute)]/60", label: "Past", icon: Icons.check },
  pause: { bg: "bg-[var(--rose)]/10", border: "border-[var(--rose)]/30", text: "text-[var(--rose)]", label: "Pause", icon: Icons.pause },
  skip: { bg: "bg-[var(--mute)]/10", border: "border-[var(--mute)]/30", text: "text-[var(--mute)]", label: "Skip", icon: Icons.skip },
};

// ✅ ახალი: დაპოსტვის სტატუსები
const PUBLISH_STATUS_STYLES: Record<string, any> = {
  published: {
    bg: "bg-[var(--ok)]/10",
    border: "border-[var(--ok)]/30",
    text: "text-[var(--ok)]",
    label: "დაიპოსტა",
    icon: Icons.check,
  },
  failed: {
    bg: "bg-[var(--rose)]/10",
    border: "border-[var(--rose)]/30",
    text: "text-[var(--rose)]",
    label: "არდაიპოსტა",
    icon: Icons.x,
  },
};

export default function MasterSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [now, setNow] = useState(new Date());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [publishedToday, setPublishedToday] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    day_of_week: 0,
    time: "09:00",
    content_type: "post",
    zodiac_sign: "",
    content_theme: "",
    goal: "Engagement",
  });

  useEffect(() => {
    fetchSchedule();
    fetchPublishedToday();
    const interval = setInterval(() => {
      setNow(new Date());
      fetchPublishedToday();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && !(event.target as HTMLElement).closest('.status-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_schedule")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("time", { ascending: true });
    
    if (!error && data) setSchedule(data);
    setLoading(false);
  };

  const fetchPublishedToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('published_content')
      .select('*')
      .gte('published_at', `${today}T00:00:00`)
      .lt('published_at', `${today}T23:59:59`)
      .order('published_at', { ascending: false });
    
    if (!error && data) setPublishedToday(data);
  };

  const deletePublished = async (id: string) => {
    if (!confirm("წაშლა საშუალებას მისცემს აგენტს ხელახლა დაპოსტოს. დარწმუნებული ხარ?")) return;
    const { error } = await supabase.from('published_content').delete().eq('id', id);
    if (!error) {
      setPublishedToday(prev => prev.filter(p => p.id !== id));
    }
  };

  const getPublishedStatus = (rule: any) => {
    const matching = publishedToday.find(p => 
      p.content_type === rule.content_type && 
      (!rule.zodiac_sign || p.zodiac_sign === rule.zodiac_sign)
    );
    if (!matching) return null;
    return matching.status;
  };

  const jsDay = now.getDay();
  const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const currentTimeStr = now.toTimeString().slice(0, 5);

  // ✅ განახლებული: იყენებს formatTime-ს შედარებისთვის
  const getRuleStatus = (rule: any) => {
    if (rule.status && ['pause', 'skip'].includes(rule.status)) {
      return rule.status;
    }
    if (!rule.is_active) return 'past';
    if (rule.day_of_week < currentDayIndex) return 'past';
    if (rule.day_of_week > currentDayIndex) return 'upcoming';
    
    // ✅ გასუფთავებული დროის შედარება
    const ruleTime = formatTime(rule.time);
    const ruleTimeHHMM = ruleTime.substring(0, 5);
    if (ruleTimeHHMM <= currentTimeStr) return 'done';
    return 'pending';
  };

  const toggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("content_schedule").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) {
      setSchedule((prev) => prev.map((rule) => (rule.id === id ? { ...rule, is_active: !currentStatus } : rule)));
    }
  };

  const updateRuleStatus = async (id: string, newStatus: string) => {
    const statusToSave = ['pause', 'skip'].includes(newStatus) ? newStatus : null;
    const { error } = await supabase.from("content_schedule").update({ status: statusToSave }).eq("id", id);
    if (!error) {
      setSchedule((prev) => prev.map((rule) => (rule.id === id ? { ...rule, status: statusToSave } : rule)));
      setActiveDropdown(null);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    const { error } = await supabase.from("content_schedule").delete().eq("id", id);
    if (!error) setSchedule((prev) => prev.filter((rule) => rule.id !== id));
  };

  const openModal = (rule: any = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        day_of_week: rule.day_of_week,
        time: rule.time,
        content_type: rule.content_type,
        zodiac_sign: rule.zodiac_sign || "",
        content_theme: rule.content_theme,
        goal: rule.goal,
      });
    } else {
      setEditingRule(null);
      setFormData({ day_of_week: 0, time: "09:00", content_type: "post", zodiac_sign: "", content_theme: "", goal: "Engagement" });
    }
    setShowModal(true);
  };

  // ✅ განახლებული: იყენებს formatTime-ს სორტირებისთვის
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      const { error } = await supabase.from("content_schedule").update({ ...formData, zodiac_sign: formData.zodiac_sign || null }).eq("id", editingRule.id);
      if (!error) {
        setSchedule((prev) => prev.map((rule) => rule.id === editingRule.id ? { ...rule, ...formData, zodiac_sign: formData.zodiac_sign || null } : rule).sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
          return formatTime(a.time).localeCompare(formatTime(b.time));
        }));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase.from("content_schedule").insert([{ ...formData, zodiac_sign: formData.zodiac_sign || null, is_active: true }]).select();
      if (!error && data) {
        setSchedule((prev) => [...prev, data[0]].sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
          return formatTime(a.time).localeCompare(formatTime(b.time));
        }));
        setShowModal(false);
      }
    }
  };

  const activeRulesCount = schedule.filter((r) => r.is_active).length;
  const formattedNow = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="ig-root min-h-screen">
      <style>{STYLES}</style>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/instagram" className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]">
              {Icons.back} <span className="hidden sm:inline">Back</span>
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Master Schedule</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block">Manage and edit your automated posting rules</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
            {Icons.plus} Add Rule
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex justify-center py-20 text-[var(--mute)]">Loading schedule...</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1 max-w-xs rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                <p className="text-xs font-medium text-[var(--mute)]">Active Rules</p>
                <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{activeRulesCount} <span className="text-sm font-normal text-[var(--mute)]">/ {schedule.length}</span></p>
              </div>
              <div className="min-w-[200px] flex-1 max-w-xs rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                <p className="text-xs font-medium text-[var(--mute)]">Weekly Output</p>
                <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{schedule.length} <span className="text-sm font-normal text-[var(--mute)]">Items</span></p>
              </div>
              <div className="min-w-[200px] flex-1 max-w-xs rounded-2xl border border-[var(--violet)]/30 bg-[var(--violet)]/5 p-4">
                <p className="text-xs font-medium text-[var(--violet)]">Current Time</p>
                <p className="mt-1 text-sm font-semibold text-[var(--moon)]">{formattedDate}</p>
                <p className="text-lg font-bold text-[var(--violet)] font-mono">{formattedNow}</p>
              </div>
            </div>

            {publishedToday.length > 0 && (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] overflow-hidden">
                <div className="border-b border-[var(--line)] bg-[var(--ink-3)]/50 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--violet)]">
                    📊 Published Today ({publishedToday.length})
                  </h3>
                  <button onClick={() => fetchPublishedToday()} className="text-xs text-[var(--mute)] hover:text-[var(--moon)] transition-colors">
                    ↻ Refresh
                  </button>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {publishedToday.map(p => {
                    const publishStyle = PUBLISH_STATUS_STYLES[p.status];
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${publishStyle.bg} ${publishStyle.border} ${publishStyle.text}`}>
                          {publishStyle.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--moon)]">
                            {p.content_type} {p.zodiac_sign && `· ${p.zodiac_sign}`}
                          </p>
                          <p className="truncate text-xs text-[var(--mute)]">{p.caption?.substring(0, 60) || 'No caption'}</p>
                        </div>
                        <span className="text-xs text-[var(--mute)] font-mono">
                          {new Date(p.published_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button 
                          onClick={() => deletePublished(p.id)} 
                          className="rounded-lg p-1.5 text-[var(--mute)] hover:bg-[var(--rose)]/10 hover:text-[var(--rose)] transition-colors"
                          title="წაშლა - აგენტი ხელახლა შეძლებს დაპოსტვას"
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day, index) => {
                const dayRules = schedule.filter((r) => r.day_of_week === index);
                if (dayRules.length === 0) return null;
                const isToday = index === currentDayIndex;

                return (
                  <div key={day} className={`rounded-2xl border overflow-hidden transition-all ${isToday ? "border-[var(--violet)]/50 bg-[var(--violet)]/5 ig-today-glow" : "border-[var(--line)] bg-[var(--ink-2)]"}`}>
                    <div className={`border-b px-4 py-3 flex items-center justify-between ${isToday ? "border-[var(--violet)]/30 bg-[var(--violet)]/10" : "border-[var(--line)] bg-[var(--ink-3)]/50"}`}>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold ${isToday ? "text-[var(--violet)]" : "text-[var(--violet)]"}`}>{day}</h3>
                        {isToday && <span className="rounded-full bg-[var(--violet)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink)]">TODAY</span>}
                      </div>
                      <span className="text-xs text-[var(--mute)]">{dayRules.length} {dayRules.length === 1 ? 'rule' : 'rules'}</span>
                    </div>
                    <div className="divide-y divide-[var(--line)]">
                      {dayRules.map((rule) => {
                        const TypeIcon = TYPE_ICONS[rule.content_type];
                        const colorClass = TYPE_COLORS[rule.content_type];
                        const status = getRuleStatus(rule);
                        const statusStyle = STATUS_STYLES[status as keyof typeof STATUS_STYLES];
                        const StatusIcon = statusStyle.icon;
                        const publishStatus = getPublishedStatus(rule);

                        return (
                          <div key={rule.id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${status === 'pending' ? 'bg-[var(--amber)]/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                            {/* ✅ განახლებული: დროის ფორმატირება */}
                            <div className="w-20 shrink-0 font-mono text-sm font-medium text-[var(--moon)]">
                              {formatTime(rule.time)}
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}>{TypeIcon}</div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[var(--moon)]">
                                  {rule.content_type.charAt(0).toUpperCase() + rule.content_type.slice(1)}
                                  {rule.zodiac_sign && <span className="ml-2 text-[var(--violet)]">· {rule.zodiac_sign}</span>}
                                </p>
                                <p className="truncate text-xs text-[var(--mute)]">{rule.content_theme}</p>
                              </div>
                            </div>
                            
                            <div className="relative hidden sm:block status-dropdown">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === rule.id ? null : rule.id);
                                }}
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors hover:opacity-80 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                              >
                                {StatusIcon}
                                <span className="text-[10px] font-semibold uppercase tracking-wider">{statusStyle.label}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                              </button>

                              {activeDropdown === rule.id && (
                                <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] p-1 shadow-xl z-50">
                                  {Object.entries(STATUS_STYLES).map(([key, style]) => (
                                    <button
                                      key={key}
                                      onClick={() => updateRuleStatus(rule.id, key)}
                                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5 ${
                                        status === key ? 'text-[var(--violet)] bg-white/5' : 'text-[var(--moon)]'
                                      }`}
                                    >
                                      {style.icon}
                                      {style.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {publishStatus && (
                              <div className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${PUBLISH_STATUS_STYLES[publishStatus].bg} ${PUBLISH_STATUS_STYLES[publishStatus].border} ${PUBLISH_STATUS_STYLES[publishStatus].text}`}>
                                {PUBLISH_STATUS_STYLES[publishStatus].icon}
                                <span className="text-[10px] font-semibold uppercase tracking-wider">
                                  {PUBLISH_STATUS_STYLES[publishStatus].label}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleRule(rule.id, rule.is_active)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${rule.is_active ? "bg-[var(--ok)]" : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"}`}>
                                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${rule.is_active ? "left-6" : "left-1"}`} />
                              </button>
                              <button onClick={() => openModal(rule)} className="rounded-lg p-1.5 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">{Icons.edit}</button>
                              <button onClick={() => deleteRule(rule.id)} className="rounded-lg p-1.5 text-[var(--mute)] transition-colors hover:bg-[var(--rose)]/10 hover:text-[var(--rose)]">{Icons.trash}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[var(--violet)]/20 bg-[var(--violet)]/5 p-4 text-center">
              <p className="text-sm text-[var(--violet)]">
                🧠 <span className="font-semibold">AI Auto-Optimization:</span> Currently in Baseline Mode. After 4 weeks of data collection, the system will suggest time/theme adjustments based on actual Reach & Saves.
              </p>
            </div>
          </>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">{editingRule ? "Edit Schedule Rule" : "Add New Schedule Rule"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Day</label>
                  <select value={formData.day_of_week} onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
                    {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Time</label>
                  <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Type</label>
                  <select value={formData.content_type} onChange={(e) => setFormData({...formData, content_type: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                    <option value="carousel">Carousel</option>
                    <option value="reel">Reel</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Zodiac (Optional)</label>
                  <select value={formData.zodiac_sign} onChange={(e) => setFormData({...formData, zodiac_sign: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
                    <option value="">None / All</option>
                    <option value="ARIES">Aries</option>
                    <option value="TAURUS">Taurus</option>
                    <option value="GEMINI">Gemini</option>
                    <option value="CANCER">Cancer</option>
                    <option value="LEO">Leo</option>
                    <option value="VIRGO">Virgo</option>
                    <option value="LIBRA">Libra</option>
                    <option value="SCORPIO">Scorpio</option>
                    <option value="SAGITTARIUS">Sagittarius</option>
                    <option value="CAPRICORN">Capricorn</option>
                    <option value="AQUARIUS">Aquarius</option>
                    <option value="PISCES">Pisces</option>
                    <option value="ALL">ALL SIGNS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Content Theme</label>
                <input type="text" value={formData.content_theme} onChange={(e) => setFormData({...formData, content_theme: e.target.value})} placeholder="e.g., Daily Habit, Red Flags" className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Primary Goal</label>
                <select value={formData.goal} onChange={(e) => setFormData({...formData, goal: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
                  <option value="Engagement">Engagement</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Saves">Saves / Shares</option>
                  <option value="Retention">Retention</option>
                  <option value="Traffic">Traffic</option>
                  <option value="Habit">Habit</option>
                  <option value="Data">Data</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-[var(--line-2)] py-2.5 text-sm font-semibold transition-colors hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-[var(--violet)] py-2.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">{editingRule ? "Update Rule" : "Save Rule"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}