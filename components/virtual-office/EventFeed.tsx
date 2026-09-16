'use client';

import { clsx } from 'clsx';

export interface EventData {
  event_id: string;
  event_type: string;
  source_agent_name?: string;
  target_agent_name?: string;
  task_id?: string;
  created_at: string;
  payload?: Record<string, unknown>;
}

interface EventFeedProps {
  events: EventData[];
  title?: string;
  maxEvents?: number;
}

const eventTypeColors: Record<string, string> = {
  TASK_CREATED: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  TASK_STARTED: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  TASK_COMPLETED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  TASK_FAILED: 'text-red-400 bg-red-400/10 border-red-400/30',
  RESOURCE_REQUESTED: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  RESOURCE_GRANTED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  CONTENT_CREATED: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  CONTENT_APPROVED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  CONTENT_REJECTED: 'text-red-400 bg-red-400/10 border-red-400/30',
  PUBLISHED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  ANALYTICS_AVAILABLE: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  PATTERN_DISCOVERED: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
  KNOWLEDGE_UPDATED: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function EventFeed({ events, title = 'Live Event Feed', maxEvents = 20 }: EventFeedProps) {
  const displayEvents = events.slice(0, maxEvents);

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-lunara-darker/50 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/50 bg-gradient-to-r from-lunara-dark to-lunara-darker">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {displayEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No events yet. Events will appear here as the system operates.
          </div>
        ) : (
          <div className="space-y-2">
            {displayEvents.map((event, index) => {
              const colorClass = eventTypeColors[event.event_type] || 'text-gray-400 bg-gray-400/10 border-gray-400/30';

              return (
                <div
                  key={event.event_id}
                  className={clsx(
                    'p-3 rounded-lg border text-sm transition-all',
                    colorClass,
                    index === 0 && 'animate-pulse'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-mono text-xs font-bold mb-1">
                        {event.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs opacity-80">
                        {event.source_agent_name && (
                          <span>
                            <span className="font-semibold">{event.source_agent_name}</span>
                            {event.target_agent_name ? ` → ${event.target_agent_name}` : ''}
                          </span>
                        )}
                        {!event.source_agent_name && 'System'}
                      </div>
                    </div>
                    <div className="text-xs opacity-60 font-mono whitespace-nowrap">
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}