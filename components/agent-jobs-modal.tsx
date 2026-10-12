"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

interface AgentJob {
  id: string;
  agent_type: string;
  job_name: string;
  post_type: string;
  description?: string | null;
  image_prompt_logic?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

interface AgentJobsModalProps {
  agentType: string;
  isOpen: boolean;
  onClose: () => void;
  onLog: (msg: string) => void;
}

const JOB_POSITIONS = [
  { x: 166, y: 100 },
  { x: 833, y: 100 },
  { x: 166, y: 300 },
  { x: 833, y: 300 },
  { x: 166, y: 500 },
  { x: 833, y: 500 },
];

export default function AgentJobsModal({
  agentType,
  isOpen,
  onClose,
  onLog,
}: AgentJobsModalProps) {
  const [agentJobs, setAgentJobs] = useState<AgentJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSavingJob, setIsSavingJob] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAgentJobs = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("agent_jobs")
      .select("*")
      .eq("agent_type", agentType)
      .order("created_at", { ascending: true });

    if (error) {
      onLog(`❌ დავალებების ჩატვირთვის შეცდომა: ${error.message}`);
    } else {
      setAgentJobs((data || []) as AgentJob[]);
      onLog(`✅ ${agentType}-ის დავალებები ჩაიტვირთა`);
    }

