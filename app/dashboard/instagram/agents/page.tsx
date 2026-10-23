"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import InstagramPanel from "@/components/instagram/InstagramPanel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

// ============================================================
// Constants
// ============================================================

const GEORGIA_TZ = "Asia/Tbilisi";
const INSTAGRAM_DAILY_API_LIMIT = 100; // API-published posts per rolling 24h (Meta)
const POLL_INTERVAL_MS = 60000;
const AUTOPILOT_STORAGE_KEY = "ig_browser_autopilot";
const AGENT_STATUS_STORAGE_KEY = "agent_statuses";

const ALL_ZODIAC_SIGNS = [
  "ARIES", "TAURUS", "GEMINI", "CANCER", "LEO", "VIRGO",
  "LIBRA", "SCORPIO", "SAGITTARIUS", "CAPRICORN", "AQUARIUS", "PISCES",
];

const ZODIAC_GLYPHS: Record<string, string> = {
  ARIES: "♈", TAURUS: "♉", GEMINI: "♊", CANCER: "♋", LEO: "♌", VIRGO: "♍",
  LIBRA: "♎", SCORPIO: "♏", SAGITTARIUS: "♐", CAPRICORN: "♑", AQUARIUS: "♒", PISCES: "♓",
};

const DAY_NAMES = ["ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ============================================================
// Styles (scoped, plain CSS)
// ============================================================

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
.ag-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a; --ink-4:#0e1124;
  --line:rgba(236,233,247,.1); --line-2:rgba(236,233,247,.18);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --violet-soft:#b3a8ff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4; --bad:#ff7a6b;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:radial-gradient(900px 420px at 80% -8%, rgba(155,140,255,.12), transparent 62%), var(--ink);
  color:var(--moon); min-height:100vh; font-size:14px;
}
.ag-root *{box-sizing:border-box}
.ag-root *:focus-visible{outline:2px solid var(--violet);outline-offset:2px;border-radius:10px}
.ag-root button{font-family:inherit;cursor:pointer}
.ag-root button:disabled{cursor:not-allowed;opacity:.5}
.ag-mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.ag-scroll{scrollbar-width:thin;scrollbar-color:rgba(155,140,255,.3) transparent}
.ag-scroll::-webkit-scrollbar{width:6px;height:6px}
.ag-scroll::-webkit-scrollbar-thumb{background:rgba(155,140,255,.28);border-radius:99px}

.ag-header{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--line);background:rgba(11,13,28,.86);backdrop-filter:blur(14px)}
.ag-header-in{max-width:1320px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ag-back{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:99px;padding:7px 14px;color:var(--mute);text-decoration:none;font-size:13px;transition:.15s}
.ag-back:hover{color:var(--moon);border-color:var(--line-2)}
.ag-title{margin:0;font-size:20px;font-weight:600;letter-spacing:-.01em}
.ag-sub{color:var(--mute);font-size:12px;margin-top:2px}
.ag-hl{display:flex;align-items:center;gap:14px;min-width:0}
.ag-hr{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ag-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line-2);border-radius:99px;padding:7px 13px;font-size:13px;background:none;color:var(--moon)}
.ag-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);display:inline-block;flex:none}
.ag-dot.off{background:var(--mute)}
.ag-dot.warn{background:var(--amber)}
.ag-dot.bad{background:var(--bad)}
.ag-dot.pulse{animation:agpulse 1.4s ease-in-out infinite}
@keyframes agpulse{0%,100%{opacity:1}50%{opacity:.35}}

.ag-switch{position:relative;width:44px;height:24px;border-radius:99px;border:0;flex:none;transition:.2s;background:var(--ink-3);box-shadow:inset 0 0 0 1px var(--line-2)}
.ag-switch.on{background:var(--ok);box-shadow:none}
.ag-switch i{position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s}
.ag-switch.on i{left:24px}

.ag-main{max-width:1320px;margin:0 auto;padding:22px 24px 48px;display:flex;flex-direction:column;gap:18px}
.ag-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.ag-card{background:var(--ink-2);border:1px solid var(--line);border-radius:18px;padding:18px;min-width:0}
.ag-kpi-l{font-size:12px;color:var(--mute)}
.ag-kpi-v{font-size:27px;font-weight:600;letter-spacing:-.02em;margin-top:6px;line-height:1.1}
.ag-kpi-v small{font-size:14px;color:var(--mute);font-weight:400}
.ag-kpi-n{font-size:12px;margin-top:6px;color:var(--mute)}
.ag-kpi-n.ok{color:var(--ok)} .ag-kpi-n.bad{color:var(--bad)} .ag-kpi-n.warn{color:var(--amber)}
.ag-meter{height:5px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:9px}
.ag-meter b{display:block;height:100%;border-radius:99px;transition:width .4s}

.ag-grid{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;align-items:start}
.ag-col{display:flex;flex-direction:column;gap:16px;min-width:0}
.ag-side{display:flex;flex-direction:column;gap:16px;position:sticky;top:84px;min-width:0}
.ag-ch{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.ag-ch h2,.ag-ch h3{margin:0;font-size:15px;font-weight:600}
.ag-ch .ag-r{margin-left:auto;font-size:12px;color:var(--mute);display:flex;align-items:center;gap:8px}

.ag-agents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.ag-agent {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.ag-agent-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ag-ai {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--t);
  background: color-mix(in srgb, var(--t) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--t) 28%, transparent);
}
.ag-an { font-size: 15px; font-weight: 600; line-height: 1.2; }
.ag-at { font-size: 11px; color: var(--mute); text-transform: capitalize; }
.ag-ast { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.ag-ast span.l { font-size: 11px; font-weight: 600; }
.ag-agent-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--mute);
  background: rgba(255,255,255,0.02);
  padding: 8px 10px;
  border-radius: 8px;
}
.ag-agent-meta b { color: var(--moon); font-weight: 500; margin-left: 4px; }
.ag-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ag-actions .ag-btn {
  flex: 1;
  justify-content: center;
  padding: 8px 6px;
  font-size: 11px;
  white-space: nowrap;
  min-width: 0;
}
.ag-actions .ag-btn svg { width: 14px; height: 14px; flex: none; }

