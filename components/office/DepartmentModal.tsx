// ============================================================
// LUNARA OS — Department Modal
// Foundation: §14 (Departments), §15 (Agents), §42 (Target UI)
// Purpose: Detailed view of a department with its agents
// ============================================================

'use client';

import { useEffect } from 'react';

type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  level: number;
  xp: number;
  xpToNext: number;
  status: string;
  taskId: string | null;
  accent: string;
  icon: string;
  missionsCompleted: number;
  autonomyLevel: number;
  currentTask?: string;
};

type Department = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

interface DepartmentModalProps {
  department: Department;
  agents: Agent[];
  onClose: () => void;
  onAgentClick: (agent: Agent) => void; // ✅ ახალი პროპი
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'WORKING': return 'text-yellow-400';
    case 'IDLE': return 'text-slate-400';
    case 'COMPLETED': return 'text-emerald-400';
    case 'ERROR': return 'text-red-400';
    case 'WAITING': return 'text-blue-400';
    case 'PAUSED': return 'text-amber-400';
    default: return 'text-slate-400';
  }
}

function getStatusLabel(status: string): string {
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

export default function DepartmentModal({ department, agents, onClose, onAgentClick }: DepartmentModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const departmentAgents = agents.filter(a => a.department === department.id);
  const workingCount = departmentAgents.filter(a => a.status === 'WORKING').length;
  const idleCount = departmentAgents.filter(a => a.status === 'IDLE').length;
  const totalXP = departmentAgents.reduce((sum, a) => sum + a.xp, 0);
  const totalMissions = departmentAgents.reduce((sum, a) => sum + a.missionsCompleted, 0);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#08070D] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-white hover:bg-white/10 transition-colors"
        >
          ×
        </button>

        <div className="border-b border-white/10 p-8" style={{ background: `linear-gradient(135deg, ${department.color}20, transparent)` }}>
          <div className="flex items-center gap-6">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl text-5xl shadow-2xl"
              style={{ background: `${department.color}30`, boxShadow: `0 0 40px ${department.color}40` }}
            >
              {department.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-white mb-2">{department.name}</h2>
              <p className="text-base text-[#A99BC7]">{department.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-white">{departmentAgents.length}</div>
              <div className="text-xs text-[#A99BC7] mt-1">აგენტები</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-yellow-400">{workingCount}</div>
              <div className="text-xs text-[#A99BC7] mt-1">მუშაობს</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-[#D8B878]">{totalXP}</div>
              <div className="text-xs text-[#A99BC7] mt-1">სულ XP</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-black text-emerald-400">{totalMissions}</div>
              <div className="text-xs text-[#A99BC7] mt-1">მისიები</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold text-[#D8B878] mb-4">
            👥 აგენტები ({departmentAgents.length})
          </h3>
          
          {departmentAgents.length === 0 ? (
            <div className="text-center py-12 text-[#A99BC7]/50">
              <p>ამ განყოფილებაში აგენტები ჯერ არ არის დანიშნული.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departmentAgents.map(agent => (
                <div
                  key={agent.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-white/30 hover:shadow-xl cursor-pointer"
                  style={{ borderColor: `${agent.accent}30` }}
                  onClick={() => onAgentClick(agent)} // ✅ აქ ვაგზავნით დაკლიკებულ აგენტს
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl shadow-lg flex-shrink-0"
                      style={{ background: `${agent.accent}30`, boxShadow: `0 0 20px ${agent.accent}30` }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-lg font-bold text-white truncate">{agent.name}</h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          agent.status === 'WORKING' ? 'bg-yellow-500/20 text-yellow-400' :
                          agent.status === 'IDLE' ? 'bg-slate-500/20 text-slate-400' :
                          agent.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {getStatusLabel(agent.status)}
                        </span>
                      </div>
                      <p className="text-sm text-[#A99BC7] mb-3">{agent.role}</p>
                      
                      {agent.currentTask && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2 mb-3">
                          <div className="text-xs text-[#A99BC7] mb-1">მიმდინარე:</div>
                          <div className="text-sm text-white truncate">{agent.currentTask}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-lg font-black" style={{ color: agent.accent }}>{agent.level}</div>
                          <div className="text-[10px] text-[#A99BC7]">დონე</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-black text-[#D8B878]">{agent.xp}</div>
                          <div className="text-[10px] text-[#A99BC7]">XP</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-black text-emerald-400">L{agent.autonomyLevel}</div>
                          <div className="text-[10px] text-[#A99BC7]">ავტო</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-6 flex justify-end">
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