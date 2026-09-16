'use client';

import { clsx } from 'clsx';

export type SystemHealth = 'HEALTHY' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAINTENANCE' | 'EMERGENCY';

interface SystemStatusProps {
  health: SystemHealth;
  totalAgents: number;
  activeAgents: number;
  activeTasks: number;
  pendingApprovals: number;
}

const healthConfig: Record<SystemHealth, { color: string; label: string; icon: string }> = {
  HEALTHY: { color: 'text-emerald-400', label: 'Healthy', icon: '✓' },
  DEGRADED: { color: 'text-yellow-400', label: 'Degraded', icon: '⚠' },
  PARTIAL_OUTAGE: { color: 'text-orange-400', label: 'Partial Outage', icon: '⚠' },
  MAINTENANCE: { color: 'text-blue-400', label: 'Maintenance', icon: '🔧' },
  EMERGENCY: { color: 'text-red-500', label: 'Emergency', icon: '🚨' },
};

export function SystemStatus({
  health,
  totalAgents,
  activeAgents,
  activeTasks,
  pendingApprovals,
}: SystemStatusProps) {
  const config = healthConfig[health];

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-lunara-darker/50 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">System Status</h2>
        <div className={clsx('flex items-center gap-2 font-mono text-sm font-bold', config.color)}>
          <span className="text-lg">{config.icon}</span>
          <span>{config.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-lunara-dark/50 border border-gray-700/30">
          <div className="text-xs text-gray-500 mb-1">Total Agents</div>
          <div className="text-2xl font-bold text-white">{totalAgents}</div>
        </div>
        <div className="p-3 rounded-lg bg-lunara-dark/50 border border-gray-700/30">
          <div className="text-xs text-gray-500 mb-1">Active Now</div>
          <div className="text-2xl font-bold text-emerald-400">{activeAgents}</div>
        </div>
        <div className="p-3 rounded-lg bg-lunara-dark/50 border border-gray-700/30">
          <div className="text-xs text-gray-500 mb-1">Active Tasks</div>
          <div className="text-2xl font-bold text-blue-400">{activeTasks}</div>
        </div>
        <div className="p-3 rounded-lg bg-lunara-dark/50 border border-gray-700/30">
          <div className="text-xs text-gray-500 mb-1">Pending Approvals</div>
          <div className="text-2xl font-bold text-amber-400">{pendingApprovals}</div>
        </div>
      </div>
    </div>
  );
}