.ag-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.ag-day{background:var(--ink-4);border:1px solid var(--line);border-radius:12px;padding:8px;min-height:150px;display:flex;flex-direction:column;gap:6px;min-width:0}
.ag-day.today{border-color:var(--violet);box-shadow:0 0 0 1px rgba(155,140,255,.28)}
.ag-dh{display:flex;justify-content:space-between;font-size:12px;color:var(--mute);padding:2px}
.ag-dh b{color:var(--moon);font-weight:600}
.ag-ev{border-left:3px solid var(--t);background:var(--ink-3);border-radius:8px;padding:6px 8px;font-size:12px;line-height:1.3;min-width:0}
.ag-ev small{display:block;color:var(--mute);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-ev.off{opacity:.45}
.ag-ev.done{opacity:.7}
.ag-empty-day{font-size:11px;color:var(--mute);opacity:.6;padding:4px 2px}

.ag-zod {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
}
.ag-z {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 0;
  text-align: center;
  background: var(--ink-4);
  min-width: 0;
}
.ag-z .g { font-size: 16px; line-height: 1; display: block; }
.ag-z .n { font-size: 9px; color: var(--mute); margin-top: 2px; letter-spacing: .02em; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ag-z.pub { border-color: rgba(95, 214, 164, .45); background: rgba(95, 214, 164, .08); }
.ag-z.pub .n { color: var(--ok); }
.ag-z.fail { border-color: rgba(255, 122, 107, .45); background: rgba(255, 122, 107, .08); }
.ag-z.fail .n { color: var(--bad); }

.ag-feed{display:flex;flex-direction:column}
.ag-fi{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
.ag-fi:first-child{border-top:0;padding-top:0}
.ag-th{width:46px;height:57px;border-radius:9px;background:var(--ink-3);object-fit:cover;flex:none;border:1px solid var(--line)}
.ag-fm{min-width:0;flex:1}
.ag-fm b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-fm small{color:var(--mute);font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.ag-bars{display:flex;align-items:flex-end;gap:8px;height:84px}
.ag-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.ag-bar i{width:100%;border-radius:6px 6px 3px 3px;background:var(--violet);min-height:3px;display:block}
.ag-bar.today i{background:var(--ok)}
.ag-bar span{font-size:10px;color:var(--mute)}
.ag-bar em{font-size:10px;font-style:normal;color:var(--moon)}

.ag-tag{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:3px 9px;font-size:11px;font-weight:600;flex:none}
.ag-tag.ok{background:rgba(95,214,164,.14);color:var(--ok)}
.ag-tag.bad{background:rgba(255,122,107,.15);color:var(--bad)}
.ag-tag.warn{background:rgba(246,193,119,.14);color:var(--amber)}
.ag-tag.mute{background:rgba(157,155,189,.12);color:var(--mute)}
.ag-tag.violet{background:rgba(155,140,255,.15);color:var(--violet-soft)}

.ag-kv{display:flex;flex-direction:column;gap:8px}
.ag-row{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mute)}
.ag-row b{color:var(--moon);font-weight:500;text-align:right;min-width:0}
.ag-box{border:1px solid var(--line);background:var(--ink-4);border-radius:12px;padding:13px}
.ag-box.next{border-color:rgba(246,193,119,.35);background:rgba(246,193,119,.05)}
.ag-lab{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
.ag-count{font-size:22px;font-weight:600;color:var(--amber);margin-top:4px}

.ag-fail{width:100%;text-align:left;border:1px solid rgba(255,122,107,.25);background:rgba(255,122,107,.06);border-radius:11px;padding:9px 11px;color:inherit;transition:.15s}
.ag-fail:hover{background:rgba(255,122,107,.12)}
.ag-fail b{font-size:12px;font-weight:500;display:flex;justify-content:space-between;gap:8px}
.ag-fail small{display:block;color:var(--mute);font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.ag-tabs{display:inline-flex;border:1px solid var(--line);border-radius:99px;padding:3px;background:var(--ink-4);margin-bottom:12px}
.ag-tabs button{border:0;background:none;color:var(--mute);border-radius:99px;padding:5px 13px;font-size:12px;font-weight:500}
.ag-tabs button.on{background:var(--moon);color:var(--ink)}
.ag-log{height:310px;overflow-y:auto;border:1px solid var(--line);background:#080a16;border-radius:12px;padding:12px;font-size:11px;display:flex;flex-direction:column;gap:6px}
.ag-log div{line-height:1.4;word-break:break-word}
.l-bad{color:var(--bad)} .l-ok{color:var(--ok);font-weight:600} .l-warn{color:var(--amber)} .l-dbg{color:var(--violet-soft)} .l-def{color:var(--mute)}

.ag-studio{border-color:rgba(155,140,255,.35)}
.ag-note{display:flex;gap:10px;font-size:13px;color:var(--moon);line-height:1.5;border:1px solid rgba(155,140,255,.2);background:rgba(155,140,255,.05);border-radius:16px;padding:14px 16px}

.ag-modal-bg{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);padding:16px}
.ag-modal{width:100%;max-width:720px;max-height:92vh;overflow-y:auto;background:var(--ink-2);border:1px solid var(--line-2);border-radius:24px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.5)}
.ag-modal.bad{border-color:rgba(255,122,107,.35)}
.ag-mh{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.ag-mh h3{margin:0;font-size:18px;font-weight:600}
.ag-mi{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none}
.ag-x{margin-left:auto;border:0;background:none;color:var(--mute);border-radius:99px;padding:8px}
.ag-x:hover{background:rgba(255,255,255,.06);color:var(--moon)}
.ag-lbl{display:block;margin-bottom:7px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.ag-ta{width:100%;background:var(--ink);border:1px solid var(--line-2);border-radius:14px;padding:13px 15px;color:var(--moon);font:inherit;font-size:13px;line-height:1.65;resize:vertical;outline:none;transition:.15s}
.ag-ta:focus{border-color:var(--violet)}
.ag-hint{font-size:12px;color:var(--mute);margin:6px 0 0}
.ag-mf{display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}
.ag-mf .ag-btn{flex:1;justify-content:center;padding:12px}
.ag-field{border:1px solid var(--line-2);background:var(--ink-4);border-radius:12px;padding:11px 13px;font-size:13px}

@media(max-width:1100px){
  .ag-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
  .ag-grid{grid-template-columns:1fr}
  .ag-side{position:static}
}
@media(max-width:760px){
  .ag-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ag-agents-grid { grid-template-columns: 1fr; }
  .ag-week{grid-template-columns:1fr}
  .ag-day{min-height:0}
  .ag-z .g { font-size: 14px; }
  .ag-z .n { font-size: 8px; }
  .ag-main{padding:16px}
  .ag-header-in{padding:12px 16px}
}
@media(prefers-reduced-motion:reduce){.ag-root *{transition:none!important;animation:none!important}}
`;

// ============================================================
// Icons
// ============================================================

const svgProps = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" {...svgProps}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  brain: <svg width="16" height="16" viewBox="0 0 24 24" {...svgProps}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" /></svg>,
  post: <svg width="20" height="20" viewBox="0 0 24 24" {...svgProps}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>,
  story: <svg width="20" height="20" viewBox="0 0 24 24" {...svgProps}><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>,
  carousel: <svg width="20" height="20" viewBox="0 0 24 24" {...svgProps}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></svg>,
  reel: <svg width="20" height="20" viewBox="0 0 24 24" {...svgProps}><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><polyline points="20 6 9 17 4 12" /></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>,
  close: <svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M18 6L6 18M6 6l12 12" /></svg>,
  studio: <svg width="16" height="16" viewBox="0 0 24 24" {...svgProps}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><polygon points="6 4 20 12 6 20 6 4" /></svg>,
  copy: <svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
};

// ============================================================
// Types
// ============================================================

type AgentType = "post" | "story" | "carousel" | "reel";

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: "active" | "inactive";
  nextRun: string;
  lastRun: string;
  totalPosts: number;
}

interface PublishedRow {
  id: string;
  content_type: string;
  zodiac_sign: string | null;
  caption: string | null;
  image_url: string | null;
  instagram_post_id: string | null;
  status: "published" | "failed" | string;
  error_message: string | null;
  published_at: string;
}

type FailedPost = PublishedRow & { status: "failed" };

interface RuleRow {
  id?: string;
  day_of_week: number;
  time: string;
  content_type: string;
  zodiac_sign: string | null;
  content_theme: string | null;
  goal: string | null;
  is_active: boolean;
  status?: string | null;
}

interface SchedulerLogRow {
  id?: string | number;
  created_at?: string;
  status: string;
  scheduled_time: string;
  message: string;
  execution_time_ms?: number;
}

interface NextPostInfo {
  rule: RuleRow;
  nextDate: Date;
  timeRemaining: string;
}

interface DashboardData {
  published: PublishedRow[];
  rules: RuleRow[];
  accountUsername: string | null;
  accountStatus: string | null;
  schedulerLogs: SchedulerLogRow[];
}

type PostAgentHandle = { executeAutoPostSequence: (zodiacSign: string) => Promise<boolean> };

const INITIAL_AGENTS: Agent[] = [
  { id: "post-agent", name: "PostAgent", type: "post", status: "inactive", nextRun: "Monday 19:00", lastRun: "Never", totalPosts: 0 },
  { id: "story-agent", name: "StoryAgent", type: "story", status: "inactive", nextRun: "Tuesday 10:00", lastRun: "Never", totalPosts: 0 },
  { id: "carousel-agent", name: "CarouselAgent", type: "carousel", status: "inactive", nextRun: "Wednesday 12:00", lastRun: "Never", totalPosts: 0 },
  { id: "reel-agent", name: "ReelAgent", type: "reel", status: "inactive", nextRun: "Tuesday 19:00", lastRun: "Never", totalPosts: 0 },
];

const TYPE_ICONS: Record<string, JSX.Element> = {
  post: Icons.post, story: Icons.story, carousel: Icons.carousel, reel: Icons.reel,
};

const TYPE_COLORS: Record<string, string> = {
  post: "#9b8cff", story: "#f6c177", carousel: "#5fd6a4", reel: "#ff7aa8",
};

const colorVar = (type: string) => ({ ["--t" as string]: TYPE_COLORS[type] ?? "#9d9bbd" } as React.CSSProperties);

// ============================================================
// Pure helpers
// ============================================================

function georgiaDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GEORGIA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function getGeorgiaNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: GEORGIA_TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return {
    dateStr: georgiaDateStr(now),
    dayIndex: dayMap[get("weekday")] ?? 0,
    hhmm: `${get("hour")}:${get("minute")}`,
  };
}

const formatRuleTime = (time: string) => (time ? time.slice(0, 5) : "");

function getNextOccurrence(ruleDay: number, ruleTime: string, afterDate: Date): Date {
  const [hours, minutes] = ruleTime.split(":").map(Number);
  const target = new Date(afterDate);
  target.setHours(hours, minutes, 0, 0);

  const currentDayJs = afterDate.getDay();
  const currentDayCustom = currentDayJs === 0 ? 6 : currentDayJs - 1;

  const daysToAdd = (ruleDay - currentDayCustom + 7) % 7;
  target.setDate(afterDate.getDate() + daysToAdd);

  if (target.getTime() <= afterDate.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target;
}

function formatTimeRemaining(diffMs: number): string {
  if (diffMs <= 0) return "ახლავე";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours >= 24) return `${Math.floor(diffHours / 24)} დღე ${diffHours % 24}სთ`;
  if (diffHours > 0) return `${diffHours}სთ ${diffMinutes}წთ`;
  return `${diffMinutes} წუთი`;
}

function chooseSmartZodiac(ruleZodiac: string | null): string {
  if (ruleZodiac && ruleZodiac !== "ALL" && ALL_ZODIAC_SIGNS.includes(ruleZodiac)) return ruleZodiac;
  return ALL_ZODIAC_SIGNS[Math.floor(Math.random() * ALL_ZODIAC_SIGNS.length)];
}

const formatShort = (iso: string) =>
  new Date(iso).toLocaleString("ka-GE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ============================================================
// Page
// ============================================================

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isChecking, setIsChecking] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [logTab, setLogTab] = useState<"agent" | "server">("agent");

  const [data, setData] = useState<DashboardData>({ published: [], rules: [], accountUsername: null, accountStatus: null, schedulerLogs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [nextPostInfo, setNextPostInfo] = useState<NextPostInfo | null>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configAgentType, setConfigAgentType] = useState<string>("post");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [thinkingStyle, setThinkingStyle] = useState("");
  const [skills, setSkills] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [showFailedModal, setShowFailedModal] = useState(false);
  const [selectedFailedPost, setSelectedFailedPost] = useState<FailedPost | null>(null);

  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [showManualStudio, setShowManualStudio] = useState(false);

  const panelRef = useRef<PostAgentHandle | null>(null);
  const agentsRef = useRef<Agent[]>(INITIAL_AGENTS);
  const autoPilotRef = useRef(false);
  const checkingRef = useRef(false);

  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { autoPilotRef.current = autoPilotEnabled; }, [autoPilotEnabled]);

  const addAgentLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAgentLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 80));
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const [publishedRes, rulesRes, accountRes] = await Promise.all([
        supabase
          .from("published_content")
          .select("id, content_type, zodiac_sign, caption, image_url, instagram_post_id, status, error_message, published_at")
          .gte("published_at", since)
          .order("published_at", { ascending: false })
          .limit(400),
        supabase
          .from("content_schedule")
          .select("*")
          .order("day_of_week", { ascending: true })
          .order("time", { ascending: true }),
        supabase.from("instagram_accounts").select("username, status").eq("status", "active").limit(1),
      ]);

      let schedulerLogs: SchedulerLogRow[] = [];
      const ordered = await supabase.from("scheduler_logs").select("*").order("created_at", { ascending: false }).limit(25);
      if (!ordered.error && ordered.data) {
        schedulerLogs = ordered.data as SchedulerLogRow[];
      } else {
        const fallback = await supabase.from("scheduler_logs").select("*").limit(25);
        if (!fallback.error && fallback.data) schedulerLogs = fallback.data as SchedulerLogRow[];
      }

      if (publishedRes.error) addAgentLog(`❌ published_content: ${publishedRes.error.message}`);
      if (rulesRes.error) addAgentLog(`❌ content_schedule: ${rulesRes.error.message}`);

      const rules = (rulesRes.data ?? []) as RuleRow[];
      const account = (accountRes.data ?? [])[0] as { username?: string; status?: string } | undefined;

      setData({
        published: (publishedRes.data ?? []) as PublishedRow[],
        rules,
        accountUsername: account?.username ?? null,
        accountStatus: account?.status ?? null,
        schedulerLogs,
      });

      const postRules = rules.filter((r) => r.content_type === "post" && r.is_active);
      const now = new Date();
      let nextRule: (RuleRow & { nextDate: Date }) | null = null;
      let closest = Infinity;
      for (const rule of postRules) {
        const occurrence = getNextOccurrence(rule.day_of_week, rule.time, now);
        const diff = occurrence.getTime() - now.getTime();
        if (diff > 0 && diff < closest) {
          closest = diff;
          nextRule = { ...rule, nextDate: occurrence };
        }
      }
      setNextPostInfo(
        nextRule ? { rule: nextRule, nextDate: nextRule.nextDate, timeRemaining: formatTimeRemaining(nextRule.nextDate.getTime() - now.getTime()) } : null
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addAgentLog]);

  const checkAndRunPostAgent = useCallback(async (forceRun: boolean = false) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setIsChecking(true);
    addAgentLog("🔍 ვამოწმებ Master Schedule-ს...");

    try {
      const { data: lastPostData } = await supabase
        .from("published_content")
        .select("published_at")
        .eq("content_type", "post")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1);

      const lastPostDate = lastPostData && lastPostData.length > 0 ? new Date(lastPostData[0].published_at) : null;

      const { data: rules, error } = await supabase
        .from("content_schedule")
        .select("*")
        .eq("content_type", "post")
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("time", { ascending: true });

      if (error) {
        addAgentLog(`❌ შეცდომა ბაზის წაკითხვისას: ${error.message}`);
        return;
      }

      if (!rules || rules.length === 0) {
        addAgentLog(`⚠️ post ტიპის წესი საერთოდ არ არის.`);
        return;
      }

      const referenceDate = lastPostDate || new Date();
      let nextRule: any = null;
      let closestTime = Infinity;

      for (const rule of rules) {
        const occurrence = getNextOccurrence(rule.day_of_week, rule.time, referenceDate);
        if (occurrence.getTime() > referenceDate.getTime()) {
          const timeDiff = occurrence.getTime() - referenceDate.getTime();
          if (timeDiff < closestTime) {
            closestTime = timeDiff;
            nextRule = { ...rule, nextDate: occurrence };
          }
        }
      }

      if (!nextRule) {
        addAgentLog(`⚠️ შემდეგი წესი ვერ მოიძებნა.`);
        return;
      }

      const now = new Date();
      const dayName = DAY_NAMES[nextRule.day_of_week];
      addAgentLog(`📋 შემდეგი წესი: ${dayName} ${nextRule.time} - ${nextRule.content_theme || "AI will generate theme"}`);
      addAgentLog(`🎯 მიზანი: ${nextRule.goal} | ნიშანი: ${nextRule.zodiac_sign || "ALL/Random"}`);

      const isTimeReached = nextRule.nextDate.getTime() <= now.getTime();

      if (!isTimeReached && !forceRun) {
        const diffMinutes = Math.floor((nextRule.nextDate.getTime() - now.getTime()) / (1000 * 60));
        addAgentLog(`⏳ დრო ჯერ არ მოსულა. დარჩენილია: ${diffMinutes} წუთი`);
        return;
      }

      const zodiacToPost = chooseSmartZodiac(nextRule.zodiac_sign);
      addAgentLog(`🌟 არჩეული ზოდიაქო: ${zodiacToPost}`);
      addAgentLog(`🚀 ვრთავ PostAgent-ს...`);

      if (panelRef.current) {
        const success = await panelRef.current.executeAutoPostSequence(zodiacToPost);
        if (success) {
          addAgentLog("🎉 PostAgent-მა წარმატებით დაასრულა ციკლი!");
          setAgents((prev) => prev.map((a) => (a.id === "post-agent" ? { ...a, lastRun: "Just now", totalPosts: a.totalPosts + 1 } : a)));
          void refreshAll();
        } else {
          addAgentLog("❌ PostAgent-ის ციკლი ვერ დასრულდა წარმატებით.");
        }
      } else {
        addAgentLog("⚠️ InstagramPanel კომპონენტი ვერ მოიძებნა.");
      }
    } catch (error) {
      addAgentLog(`❌ კრიტიკული შეცდომა: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [addAgentLog, refreshAll]);

  useEffect(() => {
    void refreshAll();
    const liveInterval = setInterval(() => { void refreshAll(); }, POLL_INTERVAL_MS);

    try {
      const savedStatuses = localStorage.getItem(AGENT_STATUS_STORAGE_KEY);
      if (savedStatuses) {
        const parsed = JSON.parse(savedStatuses) as Record<string, "active" | "inactive">;
        setAgents((prev) => prev.map((agent) => ({ ...agent, status: parsed[agent.id] || agent.status })));
      }
      if (localStorage.getItem(AUTOPILOT_STORAGE_KEY) === "1") setAutoPilotEnabled(true);
    } catch (e) {
      console.error("Failed to load saved settings", e);
    }

    const autoInterval = setInterval(() => {
      const postAgent = agentsRef.current.find((a) => a.id === "post-agent");
      if (postAgent?.status === "active" && autoPilotRef.current) {
        void checkAndRunPostAgent(false);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(liveInterval);
      clearInterval(autoInterval);
    };
  }, [refreshAll, checkAndRunPostAgent]);

  const loadAgentConfig = async (agentType: string) => {
    const { data: config, error } = await supabase.from("agent_config").select("*").eq("agent_type", agentType).single();

    if (error) {
      console.error("Error loading config:", error);
      addAgentLog(`❌ კონფიგურაციის ჩატვირთვის შეცდომა: ${error.message}`);
      return;
    }

    if (config) {
      setMasterPrompt(config.master_prompt || "");
      setThinkingStyle(config.thinking_style || "");
      setSkills(config.skills_constraints || "");
      addAgentLog(`✅ ${agentType.toUpperCase()} კონფიგურაცია ჩაიტვირთა`);
    }
  };

  const openConfigModal = (agentType: string) => {
    setConfigAgentType(agentType);
    void loadAgentConfig(agentType);
    setShowConfigModal(true);
  };

  const saveAgentConfig = async () => {
    setIsSavingConfig(true);
    addAgentLog(`💾 ${configAgentType.toUpperCase()} კონფიგურაციის შენახვა...`);

    const { error } = await supabase
      .from("agent_config")
      .upsert(
        {
          agent_type: configAgentType,
          master_prompt: masterPrompt,
          thinking_style: thinkingStyle,
          skills_constraints: skills,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_type" }
      );

    if (error) {
      addAgentLog(`❌ შეცდომა კონფიგურაციის შენახვისას: ${error.message}`);
      console.error("Save error:", error);
    } else {
      addAgentLog(`✅ ${configAgentType.toUpperCase()} კონფიგურაცია წარმატებით შეინახა!`);
      setShowConfigModal(false);
    }
    setIsSavingConfig(false);
  };

  const toggleAgent = async (id: string) => {
    const agentToToggle = agents.find((a) => a.id === id);
    if (!agentToToggle) return;

    const newStatus: "active" | "inactive" = agentToToggle.status === "active" ? "inactive" : "active";

    const newAgents = agents.map((agent) => (agent.id === id ? { ...agent, status: newStatus } : agent));
    setAgents(newAgents);

    const statusesToSave: Record<string, "active" | "inactive"> = {};
    newAgents.forEach((a) => { statusesToSave[a.id] = a.status; });
    localStorage.setItem(AGENT_STATUS_STORAGE_KEY, JSON.stringify(statusesToSave));

    addAgentLog(`🔄 ${agentToToggle.name} ${newStatus === "active" ? "ჩაირთო" : "გაითიშა"}. განრიგის განახლება...`);

    const { error } = await supabase
      .from("content_schedule")
      .update({ is_active: newStatus === "active" })
      .eq("content_type", agentToToggle.type);

    if (error) {
      console.error("Failed to update schedule rules:", error);
      addAgentLog(`❌ შეცდომა განრიგის განახლებისას: ${error.message}`);
    } else {
      addAgentLog(`✅ ${agentToToggle.name}-ის ყველა ჩანაწერი განრიგში წარმატებით განახლდა.`);
      void refreshAll();
    }
  };

  const toggleAutoPilot = () => {
    const next = !autoPilotEnabled;
    setAutoPilotEnabled(next);
    try { localStorage.setItem(AUTOPILOT_STORAGE_KEY, next ? "1" : "0"); } catch { /* storage unavailable */ }
    addAgentLog(next ? "🤖 Browser auto-pilot ჩაირთო (მუშაობს მხოლოდ ამ გვერდის გახსნისას)" : "⏸️ Browser auto-pilot გამოირთო");
  };

  const openFailedPostDetails = (post: FailedPost) => {
    setSelectedFailedPost(post);
    setShowFailedModal(true);
  };

  const retryFailedPost = async (post: FailedPost) => {
    addAgentLog(`🔄 ვცდილობ ${post.zodiac_sign || "Unknown"} პოსტის ხელახლა გამოქვეყნებას...`);
    setShowFailedModal(false);
    if (panelRef.current && post.zodiac_sign) {
      const success = await panelRef.current.executeAutoPostSequence(post.zodiac_sign);
      if (success) {
        addAgentLog(`✅ ${post.zodiac_sign} წარმატებით დაიპოსტა (Retry)!`);
        void refreshAll();
      } else {
        addAgentLog(`❌ ${post.zodiac_sign} Retry ვერ მოხერხდა.`);
      }
    }
  };

  // ✅ ახალი: პოსტის ჩანაწერის წაშლა მონაცემთა ბაზიდან
  const handleDeletePost = async (postId: string) => {
    if (window.confirm("დარწმუნებული ხარ, რომ გინდა ამ პოსტის ჩანაწერის წაშლა ბაზიდან? (ეს არ წაშლის რეალურ პოსტს Instagram-ზე)")) {
      addAgentLog(`🗑️ იშლება პოსტის ჩანაწერი: ${postId}...`);
      const { error } = await supabase.from("published_content").delete().eq("id", postId);
      if (error) {
        addAgentLog(`❌ წაშლა ვერ მოხერხდა: ${error.message}`);
      } else {
        addAgentLog(`✅ პოსტის ჩანაწერი წარმატებით წაიშალა.`);
        void refreshAll();
      }
    }
  };

  // ✅ ახალი: ლოგების კოპირება
  const handleCopyLogs = () => {
    const logsToCopy = logTab === "agent" 
      ? agentLogs.join('\n') 
      : data.schedulerLogs.map(row => `[${row.created_at ? formatShort(row.created_at) : row.scheduled_time}] ${row.status.toUpperCase()} · ${row.message}`).join('\n');
    
    navigator.clipboard.writeText(logsToCopy);
    addAgentLog("📋 ლოგები დაკოპირდა Clipboard-ზე");
  };

  const { dateStr: todayStr, dayIndex: todayIndex, hhmm: nowHHMM } = getGeorgiaNow();
  const nowMs = Date.now();

  const published = data.published.filter((p) => p.status === "published" && p.instagram_post_id);
  const publishedToday = published.filter((p) => georgiaDateStr(new Date(p.published_at)) === todayStr);
  const publishedLast24h = published.filter((p) => nowMs - new Date(p.published_at).getTime() < 24 * 60 * 60 * 1000);
  const failedAll = data.published.filter((p) => p.status === "failed");
  const failedPosts = failedAll.filter((p) => p.content_type === "post").slice(0, 10) as FailedPost[];
  const failedToday = failedAll.filter((p) => georgiaDateStr(new Date(p.published_at)) === todayStr);

  const weekPublished = published.filter((p) => nowMs - new Date(p.published_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const weekFailed = failedAll.filter((p) => nowMs - new Date(p.published_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const successRate = weekPublished + weekFailed > 0 ? (weekPublished / (weekPublished + weekFailed)) * 100 : null;

  const todaysRules = data.rules.filter((r) => r.day_of_week === todayIndex && r.is_active);
  const apiUsed = publishedLast24h.length;
  const apiPct = Math.min(100, (apiUsed / INSTAGRAM_DAILY_API_LIMIT) * 100);
  const apiColor = apiPct >= 90 ? "var(--bad)" : apiPct >= 70 ? "var(--amber)" : "var(--ok)";

  const lastPost = published.find((p) => p.content_type === "post");
  const lastPostTime = lastPost ? formatShort(lastPost.published_at) : "არ არის";

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowMs - (6 - i) * 24 * 60 * 60 * 1000);
    const key = georgiaDateStr(d);
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", { timeZone: GEORGIA_TZ, weekday: "short" }).format(d),
      count: published.filter((p) => georgiaDateStr(new Date(p.published_at)) === key).length,
      isToday: key === todayStr,
    };
  });
  const maxBar = Math.max(1, ...last7Days.map((d) => d.count));

  const zodiacStatus = (sign: string): "pub" | "fail" | "none" => {
    if (publishedToday.some((p) => p.content_type === "post" && (p.zodiac_sign || "").toUpperCase() === sign)) return "pub";
    if (failedToday.some((p) => p.content_type === "post" && (p.zodiac_sign || "").toUpperCase() === sign)) return "fail";
    return "none";
  };

  const activeAgentsCount = agents.filter((a) => a.status === "active").length;
  const totalPostsCount = agents.reduce((sum, a) => sum + a.totalPosts, 0);
  const accountOk = data.accountStatus === "active" && !!data.accountUsername;

  const agentRules = (type: string) => data.rules.filter((r) => r.content_type === type);
  const logClass = (log: string) =>
    log.includes("❌") || log.includes("FAILURE") || log.includes("💥") ? "l-bad"
    : log.includes("✅") || log.includes("SUCCESS") || log.includes("🎉") ? "l-ok"
    : log.includes("⚠️") || log.includes("ცარიელია") ? "l-warn"
    : log.includes("🔍") || log.includes("⏳") || log.includes("📋") || log.includes("📝") ? "l-dbg"
    : "l-def";

  return (
    <div className="ag-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="ag-header">
        <div className="ag-header-in">
          <div className="ag-hl">
            <Link href="/dashboard/instagram" className="ag-back">{Icons.back}<span>Dashboard</span></Link>
            <div>
              <h1 className="ag-title">Instagram Agents</h1>
              <div className="ag-sub">Control center · Georgia time (UTC+4)</div>
            </div>
          </div>

          <div className="ag-hr">
            <span className="ag-chip" title="Active Instagram account">
              <span className={`ag-dot ${accountOk ? "" : "bad"}`} />
              {data.accountUsername ? `@${data.accountUsername.replace(/^@/, "")}` : "No active account"}
            </span>
            <button className="ag-chip" onClick={() => void refreshAll()} disabled={isRefreshing} aria-label="Refresh data">
              {Icons.refresh}{isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
            <span className="ag-chip" title="Runs only while this page is open. The server scheduler is the primary publisher.">
              <span style={{ fontSize: 12, fontWeight: 600, color: autoPilotEnabled ? "var(--ok)" : "var(--mute)" }}>Browser auto-pilot</span>
              <button
                role="switch"
                aria-checked={autoPilotEnabled}
                aria-label="Browser auto-pilot"
                className={`ag-switch ${autoPilotEnabled ? "on" : ""}`}
                onClick={toggleAutoPilot}
              ><i /></button>
            </span>
          </div>
        </div>
      </header>

      <main className="ag-main">
        <section className="ag-kpis" aria-label="Key numbers">
          <div className="ag-card">
            <div className="ag-kpi-l">Published today</div>
            <div className="ag-kpi-v ag-mono">{publishedToday.length}<small> / {todaysRules.length || "–"}</small></div>
            <div className="ag-meter"><b style={{ width: `${todaysRules.length ? Math.min(100, (publishedToday.length / todaysRules.length) * 100) : 0}%`, background: "var(--violet)" }} /></div>
          </div>
          <div className="ag-card">
            <div className="ag-kpi-l">Next post</div>
            <div className="ag-kpi-v ag-mono" style={{ fontSize: 22 }}>{nextPostInfo ? nextPostInfo.timeRemaining : "—"}</div>
            <div className="ag-kpi-n">{nextPostInfo ? `${DAY_SHORT[nextPostInfo.rule.day_of_week]} ${formatRuleTime(nextPostInfo.rule.time)}` : "No active rule"}</div>
          </div>
          <div className="ag-card">
            <div className="ag-kpi-l">API limit, rolling 24h</div>
            <div className="ag-kpi-v ag-mono">{apiUsed}<small> / {INSTAGRAM_DAILY_API_LIMIT}</small></div>
            <div className="ag-meter"><b style={{ width: `${apiPct}%`, background: apiColor }} /></div>
          </div>
          <div className="ag-card">
            <div className="ag-kpi-l">Success rate, 7 days</div>
            <div className="ag-kpi-v ag-mono">{successRate === null ? "—" : `${successRate.toFixed(1)}%`}</div>
            <div className={`ag-kpi-n ${weekFailed > 0 ? "bad" : "ok"}`}>{weekPublished} published · {weekFailed} failed</div>
          </div>
          <div className="ag-card">
            <div className="ag-kpi-l">Failed today</div>
            <div className="ag-kpi-v ag-mono" style={{ color: failedToday.length ? "var(--bad)" : undefined }}>{failedToday.length}</div>
            <div className="ag-kpi-n">{failedPosts.length ? "Needs review" : "All clear"}</div>
          </div>
          <div className="ag-card">
            <div className="ag-kpi-l">Agents active</div>
            <div className="ag-kpi-v ag-mono">{activeAgentsCount}<small> / {agents.length}</small></div>
            <div className="ag-kpi-n">{totalPostsCount} posted this session</div>
          </div>
        </section>

        <div className="ag-grid">
          <div className="ag-col">
            <div className="ag-agents-grid">
              {agents.map((agent) => {
                const rules = agentRules(agent.type);
                const activeRules = rules.filter((r) => r.is_active).length;
                return (
                  <article key={agent.id} className="ag-card ag-agent" style={colorVar(agent.type)}>
                    <div className="ag-agent-top">
                      <div className="ag-ai">{TYPE_ICONS[agent.type]}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="ag-an">{agent.name}</div>
                        <div className="ag-at">{agent.type} agent</div>
                      </div>
                      <div className="ag-ast">
                        <span className="l" style={{ color: agent.status === "active" ? "var(--ok)" : "var(--mute)" }}>
                          {agent.status === "active" ? "Active" : "Inactive"}
                        </span>
                        <button
                          role="switch"
                          aria-checked={agent.status === "active"}
                          aria-label={`${agent.status === "active" ? "Deactivate" : "Activate"} ${agent.name}`}
                          className={`ag-switch ${agent.status === "active" ? "on" : ""}`}
                          onClick={() => void toggleAgent(agent.id)}
                        ><i /></button>
                      </div>
                    </div>

                    <div className="ag-agent-meta">
                      <span>Rules<b>{activeRules} active / {rules.length}</b></span>
                      {agent.id === "post-agent" && <span>Last post<b>{lastPostTime}</b></span>}
                      {agent.id === "post-agent" && (
                        <span>Mode<b>{autoPilotEnabled ? "Browser + server" : "Server scheduler"}</b></span>
                      )}
                    </div>

                    {agent.id === "post-agent" && (
                      <div className="ag-actions">
                        <button className="ag-btn soft" onClick={() => openConfigModal("post")} title="Configure">
                          {Icons.brain} Config
                        </button>
                        <button className="ag-btn" onClick={() => setShowManualStudio((v) => !v)} title="Manual Studio">
                          {Icons.studio} {showManualStudio ? "Hide" : "Studio"}
                        </button>
                        <button className="ag-btn pri" onClick={() => void checkAndRunPostAgent(true)} disabled={isChecking} title="Run Now">
                          {Icons.play} {isChecking ? "Run..." : "Run"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <section className="ag-card ag-studio" style={{ display: showManualStudio ? "block" : "none" }} aria-label="Manual Studio">
              <div className="ag-ch">
                <h2 style={{ color: "var(--violet-soft)" }}>Manual Studio (override mode)</h2>
                <span className="ag-r"><button className="ag-btn sm" onClick={() => setShowManualStudio(false)}>Close</button></span>
              </div>
              <InstagramPanel
                ref={panelRef}
                profileUsername="@lunaraosapp"
                pushEvent={(type: string, msg: string) => addAgentLog(`[${type.toUpperCase()}] ${msg}`)}
              />
            </section>

            <section className="ag-card" aria-label="Weekly schedule">
              <div className="ag-ch">
                <h2>Weekly schedule</h2>
                <span className="ag-r">
                  {Object.entries(TYPE_COLORS).map(([type, color]) => (
                    <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 5, textTransform: "capitalize" }}>
                      <span className="ag-dot" style={{ background: color, width: 7, height: 7 }} />{type}
                    </span>
                  ))}
                </span>
              </div>
              {isLoading ? (
                <div className="ag-sub">Loading schedule…</div>
              ) : data.rules.length === 0 ? (
                <div className="ag-sub">No schedule rules yet. Add them in Master Schedule.</div>
              ) : (
                <div className="ag-week">
                  {DAY_SHORT.map((day, index) => {
                    const dayRules = data.rules.filter((r) => r.day_of_week === index);
                    const isToday = index === todayIndex;
                    return (
                      <div key={day} className={`ag-day ${isToday ? "today" : ""}`}>
                        <div className="ag-dh"><b style={isToday ? { color: "var(--violet-soft)" } : undefined}>{day}{isToday ? " · today" : ""}</b><span>{dayRules.length}</span></div>
                        {dayRules.length === 0 && <div className="ag-empty-day">No posts</div>}
                        {dayRules.map((rule, i) => {
                          const passed = isToday && formatRuleTime(rule.time) <= nowHHMM;
                          return (
                            <div
                              key={rule.id ?? `${index}-${i}`}
                              className={`ag-ev ${!rule.is_active ? "off" : passed ? "done" : ""}`}
                              style={colorVar(rule.content_type)}
                            >
                              <span className="ag-mono">{formatRuleTime(rule.time)}</span> <span style={{ textTransform: "capitalize" }}>{rule.content_type}</span>
                              <small>{rule.zodiac_sign || "Random"}{rule.content_theme ? ` · ${rule.content_theme}` : ""}</small>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="ag-card" aria-label="Zodiac coverage today">
              <div className="ag-ch">
                <h2>Zodiac coverage today</h2>
                <span className="ag-r">{ALL_ZODIAC_SIGNS.filter((s) => zodiacStatus(s) === "pub").length} / 12 published</span>
              </div>
              <div className="ag-zod">
                {ALL_ZODIAC_SIGNS.map((sign) => {
                  const s = zodiacStatus(sign);
                  return (
                    <div key={sign} className={`ag-z ${s === "pub" ? "pub" : s === "fail" ? "fail" : ""}`} title={`${sign}: ${s === "pub" ? "published" : s === "fail" ? "failed" : "not published yet"}`}>
                      <div className="g">{ZODIAC_GLYPHS[sign]}</div>
                      <div className="n">{sign.slice(0, 3)}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ag-card" aria-label="Recent posts">
              <div className="ag-ch"><h2>Recent posts</h2><span className="ag-r">Last 7 days</span></div>
              <div className="ag-bars" role="img" aria-label="Posts published per day, last 7 days" style={{ marginBottom: 16 }}>
                {last7Days.map((d) => (
                  <div key={d.key} className={`ag-bar ${d.isToday ? "today" : ""}`}>
                    <em className="ag-mono">{d.count}</em>
                    <i style={{ height: `${(d.count / maxBar) * 100}%` }} />
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="ag-feed">
                {published.length === 0 && <div className="ag-sub">No published posts in the last 7 days.</div>}
                {published.slice(0, 8).map((p) => (
                  <div key={p.id} className="ag-fi">
                    {p.image_url ? (
                      <img className="ag-th" src={p.image_url} alt="" loading="lazy" />
                    ) : (
                      <div className="ag-th" />
                    )}
                    <div className="ag-fm">
                      <b style={{ textTransform: "capitalize" }}>{p.content_type}{p.zodiac_sign ? ` · ${p.zodiac_sign}` : ""}</b>
                      <small>{p.caption ? p.caption.replace(/\s+/g, " ").slice(0, 90) : "No caption"}</small>
                      <small className="ag-mono">{formatShort(p.published_at)}</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="ag-tag ok">{Icons.check} Published</span>
                      <button 
                        className="ag-btn sm" 
                        style={{ background: 'rgba(255,122,107,0.1)', borderColor: 'rgba(255,122,107,0.3)', color: 'var(--bad)' }}
                        onClick={() => handleDeletePost(p.id)}
                        title="Delete record"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="ag-side">
            <section className="ag-card" aria-label="PostAgent timeline">
              <div className="ag-ch"><h3>PostAgent timeline</h3></div>
              <div className="ag-kv">
                <div className="ag-box">
                  <div className="ag-lab" style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ color: "var(--ok)" }}>{Icons.check}</span>ბოლო პოსტი</div>
                  <div style={{ marginTop: 6, fontWeight: 500 }}>{lastPostTime}</div>
                </div>
                <div className={`ag-box ${nextPostInfo ? "next" : ""}`}>
                  <div className="ag-lab" style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ color: "var(--amber)" }}>{Icons.clock}</span>შემდეგი პოსტი</div>
                  {nextPostInfo ? (
                    <>
                      <div className="ag-count ag-mono">{nextPostInfo.timeRemaining}</div>
                      <div className="ag-kv" style={{ marginTop: 10 }}>
                        <div className="ag-row"><span>დრო</span><b>{DAY_NAMES[nextPostInfo.rule.day_of_week]} {formatRuleTime(nextPostInfo.rule.time)}</b></div>
                        <div className="ag-row"><span>ნიშანი</span><b style={{ color: "var(--violet-soft)" }}>{nextPostInfo.rule.zodiac_sign || "Random"}</b></div>
                        <div className="ag-row"><span>მიზანი</span><b>{nextPostInfo.rule.goal || "—"}</b></div>
                        <div className="ag-row"><span>თემა</span><b>{nextPostInfo.rule.content_theme || "AI will generate"}</b></div>
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: 6, fontWeight: 500 }}>—</div>
                  )}
                </div>
              </div>
            </section>

            <section className="ag-card" aria-label="Account and API health">
              <div className="ag-ch">
                <h3>Account &amp; API health</h3>
                <span className={`ag-tag ${accountOk ? "ok" : "bad"}`} style={{ marginLeft: "auto" }}>{accountOk ? "Connected" : "Check account"}</span>
              </div>
              <div className="ag-kv">
                <div className="ag-row"><span>Account</span><b>{data.accountUsername ? `@${data.accountUsername.replace(/^@/, "")}` : "—"}</b></div>
                <div className="ag-row"><span>API posts, rolling 24h</span><b className="ag-mono">{apiUsed} / {INSTAGRAM_DAILY_API_LIMIT}</b></div>
                <div className="ag-meter" style={{ marginTop: 0 }}><b style={{ width: `${apiPct}%`, background: apiColor }} /></div>
                <div className="ag-row"><span>Remaining</span><b className="ag-mono">{Math.max(0, INSTAGRAM_DAILY_API_LIMIT - apiUsed)}</b></div>
                <div className="ag-row"><span>Auto publishing</span><b>{autoPilotEnabled ? "Browser + server" : "Server scheduler"}</b></div>
              </div>
            </section>

            {failedPosts.length > 0 && (
              <section className="ag-card" style={{ borderColor: "rgba(255,122,107,.3)" }} aria-label="Failed posts">
                <div className="ag-ch">
                  <h3 style={{ color: "var(--bad)", display: "flex", gap: 8, alignItems: "center" }}>{Icons.alert} Failed posts</h3>
                  <span className="ag-tag bad" style={{ marginLeft: "auto" }}>{failedPosts.length}</span>
                </div>
                <div className="ag-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                  {failedPosts.map((post) => (
                    <button key={post.id} className="ag-fail" onClick={() => openFailedPostDetails(post)}>
                      <b><span>{post.zodiac_sign || "Unknown"} · {formatShort(post.published_at)}</span><span style={{ color: "var(--bad)", fontSize: 11 }}>Details →</span></b>
                      <small>{post.error_message || "Unknown error"}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="ag-card" aria-label="Logs">
              <div className="ag-ch">
                <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`ag-dot ${isChecking ? "warn pulse" : ""}`} />Live logs
                </h3>
                <span className="ag-r">
                  <button className="ag-btn sm" onClick={handleCopyLogs} title="Copy logs to clipboard">
                    {Icons.copy} Copy
                  </button>
                </span>
              </div>
              <div className="ag-tabs" role="tablist" aria-label="Log source">
                <button role="tab" aria-selected={logTab === "agent"} className={logTab === "agent" ? "on" : ""} onClick={() => setLogTab("agent")}>Agent</button>
                <button role="tab" aria-selected={logTab === "server"} className={logTab === "server" ? "on" : ""} onClick={() => setLogTab("server")}>Server scheduler</button>
              </div>
              <div className="ag-log ag-scroll ag-mono">
                {logTab === "agent" ? (
                  agentLogs.length === 0 ? (
                    <div className="l-def">ლოგები გამოჩნდება აქ, როცა აგენტი ამოქმედდება...</div>
                  ) : (
                    agentLogs.map((log, i) => <div key={i} className={logClass(log)}>{log}</div>)
                  )
                ) : data.schedulerLogs.length === 0 ? (
                  <div className="l-def">Server scheduler-ის ლოგები ჯერ არ არის.</div>
                ) : (
                  data.schedulerLogs.map((row, i) => (
                    <div key={row.id ?? i} className={row.status === "failed" ? "l-bad" : row.status === "published" ? "l-ok" : "l-def"}>
                      [{row.created_at ? formatShort(row.created_at) : row.scheduled_time}] {row.status.toUpperCase()} · {row.message}
                      {row.execution_time_ms ? ` (${row.execution_time_ms}ms)` : ""}
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>

        <div className="ag-note">
          <span aria-hidden>💡</span>
          <p style={{ margin: 0 }}>
            <b style={{ color: "var(--violet-soft)" }}>How it works:</b> პოსტების ძირითადი გამომქვეყნებელია სერვერის scheduler (cron). Browser auto-pilot მუშაობს მხოლოდ მაშინ, როცა ეს გვერდი ღიაა.
            ორივეს ერთდროულად ჩართვა დუბლირებული პოსტის რისკს ზრდის, ამიტომ ნაგულისხმევად browser auto-pilot გამორთულია.
          </p>
        </div>
      </main>

      {showFailedModal && selectedFailedPost && (
        <div className="ag-modal-bg" onClick={() => setShowFailedModal(false)}>
          <div className="ag-modal bad" role="dialog" aria-modal="true" aria-label="Failed post details" onClick={(e) => e.stopPropagation()}>
            <div className="ag-mh">
              <div className="ag-mi" style={{ background: "rgba(255,122,107,.16)", color: "var(--bad)" }}>{Icons.alert}</div>
              <div>
                <h3>Failed post details</h3>
                <div className="ag-sub">{new Date(selectedFailedPost.published_at).toLocaleString("ka-GE")}</div>
              </div>
              <button className="ag-x" onClick={() => setShowFailedModal(false)} aria-label="Close">{Icons.close}</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span className="ag-lbl" style={{ color: "var(--bad)" }}>Error message</span>
                <div className="ag-field" style={{ borderColor: "rgba(255,122,107,.25)", background: "rgba(255,122,107,.06)", whiteSpace: "pre-wrap" }}>
                  {selectedFailedPost.error_message || "No error message available"}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span className="ag-lbl" style={{ color: "var(--mute)" }}>Zodiac sign</span>
                  <div className="ag-field">{selectedFailedPost.zodiac_sign || "Not specified"}</div>
                </div>
                <div>
                  <span className="ag-lbl" style={{ color: "var(--mute)" }}>Content type</span>
                  <div className="ag-field" style={{ textTransform: "capitalize" }}>{selectedFailedPost.content_type}</div>
                </div>
              </div>
            </div>

            <div className="ag-mf">
              <button className="ag-btn ok" onClick={() => void retryFailedPost(selectedFailedPost)}>{Icons.refresh} Retry this post</button>
              <button className="ag-btn" onClick={() => setShowFailedModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="ag-modal-bg" onClick={() => setShowConfigModal(false)}>
          <div className="ag-modal" style={{ maxWidth: 780 }} role="dialog" aria-modal="true" aria-label="Configure agent" onClick={(e) => e.stopPropagation()}>
            <div className="ag-mh">
              <div className="ag-mi" style={{ background: "rgba(155,140,255,.18)", color: "var(--violet-soft)" }}>{Icons.brain}</div>
              <div>
                <h3>Configure {configAgentType.toUpperCase()} Agent</h3>
                <div className="ag-sub">მართე აგენტის ქცევა და აზროვნება</div>
              </div>
              <button className="ag-x" onClick={() => setShowConfigModal(false)} aria-label="Close">{Icons.close}</button>
            </div>

            <div className="ag-scroll" style={{ display: "flex", flexDirection: "column", gap: 20, maxHeight: "62vh", overflowY: "auto", paddingRight: 6 }}>
              <div>
                <label className="ag-lbl" htmlFor="cfg-master" style={{ color: "var(--violet-soft)" }}>Master Prompt</label>
                <textarea id="cfg-master" className="ag-ta" style={{ minHeight: 170 }} value={masterPrompt} onChange={(e) => setMasterPrompt(e.target.value)} placeholder="მთავარი ინსტრუქცია აგენტისთვის..." />
                <p className="ag-hint">ეს არის აგენტის მთავარი პიროვნება და მიზანი</p>
              </div>
              <div>
                <label className="ag-lbl" htmlFor="cfg-think" style={{ color: "var(--amber)" }}>Thinking Style</label>
                <textarea id="cfg-think" className="ag-ta" style={{ minHeight: 140 }} value={thinkingStyle} onChange={(e) => setThinkingStyle(e.target.value)} placeholder="როგორ ფიქრობს აგენტი..." />
                <p className="ag-hint">აზროვნების სტილი და მიდგომა</p>
              </div>
              <div>
                <label className="ag-lbl" htmlFor="cfg-skills" style={{ color: "var(--ok)" }}>Skills &amp; Constraints</label>
                <textarea id="cfg-skills" className="ag-ta" style={{ minHeight: 140 }} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="უნარები და შეზღუდვები..." />
                <p className="ag-hint">რა შეუძლია და რა არ შეუძლია აგენტს</p>
              </div>
            </div>

            <div className="ag-mf">
              <button className="ag-btn" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="ag-btn pri" onClick={() => void saveAgentConfig()} disabled={isSavingConfig}>{isSavingConfig ? "Saving…" : "Save configuration"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}