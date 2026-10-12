// /home/carvisronini-ux/lunara-os/components/agent-jobs-modal.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
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

type EditableField = "description" | "image_prompt_logic";

interface JobStyle {
  icon: string;
  accent: string;
  soft: string;
  border: string;
  label: string;
}

const getJobStyle = (postType: string): JobStyle => {
  switch (postType) {
    case "daily_energy":
      return {
        icon: "☀️",
        accent: "#F6BD60",
        soft: "rgba(246,189,96,.12)",
        border: "rgba(246,189,96,.30)",
        label: "დღის ენერგია",
      };

    case "daily_horoscope_12_signs":
      return {
        icon: "♈",
        accent: "#B9A2FF",
        soft: "rgba(185,162,255,.12)",
        border: "rgba(185,162,255,.30)",
        label: "12 ნიშნის ჰოროსკოპი",
      };

    case "daily_horoscope_single":
      return {
        icon: "✦",
        accent: "#7DCBFF",
        soft: "rgba(125,203,255,.12)",
        border: "rgba(125,203,255,.30)",
        label: "ერთი ნიშნის ჰოროსკოპი",
      };

    case "daily_tarot_card":
      return {
        icon: "✧",
        accent: "#F3A6D5",
        soft: "rgba(243,166,213,.12)",
        border: "rgba(243,166,213,.30)",
        label: "ტაროს ბარათი",
      };

    case "morning_question":
      return {
        icon: "🌅",
        accent: "#75D9B0",
        soft: "rgba(117,217,176,.12)",
        border: "rgba(117,217,176,.30)",
        label: "დილის კითხვა",
      };

    case "evening_reflection":
      return {
        icon: "🌙",
        accent: "#B9B8FF",
        soft: "rgba(185,184,255,.12)",
        border: "rgba(185,184,255,.30)",
        label: "საღამოს რეფლექსია",
      };

    case "weekly_start_message":
      return {
        icon: "✦",
        accent: "#84B9FF",
        soft: "rgba(132,185,255,.12)",
        border: "rgba(132,185,255,.30)",
        label: "კვირის დასაწყისი",
      };

    case "monthly_start_themes":
      return {
        icon: "🌌",
        accent: "#D0A7FF",
        soft: "rgba(208,167,255,.12)",
        border: "rgba(208,167,255,.30)",
        label: "თვის თემები",
      };

    default:
      return {
        icon: "✧",
        accent: "#C5C9D8",
        soft: "rgba(197,201,216,.10)",
        border: "rgba(197,201,216,.25)",
        label: postType.replace(/_/g, " "),
      };
  }
};

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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep the latest logger without making the data-loading effect rerun.
  const onLogRef = useRef(onLog);

  // Prevent stale requests from overwriting newer data.
  const requestIdRef = useRef(0);

  // Track which field is currently being saved.
  const savingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  const loadAgentJobs = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("agent_jobs")
        .select("*")
        .eq("agent_type", agentType)
        .order("created_at", { ascending: true });

      // Ignore the result if a newer request has started.
      if (requestId !== requestIdRef.current) return;

      if (error) {
        console.error("[AgentJobsModal] Supabase error:", error);

        setLoadError(
          `დავალებების ჩატვირთვა ვერ მოხერხდა: ${error.message}`
        );

        onLogRef.current(
          `❌ ${agentType}-ის დავალებების ჩატვირთვის შეცდომა: ${error.message}`
        );

        return;
      }

      const jobs = (data || []) as AgentJob[];

      setAgentJobs(jobs);
      setSelectedJobId(null);

      onLogRef.current(
        `✅ ${agentType}-ის დავალებები ჩაიტვირთა (${jobs.length})`
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      const message =
        error instanceof Error
          ? error.message
          : "უცნობი ქსელური შეცდომა";

      console.error("[AgentJobsModal] Unexpected error:", error);

      setLoadError(`მოულოდნელი შეცდომა: ${message}`);

      onLogRef.current(
        `❌ დავალებების ჩატვირთვის შეცდომა: ${message}`
      );
    } finally {
      // Only the latest request can end the loading state.
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [agentType]);

  // This effect depends on a stable loader.
  // Changing the parent's onLog callback will not trigger another request.
  useEffect(() => {
    if (!isOpen || !agentType) return;

    void loadAgentJobs();

    return () => {
      // Invalidate requests still running after close or agent change.
      requestIdRef.current += 1;
    };
  }, [isOpen, agentType, loadAgentJobs]);

  const saveJob = useCallback(
    async (
      jobId: string,
      field: EditableField,
      value: string
    ) => {
      const saveKey = `${jobId}:${field}`;

      if (savingRef.current.has(saveKey)) return;

      savingRef.current.add(saveKey);
      setIsSavingJob(jobId);

      try {
        const { error } = await supabase
          .from("agent_jobs")
          .update({ [field]: value })
          .eq("id", jobId);

        if (error) {
          console.error("[AgentJobsModal] Save error:", error);

          onLogRef.current(
            `❌ დავალების შენახვის შეცდომა: ${error.message}`
          );

          return;
        }

        setAgentJobs((previous) =>
          previous.map((job) =>
            job.id === jobId
              ? { ...job, [field]: value }
              : job
          )
        );

        onLogRef.current(
          `✅ "${field === "description" ? "აღწერა" : "ფოტოს გენერაციის ლოგიკა"}" შენახულია`
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "უცნობი შეცდომა";

        console.error("[AgentJobsModal] Save exception:", error);

        onLogRef.current(
          `❌ დავალების შენახვის შეცდომა: ${message}`
        );
      } finally {
        savingRef.current.delete(saveKey);

        setIsSavingJob((current) =>
          current === jobId ? null : current
        );
      }
    },
    []
  );

  const selectedJob = agentJobs.find(
    (job) => job.id === selectedJobId
  );

  const isEditing = Boolean(selectedJob);

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedJobId) {
          setSelectedJobId(null);
        } else {
          closeModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedJobId, closeModal]);

  if (!isOpen) return null;

  const agentName = agentType.replace(/_/g, " ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050a]/85 p-2 backdrop-blur-xl sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="აგენტის დავალებების მართვა"
        className="relative flex max-h-[96dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#0d0d17] shadow-[0_30px_120px_rgba(0,0,0,.65)] sm:rounded-[28px]"
      >
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-40 h-80 w-80 rounded-full bg-violet-500/[0.09] blur-[100px]" />
          <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-amber-400/[0.05] blur-[100px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-violet-300/20 bg-violet-400/[0.12] text-xl text-violet-200">
              {isEditing ? "✎" : "✧"}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                {isEditing
                  ? "დავალების რედაქტირება"
                  : "აგენტის სამუშაო სქემა"}
              </h2>

              <p className="mt-1 truncate text-[11px] text-white/40 sm:text-xs">
                {isEditing
                  ? "ინსტრუქციები და გენერაციის ლოგიკა"
                  : `${agentName} · სამუშაოების მართვა`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
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
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-300/15 border-t-violet-300" />
                <span className="text-lg text-violet-200">✧</span>
              </div>

              <p className="text-sm text-white/65">
                დავალებები იტვირთება...
              </p>

              <p className="text-xs text-white/30">
                Supabase-თან კავშირი
              </p>
            </div>
          ) : loadError ? (
            /* Error state */
            <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-400/[0.08] text-2xl text-rose-300">
                !
              </div>

              <h3 className="mt-4 text-base font-semibold text-white">
                ჩატვირთვა ვერ მოხერხდა
              </h3>

              <p className="mt-2 max-w-md break-words text-sm leading-6 text-white/50">
                {loadError}
              </p>

              <p className="mt-2 max-w-md text-xs leading-5 text-white/35">
                შეამოწმე Supabase-ის გარემოს ცვლადები, ცხრილის
                არსებობა და წვდომის (RLS) პოლიტიკა.
              </p>

              <button
                type="button"
                onClick={() => void loadAgentJobs()}
                className="mt-5 rounded-xl border border-violet-300/20 bg-violet-400/[0.12] px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-400/[0.2]"
              >
                ხელახლა ცდა
              </button>
            </div>
          ) : agentJobs.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl text-white/50">
                ✧
              </div>

              <h3 className="text-base font-semibold text-white/85">
                დავალებები ვერ მოიძებნა
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-white/40">
                ამ აგენტისთვის `agent_jobs` ცხრილში ჩანაწერები
                არ დაბრუნებულა.
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
            /* Editor */
            <div className="mx-auto max-w-4xl">
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
                    <h3 className="break-words text-lg font-semibold text-white sm:text-xl">
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
                  {/* Description */}
                  <div>
                    <label
                      htmlFor="agent-job-description"
                      className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85"
                    >
                      <span className="text-base">✎</span>
                      დავალების აღწერა
                    </label>

                    <p className="mb-3 text-xs leading-5 text-white/40">
                      განსაზღვრე, რა უნდა გააკეთოს აგენტმა ამ
                      დავალების შესრულებისას.
                    </p>

                    <textarea
                      id="agent-job-description"
                      value={selectedJob.description || ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setAgentJobs((previous) =>
                          previous.map((job) =>
                            job.id === selectedJob.id
                              ? { ...job, description: value }
                              : job
                          )
                        );
                      }}
                      onBlur={(event) => {
                        void saveJob(
                          selectedJob.id,
                          "description",
                          event.target.value
                        );
                      }}
                      className="min-h-[140px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 text-sm leading-6 text-white/85 outline-none transition placeholder:text-white/25 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/[0.07]"
                      placeholder="აღწერე დავალების მიზანი და შესრულების წესები..."
                    />
                  </div>

                  {/* Image prompt logic */}
                  <div>
                    <label
                      htmlFor="agent-job-image-logic"
                      className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85"
                    >
                      <span className="text-base">✧</span>
                      ფოტოს გენერაციის ლოგიკა
                    </label>

                    <p className="mb-3 text-xs leading-5 text-white/40">
                      ინსტრუქცია, რომლითაც AI შექმნის პოსტისთვის
                      ვიზუალურ პრომპტს.
                    </p>

                    <textarea
                      id="agent-job-image-logic"
                      value={selectedJob.image_prompt_logic || ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setAgentJobs((previous) =>
                          previous.map((job) =>
                            job.id === selectedJob.id
                              ? { ...job, image_prompt_logic: value }
                              : job
                          )
                        );
                      }}
                      onBlur={(event) => {
                        void saveJob(
                          selectedJob.id,
                          "image_prompt_logic",
                          event.target.value
                        );
                      }}
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
            /* Hub & Spoke layout */
            <div className="mx-auto max-w-[1020px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h3 className="text-sm font-medium text-white/85">
                    სამუშაოების რუკა
                  </h3>

                  <p className="mt-1 text-[11px] text-white/35">
                    აირჩიე დავალება მისი ინსტრუქციების სანახავად.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span className="text-[11px] text-white/55">
                    {agentJobs.length} დავალება
                  </span>
                </div>
              </div>

              {/* Desktop diagram: six cards surrounding the agent */}
              <div className="relative hidden min-h-[510px] overflow-hidden rounded-2xl border border-white/[0.055] bg-[#090912]/70 md:block">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.13]"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(190,175,255,.5) .7px, transparent .7px)",
                    backgroundSize: "19px 19px",
                  }}
                />

                <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/[0.055] blur-[65px]" />

                {/* Lines */}
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
                      <stop
                        offset="0%"
                        stopColor="#B9A2FF"
                        stopOpacity=".45"
                      />
                      <stop
                        offset="100%"
                        stopColor="#F6BD60"
                        stopOpacity=".35"
                      />
                    </linearGradient>
                  </defs>

                  {agentJobs.slice(0, 6).map((job, index) => {
                    const points = [
                      { x: 166, y: 100 },
                      { x: 833, y: 100 },
                      { x: 166, y: 300 },
                      { x: 833, y: 300 },
                      { x: 166, y: 500 },
                      { x: 833, y: 500 },
                    ];

                    const point = points[index];

                    if (!point) return null;

                    return (
                      <g key={`line-${job.id}`}>
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
                        style={{ borderColor: style.border }}
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
                            className="mt-1.5 text-[10px] font-medium opacity-80 transition group-hover:opacity-100"
                            style={{ color: style.accent }}
                          >
                            რედაქტირება ↗
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Central agent */}
                  <div className="relative z-20 col-start-2 row-start-2 flex w-full max-w-[220px] items-center justify-center">
                    <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-amber-300/[0.10] to-violet-400/[0.12] blur-xl" />

                    <div className="relative w-full rounded-[19px] border border-amber-200/25 bg-gradient-to-b from-[#24202a] to-[#11111b] p-4 text-center shadow-[0_12px_45px_rgba(0,0,0,.35)]">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border border-amber-200/20 bg-amber-200/[0.10] text-2xl">
                        ☀️
                      </div>

                      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-200/65">
                        CENTRAL AGENT
                      </p>

                      <h4 className="mt-1.5 break-words text-[12px] font-bold uppercase leading-5 tracking-wide text-white">
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

                <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center">
                  <span className="rounded-full border border-white/[0.05] bg-[#090912]/80 px-3 py-1 text-[9px] tracking-wide text-white/25">
                    AGENT WORKFLOW · SINGLE SOURCE OF TRUTH
                  </span>
                </div>
              </div>

              {/* Mobile layout */}
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
                  ცენტრალურ სქემაზე ნაჩვენებია პირველი 6 დავალება.
                  ყველა დავალება ხელმისაწვდომია მობილურ განლაგებაში.
                </p>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-2 text-[10px] text-white/35 sm:text-xs">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                loadError
                  ? "bg-rose-300"
                  : isLoading
                    ? "animate-pulse bg-amber-300"
                    : "bg-emerald-300/80"
              }`}
            />

            <span className="truncate">
              {loadError
                ? "ჩატვირთვის შეცდომა"
                : isLoading
                  ? "იტვირთება..."
                  : isEditing
                    ? "ცვლილებები ინახება ველიდან გამოსვლისას"
                    : "აგენტისა და დავალებების კავშირი"}
            </span>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="shrink-0 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
          >
            დახურვა
          </button>
        </footer>
      </section>
    </div>
  );
}