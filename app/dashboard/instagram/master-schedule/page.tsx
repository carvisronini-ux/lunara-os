// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/master-schedule/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

// ვიზუალური სტილები (იგივე, რაც მთავარ გვერდზე)
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

// იკონები
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

// LUNARA V1 BASELINE SCHEDULE DATA
const INITIAL_SCHEDULE = [
  // Monday (0)
  { id: "1", day_of_week: 0, time: "09:00", content_type: "story", zodiac_sign: null, content_theme: "Audience Data", goal: "Engagement", is_active: true },
  { id: "2", day_of_week: 0, time: "13:00", content_type: "story", zodiac_sign: null, content_theme: "Quiz / Poll", goal: "Engagement", is_active: true },
  { id: "3", day_of_week: 0, time: "19:00", content_type: "post", zodiac_sign: "ARIES", content_theme: "Daily Habit / Featured", goal: "Habit", is_active: true },
  { id: "4", day_of_week: 0, time: "21:30", content_type: "story", zodiac_sign: null, content_theme: "Retention Check", goal: "Retention", is_active: true },
  // Tuesday (1)
  { id: "5", day_of_week: 1, time: "10:00", content_type: "story", zodiac_sign: null, content_theme: "Interaction", goal: "Engagement", is_active: true },
  { id: "6", day_of_week: 1, time: "15:00", content_type: "story", zodiac_sign: null, content_theme: "Quiz", goal: "Engagement", is_active: true },
  { id: "7", day_of_week: 1, time: "19:00", content_type: "reel", zodiac_sign: null, content_theme: "Discovery Hook", goal: "Discovery", is_active: true },
  { id: "8", day_of_week: 1, time: "21:30", content_type: "story", zodiac_sign: null, content_theme: "Engagement", goal: "Engagement", is_active: true },
  // Wednesday (2)
  { id: "9", day_of_week: 2, time: "09:00", content_type: "story", zodiac_sign: null, content_theme: "Warm-up", goal: "Engagement", is_active: true },
  { id: "10", day_of_week: 2, time: "12:00", content_type: "carousel", zodiac_sign: null, content_theme: "Saves / Shares", goal: "Saves", is_active: true },
  { id: "11", day_of_week: 2, time: "18:00", content_type: "reel", zodiac_sign: null, content_theme: "Maximum Reach", goal: "Discovery", is_active: true },
  { id: "12", day_of_week: 2, time: "21:30", content_type: "story", zodiac_sign: null, content_theme: "Engagement", goal: "Engagement", is_active: true },
  // Thursday (3)
  { id: "13", day_of_week: 3, time: "09:00", content_type: "post", zodiac_sign: "SCORPIO", content_theme: "Featured Sign", goal: "Engagement", is_active: true },
  { id: "14", day_of_week: 3, time: "13:00", content_type: "story", zodiac_sign: null, content_theme: "Poll", goal: "Engagement", is_active: true },
  { id: "15", day_of_week: 3, time: "18:00", content_type: "story", zodiac_sign: null, content_theme: "Interaction", goal: "Engagement", is_active: true },
  { id: "16", day_of_week: 3, time: "20:00", content_type: "story", zodiac_sign: null, content_theme: "Post Traffic", goal: "Traffic", is_active: true },
  // Friday (4)
  { id: "17", day_of_week: 4, time: "11:00", content_type: "story", zodiac_sign: null, content_theme: "Interaction", goal: "Engagement", is_active: true },
  { id: "18", day_of_week: 4, time: "17:00", content_type: "story", zodiac_sign: null, content_theme: "Community", goal: "Engagement", is_active: true },
  { id: "19", day_of_week: 4, time: "20:00", content_type: "post", zodiac_sign: "ALL", content_theme: "Zodiac Red Flags 🚩", goal: "Shares", is_active: true },
  { id: "20", day_of_week: 4, time: "22:00", content_type: "story", zodiac_sign: null, content_theme: "UGC / Replies", goal: "Engagement", is_active: true },
  // Saturday (5)
  { id: "21", day_of_week: 5, time: "11:00", content_type: "story", zodiac_sign: null, content_theme: "Engagement", goal: "Engagement", is_active: true },
  { id: "22", day_of_week: 5, time: "16:00", content_type: "story", zodiac_sign: null, content_theme: "Interactive", goal: "Engagement", is_active: true },
  { id: "23", day_of_week: 5, time: "20:00", content_type: "reel", zodiac_sign: null, content_theme: "Discovery", goal: "Discovery", is_active: true },
  { id: "24", day_of_week: 5, time: "22:00", content_type: "story", zodiac_sign: null, content_theme: "Engagement", goal: "Engagement", is_active: true },
  // Sunday (6)
  { id: "25", day_of_week: 6, time: "10:00", content_type: "story", zodiac_sign: null, content_theme: "Retention", goal: "Retention", is_active: true },
  { id: "26", day_of_week: 6, time: "15:00", content_type: "story", zodiac_sign: null, content_theme: "Research / Data", goal: "Data", is_active: true },
  { id: "27", day_of_week: 6, time: "19:00", content_type: "carousel", zodiac_sign: null, content_theme: "Weekly Horoscope", goal: "Saves", is_active: true },
  { id: "28", day_of_week: 6, time: "21:30", content_type: "story", zodiac_sign: null, content_theme: "Next-week Return", goal: "Retention", is_active: true },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TYPE_COLORS = {
  post: "text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--violet)]/20",
  story: "text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20",
  carousel: "text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/20",
  reel: "text-[var(--rose)] bg-[var(--rose)]/10 border-[var(--rose)]/20",
};

const TYPE_ICONS = {
  post: Icons.post,
  story: Icons.story,
  carousel: Icons.carousel,
  reel: Icons.reel,
};

export default function MasterSchedulePage() {
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  const toggleRule = (id: string) => {
    setSchedule((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, is_active: !rule.is_active } : rule
      )
    );
  };

  const activeRulesCount = schedule.filter((r) => r.is_active).length;
  const nextPost = schedule.find((r) => r.is_active); // Simplified for demo

  return (
    <div className="ig-root min-h-screen">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/dashboard/instagram"
              className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]"
            >
              {Icons.back}
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Master Schedule</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block">LUNARA Growth System V1 Baseline</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
            {Icons.plus} Add Rule
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
            <p className="text-xs font-medium text-[var(--mute)]">Active Rules</p>
            <p className="mt-1 text-2xl font-bold text-[var(--moon)]">{activeRulesCount} <span className="text-sm font-normal text-[var(--mute)]">/ {schedule.length}</span></p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
            <p className="text-xs font-medium text-[var(--mute)]">Weekly Output</p>
            <p className="mt-1 text-2xl font-bold text-[var(--moon)]">8 <span className="text-sm font-normal text-[var(--mute)]">Feed/Reels</span> + 21 <span className="text-sm font-normal text-[var(--mute)]">Stories</span></p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
            <p className="text-xs font-medium text-[var(--mute)]">Next Scheduled</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ok)]">
              {nextPost ? `${nextPost.time} · ${nextPost.content_type} (${nextPost.content_theme})` : "None"}
            </p>
          </div>
        </div>

        {/* Weekly Timeline */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day, index) => {
            const dayRules = schedule.filter((r) => r.day_of_week === index).sort((a, b) => a.time.localeCompare(b.time));
            if (dayRules.length === 0) return null;

            return (
              <div key={day} className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] overflow-hidden">
                <div className="border-b border-[var(--line)] bg-[var(--ink-3)]/50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--violet)]">{day}</h3>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {dayRules.map((rule) => {
                    const TypeIcon = TYPE_ICONS[rule.content_type as keyof typeof TYPE_ICONS];
                    const colorClass = TYPE_COLORS[rule.content_type as keyof typeof TYPE_COLORS];
                    
                    return (
                      <div key={rule.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                        {/* Time */}
                        <div className="w-16 shrink-0 font-mono text-sm font-medium text-[var(--moon)]">
                          {rule.time}
                        </div>

                        {/* Type & Theme */}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}>
                            {TypeIcon}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--moon)]">
                              {rule.content_type.charAt(0).toUpperCase() + rule.content_type.slice(1)}
                              {rule.zodiac_sign && rule.zodiac_sign !== "ALL" && (
                                <span className="ml-2 text-[var(--violet)]">· {rule.zodiac_sign}</span>
                              )}
                              {rule.zodiac_sign === "ALL" && (
                                <span className="ml-2 text-[var(--rose)]">· ALL SIGNS</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-[var(--mute)]">{rule.content_theme}</p>
                          </div7>
                        </div>

                        {/* Goal Badge */}
                        <div className="hidden shrink-0 sm:block">
                          <span className="rounded-full bg-[var(--ink)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--mute)] border border-[var(--line-2)]">
                            {rule.goal}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleRule(rule.id)}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                              rule.is_active ? "bg-[var(--ok)]" : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"
                            }`}
                          >
                            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${rule.is_active ? "left-6" : "left-1"}`} />
                          </button>
                          <button className="rounded-lg p-1.5 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
                            {Icons.edit}
                          </button>
                          <button className="rounded-lg p-1.5 text-[var(--mute)] transition-colors hover:bg-[var(--rose)]/10 hover:text-[var(--rose)]">
                            {Icons.trash}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Optimization Notice */}
        <div className="rounded-2xl border border-[var(--violet)]/20 bg-[var(--violet)]/5 p-4 text-center">
          <p className="text-sm text-[var(--violet)]">
            🧠 <span className="font-semibold">AI Auto-Optimization:</span> Currently in Baseline Mode. After 4 weeks of data collection, the system will suggest time/theme adjustments based on actual Reach & Saves.
          </p>
        </div>

      </main>
    </div>
  );
}