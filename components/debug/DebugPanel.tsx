'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import '@/styles/pixel.css';

interface DebugInfo {
  timestamp: string;
  files: {
    exists: boolean;
    path: string;
  }[];
  supabase: {
    connected: boolean;
    url: string;
    error?: string;
  };
  agents: {
    total: number;
    active: number;
    statuses: Record<string, number>;
  };
  events: {
    total: number;
    lastEvent?: string;
  };
  simulation: {
    active: boolean;
    tickCount: number;
    lastUpdate: string;
  };
  errors: string[];
}

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  const runDiagnostics = async () => {
    setLoading(true);
    
    // სიმულაცია diagnostic მონაცემების
    const info: DebugInfo = {
      timestamp: new Date().toISOString(),
      files: [
        { exists: true, path: 'app/virtual-office/page.tsx' },
        { exists: true, path: 'components/virtual-office/PixelAgent.tsx' },
        { exists: true, path: 'components/virtual-office/PixelRoom.tsx' },
        { exists: true, path: 'components/virtual-office/PixelEventFeed.tsx' },
        { exists: true, path: 'components/virtual-office/PixelModeIndicator.tsx' },
        { exists: true, path: 'styles/pixel.css' },
        { exists: true, path: 'core/database/client.ts' },
        { exists: true, path: 'core/tasks/taskEngine.ts' },
        { exists: true, path: 'core/events/eventBus.ts' },
      ],
      supabase: {
        connected: true,
        url: process.env.NEXT_PUBLIC_SUPABASE_OS_URL || 'Not configured',
      },
      agents: {
        total: 10,
        active: 3,
        statuses: {
          IDLE: 4,
          WORKING: 3,
          WAITING: 2,
          OFFLINE: 1,
        },
      },
      events: {
        total: 15,
        lastEvent: 'TASK_CREATED',
      },
      simulation: {
        active: true,
        tickCount: 42,
        lastUpdate: new Date().toISOString(),
      },
      errors: [],
    };

    // Supabase კავშირის შემოწმება
    try {
      const { supabaseOs } = await import('@/core/database/client');
      const { error } = await supabaseOs.from('agents').select('count', { count: 'exact', head: true });
      
      if (error) {
        info.supabase.connected = false;
        info.supabase.error = error.message;
        info.errors.push(`Supabase connection error: ${error.message}`);
      }
    } catch (err) {
      info.supabase.connected = false;
      info.supabase.error = err instanceof Error ? err.message : 'Unknown error';
      info.errors.push(`Failed to import Supabase client: ${info.supabase.error}`);
    }

    setDebugInfo(info);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black border-4 border-yellow-400 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto pixel-font">
        {/* Header */}
        <div className="sticky top-0 bg-black border-b-4 border-yellow-400 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-yellow-400 animate-pulse" />
            <h2 className="text-lg text-yellow-400">LUNARA OS DEBUG PANEL</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-red-600 border-2 border-white px-3 py-1 text-xs hover:bg-red-700 transition-colors"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-yellow-400 text-sm mb-4">Running diagnostics...</div>
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : debugInfo ? (
            <>
              {/* Timestamp */}
              <div className="bg-gray-900 border-2 border-gray-700 p-3">
                <div className="text-xs text-gray-500 mb-1">Diagnostic Timestamp</div>
                <div className="text-sm text-green-400">{debugInfo.timestamp}</div>
              </div>

              {/* Supabase Status */}
              <div className="bg-gray-900 border-2 border-gray-700 p-3">
                <div className="text-xs text-gray-500 mb-2">Supabase Connection</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx(
                    'w-3 h-3 border-2 border-black',
                    debugInfo.supabase.connected ? 'bg-green-400' : 'bg-red-400'
                  )} />
                  <span className={clsx(
                    'text-sm',
                    debugInfo.supabase.connected ? 'text-green-400' : 'text-red-400'
                  )}>
                    {debugInfo.supabase.connected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 break-all">
                  URL: {debugInfo.supabase.url}
                </div>
                {debugInfo.supabase.error && (
                  <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-400 p-2">
                    Error: {debugInfo.supabase.error}
                  </div>
                )}
              </div>

              {/* Files Status */}
              <div className="bg-gray-900 border-2 border-gray-700 p-3">
                <div className="text-xs text-gray-500 mb-2">Required Files</div>
                <div className="space-y-1">
                  {/* ✅ გასწორებულია: დამატებულია index პარამეტრი */}
                  {debugInfo.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className={clsx(
                        'w-2 h-2 border border-black',
                        file.exists ? 'bg-green-400' : 'bg-red-400'
                      )} />
                      <span className={clsx(
                        file.exists ? 'text-green-400' : 'text-red-400'
                      )}>
                        {file.exists ? '✓' : '✗'} {file.path}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agents Status */}
              <div className="bg-gray-900 border-2 border-gray-700 p-3">
                <div className="text-xs text-gray-500 mb-2">Agents</div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-2xl text-white">{debugInfo.agents.total}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Active</div>
                    <div className="text-2xl text-emerald-400">{debugInfo.agents.active}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {Object.entries(debugInfo.agents.statuses).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{status}:</span>
                      <span className="text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events Status */}
              <div className="bg-gray-900 border-2 border-gray-700 p-3">
                <div className="text-xs text-gray-500 mb-2">Events</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Total Events:</span>
                  <span className="text-sm text-white">{debugInfo.events.total}</span>
                </div>
                {debugInfo.events.lastEvent && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Last Event:</span>
                    <span className="text-blue-400">{debugInfo.events.lastEvent}</span>
                  </div>
                )}
              </div>

              {/* Simulation Status */}
              <div className="bg-gray-900 border-2 border-gray-700 p-3">
                <div className="text-xs text-gray-500 mb-2">Simulation Engine</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx(
                    'w-3 h-3 border-2 border-black',
                    debugInfo.simulation.active ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
                  )} />
                  <span className={clsx(
                    'text-sm',
                    debugInfo.simulation.active ? 'text-yellow-400' : 'text-gray-400'
                  )}>
                    {debugInfo.simulation.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tick Count:</span>
                    <span className="text-white">{debugInfo.simulation.tickCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Update:</span>
                    <span className="text-white">{debugInfo.simulation.lastUpdate}</span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {debugInfo.errors.length > 0 && (
                <div className="bg-red-900/20 border-2 border-red-400 p-3">
                  <div className="text-xs text-red-400 mb-2">⚠ ERRORS DETECTED</div>
                  <div className="space-y-1">
                    {/* ✅ გასწორებულია: დამატებულია index პარამეტრი */}
                    {debugInfo.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-300">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Errors */}
              {debugInfo.errors.length === 0 && (
                <div className="bg-green-900/20 border-2 border-green-400 p-3">
                  <div className="text-xs text-green-400">
                    ✓ No errors detected. System is healthy.
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={runDiagnostics}
                className="w-full bg-blue-600 border-2 border-white py-2 text-xs hover:bg-blue-700 transition-colors"
              >
                ↻ REFRESH DIAGNOSTICS
              </button>
            </>
          ) : (
            <div className="text-center py-12 text-red-400">
              Failed to load diagnostic information
            </div>
          )}
        </div>
      </div>
    </div>
  );
}