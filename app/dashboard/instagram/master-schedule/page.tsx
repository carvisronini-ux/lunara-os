// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/master-schedule/page.tsx
"use client";

import { useEffect, useState } from "react";
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

const Icon = {
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

export default function MasterSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from("content_schedule")
        .select("*")
        .order("day_of_week")
        .order("time");
      
      if (error) throw error;
      setSchedule(data || []);
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="ig-root min-h-screen">
      <style>{STYLES}</style>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/dashboard/instagram"
              className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]"
            >
              {Icon.back}
              <span className="hidden sm:inline">Back to Instagram</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">Master Schedule</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">
                Automated posting schedule for LUNARA
              </p>
            </div>
          </div>

          <button className="flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-3.5 py-1.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90">
            {Icon.plus} Add Schedule Rule
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-[var(--mute)]">Loading schedule...</p>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--line-2)] px-6 py-12 text-center">
            <p className="font-medium">No schedule rules yet</p>
            <p className="max-w-xs text-sm text-[var(--mute)]">
              Create your first automated posting rule to start scheduling content.
            </p>
            <button className="mt-1 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
              Add Schedule Rule
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {daysOfWeek.map((day, index) => {
              const daySchedule = schedule.filter((item) => item.day_of_week === index);
              if (daySchedule.length === 0) return null;

              return (
                <div key={day} className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--violet)]">{day}</h3>
                  <div className="space-y-2">
                    {daySchedule.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-[var(--line-2)] bg-[var(--ink)] p-3"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm text-[var(--mute)]">{item.time}</span>
                          <div>
                            <p className="text-sm font-medium">
                              {item.content_type}
                              {item.zodiac_sign && ` · ${item.zodiac_sign}`}
                            </p>
                            <p className="text-xs text-[var(--mute)]">{item.content_theme}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-[var(--ok)]/10 px-2 py-1 text-xs text-[var(--ok)]">
                          {item.goal}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}