    setIsLoading(false);
  }, [agentType, onLog]);

  useEffect(() => {
    if (isOpen && agentType) {
      setSelectedJobId(null);
      void loadAgentJobs();
    }
  }, [isOpen, agentType, loadAgentJobs]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedJobId) {
          setSelectedJobId(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedJobId, onClose]);

  const saveJob = async (
    jobId: string,
    field: "description" | "image_prompt_logic",
    value: string
  ) => {
    setIsSavingJob(jobId);

    const { error } = await supabase
      .from("agent_jobs")
      .update({ [field]: value })
      .eq("id", jobId);

    if (error) {
      onLog(`❌ დავალების შენახვის შეცდომა: ${error.message}`);
    } else {
      setAgentJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, [field]: value } : job
        )
      );
      onLog("✅ დავალება წარმატებით შეინახა!");
    }

    setIsSavingJob(null);
  };

  const selectedJob = agentJobs.find((job) => job.id === selectedJobId);

  const getJobStyle = (postType: string) => {
    switch (postType) {
      case "daily_energy":
        return {
          icon: "☀️",
          accent: "#F6BD60",
          soft: "rgba(246,189,96,.12)",
          border: "rgba(246,189,96,.3)",
          label: "დღის ენერგია",
        };
      case "daily_horoscope_12_signs":
        return {
          icon: "♈",
          accent: "#B9A2FF",
          soft: "rgba(185,162,255,.12)",
          border: "rgba(185,162,255,.3)",
          label: "12 ნიშნის ჰოროსკოპი",
        };
      case "daily_horoscope_single":
        return {
          icon: "✦",
          accent: "#7DCBFF",
          soft: "rgba(125,203,255,.12)",
          border: "rgba(125,203,255,.3)",
          label: "ერთი ნიშნის ჰოროსკოპი",
        };
      case "daily_tarot_card":
        return {
          icon: "🃏",
          accent: "#F3A6D5",
          soft: "rgba(243,166,213,.12)",
          border: "rgba(243,166,213,.3)",
          label: "ტაროს ბარათი",
        };
      case "morning_question":
        return {
          icon: "🌅",
          accent: "#75D9B0",
          soft: "rgba(117,217,176,.12)",
          border: "rgba(117,217,176,.3)",
          label: "დილის კითხვა",
        };
      case "evening_reflection":
        return {
          icon: "🌙",
          accent: "#B9B8FF",
          soft: "rgba(185,184,255,.12)",
          border: "rgba(185,184,255,.3)",
          label: "საღამოს რეფლექსია",
        };
      default:
        return {
          icon: "✧",
          accent: "#C5C9D8",
          soft: "rgba(197,201,216,.1)",
          border: "rgba(197,201,216,.25)",
          label: postType.replace(/_/g, " "),
        };
    }
  };

  if (!isOpen) return null;

  const agentName = agentType.replace(/_/g, " ");
  const isEditing = Boolean(selectedJobId && selectedJob);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050a]/80 p-2 backdrop-blur-xl sm:p-5"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="აგენტის დავალებების მართვა"
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[96dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0d0d17] shadow-[0_30px_120px_rgba(0,0,0,.65)] sm:rounded-[28px]"
      >
        {/* Subtle ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-40 h-80 w-80 rounded-full bg-violet-500/[0.09] blur-[100px]" />
          <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-amber-400/[0.05] blur-[100px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-violet-300/20 bg-violet-400/[0.12] text-lg text-violet-200">
              {isEditing ? "✎" : "✧"}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                {isEditing ? "დავალების რედაქტირება" : "აგენტის სამუშაო სქემა"}
              </h2>
              <p className="mt-1 truncate text-[11px] text-white/40 sm:text-xs">
                {isEditing
                  ? "ინსტრუქციები და გენერაციის ლოგიკა"
                  : `${agentName} · სამუშაოების კავშირი`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="დახურვა"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Main content */}
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          {isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-300/15 border-t-violet-300" />
              <p className="text-sm text-white/45">დავალებები იტვირთება...</p>
            </div>
          ) : agentJobs.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl text-white/50">
                ✧
              </div>
              <h3 className="text-base font-semibold text-white/85">
                დავალებები ჯერ არ არის
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/40">
                ამ აგენტისთვის `agent_jobs` ცხრილში დავალებები ვერ მოიძებნა.
              </p>
              <button
                type="button"
                onClick={() => void loadAgentJobs()}
                className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/10"
              >
                ხელახლა ჩატვირთვა
              </button>
            </div>
          ) : isEditing && selectedJob ? (
            /* EDITOR */
            <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                type="button"
                onClick={() => setSelectedJobId(null)}
                className="mb-5 inline-flex items-center gap-2 rounded-lg py-2 pr-3 text-sm text-violet-300 transition hover:text-violet-200"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6M9 12h12" />
                </svg>
                სქემაზე დაბრუნება
              </button>

              <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 sm:p-6">
                <div className="mb-6 flex items-start gap-3 border-b border-white/[0.07] pb-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                    style={{
                      background: getJobStyle(selectedJob.post_type).soft,
                      color: getJobStyle(selectedJob.post_type).accent,
                    }}
                  >
                    {getJobStyle(selectedJob.post_type).icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-white sm:text-xl">
                      {selectedJob.job_name}
                    </h3>
                    <p className="mt-1 break-words text-xs text-white/40">
                      {selectedJob.post_type}
                    </p>
                  </div>

                  {isSavingJob === selectedJob.id && (
                    <span className="flex shrink-0 items-center gap-2 text-xs text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                      ინახება
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✎</span>
                      დავალების აღწერა
                    </label>
                    <p className="mb-3 text-xs leading-5 text-white/40">
                      განსაზღვრე, რა უნდა გააკეთოს აგენტმა ამ დავალების
                      შესრულებისას.
                    </p>
                    <textarea
                      value={selectedJob.description || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAgentJobs((prev) =>
                          prev.map((job) =>
                            job.id === selectedJob.id
                              ? { ...job, description: value }
                              : job
                          )
                        );
                      }}
                      onBlur={(event) =>
                        void saveJob(
                          selectedJob.id,
                          "description",
                          event.target.value
                        )
                      }
                      className="min-h-[140px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 text-sm leading-6 text-white/85 outline-none transition placeholder:text-white/25 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/[0.07]"
                      placeholder="აღწერე დავალების მიზანი და შესრულების წესები..."
                    />
                  </div>

                  <div>
                    <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✧</span>
                      ფოტოს გენერაციის ლოგიკა
                    </label>
                    <p className="mb-3 text-xs leading-5 text-white/40">
                      ინსტრუქცია, რომლითაც AI შექმნის პოსტისთვის ვიზუალურ
                      პრომპტს.
                    </p>
                    <textarea
                      value={selectedJob.image_prompt_logic || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAgentJobs((prev) =>
                          prev.map((job) =>
                            job.id === selectedJob.id
                              ? { ...job, image_prompt_logic: value }
                              : job
                          )
                        );
                      }}
                      onBlur={(event) =>
                        void saveJob(
                          selectedJob.id,
                          "image_prompt_logic",
                          event.target.value
                        )
                      }
                      className="min-h-[180px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 font-mono text-[13px] leading-6 text-emerald-100/80 outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-300/[0.06]"
                      placeholder="მიუთითე ვიზუალური სტილი, კომპოზიცია, განათება და სხვა მოთხოვნები..."
                    />
                    <p className="mt-2.5 flex items-center gap-2 text-[11px] text-white/35">
                      <span className="text-emerald-300">●</span>
                      შენახვა ავტომატურად იწყება ველიდან გამოსვლისას.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* HUB & SPOKE SCHEMA */
            <div className="mx-auto max-w-[1020px]">
              {/* Legend */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h3 className="text-sm font-medium text-white/85">
                    სამუშაოების რუკა
                  </h3>
                  <p className="mt-1 text-[11px] text-white/35">
                    აირჩიე ნებისმიერი დავალება მისი ინსტრუქციების სანახავად.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  <span className="text-[11px] text-white/55">
                    {agentJobs.length} დავალება
                  </span>
                </div>
              </div>

              {/* Desktop radial layout */}
              <div className="relative hidden min-h-[510px] overflow-hidden rounded-2xl border border-white/[0.055] bg-[#090912]/70 md:block">
                {/* Decorative grid */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.13]"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(190,175,255,.5) .7px, transparent .7px)",
                    backgroundSize: "19px 19px",
                  }}
                />

                {/* Soft center glow */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/[0.055] blur-[65px]" />

                {/* Connection lines */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 1000 600"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="agentConnectionGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#B9A2FF" stopOpacity=".45" />
                      <stop offset="100%" stopColor="#F6BD60" stopOpacity=".35" />
                    </linearGradient>
                  </defs>

                  {agentJobs.slice(0, 6).map((job, index) => {
                    const point = JOB_POSITIONS[index];
                    if (!point) return null;

                    return (
                      <g key={`connection-${job.id}`}>
                        <line
                          x1="500"
                          y1="300"
                          x2={point.x}
                          y2={point.y}
                          stroke="url(#agentConnectionGradient)"
                          strokeWidth="1.5"
                          strokeDasharray="4 7"
                          opacity=".8"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="3"
                          fill="#B9A2FF"
                          fillOpacity=".8"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Six compact cards around the central agent */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-2 p-3">
                  {agentJobs.slice(0, 6).map((job, index) => {
                    const style = getJobStyle(job.post_type);

                    const positionClasses = [
                      "col-start-1 row-start-1",
                      "col-start-3 row-start-1",
                      "col-start-1 row-start-2",
                      "col-start-3 row-start-2",
                      "col-start-1 row-start-3",
                      "col-start-3 row-start-3",
                    ];

                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className={`group relative z-10 flex w-full max-w-[205px] min-w-0 items-center gap-3 rounded-[15px] border bg-[#11111e]/95 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-[#191929] hover:shadow-[0_8px_28px_rgba(0,0,0,.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 ${positionClasses[index]}`}
                        style={{
                          borderColor: style.border,
                        }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition group-hover:scale-105"
                          style={{
                            background: style.soft,
                            color: style.accent,
                          }}
                        >
                          {style.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[12px] font-semibold leading-5 text-white/90">
                            {job.job_name}
                          </h4>
                          <p className="mt-0.5 truncate text-[10px] text-white/40">
                            {style.label}
                          </p>
                          <p
                            className="mt-1.5 text-[10px] font-medium transition group-hover:opacity-100"
                            style={{ color: style.accent, opacity: 0.8 }}
                          >
                            რედაქტირება ↗
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Central agent card */}
                  <div className="relative z-20 col-start-2 row-start-2 flex w-full max-w-[220px] items-center justify-center">
                    <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-amber-300/[0.10] to-violet-400/[0.12] blur-xl" />

                    <div className="relative w-full rounded-[19px] border border-amber-200/25 bg-gradient-to-b from-[#24202a] to-[#11111b] p-4 text-center shadow-[0_12px_45px_rgba(0,0,0,.35)]">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border border-amber-200/20 bg-amber-200/[0.10] text-2xl shadow-inner shadow-amber-200/[0.04]">
                        ☀️
                      </div>

                      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-200/65">
                        CENTRAL AGENT
                      </p>

                      <h4 className="mt-1.5 break-words text-[12px] font-bold uppercase leading-5 tracking-wide text-white sm:text-[13px]">
                        {agentName}
                      </h4>

                      <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border border-amber-200/15 bg-amber-200/[0.055] px-2.5 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(246,189,96,.7)]" />
                        <span className="text-[10px] font-medium text-amber-100/80">
                          {agentJobs.length} დავალება
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer label */}
                <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center">
                  <span className="rounded-full border border-white/[0.05] bg-[#090912]/80 px-3 py-1 text-[9px] tracking-wide text-white/25">
                    AGENT WORKFLOW · SINGLE SOURCE OF TRUTH
                  </span>
                </div>
              </div>

              {/* Mobile layout: compact central agent + small task cards */}
              <div className="md:hidden">
                <div className="relative mb-4 overflow-hidden rounded-2xl border border-amber-200/20 bg-gradient-to-br from-[#24202a] to-[#11111b] p-4">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/[0.07] blur-3xl" />

                  <div className="relative flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-200/15 bg-amber-200/[0.09] text-2xl">
                      ☀️
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200/65">
                        CENTRAL AGENT
                      </p>
                      <h4 className="mt-1 break-words text-sm font-bold uppercase text-white">
                        {agentName}
                      </h4>
                    </div>

                    <span className="shrink-0 rounded-full border border-amber-200/15 bg-amber-200/[0.06] px-2.5 py-1 text-[10px] text-amber-100/80">
                      {agentJobs.length} jobs
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex items-center justify-between px-1">
                  <h4 className="text-xs font-medium text-white/75">
                    დავალებები
                  </h4>
                  <span className="text-[10px] text-white/35">
                    აირჩიე რედაქტირებისთვის
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                  {agentJobs.map((job) => {
                    const style = getJobStyle(job.post_type);

                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className="group flex min-w-0 items-center gap-3 rounded-xl border bg-[#11111e] p-3 text-left transition hover:bg-[#191929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
                        style={{ borderColor: style.border }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                          style={{
                            background: style.soft,
                            color: style.accent,
                          }}
                        >
                          {style.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white/90">
                            {job.job_name}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-white/40">
                            {style.label}
                          </p>
                        </div>

                        <span className="text-xs text-white/25 transition group-hover:text-white/70">
                          ↗
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {agentJobs.length > 6 && (
                <p className="mt-3 text-center text-[11px] text-amber-200/70">
                  შენიშვნა: ცენტრალურ სქემაზე ნაჩვენებია პირველი 6 დავალება.
                  დანარჩენი დავალებები მობილურ განლაგებაში ჩანს.
                </p>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-2 text-[10px] text-white/35 sm:text-xs">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/80" />
            <span className="truncate">
              {isEditing
                ? "ცვლილებები ინახება ავტომატურად"
                : "აგენტისა და დავალებების კავშირი"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
          >
            დახურვა
          </button>
        </footer>
      </section>
    </div>
  );
}