'use client';

import { clsx } from 'clsx';
import { AgentCard, type AgentData } from './AgentCard';

export interface DepartmentData {
  department_id: string;
  name: string;
  display_name: string;
  description?: string;
  agents: AgentData[];
}

interface DepartmentRoomProps {
  department: DepartmentData;
  onAgentClick?: (agent: AgentData) => void;
}

const departmentEmojis: Record<string, string> = {
  executive_core: '👑',
  intelligence: '🔬',
  strategy: '',
  content: '✍️',
  creative: '🎨',
  production: '🎬',
  resources: '',
  knowledge: '📚',
  quality: '🛡️',
  distribution: '📡',
  analytics: '',
  learning: '🧬',
};

export function DepartmentRoom({ department, onAgentClick }: DepartmentRoomProps) {
  const emoji = departmentEmojis[department.name] || '🏢';
  const activeAgents = department.agents.filter(a => a.status === 'WORKING').length;
  const totalAgents = department.agents.length;

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-lunara-darker/50 backdrop-blur-sm overflow-hidden">
      {/* Room Header */}
      <div className="px-5 py-4 border-b border-gray-700/50 bg-gradient-to-r from-lunara-dark to-lunara-darker">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <h2 className="text-white font-bold text-lg">{department.display_name}</h2>
              {department.description && (
                <p className="text-gray-400 text-xs mt-0.5">{department.description}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 font-mono">
              {activeAgents}/{totalAgents} Active
            </div>
            {activeAgents > 0 && (
              <div className="flex items-center gap-1 mt-1 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="p-4">
        {department.agents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No agents registered in this department
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {department.agents.map(agent => (
              <AgentCard
                key={agent.agent_id}
                agent={agent}
                onClick={() => onAgentClick?.(agent)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}