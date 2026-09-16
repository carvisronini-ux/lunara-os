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

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<AgentStatus, { color: string; glow: string; label: string }> = {
  OFFLINE: {
    color: 'bg-gray-500',
    glow: 'shadow-gray-500/50',
    label: 'Offline',
  },
  IDLE: {
    color: 'bg-blue-400',
    glow: 'shadow-blue-400/50',
    label: 'Idle',
  },
  STARTING: {
    color: 'bg-yellow-400',
    glow: 'shadow-yellow-400/50',
    label: 'Starting',
  },
  WORKING: {
    color: 'bg-emerald-400',
    glow: 'shadow-emerald-400/50',
    label: 'Working',
  },
  WAITING: {
    color: 'bg-purple-400',
    glow: 'shadow-purple-400/50',
    label: 'Waiting',
  },
  WAITING_FOR_RESOURCE: {
    color: 'bg-orange-400',
    glow: 'shadow-orange-400/50',
    label: 'Waiting for Resource',
  },
  WAITING_FOR_REVIEW: {
    color: 'bg-pink-400',
    glow: 'shadow-pink-400/50',
    label: 'Waiting for Review',
  },
  ERROR: {
    color: 'bg-red-500',
    glow: 'shadow-red-500/50',
    label: 'Error',
  },
  PAUSED: {
    color: 'bg-gray-400',
    glow: 'shadow-gray-400/50',
    label: 'Paused',
  },
  SUSPENDED: {
    color: 'bg-red-700',
    glow: 'shadow-red-700/50',
    label: 'Suspended',
  },
  COMPLETED: {
    color: 'bg-emerald-500',
    glow: 'shadow-emerald-500/50',
    label: 'Completed',
  },
};

export function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.OFFLINE;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={clsx(
            'rounded-full',
            sizeClasses[size],
            config.color,
            status === 'WORKING' && 'animate-pulse',
            status === 'ERROR' && 'animate-pulse'
          )}
        />
        {status === 'WORKING' && (
          <div
            className={clsx(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              config.color
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className={clsx('text-gray-300 font-medium', labelSizeClasses[size])}>
          {config.label}
        </span>
      )}
    </div>
  );
}