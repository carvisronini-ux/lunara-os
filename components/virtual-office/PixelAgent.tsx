'use client';

import { clsx } from 'clsx';

export type AgentStatus = 'OFFLINE' | 'IDLE' | 'WORKING' | 'WAITING' | 'ERROR';

interface PixelAgentProps {
  name: string;
  department: string;
  status: AgentStatus;
  hp: number;
  mp: number;
  currentTask?: string;
  onClick?: () => void;
}

// Mapping departments to specific Tiny Swords units (ზუსტად თქვენი ფაილების სახელები)
const getUnitImage = (department: string): string => {
  const base = '/assets/tiny-swords/Units/Black Units/';
  switch (department) {
    case 'executive_core': return `${base}Warrior/Warrior_Idle.png`;
    case 'intelligence': return `${base}Archer/Archer_Idle.png`;
    case 'strategy': return `${base}Monk/Idle.png`;
    case 'resources': return `${base}Lancer/Lancer_Idle.png`;
    case 'quality': return `${base}Archer/Archer_Idle.png`;
    default: return `${base}Pawn/Pawn_Idle.png`; // Content, Creative, Distribution, etc.
  }
};

const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case 'WORKING': return 'bg-green-400';
    case 'IDLE': return 'bg-blue-400';
    case 'WAITING': return 'bg-yellow-400';
    case 'ERROR': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export function PixelAgent({ name, department, status, hp, mp, currentTask, onClick }: PixelAgentProps) {
  const unitImage = getUnitImage(department);

  return (
    <div 
      onClick={onClick}
      className="pixel-building-container cursor-pointer group hover:scale-105 transition-transform"
      style={{ width: '48px' }}
    >
      {/* HP/MP Bars */}
      <div className="flex flex-col gap-0.5 mb-1 w-full">
        <div className="flex items-center gap-1">
          <span className="text-[6px] text-white pixel-font">HP</span>
          <div className="hp-bar"><div className="hp-bar-fill" style={{ width: `${hp}%` }} /></div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[6px] text-white pixel-font">MP</span>
          <div className="mp-bar"><div className="mp-bar-fill" style={{ width: `${mp}%` }} /></div>
        </div>
      </div>

      {/* Agent Sprite */}
      <div className="relative">
        <img 
          src={unitImage} 
          alt={name}
          className="agent-sprite w-12 h-12 object-contain"
        />
        {/* Status Dot */}
        <div className={clsx('absolute -top-1 -right-1 rounded-full border border-black', getStatusColor(status))} />
      </div>

      {/* Name Label */}
      <div className="mt-1 text-center">
        <span className="text-[7px] text-white pixel-font drop-shadow-[0_1px_0_rgba(0,0,0,1)]">
          {name}
        </span>
      </div>

      {/* Hover Task Tooltip */}
      {currentTask && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
          <div className="bg-black border-2 border-white px-2 py-1 text-[7px] text-white pixel-font whitespace-nowrap">
            {currentTask}
          </div>
        </div>
      )}
    </div>
  );
}