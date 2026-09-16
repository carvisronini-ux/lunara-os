import { z } from "zod";

export const EventTypeSchema = z.enum([
  "TASK_CREATED",
  "TASK_STARTED",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "RESOURCE_REQUESTED",
  "RESOURCE_GRANTED",
  "RESOURCE_REVOKED",
  "ASSET_REQUESTED",
  "ASSET_CREATED",
  "ASSET_APPROVED",
  "CONTENT_CREATED",
  "CONTENT_REVIEW_REQUESTED",
  "CONTENT_APPROVED",
  "CONTENT_REJECTED",
  "PUBLISH_REQUESTED",
  "PUBLISHED",
  "ANALYTICS_AVAILABLE",
  "PATTERN_DISCOVERED",
  "KNOWLEDGE_UPDATED",
  "AGENT_VERSION_CREATED",
  "AGENT_EVALUATED",
  "AGENT_PROMOTED",
  "AGENT_ROLLED_BACK",
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const EventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: EventTypeSchema,
  source_agent_id: z.string().uuid().optional().nullable(),
  target_agent_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  content_id: z.string().uuid().optional().nullable(),
  payload: z.record(z.unknown()).optional().nullable(),
  created_at: z.string().datetime(),
});

export type Event = z.infer<typeof EventSchema>;

export const EventCreateSchema = EventSchema.omit({
  event_id: true,
  created_at: true,
});

export type EventCreate = z.infer<typeof EventCreateSchema>;