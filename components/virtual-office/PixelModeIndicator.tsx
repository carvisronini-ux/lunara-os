'use client';

import { clsx } from 'clsx';

interface PixelModeIndicatorProps {
  mode: 'LIVE' | 'SIMULATION';
}

export function PixelModeIndicator({ mode }: PixelModeIndicatorProps) {
  const isLive = mode === 'LIVE';

  return (
    <div className={clsx('pixel-font px-3 py-2 border-2 flex items-center gap-2', isLive ? 'mode-live' : 'mode-simulation')}>
      <div className={clsx('w-2 h-2 border border-black', isLive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400')} />
      <span className="text-[10px]">{mode}</span>
      {!isLive && <span className="text-[7px] opacity-75">(SIM)</span>}
.    </div>
  );
}