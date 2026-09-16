'use client';

import { clsx } from 'clsx';
import { StatusBadge, type AgentStatus } from './StatusBadge';

export interface AgentData {
  agent_id: string;
  display_name: string;
  machine_id: string;
  department: string;
  status: AgentStatus;
  mission?: string;
  current_task?: string;
  version: string;
}

interface AgentCardProps {
  agent: AgentData;
  onClick?: () => void;
}

const departmentIcons: Record<string, string> = {
  executive_core: '👑',
  intelligence: '',
  strategy: '🧠',
  content: '✍️',
  creative: '🎨',
  production: '',
  resources: '🔐',
  knowledge: '📚',
  quality: '🛡️',
  distribution: '📡',
  analytics: '',
  learning: '🧬',
};

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const icon = departmentIcons[agent.department] || '🤖';

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer',
        'bg-lunara-dark/50 backdrop-blur-sm',
        'hover:border-lunara-purple/50 hover:shadow-lg hover:shadow-lunara-purple/10',
        agent.status === 'ERROR' && 'border-red-500/30 bg-red-500/5',
        agent.status === 'WORKING' && 'border-emerald-500/30 bg-emerald-500/5',
        agent.status === 'IDLE' && 'border-blue-500/20',
        agent.status === 'OFFLINE' && 'border-gray-500/20 opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-white font-semibold text-sm">{agent.display_name}</h3>
            <p className="text-gray-500 text-xs font-mono">{agent.machine_id}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 font-mono">v{agent.version}</span>
      </div>

      {/* Status */}
      <div className="mb-3">
        <StatusBadge status={agent.status} size="sm" showLabel={true} />
      </div>

      {/* Mission */}
      {agent.mission && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2 italic">
          {agent.mission}
        </p>
      )}

      {/* Current Task */}
      {agent.current_task && (
        <div className="pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 mb-1">Current Task:</p>
          <p className="text-xs text-lunara-purple-light font-medium">
            {agent.current_task}
          </p>
        </div>
      )}

      {/* Working indicator */}
      {agent.status === 'WORKING' && (
        <div className="absolute top-2 right-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}
    </div>
  );
}