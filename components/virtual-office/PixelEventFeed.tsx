'use client';

export interface EventData {
  event_id: string;
  event_type: string;
  message: string;
  timestamp: string;
}

interface PixelEventFeedProps {
  events: EventData[];
}

const eventTypeIcons: Record<string, string> = {
  TASK_CREATED: '📋',
  TASK_STARTED: '⚡',
  TASK_COMPLETED: '✅',
  TASK_FAILED: '❌',
  AGENT_REGISTERED: '🤖',
  EMERGENCY_ACTIVATED: '🚨',
  RESOURCE_REQUESTED: '🔐',
  RESOURCE_GRANTED: '🔓',
  KNOWLEDGE_VERSION_CREATED: '📚',
  CONTENT_REVIEW_REQUESTED: '🛡️',
  CONTENT_APPROVED: '✅',
  CONTENT_REJECTED: '❌',
  PATTERN_DISCOVERED: '🧬',
};

export function PixelEventFeed({ events }: PixelEventFeedProps) {
  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <div className="text-[8px] text-gray-500 pixel-font text-center py-4">No events yet...</div>
      ) : (
        events.slice(0, 12).map((event) => (
          <div key={event.event_id} className="pixel-event flex items-start gap-2 p-2 rounded bg-[#2C1810]/50 border border-[#F5E6D3]/20">
            <span className="text-[10px]">{eventTypeIcons[event.event_type] || '⚡'}</span>
            <div className="flex-1">
              <div className="text-[9px] text-[#F5E6D3] pixel-font leading-tight">{event.message}</div>
              <div className="text-[7px] text-gray-500 pixel-font mt-0.5">{event.timestamp}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}