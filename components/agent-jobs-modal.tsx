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
      setSelectedJobId(null);
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

  const getJobStyle = (postType: string) => {
    switch (postType) {
      case 'daily_energy': return { icon: '', color: 'from-amber-400/20 to-orange-500/20', borderColor: 'border-amber-400/40', glow: 'shadow-amber-400/20' };
      case 'daily_horoscope_12_signs': return { icon: '♈', color: 'from-violet-400/20 to-purple-500/20', borderColor: 'border-violet-400/40', glow: 'shadow-violet-400/20' };
      case 'daily_horoscope_single': return { icon: '⭐', color: 'from-blue-400/20 to-cyan-500/20', borderColor: 'border-blue-400/40', glow: 'shadow-blue-400/20' };
      case 'daily_tarot_card': return { icon: '', color: 'from-pink-400/20 to-rose-500/20', borderColor: 'border-pink-400/40', glow: 'shadow-pink-400/20' };
      case 'morning_question': return { icon: '🌄', color: 'from-emerald-400/20 to-teal-500/20', borderColor: 'border-emerald-400/40', glow: 'shadow-emerald-400/20' };
      case 'evening_reflection': return { icon: '🌙', color: 'from-indigo-400/20 to-purple-600/20', borderColor: 'border-indigo-400/40', glow: 'shadow-indigo-400/20' };
      default: return { icon: '📋', color: 'from-gray-400/20 to-gray-500/20', borderColor: 'border-gray-400/40', glow: 'shadow-gray-400/20' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-6xl rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)]/98 p-8 shadow-[0_35px_100px_rgba(0,0,0,.6)]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/20 text-[var(--amber)] text-xl">
              {selectedJobId ? '✏️' : '🔗'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--moon)]">
                {selectedJobId ? 'დავალების რედაქტირება' : 'Agent Jobs Schema'}
              </h3>
              <p className="text-xs text-[var(--mute)]">
                {selectedJobId ? 'შეცვალე ინსტრუქციები' : `Single source of truth - ${agentType.replace(/_/g, ' ').toUpperCase()}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <p className="text-[var(--mute)] animate-pulse">იტვირთება...</p>
          </div>
        ) : agentJobs.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center text-center">
            <p className="text-[var(--mute)] mb-2">დავალებები ვერ მოიძებნა.</p>
            <p className="text-xs text-[var(--mute)]/60">გთხოვთ, ერ შექმნათ ისინი Supabase-ში.</p>
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
                     ფოტოს გენერაციის ლოგიკა (Image Prompt Logic)
                  </label>
                  <textarea
                    value={selectedJob.image_prompt_logic || ''}
                    onChange={(e) => {
                      const updatedJobs = agentJobs.map(j => j.id === selectedJob.id ? {...j, image_prompt_logic: e.target.value} : j);
                      setAgentJobs(updatedJobs);
                    }}
                    onBlur={(e) => saveJob(selectedJob.id, 'image_prompt_logic', e.target.value)}
                    className="w-full rounded-xl border border-[var(--line-2)] bg-black/30 px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--ok)]/70 focus:bg-black/40 focus:ring-2 focus:ring-[var(--ok)]/10 min-h-[160px] resize-y font-mono"
                    placeholder="ზუსტი ინსტრუქცია AI-სთვის, როგორ შეადგინოს ფოტოს პრომპტი..."
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
          // ✅ SCHEMA VIEW (Hub & Spoke Design)
          <div className="relative min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
            {/* SVG Connection Lines Layer */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ zIndex: 0 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(192, 181, 255, 0.3)" />
                  <stop offset="100%" stopColor="rgba(255, 209, 138, 0.3)" />
                </linearGradient>
              </defs>
              {/* Connection lines from center to each job card */}
              {agentJobs.map((job, index) => {
                const angle = (index * 60) * (Math.PI / 180);
                const radius = 280;
                const startX = 300;
                const startY = 100;
                const endX = startX + Math.cos(angle) * radius;
                const endY = startY + Math.sin(angle) * radius;
                
                return (
                  <g key={`line-${job.id}`}>
                    <line
                      x1={startX}
                      y1={startY + 80}
                      x2={endX}
                      y2={endY + 40}
                      stroke="url(#lineGradient)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      className="animate-pulse"
                    />
                    {/* Animated dot traveling along the line */}
                    <circle r="3" fill="rgba(192, 181, 255, 0.6)">
                      <animateMotion
                        dur="2s"
                        repeatCount="indefinite"
                        path={`M${startX},${startY + 80} L${endX},${endY + 40}`}
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>

            {/* Central Agent Hub */}
            <div className="absolute left-1/2 top-[60px] -translate-x-1/2" style={{ zIndex: 10 }}>
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--amber)]/20 to-[var(--violet)]/20 blur-xl"></div>
                
                {/* Main Hub Card */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--amber)]/40 bg-gradient-to-br from-[var(--amber)]/10 to-black/60 p-8 text-center shadow-2xl shadow-[var(--amber)]/20">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--amber)]/20 text-5xl shadow-lg">
                    ☀️
                  </div>
                  <h4 className="text-2xl font-bold text-[var(--moon)]">{agentType.replace(/_/g, ' ').toUpperCase()}</h4>
                  <p className="mt-2 text-sm text-[var(--mute)] max-w-xs">
                    Single Source of Truth
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--amber)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--amber)]"></span>
                    {agentJobs.length} Active Jobs
                  </div>
                </div>
              </div>
            </div>

            {/* Job Cards positioned around the hub */}
            <div className="relative h-full" style={{ zIndex: 10 }}>
              {/* Top Row */}
              <div className="absolute left-0 top-0 w-1/3">
                {agentJobs[0] && (
                  <JobCard 
                    job={agentJobs[0]} 
                    style={getJobStyle(agentJobs[0].post_type)}
                    onClick={() => setSelectedJobId(agentJobs[0].id)}
                  />
                )}
              </div>
              <div className="absolute right-0 top-0 w-1/3">
                {agentJobs[1] && (
                  <JobCard 
                    job={agentJobs[1]} 
                    style={getJobStyle(agentJobs[1].post_type)}
                    onClick={() => setSelectedJobId(agentJobs[1].id)}
                  />
                )}
              </div>

              {/* Middle Row */}
              <div className="absolute left-0 top-1/2 w-1/3 -translate-y-1/2">
                {agentJobs[2] && (
                  <JobCard 
                    job={agentJobs[2]} 
                    style={getJobStyle(agentJobs[2].post_type)}
                    onClick={() => setSelectedJobId(agentJobs[2].id)}
                  />
                )}
              </div>
              <div className="absolute right-0 top-1/2 w-1/3 -translate-y-1/2">
                {agentJobs[3] && (
                  <JobCard 
                    job={agentJobs[3]} 
                    style={getJobStyle(agentJobs[3].post_type)}
                    onClick={() => setSelectedJobId(agentJobs[3].id)}
                  />
                )}
              </div>

              {/* Bottom Row */}
              <div className="absolute bottom-0 left-1/4 w-1/3">
                {agentJobs[4] && (
                  <JobCard 
                    job={agentJobs[4]} 
                    style={getJobStyle(agentJobs[4].post_type)}
                    onClick={() => setSelectedJobId(agentJobs[4].id)}
                  />
                )}
              </div>
              <div className="absolute bottom-0 right-1/4 w-1/3">
                {agentJobs[5] && (
                  <JobCard 
                    job={agentJobs[5]} 
                    style={getJobStyle(agentJobs[5].post_type)}
                    onClick={() => setSelectedJobId(agentJobs[5].id)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Job Card Component
function JobCard({ job, style, onClick }: { job: any; style: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border-2 ${style.borderColor} bg-gradient-to-br ${style.color} p-6 text-left shadow-lg ${style.glow} transition-all duration-300 hover:-translate-y-2 hover:scale-105 hover:shadow-xl`}
    >
      <div className="relative z-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-black/30 text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          {style.icon}
        </div>
        <h5 className="font-bold text-[var(--moon)] group-hover:text-white transition-colors">
          {job.job_name}
        </h5>
        <span className="mt-2 inline-block rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--mute)] border border-[var(--line)]">
          {job.post_type}
        </span>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      </div>
    </button>
  );
}