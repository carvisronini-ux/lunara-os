'use client';

export interface EventData {
  event_id: string;
  event_type: string;
  source_agent_name?: string;
  created_at: string;
}

interface PixelEventFeedProps {
  events: EventData[];
  title?: string;
}

const eventTypeIcons: Record<string, string> = {
  TASK_CREATED: '📋',
  TASK_STARTED: '▶️',
  TASK_COMPLETED: '✅',
  TASK_FAILED: '❌',
  RESOURCE_REQUESTED: '🔑',
  RESOURCE_GRANTED: '🔓',
  CONTENT_CREATED: '✍️',
  CONTENT_APPROVED: '✓',
  PUBLISHED: '📡',
  ANALYTICS_AVAILABLE: '📊',
  PATTERN_DISCOVERED: '💡',
  KNOWLEDGE_UPDATED: '📚',
};

export function PixelEventFeed({ events, title = 'EVENTS' }: PixelEventFeedProps) {
  return (
    <div className="bg-black border-2 border-white p-2">
      <div className="border-b border-white pb-1 mb-2">
        <span className="text-[10px] text-yellow-400 pixel-font">{title}</span>
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-[8px] text-gray-500 pixel-font text-center py-2">
            No events yet...
          </div>
        ) : (
          events.slice(0, 10).map((event, index) => (
            <div
              key={event.event_id}
              className="pixel-event flex items-center gap-2"
              style={{ opacity: 1 - index * 0.1 }}
            >
              <span className="text-[10px]">
                {eventTypeIcons[event.event_type] || '⚡'}
              </span>
              <div className="flex-1">
                <div className="text-[7px] text-white pixel-font">
                  {event.event_type.replace(/_/g, ' ')}
                </div>
                {event.source_agent_name && (
                  <div className="text-[6px] text-gray-400 pixel-font">
                    {event.source_agent_name}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}