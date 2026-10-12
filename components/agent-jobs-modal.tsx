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
  const [isSavingJob, setIsSavingJob] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && agentType) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)]/98 p-5 sm:p-7 shadow-[0_35px_100px_rgba(0,0,0,.55)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/20 text-[var(--amber)] text-xl"></div>
            <div>
              <h3 className="text-lg font-semibold">Agent Jobs: {agentType.replace(/_/g, ' ').toUpperCase()}</h3>
              <p className="text-xs text-[var(--mute)]">მართე კონკრეტული დავალებები და ფოტოს გენერაციის ლოგიკა</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <p className="text-center text-[var(--mute)] py-8">იტვირთება...</p>
          ) : agentJobs.length === 0 ? (
            <p className="text-center text-[var(--mute)] py-8">დავალებები ვერ მოიძებნა. გთხოვთ, ჯერ შექმნათ ისინი Supabase-ში.</p>
          ) : (
            agentJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-[var(--line)] bg-black/20 p-5 transition-all hover:border-[var(--amber)]/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-bold text-[var(--moon)]">{job.job_name}</h4>
                    <span className="inline-block mt-1.5 rounded-md bg-[var(--violet)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--violet)] border border-[var(--violet)]/20">
                      {job.post_type}
                    </span>
                  </div>
                  {isSavingJob === job.id && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ok)] animate-pulse">Saving...</span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--mute)]">
                      📝 დავალების აღწერა (Description)
                    </label>
                    <textarea
                      value={job.description || ''}
                      onChange={(e) => {
                        const updatedJobs = agentJobs.map(j => j.id === job.id ? {...j, description: e.target.value} : j);
                        setAgentJobs(updatedJobs);
                      }}
                      onBlur={(e) => saveJob(job.id, 'description', e.target.value)}
                      className="w-full rounded-xl border border-[var(--line-2)] bg-black/30 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/40 focus:ring-2 focus:ring-[var(--amber)]/10 min-h-[80px] resize-y"
                      placeholder="აღწერე რა უნდა გააკეთოს ამ დავალების დროს..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ok)]">
                      🎨 ფოტოს გენერაციის ლოგიკა (Image Prompt Logic)
                    </label>
                    <textarea
                      value={job.image_prompt_logic || ''}
                      onChange={(e) => {
                        const updatedJobs = agentJobs.map(j => j.id === job.id ? {...j, image_prompt_logic: e.target.value} : j);
                        setAgentJobs(updatedJobs);
                      }}
                      onBlur={(e) => saveJob(job.id, 'image_prompt_logic', e.target.value)}
                      className="w-full rounded-xl border border-[var(--line-2)] bg-black/30 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--ok)]/70 focus:bg-black/40 focus:ring-2 focus:ring-[var(--ok)]/10 min-h-[100px] resize-y font-mono"
                      placeholder="ზუსტი ინსტრუქცია AI-სთვის, როგორ შეადგინოს ფოტოს პრომპტი ამ კონკრეტული პოსტისთვის..."
                    />
                    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[var(--mute)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      შენახვა ხდება ავტომატურად, როცა ველიდან გახვალ (Blur).
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}