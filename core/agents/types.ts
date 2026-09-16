import { z } from "zod";

export const AgentStatusSchema = z.enum([
  "OFFLINE",
  "IDLE",
  "STARTING",
  "WORKING",
  "WAITING",
  "WAITING_FOR_RESOURCE",
  "WAITING_FOR_REVIEW",
  "ERROR",
  "PAUSED",
  "SUSPENDED",
  "COMPLETED",
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AutonomyLevelSchema = z.enum([
  "L0_MANUAL",
  "L1_ASSISTED",
  "L2_AUTO_WITH_APPROVAL",
  "L3_AUTONOMOUS_WITHIN_POLICY",
  "L4_HIGH_AUTONOMY",
]);

export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;

export const AgentSchema = z.object({
  agent_id: z.string().uuid(),
  display_name: z.string().max(100),
  machine_id: z.string().max(100),
  department_id: z.string().uuid(),
  version: z.string().max(20).default("1.0.0"),
  status: AgentStatusSchema.default("OFFLINE"),
  autonomy_level: AutonomyLevelSchema.default("L1_ASSISTED"),
  mission: z.string().optional().nullable(),
  responsibilities: z.record(z.unknown()).optional().nullable(),
  supervisor_agent_id: z.string().uuid().optional().nullable(),
  controller_agent_id: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_heartbeat: z.string().datetime().optional().nullable(),
});

export type Agent = z.infer<typeof AgentSchema>;