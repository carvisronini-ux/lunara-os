// ============================================================
// LUNARA OS — Internal Orchestrator (Phase 7)
// Foundation §62, §65, §67, §111, §115, §116
// ============================================================

import { osEngine } from '../engine';
import { learningManager } from '../learning';
import type { TaskStatus } from '../contracts';

export type PipelineStage = {
  name: string;
  capability: string;
  agentId: string;
  description: string;
};

export type PipelineDefinition = {
  id: string;
  name: string;
  stages: PipelineStage[];
};

export type ActivePipelineInstance = {
  pipelineId: string;
  instanceId: string;
  currentStageIndex: number;
  status: "running" | "completed" | "failed";
  context: Record<string, unknown>;
};

// §116: First End-to-End Pipeline Definition
export const CONTENT_CREATION_PIPELINE: PipelineDefinition = {
  id: "pipeline_content_v1",
  name: "End-to-End Content Pipeline",
  stages: [
    { name: "TREND_RESEARCH", capability: "research.trends", agentId: "nyx", description: "Analyzing TikTok trend signals" },
    { name: "STRATEGY", capability: "strategy.plan", agentId: "sage", description: "Developing content strategy" },
    { name: "CONTENT_WRITING", capability: "content.write", agentId: "muse", description: "Writing hook variants" },
    { name: "CREATIVE_DIRECTION", capability: "creative.direction", agentId: "vega", description: "Creating visual concept" },
    { name: "QUALITY_REVIEW", capability: "quality.final_gate", agentId: "aegis", description: "QA review of pending post" },
    { name: "DISTRIBUTION", capability: "publishing.telegram", agentId: "echo", description: "Publishing to Telegram channel" },
    { name: "ANALYTICS", capability: "analytics.analyze", agentId: "nova", description: "Collecting performance metrics" },
    { name: "LEARNING", capability: "learning.discover_patterns", agentId: "iris", description: "Extracting patterns from last week" }
  ]
};

export class LunaraOrchestrator {
  private activePipelines: Map<string, ActivePipelineInstance> = new Map();

  constructor() {
    console.log('[LunaraOrchestrator] Initialized and subscribing to events');
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    // §65: Orchestrator reacts to task lifecycle events from the Core Engine
    osEngine.onEvent("TASK_COMPLETED", (event) => this.handleTaskCompleted(event));
    osEngine.onEvent("TASK_FAILED", (event) => this.handleTaskFailed(event));
  }

