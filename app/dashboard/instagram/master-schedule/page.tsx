"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
.ig-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.1); --line-2:rgba(236,233,247,.18);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon);
  color-scheme:dark;
}
.ig-root .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.ig-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
.ig-scroll{scrollbar-width:none}
.ig-scroll::-webkit-scrollbar{display:none}
@keyframes ig-pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(155, 140, 255, 0.28); }
  50% { box-shadow: 0 0 22px 2px rgba(155, 140, 255, 0.14); }
}
.ig-today-glow { animation: ig-pulse-glow 3s ease-in-out infinite; }
@keyframes ig-pop{from{opacity:0; transform:translateY(6px) scale(.98)} to{opacity:1; transform:none}}
.ig-pop{animation:ig-pop .16s ease-out}
@keyframes ig-shimmer{0%{opacity:.5} 50%{opacity:1} 100%{opacity:.5}}
.ig-skeleton{animation:ig-shimmer 1.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){
  .ig-today-glow,.ig-pop,.ig-skeleton{animation:none}
  .ig-root *{transition:none !important}
}
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
  chevron: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  refresh: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/></svg>,
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ZODIAC_OPTIONS = [
  { value: null, label: '🎲 Random', color: 'text-[#b3a8ff]' },
  { value: 'ARIES', label: '♈ Aries', color: 'text-[#ff7aa8]' },
  { value: 'TAURUS', label: '♉ Taurus', color: 'text-[#5fd6a4]' },
  { value: 'GEMINI', label: '♊ Gemini', color: 'text-[#f6c177]' },
  { value: 'CANCER', label: '♋ Cancer', color: 'text-[#ece9f7]' },
  { value: 'LEO', label: '♌ Leo', color: 'text-[#f6c177]' },
  { value: 'VIRGO', label: '♍ Virgo', color: 'text-[#5fd6a4]' },
  { value: 'LIBRA', label: '♎ Libra', color: 'text-[#b3a8ff]' },
  { value: 'SCORPIO', label: '♏ Scorpio', color: 'text-[#ff7aa8]' },
  { value: 'SAGITTARIUS', label: '♐ Sagittarius', color: 'text-[#b3a8ff]' },
  { value: 'CAPRICORN', label: '♑ Capricorn', color: 'text-[#9d9bbd]' },
  { value: 'AQUARIUS', label: '♒ Aquarius', color: 'text-[#b3a8ff]' },
  { value: 'PISCES', label: '♓ Pisces', color: 'text-[#b3a8ff]' },
];

const TYPE_COLORS: Record<string, string> = {
  post: "text-[#b3a8ff] bg-[#9b8cff]/10 border-[#9b8cff]/25",
  story: "text-[#f6c177] bg-[#f6c177]/10 border-[#f6c177]/25",
  carousel: "text-[#5fd6a4] bg-[#5fd6a4]/10 border-[#5fd6a4]/25",
  reel: "text-[#ff7aa8] bg-[#ff7aa8]/10 border-[#ff7aa8]/25",
};

const TYPE_ICONS: Record<string, any> = {
  post: Icons.post,
  story: Icons.story,
  carousel: Icons.carousel,
  reel: Icons.reel,
};

const STATUS_STYLES: Record<string, any> = {
  pending: { bg: "bg-[#f6c177]/10", border: "border-[#f6c177]/30", text: "text-[#f6c177]", label: "Pending", icon: Icons.clock },
  done: { bg: "bg-[#5fd6a4]/10", border: "border-[#5fd6a4]/30", text: "text-[#5fd6a4]", label: "Done", icon: Icons.check },
  upcoming: { bg: "bg-[#1a1e3a]", border: "border-[#ece9f7]/15", text: "text-[#9d9bbd]", label: "Upcoming", icon: Icons.calendar },
  past: { bg: "bg-[#1a1e3a]/50", border: "border-[#ece9f7]/10", text: "text-[#9d9bbd]/70", label: "Past", icon: Icons.check },
  pause: { bg: "bg-[#ff7aa8]/10", border: "border-[#ff7aa8]/30", text: "text-[#ff7aa8]", label: "Pause", icon: Icons.pause },
  skip: { bg: "bg-[#9d9bbd]/10", border: "border-[#9d9bbd]/30", text: "text-[#9d9bbd]", label: "Skip", icon: Icons.skip },
};

const STATUS_DOT: Record<string, string> = {
  pending: "#f6c177",
  done: "#5fd6a4",
  upcoming: "#9d9bbd",
  past: "#4b4f78",
  pause: "#ff7aa8",
  skip: "#9d9bbd",
};

