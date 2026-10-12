// /home/carvisronini-ux/lunara-os/components/agent-jobs-modal.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  use_ai_image?: boolean | null; // ✅ ახალი ველი
  created_at?: string;
  [key: string]: unknown;
}

interface AgentJobsModalProps {
  agentType: string;
  isOpen: boolean;
  onClose: () => void;
  onLog: (msg: string) => void;
}

type EditableField = "description" | "image_prompt_logic" | "use_ai_image"; // ✅ განახლებული ტიპი

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
      return { icon: "☀️", accent: "#F6BD60", soft: "rgba(246,189,96,.12)", border: "rgba(246,189,96,.30)", label: "დღის ენერგია" };
    case "daily_horoscope_12_signs":
      return { icon: "♈", accent: "#B9A2FF", soft: "rgba(185,162,255,.12)", border: "rgba(185,162,255,.30)", label: "12 ნიშნის ჰოროსკოპი" };
    case "daily_horoscope_single":
      return { icon: "✦", accent: "#7DCBFF", soft: "rgba(125,203,255,.12)", border: "rgba(125,203,255,.30)", label: "ერთი ნიშნის ჰოროსკოპი" };
    case "daily_tarot_card":
      return { icon: "✧", accent: "#F3A6D5", soft: "rgba(243,166,213,.12)", border: "rgba(243,166,213,.30)", label: "ტაროს ბარათი" };
    case "morning_question":
      return { icon: "🌅", accent: "#75D9B0", soft: "rgba(117,217,176,.12)", border: "rgba(117,217,176,.30)", label: "დილის კითხვა" };
    case "evening_reflection":
      return { icon: "🌙", accent: "#B9B8FF", soft: "rgba(185,184,255,.12)", border: "rgba(185,184,255,.30)", label: "საღამოს რეფლექსია" };
    case "weekly_start_message":
      return { icon: "✦", accent: "#84B9FF", soft: "rgba(132,185,255,.12)", border: "rgba(132,185,255,.30)", label: "კვირის დასაწყისი" };
    case "monthly_start_themes":
      return { icon: "🌌", accent: "#D0A7FF", soft: "rgba(208,167,255,.12)", border: "rgba(208,167,255,.30)", label: "თვის თემები" };
    default:
      return { icon: "✧", accent: "#C5C9D8", soft: "rgba(197,201,216,.10)", border: "rgba(197,201,216,.25)", label: postType.replace(/_/g, " ") };
  }
};

const POST_TYPE_OPTIONS = [
  { value: "daily_energy", label: "დღის ენერგია" },
  { value: "daily_horoscope_12_signs", label: "12 ნიშნის ჰოროსკოპი" },
  { value: "daily_horoscope_single", label: "ერთი ნიშნის ჰოროსკოპი" },
  { value: "daily_tarot_card", label: "ტაროს ბარათი" },
  { value: "morning_question", label: "დილის კითხვა" },
  { value: "evening_reflection", label: "საღამოს რეფლექსია" },
  { value: "weekly_start_message", label: "კვირის დასაწყისი" },
  { value: "monthly_start_themes", label: "თვის თემები" },
];