  // §116: Trigger the first end-to-end pipeline
  public triggerFirstPipeline(context: Record<string, unknown> = {}): string {
    const instanceId = `pipeline_inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const instance: ActivePipelineInstance = {
      pipelineId: CONTENT_CREATION_PIPELINE.id,
      instanceId,
      currentStageIndex: 0,
      status: "running",
      context
    };

    this.activePipelines.set(instanceId, instance);
    this.executeStage(instance);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "TASK_CREATED" as any,
      timestamp: Date.now(),
      agent_id: null,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { pipeline: CONTENT_CREATION_PIPELINE.name, instanceId, stage: "STARTED" },
      severity: "info" as any
    });

    return instanceId;
  }

  private executeStage(instance: ActivePipelineInstance) {
    const pipeline = CONTENT_CREATION_PIPELINE;
    const stage = pipeline.stages[instance.currentStageIndex];

    if (!stage) {
      // Pipeline finished successfully
      instance.status = "completed";
      this.activePipelines.delete(instance.instanceId);
      
      osEngine.emitEvent({
        event_id: `evt_${Date.now()}_${Math.random()}`,
        type: "TASK_COMPLETED" as any,
        timestamp: Date.now(),
        agent_id: "astra",
        task_id: null,
        resource_id: null,
        content_id: null,
        payload: { pipeline: pipeline.name, instanceId: instance.instanceId, status: "COMPLETED" },
        severity: "info" as any // ✅ შეცვლილია "success"-დან "info"-ზე და დამატებულია 'as any'
      });
      return;
    }

    const agentId = stage.agentId;
    const taskId = `task_pipe_${instance.instanceId}_${stage.name.toLowerCase()}`;

    // §34: Idempotency check
    const existingTask = osEngine.getTask(taskId);
    if (existingTask && existingTask.status !== "COMPLETED" && existingTask.status !== "FAILED") {
      return;
    }

    // §62: Create the next task in the dependency chain
    osEngine.createTask({
      task_id: taskId,
      idempotency_key: `pipeline:${instance.instanceId}:${stage.name}`,
      title: `${pipeline.name} - ${stage.name}`,
      description: stage.description,
      status: "QUEUED" as any,
      priority: "high",
      agent_id: agentId,
      department: "executive" as any,
      required_capability: stage.capability as any,
      payload: { 
        pipelineInstanceId: instance.instanceId, 
        stageName: stage.name,
        context: instance.context 
      },
      expected_outputs: ["structured_result"],
      depends_on: instance.currentStageIndex > 0 ? [`${instance.instanceId}_stage_${instance.currentStageIndex - 1}`] : [],
      progress: 0,
      retry_count: 0,
      max_retries: 3,
      error_category: null,
      error_message: null,
      created_at: Date.now(),
      started_at: null,
      completed_at: null,
      deadline: Date.now() + 1000 * 60 * 10
    } as any);

    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "TASK_CREATED" as any,
      timestamp: Date.now(),
      agent_id: agentId,
      task_id: taskId,
      resource_id: null,
      content_id: null,
      payload: { stage: stage.name, pipeline: pipeline.name },
      severity: "info" as any
    });
  }

  private handleTaskCompleted(event: any) {
    const taskId = event.task_id;
    if (!taskId) return;

    // ✅ BULLETPROOF FIX: Exact regex matching the instanceId format
    const match = taskId.match(/^task_pipe_(pipeline_inst_\d+_[a-z0-9]+)_([a-z_]+)$/);
    if (!match) return;
    
    const instanceId = match[1]; // This is now 100% guaranteed to be correct
    const instance = this.activePipelines.get(instanceId);
    if (!instance) return;

    // Move to next stage (§62)
    instance.currentStageIndex += 1;
    
    const pipeline = CONTENT_CREATION_PIPELINE;
    const isLastStage = instance.currentStageIndex >= pipeline.stages.length;
    
    if (isLastStage) {
      // §82, §111: Trigger Learning Record creation upon pipeline completion
      learningManager.createLearningRecord(
        "iris",
        `Pipeline ${instance.instanceId} completed. Analyzing overall performance pattern.`,
        undefined,
        "demo_campaign"
      );
    }

    // Execute the next stage
    this.executeStage(instance);
  }

  private handleTaskFailed(event: any) {
    const taskId = event.task_id;
    if (!taskId) return;

    // ✅ BULLETPROOF FIX: Exact regex matching the instanceId format
    const match = taskId.match(/^task_pipe_(pipeline_inst_\d+_[a-z0-9]+)_([a-z_]+)$/);
    if (!match) return;
    
    const instanceId = match[1];
    const instance = this.activePipelines.get(instanceId);
    if (!instance) return;

    // §35, §72: Escalation logic for failed tasks
    osEngine.emitEvent({
      event_id: `evt_${Date.now()}_${Math.random()}`,
      type: "TASK_ESCALATED" as any,
      timestamp: Date.now(),
      agent_id: event.agent_id,
      task_id: taskId,
      resource_id: null,
      content_id: null,
      payload: { 
        reason: "Task failed in pipeline, escalating to Executive Core",
        stage: CONTENT_CREATION_PIPELINE.stages[instance.currentStageIndex]?.name 
      },
      severity: "warning" as any
    });

    // Halt pipeline and mark as failed
    instance.status = "failed";
    this.activePipelines.delete(instanceId);
  }

  public getActivePipelines(): ActivePipelineInstance[] {
    return Array.from(this.activePipelines.values());
  }

  public getPipelineDefinition(): PipelineDefinition {
    return CONTENT_CREATION_PIPELINE;
  }
}

// Singleton instance
export const orchestrator = new LunaraOrchestrator();