const PUBLISH_STATUS_STYLES: Record<string, any> = {
  published: { bg: "bg-[#5fd6a4]/10", border: "border-[#5fd6a4]/30", text: "text-[#5fd6a4]", label: "დაიპოსტა", icon: Icons.check },
  failed: { bg: "bg-[#ff7aa8]/10", border: "border-[#ff7aa8]/30", text: "text-[#ff7aa8]", label: "არდაიპოსტა", icon: Icons.x },
};

const formatTime = (time: string): string => {
  if (!time) return '';
  if (time.includes('.')) return time.split('.')[0];
  if (time.length >= 8) return time.substring(0, 8);
  return time;
};

const inputClass = "w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[#9d9bbd]/60 focus:border-[var(--violet)]";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--mute)]";

export default function MasterSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [now, setNow] = useState(new Date());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [publishedToday, setPublishedToday] = useState<any[]>([]);
  
  const [activeZodiacDropdown, setActiveZodiacDropdown] = useState<string | null>(null);
  const [savingZodiac, setSavingZodiac] = useState<string | null>(null);
  const zodiacDropdownRef = useRef<HTMLDivElement>(null);

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
      if (activeZodiacDropdown && zodiacDropdownRef.current && !zodiacDropdownRef.current.contains(event.target as Node)) {
        setActiveZodiacDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown, activeZodiacDropdown]);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("content_schedule").select("*").order("day_of_week", { ascending: true }).order("time", { ascending: true });
    if (!error && data) setSchedule(data);
    setLoading(false);
  };

  const fetchPublishedToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('published_content').select('*').gte('published_at', `${today}T00:00:00`).lt('published_at', `${today}T23:59:59`).order('published_at', { ascending: false });
    if (!error && data) setPublishedToday(data);
  };

  const deletePublished = async (id: string) => {
    if (!confirm("წაშლა საშუალებას მისცემს აგენტს ხელახლა დაპოსტოს. დარწმუნებული ხარ?")) return;
    const { error } = await supabase.from('published_content').delete().eq('id', id);
    if (!error) setPublishedToday(prev => prev.filter(p => p.id !== id));
  };

  const getPublishedStatus = (rule: any) => {
    const matching = publishedToday.find(p => p.content_type === rule.content_type && (!rule.zodiac_sign || p.zodiac_sign === rule.zodiac_sign));
    if (!matching) return null;
    return matching.status;
  };

  const jsDay = now.getDay();
  const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const currentTimeStr = now.toTimeString().slice(0, 5);

  const getRuleStatus = (rule: any) => {
    if (rule.status && ['pause', 'skip'].includes(rule.status)) return rule.status;
    if (!rule.is_active) return 'past';
    if (rule.day_of_week < currentDayIndex) return 'past';
    if (rule.day_of_week > currentDayIndex) return 'upcoming';
    const ruleTime = formatTime(rule.time);
    const ruleTimeHHMM = ruleTime.substring(0, 5);
    if (ruleTimeHHMM <= currentTimeStr) return 'done';
    return 'pending';
  };

  const toggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("content_schedule").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) setSchedule((prev) => prev.map((rule) => (rule.id === id ? { ...rule, is_active: !currentStatus } : rule)));
  };

  const updateRuleStatus = async (id: string, newStatus: string) => {
    const statusToSave = ['pause', 'skip'].includes(newStatus) ? newStatus : null;
    const { error } = await supabase.from("content_schedule").update({ status: statusToSave }).eq("id", id);
    if (!error) {
      setSchedule((prev) => prev.map((rule) => (rule.id === id ? { ...rule, status: statusToSave } : rule)));
      setActiveDropdown(null);
    }
  };

  // ✅ განახლებული: დამატებულია .select() და console.error დიაგნოსტიკისთვის
  const updateZodiacSign = async (ruleId: string, newZodiac: string | null) => {
    setSavingZodiac(ruleId);
    
    const { data, error } = await supabase
      .from("content_schedule")
      .update({ zodiac_sign: newZodiac })
      .eq("id", ruleId)
      .select(); // ვამოწმებთ, განახლდა თუ არა რეალურად
    
    if (error) {
      console.error("შეცდომა ზოდიაქოს განახლებისას:", error);
      alert(`შეცდომა ბაზაში შენახვისას: ${error.message}\n\nშეამოწმე, რომ 'zodiac_sign' სვეტი არსებობს ცხრილში.`);
    } else {
      setSchedule((prev) => prev.map((rule) => 
        rule.id === ruleId ? { ...rule, zodiac_sign: newZodiac } : rule
      ));
    }
    
    setSavingZodiac(null);
    setActiveZodiacDropdown(null);
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

  const getZodiacDisplay = (zodiacSign: string | null) => {
    if (!zodiacSign) return { label: '🎲 Random', color: 'text-[#b3a8ff]' };
    const option = ZODIAC_OPTIONS.find(z => z.value === zodiacSign);
    return option || { label: zodiacSign, color: 'text-[#9d9bbd]' };
  };

  return (
    <div className="ig-root min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#0b0d1c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/instagram" className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]">
              {Icons.back} <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Master Schedule</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">Manage and edit your automated posting rules</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
            {Icons.plus} Add Rule
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading schedule">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map(i => <div key={i} className="ig-skeleton h-24 rounded-2xl border border-[var(--line)] bg-[var(--ink-2)]" />)}
            </div>
            {[0, 1].map(i => <div key={i} className="ig-skeleton h-44 rounded-2xl border border-[var(--line)] bg-[var(--ink-2)]" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                <p className="text-xs font-medium text-[var(--mute)]">Active rules</p>
                <p className="mono mt-1.5 text-3xl font-medium leading-none">{activeRulesCount}<span className="ml-1.5 text-sm text-[var(--mute)]">/ {schedule.length}</span></p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--ok)] transition-all duration-500" style={{ width: `${schedule.length ? (activeRulesCount / schedule.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                <p className="text-xs font-medium text-[var(--mute)]">Weekly output</p>
                <p className="mono mt-1.5 text-3xl font-medium leading-none">{schedule.length}<span className="ml-1.5 text-sm text-[var(--mute)]">items</span></p>
                <p className="mt-3 text-xs text-[var(--mute)]">Across {DAYS_OF_WEEK.filter((_, i) => schedule.some(r => r.day_of_week === i)).length} days</p>
              </div>
              <div className="rounded-2xl border border-[#9b8cff]/35 bg-[#9b8cff]/[0.07] p-4">
                <p className="text-xs font-medium text-[#b3a8ff]">Current time</p>
                <p className="mono mt-1.5 text-3xl font-medium leading-none text-[#b3a8ff]">{formattedNow}</p>
                <p className="mt-3 text-xs text-[var(--moon)]/80">{formattedDate}</p>
              </div>
            </div>

            {publishedToday.length > 0 && (
              <section className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)]" aria-label="Published today">
                <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--line)] bg-[#1a1e3a]/50 px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2 w-2 rounded-full bg-[var(--ok)]" />
                    Published today
                    <span className="mono rounded-full bg-white/10 px-2 py-0.5 text-xs text-[var(--mute)]">{publishedToday.length}</span>
                  </h3>
                  <button onClick={() => fetchPublishedToday()} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
                    {Icons.refresh} Refresh
                  </button>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {publishedToday.map(p => {
                    const publishStyle = PUBLISH_STATUS_STYLES[p.status];
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${publishStyle.bg} ${publishStyle.border} ${publishStyle.text}`}>
                          {publishStyle.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium capitalize">
                            {p.content_type} {p.zodiac_sign && <span className="font-normal text-[var(--mute)]">· {p.zodiac_sign}</span>}
                          </p>
                          <p className="truncate text-xs text-[var(--mute)]">{p.caption?.substring(0, 60) || 'No caption'}</p>
                        </div>
                        <span className="mono shrink-0 text-xs text-[var(--mute)]">
                          {new Date(p.published_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button onClick={() => deletePublished(p.id)} aria-label="წაშლა" className="rounded-lg p-1.5 text-[var(--mute)] transition-colors hover:bg-[#ff7aa8]/10 hover:text-[var(--rose)]" title="წაშლა - აგენტი ხელახლა შეძლებს დაპოსტვას">
                          {Icons.trash}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {schedule.length > 0 && (
              <nav aria-label="Jump to day" className="ig-scroll -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
                {DAYS_OF_WEEK.map((day, index) => {
                  const count = schedule.filter((r) => r.day_of_week === index).length;
                  const isToday = index === currentDayIndex;
                  const has = count > 0;
                  return (
                    <a key={day} href={has ? `#day-${index}` : undefined} aria-disabled={!has} className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${isToday ? "border-[#9b8cff]/60 bg-[#9b8cff]/15 text-[var(--moon)]" : has ? "border-[var(--line-2)] text-[var(--mute)] hover:text-[var(--moon)]" : "pointer-events-none border-[var(--line)] text-[#9d9bbd]/40"}`}>
                      {day.slice(0, 3)}
                      <span className="mono text-xs opacity-80">{count}</span>
                    </a>
                  );
                })}
              </nav>
            )}

            {schedule.length === 0 && (
              <div className="rounded-3xl border border-dashed border-[var(--line-2)] px-6 py-16 text-center">
                <p className="font-semibold">No schedule rules yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--mute)]">Create your first rule to start automated posting.</p>
                <button onClick={() => openModal()} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
                  {Icons.plus} Add Rule
                </button>
              </div>
            )}

            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day, index) => {
                const dayRules = schedule.filter((r) => r.day_of_week === index);
                if (dayRules.length === 0) return null;
                const isToday = index === currentDayIndex;

                return (
                  <section key={day} id={`day-${index}`} className={`scroll-mt-24 rounded-2xl border transition-all ${isToday ? "border-[#9b8cff]/50 bg-[#9b8cff]/[0.04] ig-today-glow" : "border-[var(--line)] bg-[var(--ink-2)]"}`}>
                    <div className={`flex items-center justify-between rounded-t-2xl border-b px-4 py-3 ${isToday ? "border-[#9b8cff]/30 bg-[#9b8cff]/10" : "border-[var(--line)] bg-[#1a1e3a]/50"}`}>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-semibold">{day}</h3>
                        {isToday && <span className="rounded-full bg-[var(--violet)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--ink)]">TODAY</span>}
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
                        const zodiacDisplay = getZodiacDisplay(rule.zodiac_sign);

                        return (
                          <div key={rule.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors ${status === 'pending' ? 'bg-[#f6c177]/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                            <div className="flex w-[88px] shrink-0 items-center gap-2.5">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[status] ?? "#9d9bbd" }} aria-hidden />
                              <span className="mono text-sm font-medium">{formatTime(rule.time)}</span>
                            </div>

                            <div className={`flex min-w-[170px] flex-1 items-center gap-3 ${!rule.is_active ? 'opacity-55' : ''}`}>
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>{TypeIcon}</div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {rule.content_type.charAt(0).toUpperCase() + rule.content_type.slice(1)}
                                  {rule.zodiac_sign && <span className="ml-2 font-normal text-[#b3a8ff]">· {rule.zodiac_sign}</span>}
                                </p>
                                <p className="truncate text-xs text-[var(--mute)]">{rule.content_theme}</p>
                              </div>
                            </div>

                            <div className="ml-auto flex flex-wrap items-center gap-2">
                              {rule.content_type === 'post' && (
                                <div className={`relative ${activeZodiacDropdown === rule.id ? 'z-[70]' : 'z-10'}`} ref={zodiacDropdownRef}>
                                  <button 
                                    onClick={() => setActiveZodiacDropdown(activeZodiacDropdown === rule.id ? null : rule.id)}
                                    disabled={savingZodiac === rule.id}
                                    aria-haspopup="listbox"
                                    aria-expanded={activeZodiacDropdown === rule.id}
                                    className={`flex items-center gap-1.5 rounded-full border border-[#9b8cff]/30 bg-[#9b8cff]/[0.06] px-2.5 py-1 transition-colors hover:bg-[#9b8cff]/15 ${zodiacDisplay.color} ${savingZodiac === rule.id ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                                    title="დააჭირე ზოდიაქოს შესაცვლელად"
                                  >
                                    {savingZodiac === rule.id ? (
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                      <span className="text-[11px] font-semibold uppercase tracking-wider">
                                        {zodiacDisplay.label}
                                      </span>
                                    )}
                                    {Icons.chevron}
                                  </button>

                                  {activeZodiacDropdown === rule.id && (
                                    <div role="listbox" className="ig-pop absolute right-0 top-full z-[100] mt-2 max-h-[60vh] w-52 overflow-y-auto rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] p-1 shadow-2xl">
                                      {ZODIAC_OPTIONS.map((option) => (
                                        <button
                                          key={option.value || 'random'}
                                          role="option"
                                          aria-selected={rule.zodiac_sign === option.value}
                                          onClick={() => updateZodiacSign(rule.id, option.value)}
                                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5 ${
                                            rule.zodiac_sign === option.value ? 'bg-[#9b8cff]/20 text-[#b3a8ff]' : option.color
                                          }`}
                                        >
                                          <span className="flex-1">{option.label}</span>
                                          {rule.zodiac_sign === option.value && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className={`status-dropdown relative ${activeDropdown === rule.id ? 'z-[70]' : 'z-10'}`}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === rule.id ? null : rule.id); }}
                                  aria-haspopup="menu"
                                  aria-expanded={activeDropdown === rule.id}
                                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-opacity hover:opacity-80 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                                >
                                  {StatusIcon}
                                  <span className="text-[11px] font-semibold uppercase tracking-wider">{statusStyle.label}</span>
                                  {Icons.chevron}
                                </button>

                                {activeDropdown === rule.id && (
                                  <div role="menu" className="ig-pop absolute right-0 top-full z-[100] mt-2 w-40 rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] p-1 shadow-2xl">
                                    {Object.entries(STATUS_STYLES).map(([key, style]) => (
                                      <button
                                        key={key}
                                        role="menuitem"
                                        onClick={() => updateRuleStatus(rule.id, key)}
                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5 ${status === key ? 'bg-white/5 text-[#b3a8ff]' : 'text-[var(--moon)]'}`}
                                      >
                                        {style.icon}
                                        {style.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {publishStatus && (
                                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${PUBLISH_STATUS_STYLES[publishStatus].bg} ${PUBLISH_STATUS_STYLES[publishStatus].border} ${PUBLISH_STATUS_STYLES[publishStatus].text}`}>
                                  {PUBLISH_STATUS_STYLES[publishStatus].icon}
                                  <span className="text-[11px] font-semibold tracking-wide">
                                    {PUBLISH_STATUS_STYLES[publishStatus].label}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1 border-l border-[var(--line)] pl-2">
                                <button role="switch" aria-checked={rule.is_active} aria-label={rule.is_active ? "Disable rule" : "Enable rule"} onClick={() => toggleRule(rule.id, rule.is_active)} className={`relative mr-1 h-6 w-11 shrink-0 rounded-full transition-colors ${rule.is_active ? "bg-[var(--ok)]" : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"}`}>
                                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${rule.is_active ? "left-6" : "left-1"}`} />
                                </button>
                                <button onClick={() => openModal(rule)} aria-label="Edit rule" className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">{Icons.edit}</button>
                                <button onClick={() => deleteRule(rule.id)} aria-label="Delete rule" className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-[#ff7aa8]/10 hover:text-[var(--rose)]">{Icons.trash}</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-[#9b8cff]/20 bg-[#9b8cff]/[0.05] p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#9b8cff]/15 text-xs" aria-hidden>🧠</span>
              <p className="text-sm leading-relaxed text-[var(--moon)]/85">
                <span className="font-semibold text-[#b3a8ff]">AI Auto-Optimization:</span> Currently in Baseline Mode. After 4 weeks of data collection, the system will suggest time/theme adjustments based on actual Reach &amp; Saves.
              </p>
            </div>
          </>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setShowModal(false)}>
          <div role="dialog" aria-modal="true" aria-label={editingRule ? "Edit schedule rule" : "Add schedule rule"} className="ig-pop max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingRule ? "Edit Schedule Rule" : "Add New Schedule Rule"}</h3>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Close" className="rounded-full p-1.5 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">{Icons.x}</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rule-day" className={labelClass}>Day</label>
                  <select id="rule-day" value={formData.day_of_week} onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})} className={inputClass}>
                    {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="rule-time" className={labelClass}>Time</label>
                  <input id="rule-time" type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rule-type" className={labelClass}>Type</label>
                  <select id="rule-type" value={formData.content_type} onChange={(e) => setFormData({...formData, content_type: e.target.value})} className={inputClass}>
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                    <option value="carousel">Carousel</option>
                    <option value="reel">Reel</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rule-zodiac" className={labelClass}>Zodiac (optional)</label>
                  <select id="rule-zodiac" value={formData.zodiac_sign} onChange={(e) => setFormData({...formData, zodiac_sign: e.target.value})} className={inputClass}>
                    <option value="">🎲 Random</option>
                    <option value="ARIES">♈ Aries</option>
                    <option value="TAURUS">♉ Taurus</option>
                    <option value="GEMINI">♊ Gemini</option>
                    <option value="CANCER">♋ Cancer</option>
                    <option value="LEO">♌ Leo</option>
                    <option value="VIRGO">♍ Virgo</option>
                    <option value="LIBRA">♎ Libra</option>
                    <option value="SCORPIO">♏ Scorpio</option>
                    <option value="SAGITTARIUS">♐ Sagittarius</option>
                    <option value="CAPRICORN">♑ Capricorn</option>
                    <option value="AQUARIUS">♒ Aquarius</option>
                    <option value="PISCES">♓ Pisces</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="rule-theme" className={labelClass}>Content theme</label>
                <input id="rule-theme" type="text" value={formData.content_theme} onChange={(e) => setFormData({...formData, content_theme: e.target.value})} placeholder="e.g., Daily Habit, Red Flags" className={inputClass} required />
              </div>
              <div>
                <label htmlFor="rule-goal" className={labelClass}>Primary goal</label>
                <select id="rule-goal" value={formData.goal} onChange={(e) => setFormData({...formData, goal: e.target.value})} className={inputClass}>
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