export default function AgentJobsModal({ agentType, isOpen, onClose, onLog }: AgentJobsModalProps) {
  const [agentJobs, setAgentJobs] = useState<AgentJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSavingJob, setIsSavingJob] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create form states
  const [newJobName, setNewJobName] = useState("");
  const [newJobPostType, setNewJobPostType] = useState("daily_energy");
  const [newJobDescription, setNewJobDescription] = useState("");
  const [newJobImageLogic, setNewJobImageLogic] = useState("");
  const [newJobUseAiImage, setNewJobUseAiImage] = useState(true); // ✅ ახალი
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const onLogRef = useRef(onLog);
  const requestIdRef = useRef(0);
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

      if (requestId !== requestIdRef.current) return;

      if (error) {
        console.error("[AgentJobsModal] Supabase error:", error);
        setLoadError(`დავალებების ჩატვირთვა ვერ მოხერხდა: ${error.message}`);
        onLogRef.current(`❌ ${agentType}-ის დავალებების ჩატვირთვის შეცდომა: ${error.message}`);
        return;
      }

      const jobs = (data || []) as AgentJob[];
      setAgentJobs(jobs);
      setSelectedJobId(null);
      onLogRef.current(`✅ ${agentType}-ის დავალებები ჩაიტვირთა (${jobs.length})`);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      const message = error instanceof Error ? error.message : "უცნობი ქსელური შეცდომა";
      console.error("[AgentJobsModal] Unexpected error:", error);
      setLoadError(`მოულოდნელი შეცდომა: ${message}`);
      onLogRef.current(`❌ დავალებების ჩატვირთვის შეცდომა: ${message}`);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [agentType]);

  useEffect(() => {
    if (!isOpen || !agentType) return;
    void loadAgentJobs();
    return () => {
      requestIdRef.current += 1;
    };
  }, [isOpen, agentType, loadAgentJobs]);

  const saveJob = useCallback(
    async (jobId: string, field: EditableField, value: string | boolean) => { // ✅ განახლებული ტიპი
      const saveKey = `${jobId}:${field}`;
      if (savingRef.current.has(saveKey)) return;

      savingRef.current.add(saveKey);
      setIsSavingJob(jobId);
      setSaveSuccess(false);

      try {
        const { error } = await supabase
          .from("agent_jobs")
          .update({ [field]: value })
          .eq("id", jobId);

        if (error) {
          console.error("[AgentJobsModal] Save error:", error);
          onLogRef.current(`❌ დავალების შენახვის შეცდომა: ${error.message}`);
          return;
        }

        setAgentJobs((previous) =>
          previous.map((job) =>
            job.id === jobId ? { ...job, [field]: value } : job
          )
        );

        const fieldName = field === "description" ? "აღწერა" : field === "image_prompt_logic" ? "ფოტოს გენერაციის ლოგიკა" : "AI ფოტოს გენერაცია";
        onLogRef.current(`✅ "${fieldName}" წარმატებით შეინახა ბაზაში!`);
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);

      } catch (error) {
        const message = error instanceof Error ? error.message : "უცნობი შეცდომა";
        console.error("[AgentJobsModal] Save exception:", error);
        onLogRef.current(`❌ დავალების შენახვის შეცდომა: ${message}`);
      } finally {
        savingRef.current.delete(saveKey);
        setIsSavingJob((current) => (current === jobId ? null : current));
      }
    },
    []
  );

  const createNewJob = useCallback(async () => {
    if (!newJobName.trim()) {
      onLogRef.current("❌ დავალების სახელი სავალდებულოა");
      return;
    }

    setIsCreatingJob(true);
    try {
      const { data, error } = await supabase
        .from("agent_jobs")
        .insert({
          agent_type: agentType,
          job_name: newJobName.trim(),
          post_type: newJobPostType,
          description: newJobDescription.trim() || null,
          image_prompt_logic: newJobImageLogic.trim() || null,
          use_ai_image: newJobUseAiImage, // ✅ ახალი
        })
        .select()
        .single();

      if (error) {
        console.error("[AgentJobsModal] Create error:", error);
        onLogRef.current(`❌ ახალი დავალების შექმნის შეცდომა: ${error.message}`);
        return;
      }

      setAgentJobs((prev) => [...prev, data as AgentJob]);
      onLogRef.current(`✅ ახალი დავალება "${newJobName}" წარმატებით შეიქმნა`);

      setNewJobName("");
      setNewJobPostType("daily_energy");
      setNewJobDescription("");
      setNewJobImageLogic("");
      setNewJobUseAiImage(true); // ✅ რესეტი
      setShowCreateForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "უცნობი შეცდომა";
      console.error("[AgentJobsModal] Create exception:", error);
      onLogRef.current(`❌ ახალი დავალების შექმნის შეცდომა: ${message}`);
    } finally {
      setIsCreatingJob(false);
    }
  }, [agentType, newJobName, newJobPostType, newJobDescription, newJobImageLogic, newJobUseAiImage]);

  const selectedJob = agentJobs.find((job) => job.id === selectedJobId);
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-40 h-80 w-80 rounded-full bg-violet-500/[0.09] blur-[100px]" />
          <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-amber-400/[0.05] blur-[100px]" />
        </div>

        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-violet-300/20 bg-violet-400/[0.12] text-xl text-violet-200">
              {isEditing ? "✎" : showCreateForm ? "+" : "✧"}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                {isEditing
                  ? "დავალების რედაქტირება"
                  : showCreateForm
                  ? "ახალი დავალების შექმნა"
                  : "აგენტის სამუშაო სქემა"}
              </h2>

              <p className="mt-1 truncate text-[11px] text-white/40 sm:text-xs">
                {isEditing
                  ? "ინსტრუქციები და გენერაციის ლოგიკა"
                  : showCreateForm
                  ? "შეავსე ახალი დავალების დეტალები"
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          {isLoading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-300/15 border-t-violet-300" />
                <span className="text-lg text-violet-200">✧</span>
              </div>
              <p className="text-sm text-white/65">დავალებები იტვირთება...</p>
              <p className="text-xs text-white/30">Supabase-თან კავშირი</p>
            </div>
          ) : loadError ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-400/[0.08] text-2xl text-rose-300">!</div>
              <h3 className="mt-4 text-base font-semibold text-white">ჩატვირთვა ვერ მოხერხდა</h3>
              <p className="mt-2 max-w-md break-words text-sm leading-6 text-white/50">{loadError}</p>
              <p className="mt-2 max-w-md text-xs leading-5 text-white/35">
                შეამოწმე Supabase-ის გარემოს ცვლადები, ცხრილის არსებობა და წვდომის (RLS) პოლიტიკა.
              </p>
              <button
                type="button"
                onClick={() => void loadAgentJobs()}
                className="mt-5 rounded-xl border border-violet-300/20 bg-violet-400/[0.12] px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-400/[0.2]"
              >
                ხელახლა ცდა
              </button>
            </div>
          ) : agentJobs.length === 0 && !showCreateForm ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl text-white/50">✧</div>
              <h3 className="text-base font-semibold text-white/85">დავალებები ვერ მოიძებნა</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/40">
                ამ აგენტისთვის `agent_jobs` ცხრილში ჩანაწერები არ დაბრუნებულა.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => void loadAgentJobs()}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/10"
                >
                  ხელახლა ჩატვირთვა
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-xl border border-violet-300/20 bg-violet-400/[0.12] px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-400/[0.2]"
                >
                  + ახალი დავალება
                </button>
              </div>
            </div>
          ) : isEditing && selectedJob ? (
            <div className="mx-auto max-w-4xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedJobId(null);
                  setSaveSuccess(false);
                }}
                className="mb-5 inline-flex items-center gap-2 rounded-lg py-2 pr-3 text-sm text-violet-300 transition hover:text-violet-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                    <p className="mt-1 break-words text-xs text-white/40">{selectedJob.post_type}</p>
                  </div>

                  {isSavingJob === selectedJob.id && (
                    <span className="flex shrink-0 items-center gap-2 text-xs text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                      ინახება...
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="agent-job-description" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✎</span>
                      დავალების აღწერა
                    </label>
                    <p className="mb-3 text-xs leading-5 text-white/40">
                      განსაზღვრე, რა უნდა გააკეთოს აგენტმა ამ დავალების შესრულებისას.
                    </p>
                    <textarea
                      id="agent-job-description"
                      value={selectedJob.description || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAgentJobs((previous) =>
                          previous.map((job) =>
                            job.id === selectedJob.id ? { ...job, description: value } : job
                          )
                        );
                      }}
                      onBlur={(event) => void saveJob(selectedJob.id, "description", event.target.value)}
                      className="min-h-[140px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 text-sm leading-6 text-white/85 outline-none transition placeholder:text-white/25 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/[0.07]"
                      placeholder="აღწერე დავალების მიზანი და შესრულების წესები..."
                    />
                  </div>

                  {/* ✅ ახალი: AI ფოტოს გენერაციის ჩართვა/გამორთვის ღილაკი */}
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.09] bg-[#080811]/80 p-4">
                    <div>
                      <h4 className="text-sm font-medium text-white/85">AI ფოტოს გენერაცია</h4>
                      <p className="text-xs text-white/40">თუ გამორთულია, სისტემა ავტომატურად გამოიყენებს სარეზერვო სტატიკურ სურათს.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveJob(selectedJob.id, "use_ai_image", !(selectedJob.use_ai_image ?? true))}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                        (selectedJob.use_ai_image ?? true) ? "bg-emerald-500" : "bg-gray-600"
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        (selectedJob.use_ai_image ?? true) ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>

                  <div className={(selectedJob.use_ai_image ?? true) ? "opacity-100" : "opacity-40 pointer-events-none transition-opacity"}>
                    <label htmlFor="agent-job-image-logic" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✧</span>
                      ფოტოს გენერაციის ლოგიკა
                    </label>
                    <p className="mb-3 text-xs leading-5 text-white/40">
                      ინსტრუქცია, რომლითაც AI შექმნის პოსტისთვის ვიზუალურ პრომპტს.
                    </p>
                    <textarea
                      id="agent-job-image-logic"
                      value={selectedJob.image_prompt_logic || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAgentJobs((previous) =>
                          previous.map((job) =>
                            job.id === selectedJob.id ? { ...job, image_prompt_logic: value } : job
                          )
                        );
                      }}
                      onBlur={(event) => void saveJob(selectedJob.id, "image_prompt_logic", event.target.value)}
                      className="min-h-[180px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 font-mono text-[13px] leading-6 text-emerald-100/80 outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-300/[0.06]"
                      placeholder="მიუთითე ვიზუალური სტილი, კომპოზიცია, განათება და სხვა მოთხოვნები..."
                    />
                  </div>

                  <div className="flex gap-3 border-t border-white/[0.07] pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJobId(null);
                        setSaveSuccess(false);
                      }}
                      className="flex-1 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
                    >
                      გაუქმება
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedJobId) return;
                        const job = agentJobs.find((j) => j.id === selectedJobId);
                        if (job) {
                          void saveJob(selectedJobId, "description", job.description || "");
                          void saveJob(selectedJobId, "image_prompt_logic", job.image_prompt_logic || "");
                          void saveJob(selectedJobId, "use_ai_image", job.use_ai_image ?? true);
                        }
                      }}
                      disabled={isSavingJob === selectedJobId || saveSuccess}
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        saveSuccess
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-200"
                          : "border-emerald-300/20 bg-emerald-400/[0.12] text-emerald-100 hover:bg-emerald-400/[0.2]"
                      } disabled:opacity-50`}
                    >
                      {isSavingJob === selectedJobId
                        ? "ინახება..."
                        : saveSuccess
                        ? "✅ წარმატებით შეინახა!"
                        : "💾 შენახვა"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : showCreateForm ? (
            <div className="mx-auto max-w-4xl">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSaveSuccess(false);
                }}
                className="mb-5 inline-flex items-center gap-2 rounded-lg py-2 pr-3 text-sm text-violet-300 transition hover:text-violet-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6M9 12h12" />
                </svg>
                სქემაზე დაბრუნება
              </button>

              <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 sm:p-6">
                <div className="mb-6 flex items-start gap-3 border-b border-white/[0.07] pb-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/[0.12] text-2xl text-violet-200">+</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-semibold text-white sm:text-xl">ახალი დავალების შექმნა</h3>
                    <p className="mt-1 break-words text-xs text-white/40">შეავსე ყველა საჭირო ველი</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="new-job-name" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✎</span>
                      დავალების სახელი *
                    </label>
                    <input
                      id="new-job-name"
                      type="text"
                      value={newJobName}
                      onChange={(event) => setNewJobName(event.target.value)}
                      className="w-full rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 text-sm leading-6 text-white/85 outline-none transition placeholder:text-white/25 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/[0.07]"
                      placeholder="მაგ: დღის ჰოროსკოპი ვერძისთვის"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-job-post-type" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✧</span>
                      პოსტის ტიპი *
                    </label>
                    <select
                      id="new-job-post-type"
                      value={newJobPostType}
                      onChange={(event) => setNewJobPostType(event.target.value)}
                      className="w-full rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 text-sm leading-6 text-white/85 outline-none transition focus:border-violet-300/40 focus:ring-2 focus:ring-violet-300/[0.07]"
                    >
                      {POST_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ ახალი: შექმნის ფორმაშიც Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.09] bg-[#080811]/80 p-4">
                    <div>
                      <h4 className="text-sm font-medium text-white/85">AI ფოტოს გენერაცია</h4>
                      <p className="text-xs text-white/40">ჩართულია ნაგულისხმევად.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewJobUseAiImage(!newJobUseAiImage)}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                        newJobUseAiImage ? "bg-emerald-500" : "bg-gray-600"
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        newJobUseAiImage ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>

                  <div className={newJobUseAiImage ? "opacity-100" : "opacity-40 pointer-events-none transition-opacity"}>
                    <label htmlFor="new-job-image-logic" className="mb-2.5 flex items-center gap-2 text-sm font-medium text-white/85">
                      <span className="text-base">✧</span>
                      ფოტოს გენერაციის ლოგიკა
                    </label>
                    <textarea
                      id="new-job-image-logic"
                      value={newJobImageLogic}
                      onChange={(event) => setNewJobImageLogic(event.target.value)}
                      className="min-h-[140px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#080811]/80 px-4 py-3.5 font-mono text-[13px] leading-6 text-emerald-100/80 outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:ring-2 focus:ring-emerald-300/[0.06]"
                      placeholder="მიუთითე ვიზუალური სტილი, კომპოზიცია, განათება და სხვა მოთხოვნები..."
                    />
                  </div>

                  <div className="flex gap-3 border-t border-white/[0.07] pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setSaveSuccess(false);
                      }}
                      className="flex-1 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
                    >
                      გაუქმება
                    </button>

                    <button
                      type="button"
                      onClick={createNewJob}
                      disabled={isCreatingJob || !newJobName.trim()}
                      className="flex-1 rounded-xl border border-violet-300/20 bg-violet-400/[0.12] px-4 py-3 text-sm font-medium text-violet-100 transition hover:bg-violet-400/[0.2] disabled:opacity-50"
                    >
                      {isCreatingJob ? "იქმნება..." : "✨ დავალების შექმნა"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[1020px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h3 className="text-sm font-medium text-white/85">სამუშაოების რუკა</h3>
                  <p className="mt-1 text-[11px] text-white/35">
                    აირჩიე დავალება მისი ინსტრუქციების სანახავად.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <span className="text-[11px] text-white/55">{agentJobs.length} დავალება</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-400/[0.12] px-3 py-1.5 text-[11px] font-medium text-violet-100 transition hover:bg-violet-400/[0.2]"
                  >
                    <span className="text-sm">+</span>
                    ახალი დავალება
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {agentJobs.map((job) => {
                  const style = getJobStyle(job.post_type);

                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setSaveSuccess(false);
                      }}
                      className="group relative flex min-w-0 items-center gap-3 rounded-xl border bg-[#11111e]/95 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-[#191929] hover:shadow-[0_8px_28px_rgba(0,0,0,.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"
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

                        <p className="mt-0.5 truncate text-[10px] text-white/40">{style.label}</p>

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
              </div>
            </div>
          )}
        </main>

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
                ? "ცვლილებები ინახება ველიდან გამოსვლისას ან Save ღილაკით"
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