import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "CREATED",
  "QUEUED",
  "CLAIMED",
  "RUNNING",
  "WAITING",
  "REVIEW",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "FAILED_PERMANENTLY",
  "ESCALATED",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  task_id: z.string().uuid(),
  workflow_id: z.string().uuid().optional().nullable(),
  creator_agent_id: z.string().uuid(),
  assigned_agent_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid(),
  title: z.string().max(255),
  description: z.string().optional().nullable(),
  status: TaskStatusSchema,
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  payload: z.record(z.unknown()).optional().nullable(),
  required_permissions: z.array(z.string()).optional().nullable(),
  idempotency_key: z.string().max(255),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  started_at: z.string().datetime().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
  failed_at: z.string().datetime().optional().nullable(),
  error_log: z.array(z.unknown()).optional().nullable(),
  retry_count: z.number().int().default(0),
  max_retries: z.number().int().default(3),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskCreateSchema = TaskSchema.omit({
  task_id: true,
  created_at: true,
  updated_at: true,
  started_at: true,
  completed_at: true,
  failed_at: true,
  retry_count: true,
}).extend({
  creator_agent_id: z.string().uuid(),
  department_id: z.string().uuid(),
  title: z.string().max(255),
  idempotency_key: z.string().max(255),
});

export type TaskCreate = z.infer<typeof TaskCreateSchema>;