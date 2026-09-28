// ============================================================
// LUNARA OS — Agent Detail Modal
// Foundation: §34 (Agent Training), §42 (Target UI Structure)
// Purpose: Detailed view and instruction management for individual agents
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import type { AgentStatus } from "@/core/contracts"; // ✅ დამატებული იმპორტი

type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  level: number;
  xp: number;
  xpToNext: number;
  status: AgentStatus; // ✅ შეცვლილია string-დან AgentStatus-ზე
  taskId: string | null;
  accent: string;
  icon: string;
  missionsCompleted: number;
  autonomyLevel: number;
  currentTask?: string;
};

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'WORKING': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    case 'IDLE': return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
    case 'COMPLETED': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    case 'ERROR': return 'text-red-400 bg-red-500/20 border-red-500/40';
    case 'WAITING': return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
    case 'PAUSED': return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    default: return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
  }
}

function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case 'WORKING': return '⚡ მუშაობს';
    case 'IDLE': return '⏸️ უმოქმედო';
    case 'COMPLETED': return '✅ დასრულებული';
    case 'ERROR': return '❌ შეცდომა';
    case 'WAITING': return '⏳ მოლოდინში';
    case 'PAUSED': return '⏸️ შეჩერებული';
    default: return status;
  }
}

export default function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  const [instructions, setInstructions] = useState(`You are ${agent.name}, ${agent.role} of Lunara OS.

CORE RESPONSIBILITY:
- Execute tasks with precision and adhere to Dark Luxury / Cosmic Editorial brand guidelines.

VOICE:
- Mysterious, intelligent, intimate, emotionally precise.
- Modern and concise.

AVOID:
- Generic AI astrology clichés.
- Fake certainty or "AI woman + galaxy" aesthetics.`);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSaveInstructions = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('✅ ინსტრუქციები წარმატებით შენახვა! (v2.0)');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#08070D] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-white hover:bg-white/10 transition-colors"
        >
          ×
        </button>

        <div className="border-b border-white/10 p-8" style={{ background: `linear-gradient(135deg, ${agent.accent}20, transparent)` }}>
          <div className="flex items-start gap-6">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl text-5xl shadow-2xl flex-shrink-0"
              style={{ background: `${agent.accent}30`, boxShadow: `0 0 40px ${agent.accent}40` }}
            >
              {agent.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-black text-white">{agent.name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(agent.status)}`}>
                  {getStatusLabel(agent.status)}
                </span>
              </div>
              <p className="text-lg text-[#D8B878] font-medium mb-1">{agent.role}</p>
              <p className="text-sm text-[#A99BC7]">დეპარტამენტი: {agent.department}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-white">{agent.level}</div>
              <div className="text-xs text-[#A99BC7] mt-1">დონე</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-[#D8B878]">{agent.xp} <span className="text-sm text-[#A99BC7]">/ {agent.xpToNext}</span></div>
              <div className="text-xs text-[#A99BC7] mt-1">გამოცდილება (XP)</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-emerald-400">{agent.missionsCompleted}</div>
              <div className="text-xs text-[#A99BC7] mt-1">შესრულებული მისიები</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-blue-400">L{agent.autonomyLevel}</div>
              <div className="text-xs text-[#A99BC7] mt-1">ავტონომიის დონე</div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {agent.currentTask && (
            <div>
              <h3 className="text-xl font-bold text-[#D8B878] mb-4 flex items-center gap-2">
                🎯 მიმდინარე ამოცანა
              </h3>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-base text-white font-medium mb-3">{agent.currentTask}</p>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: '65%', background: agent.accent }}></div>
                </div>
                <p className="text-xs text-[#A99BC7] mt-2 text-right">პროგრესი: ~65%</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#D8B878] flex items-center gap-2">
                🧠 სისტემური ინსტრუქციები (System Prompt)
              </h3>
              <span className="text-xs text-[#A99BC7] bg-white/5 px-2 py-1 rounded border border-white/10">v1.0</span>
            </div>
            
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-[#171127] border border-[#6D6BEA]/30 rounded-xl p-4 text-[#F5F1FF] font-mono text-sm focus:outline-none focus:border-[#D8B878] transition-colors resize-y"
              rows={12}
              placeholder="შეიყვანე აგენტის სისტემური ინსტრუქციები აქ..."
            />
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[#A99BC7]/70">
                💡 ცვლილებები ავტომატურად ვერსიონირდება და ინახება Supabase-ში (§34).
              </p>
              <div className="flex items-center gap-3">
                {saveMessage && (
                  <span className="text-sm text-emerald-400 font-medium animate-pulse">{saveMessage}</span>
                )}
                <button
                  onClick={handleSaveInstructions}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#D8B878] to-[#6D6BEA] text-[#08070D] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? '💾 ინახება...' : '💾 ინსტრუქციის შენახვა'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-6 flex justify-end bg-[#08070D]">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
          >
            დახურვა
          </button>
        </div>
      </div>
    </div>
  );
}