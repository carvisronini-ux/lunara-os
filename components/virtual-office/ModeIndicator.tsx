'use client';

import { clsx } from 'clsx';

interface ModeIndicatorProps {
  mode: 'LIVE' | 'SIMULATION';
}

export function ModeIndicator({ mode }: ModeIndicatorProps) {
  const isLive = mode === 'LIVE';

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-sm font-bold tracking-wider',
        isLive
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      )}
    >
      <div className="relative">
        <div
          className={clsx(
            'w-2 h-2 rounded-full',
            isLive ? 'bg-emerald-400' : 'bg-amber-400'
          )}
        />
        <div
          className={clsx(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            isLive ? 'bg-emerald-400' : 'bg-amber-400'
          )}
        />
      </div>
      <span>{mode} MODE</span>
      {!isLive && (
        <span className="text-xs font-normal opacity-75 ml-1">
          (Simulated data — not production)
        </span>
      )}
    </div>
  );
}