'use client';

import { PixelAgent, type AgentStatus } from './PixelAgent';

export interface DepartmentData {
  department_id: string;
  name: string;
  display_name: string;
  agents: Array<{
    agent_id: string;
    display_name: string;
    status: AgentStatus;
    hp: number;
    mp: number;
    current_task?: string;
  }>;
}

interface PixelRoomProps {
  department: DepartmentData;
  position: { x: number; y: number };
  onAgentClick?: (agentId: string) => void;
}

const buildingColors: Record<string, string> = {
  executive_core: '#8b5cf6',
  intelligence: '#3b82f6',
  strategy: '#6366f1',
  content: '#ec4899',
  creative: '#f59e0b',
  production: '#ef4444',
  resources: '#10b981',
  knowledge: '#8b5cf6',
  quality: '#64748b',
  distribution: '#06b6d4',
  analytics: '#14b8a6',
  learning: '#a855f7',
};

export function PixelRoom({ department, position, onAgentClick }: PixelRoomProps) {
  const buildingColor = buildingColors[department.name] || '#8b6f47';
  const activeAgents = department.agents.filter(a => a.status === 'WORKING').length;

  return (
    <div
      className="absolute pixel-building"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '120px',
        height: '100px',
        background: buildingColor,
      }}
    >
      {/* Building Label */}
      <div className="absolute -top-8 left-0 right-0 text-center">
        <div className="bg-black border-2 border-white px-2 py-1 inline-block">
          <span className="text-[8px] text-white pixel-font">
            {department.display_name}
          </span>
        </div>
      </div>

      {/* Active Count */}
      <div className="absolute top-2 right-2 bg-black border border-white px-1 py-0.5">
        <span className="text-[7px] text-green-400 pixel-font">
          {activeAgents}/{department.agents.length}
        </span>
      </div>

      {/* Agents Inside Building */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center">
        {department.agents.slice(0, 4).map(agent => (
          <PixelAgent
            key={agent.agent_id}
            name={agent.display_name}
            status={agent.status}
            hp={agent.hp}
            mp={agent.mp}
            currentTask={agent.current_task}
            onClick={() => onAgentClick?.(agent.agent_id)}
          />
        ))}
      </div>

      {/* Door */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-12 bg-yellow-900 border-2 border-black">
        <div className="absolute top-4 right-1 w-1 h-1 bg-yellow-400 rounded-full" />
      </div>
    </div>
  );
}