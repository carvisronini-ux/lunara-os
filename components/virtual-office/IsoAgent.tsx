'use client';

import { clsx } from 'clsx';

export type AgentStatus = 'IDLE' | 'WORKING' | 'WAITING' | 'ERROR' | 'OFFLINE';

interface IsoAgentProps {
  name: string;
  department: string;
  status: AgentStatus;
  hp: number;
  mp: number;
  position: { x: number; y: number };
  onClick?: () => void;
}

// ზუსტი გზები თქვენი ფაილების სტრუქტურის მიხედვით
const unitImages: Record<string, string> = {
  executive_core: '/assets/tiny-swords/Units/Black Units/Warrior/Warrior_Idle.png',
  intelligence: '/assets/tiny-swords/Units/Black Units/Archer/Archer_Idle.png',
  strategy: '/assets/tiny-swords/Units/Black Units/Monk/Idle.png',
  resources: '/assets/tiny-swords/Units/Black Units/Lancer/Lancer_Idle.png',
  quality: '/assets/tiny-swords/Units/Black Units/Archer/Archer_Idle.png',
  content: '/assets/tiny-swords/Units/Black Units/Pawn/Pawn_Idle.png',
  creative: '/assets/tiny-swords/Units/Black Units/Pawn/Pawn_Idle Gold.png',
  distribution: '/assets/tiny-swords/Units/Black Units/Pawn/Pawn_Run.png',
  analytics: '/assets/tiny-swords/Units/Black Units/Monk/Idle.png',
  learning: '/assets/tiny-swords/Units/Black Units/Monk/Heal.png',
};

const statusAnimation: Record<AgentStatus, string> = {
  IDLE: 'agent-idle',
  WORKING: 'agent-working',
  WAITING: 'agent-waiting',
  ERROR: 'agent-waiting',
  OFFLINE: '',
};

export function IsoAgent({ name, department, status, hp, mp, position, onClick }: IsoAgentProps) {
  const image = unitImages[department] || unitImages.content;
  const animation = statusAnimation[status];

  return (
    <div
      className={clsx('iso-agent', animation)}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onClick={onClick}
    >
      {/* HP/MP Bars */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col gap-0.5">
        <div className="mini-hp-bar">
          <div className="mini-hp-fill" style={{ width: `${hp}%` }} />
        </div>
        <div className="mini-mp-bar">
          <div className="mini-mp-fill" style={{ width: `${mp}%` }} />
        </div>
      </div>

      {/* Agent Sprite */}
      <img
        src={image}
        alt={name}
        className="pixel-art w-10 h-10 object-contain"
      />

      {/* Name */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[7px] text-white pixel-font drop-shadow-[0_1px_0_rgba(0,0,0,1)]">
          {name}
        </span>
      </div>

      {/* Status Indicator */}
      <div className={clsx('status-badge', `status-${status.toLowerCase()}`)} 
           style={{ top: '-4px', right: '-4px', width: '8px', height: '8px' }} />
    </div>
  );
}