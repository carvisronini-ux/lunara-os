'use client';

import { clsx } from 'clsx';

export type AgentStatus =
  | 'OFFLINE'
  | 'IDLE'
  | 'STARTING'
  | 'WORKING'
  | 'WAITING'
  | 'WAITING_FOR_RESOURCE'
  | 'WAITING_FOR_REVIEW'
  | 'ERROR'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'COMPLETED';

interface PixelAgentProps {
  name: string;
  status: AgentStatus;
  hp: number; // 0-100
  mp: number; // 0-100
  currentTask?: string;
  onClick?: () => void;
}

const statusColors: Record<AgentStatus, string> = {
  OFFLINE: '#6b7280',
  IDLE: '#60a5fa',
  STARTING: '#fbbf24',
  WORKING: '#4ade80',
  WAITING: '#fbbf24',
  WAITING_FOR_RESOURCE: '#f97316',
  WAITING_FOR_REVIEW: '#a855f7',
  ERROR: '#ef4444',
  PAUSED: '#6b7280',
  SUSPENDED: '#dc2626',
  COMPLETED: '#10b981',
};

const statusAnimations: Record<AgentStatus, string> = {
  IDLE: 'agent-idle',
  WORKING: 'agent-working',
  WAITING: 'agent-waiting',
  WAITING_FOR_RESOURCE: 'agent-waiting',
  WAITING_FOR_REVIEW: 'agent-waiting',
  ERROR: 'agent-waiting',
  STARTING: 'agent-idle',
  OFFLINE: '',
  PAUSED: '',
  SUSPENDED: '',
  COMPLETED: 'agent-idle',
};

export function PixelAgent({ name, status, hp, mp, currentTask, onClick }: PixelAgentProps) {
  const statusColor = statusColors[status];
  const animation = statusAnimations[status];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative cursor-pointer group',
        animation
      )}
      style={{ width: '64px', height: '80px' }}
    >
      {/* HP/MP Bars */}
      <div className="absolute -top-6 left-0 right-0 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white pixel-font">HP</span>
          <div className="hp-bar flex-1">
            <div className="hp-bar-fill" style={{ width: `${hp}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white pixel-font">MP</span>
          <div className="mp-bar flex-1">
            <div className="mp-bar-fill" style={{ width: `${mp}%` }} />
          </div>
        </div>
      </div>

      {/* Agent Sprite (Pixel Character) */}
      <div className="relative w-full h-full">
        {/* Body */}
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-12 border-2 border-black"
          style={{ background: statusColor }}
        >
          {/* Head */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-yellow-200 border-2 border-black">
            {/* Eyes */}
            <div className="absolute top-2 left-1 w-1 h-1 bg-black" />
            <div className="absolute top-2 right-1 w-1 h-1 bg-black" />
          </div>
        </div>

        {/* Status Indicator */}
        <div
          className="absolute -top-2 -right-2 w-3 h-3 border border-black"
          style={{ background: statusColor }}
        />
      </div>

      {/* Name Label */}
      <div className="absolute -bottom-4 left-0 right-0 text-center">
        <span className="text-[8px] text-white pixel-font drop-shadow-[0_1px_0_rgba(0,0,0,1)]">
          {name}
        </span>
      </div>

      {/* Current Task Tooltip */}
      {currentTask && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap hidden group-hover:block">
          <div className="bg-black border border-white px-2 py-1 text-[7px] text-white pixel-font">
            {currentTask}
          </div>
        </div>
      )}
    </div>
  );
}