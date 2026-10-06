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

export default function MasterSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // ფორმის მდგომარეობა ახალი წესისთვის
  const [newRule, setNewRule] = useState({
    day_of_week: 0,
    time: "09:00",
    content_type: "post",
    zodiac_sign: "",
    content_theme: "",
    goal: "Engagement",
  });

  // 1. მონაცემების წამოღება ბაზიდან
  useEffect(() => {
    fetchSchedule();
  }, []);

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

  // 2. წესის ჩართვა/გამორთვა
  const toggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("content_schedule")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      setSchedule((prev) =>
        prev.map((rule) => (rule.id === id ? { ...rule, is_active: !currentStatus } : rule))
      );
    }
  };

  // 3. წესის წაშლა
  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    const { error } = await supabase.from("content_schedule").delete().eq("id", id);
    if (!error) {
      setSchedule((prev) => prev.filter((rule) => rule.id !== id));
    }
  };

  // 4. ახალი წესის დამატება
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("content_schedule")
      .insert([{ ...newRule, zodiac_sign: newRule.zodiac_sign || null, is_active: true }])
      .select();

    if (!error && data) {
      setSchedule((prev) => [...prev, data[0]].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.time.localeCompare(b.time);
      }));
      setShowAddModal(false);
      setNewRule({ day_of_week: 0, time: "09:00", content_type: "post", zodiac_sign: "", content_theme: "", goal: "Engagement" });
    }
  };

  const activeRulesCount = schedule.filter((r) => r.is_active).length;

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
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
            {Icons.plus} Add Rule
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex justify-center py-20 text-[var(--mute)]">Loading schedule...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                <p className="text-xs font-medium text-[var(--mute)]">Active Rules</p>
                <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{activeRulesCount} <span className="text-sm font-normal text-[var(--mute)]">/ {schedule.length}</span></p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                <p className="text-xs font-medium text-[var(--mute)]">Total Weekly Output</p>
                <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{schedule.length} <span className="text-sm font-normal text-[var(--mute)]">Items</span></p>
              </div>
            </div>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day, index) => {
                const dayRules = schedule.filter((r) => r.day_of_week === index);
                if (dayRules.length === 0) return null;

                return (
                  <div key={day} className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] overflow-hidden">
                    <div className="border-b border-[var(--line)] bg-[var(--ink-3)]/50 px-4 py-3">
                      <h3 className="text-sm font-semibold text-[var(--violet)]">{day}</h3>
                    </div>
                    <div className="divide-y divide-[var(--line)]">
                      {dayRules.map((rule) => {
                        const TypeIcon = TYPE_ICONS[rule.content_type];
                        const colorClass = TYPE_COLORS[rule.content_type];
                        return (
                          <div key={rule.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                            <div className="w-16 shrink-0 font-mono text-sm font-medium text-[var(--moon)]">{rule.time}</div>
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
                            <div className="hidden shrink-0 sm:block">
                              <span className="rounded-full bg-[var(--ink)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)] border border-[var(--line-2)]">{rule.goal}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleRule(rule.id, rule.is_active)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${rule.is_active ? "bg-[var(--ok)]" : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"}`}>
                                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${rule.is_active ? "left-6" : "left-1"}`} />
                              </button>
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
          </>
        )}
      </main>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Add New Schedule Rule</h3>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Day</label>
                  <select value={newRule.day_of_week} onChange={(e) => setNewRule({...newRule, day_of_week: parseInt(e.target.value)})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
                    {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Time</label>
                  <input type="time" value={newRule.time} onChange={(e) => setNewRule({...newRule, time: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Type</label>
                  <select value={newRule.content_type} onChange={(e) => setNewRule({...newRule, content_type: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                    <option value="carousel">Carousel</option>
                    <option value="reel">Reel</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Zodiac (Optional)</label>
                  <select value={newRule.zodiac_sign} onChange={(e) => setNewRule({...newRule, zodiac_sign: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
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
                <input type="text" value={newRule.content_theme} onChange={(e) => setNewRule({...newRule, content_theme: e.target.value})} placeholder="e.g., Daily Habit, Red Flags" className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]" required />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--mute)]">Primary Goal</label>
                <select value={newRule.goal} onChange={(e) => setNewRule({...newRule, goal: e.target.value})} className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]">
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
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl border border-[var(--line-2)] py-2.5 text-sm font-semibold transition-colors hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-[var(--violet)] py-2.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}