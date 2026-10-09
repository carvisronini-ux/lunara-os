// /home/carvisronini-ux/lunara-os/app/dashboard/telegram/master-schedule/page.tsx
"use client";

import { useState, useEffect } from "react";
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
  background:var(--ink); color:var(--moon); color-scheme:dark;
}
.ig-root .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.ig-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
.ig-scroll{scrollbar-width:none}
.ig-scroll::-webkit-scrollbar{display:none}
@keyframes ig-pulse-glow { 0%,100% { box-shadow:0 0 0 0 rgba(155,140,255,0); } 50% { box-shadow:0 0 30px 2px rgba(155,140,255,.11); } }
.ig-today-glow{animation:ig-pulse-glow 4s ease-in-out infinite}
@keyframes ig-pop{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
.ig-pop{animation:ig-pop .18s cubic-bezier(.22,1,.36,1)}
`;

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>,
  x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  chevron: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
};

const DAYS_OF_WEEK = ["ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];
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

const ALL_ZODIAC_SIGNS = ['ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'];
const inputClass = "w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[#9d9bbd]/60 focus:border-[var(--violet)]";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--mute)]";

export default function TelegramMasterSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [now, setNow] = useState(new Date());
  const [activeZodiacDropdown, setActiveZodiacDropdown] = useState<string | null>(null);
  const [savingZodiac, setSavingZodiac] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    day_of_week: 0,
    time: "09:00",
    content_type: "telegram",
    zodiac_sign: "",
    content_theme: "",
    goal: "Engagement",
  });

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeZodiacDropdown && !(event.target as HTMLElement).closest(`[data-zodiac-dropdown="${activeZodiacDropdown}"]`)) {
        setActiveZodiacDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeZodiacDropdown]);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_schedule")
      .select("*")
      .eq("content_type", "telegram")
      .order("day_of_week", { ascending: true })
      .order("time", { ascending: true });
    if (!error && data) setSchedule(data);
    setLoading(false);
  };

  const toggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("content_schedule").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) setSchedule((prev) => prev.map((rule) => (rule.id === id ? { ...rule, is_active: !currentStatus } : rule)));
  };

  const updateZodiacSign = async (ruleId: string, newZodiac: string | null) => {
    setSavingZodiac(ruleId);
    const currentRule = schedule.find(r => r.id === ruleId);
    let newTheme = currentRule?.content_theme || "";

    if (newZodiac) {
      const zodiacRegex = new RegExp(`\\b(${ALL_ZODIAC_SIGNS.join('|')})\\b`, 'gi');
      if (zodiacRegex.test(newTheme)) {
        newTheme = newTheme.replace(zodiacRegex, newZodiac);
      } else {
        const words = newTheme.split(' ');
        if (words.length > 0) { words[0] = newZodiac; newTheme = words.join(' '); }
      }
    }

    const { data, error } = await supabase.from("content_schedule").update({ zodiac_sign: newZodiac, content_theme: newTheme }).eq("id", ruleId).select();
    if (!error && data) {
      setSchedule((prev) => prev.map((rule) => rule.id === ruleId ? { ...rule, zodiac_sign: newZodiac, content_theme: newTheme } : rule));
    }
    setSavingZodiac(null);
    setActiveZodiacDropdown(null);
  };

  const deleteRule = async (id: string) => {
    if (!confirm("წაშლა დარწმუნებული ხარ?")) return;
    const { error } = await supabase.from("content_schedule").delete().eq("id", id);
    if (!error) setSchedule((prev) => prev.filter((rule) => rule.id !== id));
  };

  const openModal = (rule: any = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({ day_of_week: rule.day_of_week, time: rule.time, content_type: "telegram", zodiac_sign: rule.zodiac_sign || "", content_theme: rule.content_theme || "", goal: rule.goal });
    } else {
      setEditingRule(null);
      setFormData({ day_of_week: 0, time: "09:00", content_type: "telegram", zodiac_sign: "", content_theme: "", goal: "Engagement" });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const themeToSave = formData.content_theme.trim() === '' ? null : formData.content_theme;
    const payload = { ...formData, zodiac_sign: formData.zodiac_sign || null, content_theme: themeToSave };

    if (editingRule) {
      const { error } = await supabase.from("content_schedule").update(payload).eq("id", editingRule.id);
      if (!error) {
        setSchedule((prev) => prev.map((rule) => rule.id === editingRule.id ? { ...rule, ...payload } : rule).sort((a, b) => a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.time.localeCompare(b.time)));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase.from("content_schedule").insert([{ ...payload, is_active: true }]).select();
      if (!error && data) {
        setSchedule((prev) => [...prev, data[0]].sort((a, b) => a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.time.localeCompare(b.time)));
        setShowModal(false);
      }
    }
  };

  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const getZodiacDisplay = (zodiacSign: string | null) => {
    if (!zodiacSign) return { label: '🎲 Random', color: 'text-[#b3a8ff]' };
    return ZODIAC_OPTIONS.find(z => z.value === zodiacSign) || { label: zodiacSign, color: 'text-[#9d9bbd]' };
  };

  return (
    <div className="ig-root min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#0b0d1c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]">
              {Icons.back} <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Telegram Master Schedule</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">Manage automated Telegram channel posting rules</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
            {Icons.plus} Add Telegram Rule
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="text-center py-10 text-[var(--mute)]">Loading schedule...</div>
        ) : schedule.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line-2)] px-6 py-16 text-center">
            <p className="font-semibold">No Telegram schedule rules yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--mute)]">Create your first rule to start automated Telegram posting.</p>
            <button onClick={() => openModal()} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
              {Icons.plus} Add Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayRules = schedule.filter((r) => r.day_of_week === index);
              if (dayRules.length === 0) return null;
              const isToday = index === currentDayIndex;
              return (
                <section key={day} className={`scroll-mt-24 rounded-2xl border transition-all ${isToday ? "border-[#9b8cff]/50 bg-[#9b8cff]/[0.04] ig-today-glow" : "border-[var(--line)] bg-[var(--ink-2)]"}`}>
                  <div className={`flex items-center justify-between rounded-t-2xl border-b px-5 py-3.5 ${isToday ? "border-[#9b8cff]/30 bg-[#9b8cff]/10" : "border-[var(--line)] bg-white/[0.025]"}`}>
                    <h3 className="text-sm font-semibold">{day}</h3>
                    <span className="text-xs text-[var(--mute)]">{dayRules.length} rules</span>
                  </div>
                  <div className="divide-y divide-[var(--line)]">
                    {dayRules.map((rule) => {
                      const zodiacDisplay = getZodiacDisplay(rule.zodiac_sign);
                      return (
                        <div key={rule.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                          <div className="flex w-[88px] shrink-0 items-center gap-2.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${rule.is_active ? 'bg-[var(--ok)]' : 'bg-[var(--mute)]'}`} />
                            <span className="mono text-sm font-medium">{rule.time}</span>
                          </div>
                          <div className={`flex min-w-[170px] flex-1 items-center gap-3 ${!rule.is_active ? 'opacity-55' : ''}`}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                Telegram Post {rule.zodiac_sign && <span className="ml-2 font-normal text-[#b3a8ff]">· {rule.zodiac_sign}</span>}
                              </p>
                              <p className="truncate text-xs text-[var(--mute)] italic">{rule.content_theme || "AI will generate theme"}</p>
                            </div>
                          </div>
                          <div className="ml-auto flex flex-wrap items-center gap-2">
                            <div className={`relative ${activeZodiacDropdown === rule.id ? 'z-[70]' : 'z-10'}`} data-zodiac-dropdown={rule.id}>
                              <button onClick={() => setActiveZodiacDropdown(activeZodiacDropdown === rule.id ? null : rule.id)} disabled={savingZodiac === rule.id} className={`flex items-center gap-1.5 rounded-full border border-[#9b8cff]/30 bg-[#9b8cff]/[0.06] px-2.5 py-1 transition-colors hover:bg-[#9b8cff]/15 ${zodiacDisplay.color} ${savingZodiac === rule.id ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}>
                                {savingZodiac === rule.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <span className="text-[11px] font-semibold uppercase tracking-wider">{zodiacDisplay.label}</span>}
                                {Icons.chevron}
                              </button>
                              {activeZodiacDropdown === rule.id && (
                                <div className="ig-pop absolute right-0 top-full z-[100] mt-2 max-h-[60vh] w-52 overflow-y-auto rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] p-1 shadow-2xl">
                                  {ZODIAC_OPTIONS.map((option) => (
                                    <button key={option.value || 'random'} onClick={() => updateZodiacSign(rule.id, option.value)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5 ${rule.zodiac_sign === option.value ? 'bg-[#9b8cff]/20 text-[#b3a8ff]' : option.color}`}>
                                      <span className="flex-1">{option.label}</span>
                                      {rule.zodiac_sign === option.value && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 border-l border-[var(--line)] pl-2">
                              <button role="switch" aria-checked={rule.is_active} onClick={() => toggleRule(rule.id, rule.is_active)} className={`relative mr-1 h-6 w-11 shrink-0 rounded-full transition-colors ${rule.is_active ? "bg-[var(--ok)]" : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"}`}>
                                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${rule.is_active ? "left-6" : "left-1"}`} />
                              </button>
                              <button onClick={() => openModal(rule)} aria-label="Edit rule" className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">{Icons.edit}</button>
                              <button onClick={() => deleteRule(rule.id)} aria-label="Delete rule" className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-[var(--rose)]/10 hover:text-[var(--rose)]">{Icons.trash}</button>
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
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setShowModal(false)}>
          <div role="dialog" className="ig-pop max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingRule ? "Edit Telegram Rule" : "Add New Telegram Rule"}</h3>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1.5 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">{Icons.x}</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Day</label>
                  <select value={formData.day_of_week} onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})} className={inputClass}>
                    {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div>
                <label className={labelClass}>Zodiac (optional)</label>
                <select value={formData.zodiac_sign} onChange={(e) => setFormData({...formData, zodiac_sign: e.target.value})} className={inputClass}>
                  <option value="">🎲 Random</option>
                  {/* ✅ გასწორებულია: z.value !== null შემოწმება და as string გამოყენება */}
                  {ZODIAC_OPTIONS.filter(z => z.value !== null).map((z) => <option key={z.value as string} value={z.value as string}>{z.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Content theme</label>
                <input type="text" value={formData.content_theme} onChange={(e) => setFormData({...formData, content_theme: e.target.value})} placeholder="დატოვე ცარიელი, რომ AI-მ თავად მოიფიქროს თემა" className={inputClass} />
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