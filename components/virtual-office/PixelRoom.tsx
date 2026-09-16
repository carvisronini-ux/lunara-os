'use client';

import { PixelAgent, type AgentStatus } from './PixelAgent';

export interface DepartmentData {
  department_id: string;
  name: string;
  display_name: string;
  agents: Array<{
    agent_id: string;
    display_name: string;
    department: string;
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

// Mapping departments to Tiny Swords Buildings
const getBuildingImage = (name: string): string => {
  const base = '/assets/tiny-swords/Buildings/';
  switch (name) {
    case 'executive_core': return `${base}Castle.png`;
    case 'intelligence': return `${base}Tower.png`;
    case 'strategy': return `${base}Monastery.png`;
    case 'content': return `${base}House1.png`;
    case 'creative': return `${base}House2.png`;
    case 'resources': return `${base}Barracks.png`;
    case 'quality': return `${base}Archery.png`;
    case 'distribution': return `${base}House3.png`;
    case 'analytics': return `${base}House1.png`;
    case 'learning': return `${base}Monastery.png`;
    default: return `${base}House1.png`;
  }
};

export function PixelRoom({ department, position, onAgentClick }: PixelRoomProps) {
  const buildingImage = getBuildingImage(department.name);
  const activeAgents = department.agents.filter(a => a.status === 'WORKING').length;

  return (
    <div 
      className="absolute pixel-building-container"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Building Label */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
        <div className="bg-black border-2 border-white px-2 py-1">
          <span className="text-[8px] text-yellow-400 pixel-font">{department.display_name}</span>
        </div>
      </div>

      {/* Active Count Badge */}
      <div className="absolute top-0 right-0 bg-black border-2 border-white px-1.5 py-0.5 z-10">
        <span className="text-[7px] text-green-400 pixel-font">
          {activeAgents}/{department.agents.length}
        </span>
      </div>

      {/* Building Image */}
      <img 
        src={buildingImage} 
        alt={department.display_name}
        className="pixel-building-img w-32 h-32 object-contain mb-[-10px]"
      />

      {/* Agents positioned in front of the building */}
      <div className="flex flex-wrap gap-1 justify-center w-32 mt-[-20px] z-20">
        {department.agents.slice(0, 4).map(agent => (
          <PixelAgent
            key={agent.agent_id}
            name={agent.display_name}
            department={agent.department}
            status={agent.status}
            hp={agent.hp}
            mp={agent.mp}
            currentTask={agent.current_task}
            onClick={() => onAgentClick?.(agent.agent_id)}
          />
        ))}
      </div>
    </div>
  );
}