// /home/carvisronini-ux/lunara-os/components/agent-jobs-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

interface AgentJobsModalProps {
  agentType: string;
  isOpen: boolean;
  onClose: () => void;
  onLog: (msg: string) => void;
}

export default function AgentJobsModal({ 
  agentType, 
  isOpen, 
  onClose, 
  onLog 
}: AgentJobsModalProps) {
  const [agentJobs, setAgentJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSavingJob, setIsSavingJob] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && agentType) {
      setSelectedJobId(null); // Reset selection when modal opens
      loadAgentJobs();
    }
  }, [isOpen, agentType]);

  const loadAgentJobs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('agent_jobs')
      .select('*')
      .eq('agent_type', agentType)
      .order('created_at', { ascending: true });

    if (error) {
      onLog(`❌ დავალებების ჩატვირთვის შეცდომა: ${error.message}`);
    } else {
      setAgentJobs(data || []);
      onLog(`✅ ${agentType}-ის დავალებები ჩაიტვირთა`);
    }
    setIsLoading(false);
  };

  const saveJob = async (jobId: string, field: string, value: string) => {
    setIsSavingJob(jobId);
    const jobToUpdate = agentJobs.find(j => j.id === jobId);
    if (!jobToUpdate) return;

    const { error } = await supabase
      .from('agent_jobs')
      .update({ [field]: value })
      .eq('id', jobId);

    if (error) {
      onLog(`❌ დავალების შენახვის შეცდომა: ${error.message}`);
    } else {
      setAgentJobs(prev => prev.map(j => j.id === jobId ? { ...j, [field]: value } : j));
      onLog(`✅ დავალება წარმატებით შეინახა!`);
    }
    setIsSavingJob(null);
  };

  const selectedJob = agentJobs.find(j => j.id === selectedJobId);

  // Helper to get icon/color based on post_type for visual distinction
  const getJobStyle = (postType: string) => {
    switch (postType) {
      case 'daily_energy': return { icon: '🌅', color: 'border-[#f6c177]/30 bg-[#f6c177]/5 hover:bg-[#f6c177]/10' };
      case 'daily_horoscope_12_signs': return { icon: '♈', color: 'border-[#a78bfa]/30 bg-[#a78bfa]/5 hover:bg-[#a78bfa]/10' };
      case 'daily_horoscope_single': return { icon: '⭐', color: 'border-[#60a5fa]/30 bg-[#60a5fa]/5 hover:bg-[#60a5fa]/10' };
      case 'daily_tarot_card': return { icon: '🃏', color: 'border-[#f472b6]/30 bg-[#f472b6]/5 hover:bg-[#f472b6]/10' };
      case 'morning_question': return { icon: '🌄', color: 'border-[#5fd6a4]/30 bg-[#5fd6a4]/5 hover:bg-[#5fd6a4]/10' };
      case 'evening_reflection': return { icon: '🌙', color: 'border-[#8d79ff]/30 bg-[#8d79ff]/5 hover:bg-[#8d79ff]/10' };
      default: return { icon: '📋', color: 'border-[var(--line)] bg-black/20 hover:bg-black/30' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-5xl rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)]/98 p-6 sm:p-8 shadow-[0_35px_100px_rgba(0,0,0,.6)]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/20 text-[var(--amber)] text-xl">
              {selectedJobId ? '✏️' : '💼'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--moon)]">
                {selectedJobId ? 'დავალების რედაქტირება' : `Agent Jobs: ${agentType.replace(/_/g, ' ').toUpperCase()}`}
              </h3>
              <p className="text-xs text-[var(--mute)]">
                {selectedJobId ? 'შეცვალე ინსტრუქციები (შენახვა ავტომატურია)' : 'აირჩიე დავალება სქემიდან რედაქტირებისთვის'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-[var(--mute)] animate-pulse">იტვირთება...</p>
          </div>
        ) : agentJobs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-[var(--mute)] mb-2">დავალებები ვერ მოიძებნა.</p>
            <p className="text-xs text-[var(--mute)]/60">გთხოვთ, ჯერ შექმნათ ისინი Supabase-ში.</p>
          </div>
        ) : selectedJobId && selectedJob ? (
          // ✅ DETAIL VIEW (Editor)
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={() => setSelectedJobId(null)}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--violet)] transition-colors hover:text-[var(--violet-2)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              უკან დაბრუნება სქემაზე
            </button>

            <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--amber)]/10 text-3xl">
                  {getJobStyle(selectedJob.post_type).icon}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[var(--moon)]">{selectedJob.job_name}</h4>
                  <span className="inline-block mt-1.5 rounded-md bg-[var(--violet)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--violet)] border border-[var(--violet)]/20">
                    {selectedJob.post_type}
                  </span>
                </div>
                {isSavingJob === selectedJob.id && (
                  <span className="ml-auto flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ok)] animate-pulse">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    ინახება...
                  </span>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">
                    📝 დავალების აღწერა (Description)
                  </label>
                  <textarea
                    value={selectedJob.description || ''}
                    onChange={(e) => {
                      const updatedJobs = agentJobs.map(j => j.id === selectedJob.id ? {...j, description: e.target.value} : j);
                      setAgentJobs(updatedJobs);
                    }}
                    onBlur={(e) => saveJob(selectedJob.id, 'description', e.target.value)}
                    className="w-full rounded-xl border border-[var(--line-2)] bg-black/30 px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/40 focus:ring-2 focus:ring-[var(--amber)]/10 min-h-[120px] resize-y"
                    placeholder="აღწერე რა უნდა გააკეთოს ამ დავალების დროს..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ok)]">
                    🎨 ფოტოს გენერაციის ლოგიკა (Image Prompt Logic)
                  </label>
                  <textarea
                    value={selectedJob.image_prompt_logic || ''}
                    onChange={(e) => {
                      const updatedJobs = agentJobs.map(j => j.id === selectedJob.id ? {...j, image_prompt_logic: e.target.value} : j);
                      setAgentJobs(updatedJobs);
                    }}
                    onBlur={(e) => saveJob(selectedJob.id, 'image_prompt_logic', e.target.value)}
                    className="w-full rounded-xl border border-[var(--line-2)] bg-black/30 px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--ok)]/70 focus:bg-black/40 focus:ring-2 focus:ring-[var(--ok)]/10 min-h-[160px] resize-y font-mono"
                    placeholder="ზუსტი ინსტრუქცია AI-სთვის, როგორ შეადგინოს ფოტოს პრომპტი ამ კონკრეტული პოსტისთვის..."
                  />
                  <p className="mt-2 flex items-center gap-2 text-[11px] text-[var(--mute)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    შენახვა ხდება ავტომატურად, როცა ველიდან გახვალ (Blur).
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // ✅ GRID VIEW (Schema)
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Central Agent Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--amber)]/30 bg-gradient-to-br from-[var(--amber)]/10 to-black/40 p-6 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDIwOSwxMzgsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--amber)]/20 text-4xl shadow-lg shadow-[var(--amber)]/10">
                  ☀️
                </div>
                <h4 className="text-xl font-bold text-[var(--moon)]">{agentType.replace(/_/g, ' ').toUpperCase()} AGENT</h4>
                <p className="mt-2 text-sm text-[var(--mute)] max-w-md mx-auto">
                  ქვემოთ მოცემულია 6 დავალება, რომელსაც ეს აგენტი ასრულებს. დააკლიკე ნებისმიერ ბანერს ინსტრუქციების სანახავად და რედაქტირებისთვის.
                </p>
              </div>
            </div>

            {/* 6 Job Banners Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agentJobs.map((job) => {
                const style = getJobStyle(job.post_type);
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.color} border-[var(--line)]`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-3xl transition-transform duration-300 group-hover:scale-110">{style.icon}</span>
                      <svg className="h-5 w-5 text-[var(--mute)] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div>
                      <h5 className="font-bold text-[var(--moon)] group-hover:text-[var(--amber)] transition-colors">{job.job_name}</h5>
                      <span className="mt-2 inline-block rounded-md bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--mute)] border border-[var(--line)]">
                        {job.post_type}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}