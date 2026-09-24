// ============================================================
// LUNARA OS — Core Engine (Sprint 2)
// Foundation: Lunara Master Bible v2.0 & Foundation v1.0
// Purpose: In-memory implementation of Agent Registry, Task Engine, and Event Bus
// ============================================================

import type {
  AgentConstitution,
  AgentStatus,
  Task,
  TaskStatus,
  Event,
  EventType,
} from './contracts';

// ლოკალური ტიპის განსაზღვრა, რადგან AgentState არ არის ექსპორტირებული contracts-დან
export type AgentState = {
  agent_id: string;
  status: AgentStatus;
  current_task_id: string | null;
  last_heartbeat: number;
  health_score: number;
  last_activity?: number;
};

export class LunaraOSEngine {
  // 1. Agent Registry
  private agents: Map<string, { constitution: AgentConstitution; state: AgentState }> = new Map();

  // 2. Task Engine
  private tasks: Map<string, Task> = new Map();

  // 3. Event Bus
  private events: Event[] = [];
  private listeners: Map<EventType, ((event: Event) => void)[]> = new Map();
  private readonly MAX_EVENTS = 1000; // Prevent memory leaks in simulation

  constructor() {
    console.log('[LunaraOSEngine] Initialized and ready');
  }

  /* =========================================================
     AGENT REGISTRY (§16, §66, §53)
     ========================================================= */

  public registerAgent(constitution: AgentConstitution, initialState: AgentState): void {
    if (this.agents.has(constitution.agent_id)) {
      console.warn(`[LunaraOSEngine] Agent ${constitution.agent_id} already registered.`);
      return;
    }

    this.agents.set(constitution.agent_id, {
      constitution,
      state: initialState,
    });

    this.emitEvent({
      event_id: `evt_agent_reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'AGENT_REGISTERED',
      timestamp: Date.now(),
      agent_id: constitution.agent_id,
      task_id: null,
      resource_id: null,
      content_id: null,
      payload: { display_name: constitution.display_name, department: constitution.department },
      severity: 'info' as any,
    });
  }

  public getAgent(agentId: string): { constitution: AgentConstitution; state: AgentState } | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): { constitution: AgentConstitution; state: AgentState }[] {
    return Array.from(this.agents.values());
  }

  public updateAgentState(agentId: string, newState: Partial<AgentState>): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error(`[LunaraOSEngine] Cannot update state: Agent ${agentId} not found.`);
      return;
    }

    const oldStatus = agent.state.status;
    agent.state = { ...agent.state, ...newState, last_activity: Date.now() };

    if (oldStatus !== newState.status) {
      this.emitEvent({
        event_id: `evt_agent_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'AGENT_STATUS_CHANGED',
        timestamp: Date.now(),
        agent_id: agentId,
        task_id: newState.current_task_id || null,
        resource_id: null,
        content_id: null,
        payload: { old_status: oldStatus, new_status: newState.status },
        severity: 'info' as any,
      });
    }
  }

  /* =========================================================
     TASK ENGINE (§33, §34, §35, §62)
     ========================================================= */

  public createTask(task: Task): Task {
    // §34: Idempotency check — prevents duplicate execution
    const existingTask = Array.from(this.tasks.values()).find(
      (t) => t.idempotency_key === task.idempotency_key && t.status !== 'FAILED_PERMANENTLY' && t.status !== 'COMPLETED'
    );

    if (existingTask) {
      console.log(`[LunaraOSEngine] Idempotent task already exists: ${task.idempotency_key}`);
      return existingTask;
    }

    this.tasks.set(task.task_id, task);

    this.emitEvent({
      event_id: `evt_task_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'TASK_CREATED',
      timestamp: Date.now(),
      agent_id: task.creator_agent_id,
      task_id: task.task_id,
      resource_id: null,
      content_id: null,
      payload: { title: task.title, priority: task.priority },
      severity: 'info' as any,
    });

    return task;
  }

  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public updateTaskStatus(taskId: string, newStatus: TaskStatus, agentId?: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`[LunaraOSEngine] Cannot update status: Task ${taskId} not found.`);
      return undefined;
    }

    const oldStatus = task.status;
    task.status = newStatus;

    if (agentId) {
      task.assigned_agent_id = agentId;
    }

    const now = Date.now();
    if (newStatus === 'RUNNING' && oldStatus !== 'RUNNING') {
      task.started_at = now;
    }

    if (
      newStatus === 'COMPLETED' ||
      newStatus === 'FAILED' ||
      newStatus === 'FAILED_PERMANENTLY' ||
      newStatus === 'ESCALATED'
    ) {
      task.completed_at = now;
    }

    // Emit specific event based on status transition
    let eventType: EventType = 'TASK_STARTED' as any;
    let severity: any = 'info';

    switch (newStatus) {
      case 'RUNNING':
        eventType = 'TASK_STARTED' as any;
        break;
      case 'COMPLETED':
        eventType = 'TASK_COMPLETED' as any;
        break;
      case 'FAILED':
      case 'FAILED_PERMANENTLY':
        eventType = 'TASK_FAILED' as any;
        severity = 'error';
        break;
      case 'RETRYING':
        eventType = 'TASK_RETRIED' as any;
        severity = 'warning';
        break;
      case 'ESCALATED':
        eventType = 'TASK_ESCALATED' as any;
        severity = 'critical';
        break;
      default:
        eventType = 'TASK_STARTED' as any; // Fallback for QUEUED, CLAIMED, etc.
    }

    this.emitEvent({
      event_id: `evt_task_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: now,
      agent_id: task.assigned_agent_id || null,
      task_id: task.task_id,
      resource_id: null,
      content_id: null,
      payload: { old_status: oldStatus, new_status: newStatus, error: task.error_message },
      severity,
    });

    return task;
  }

  /* =========================================================
     EVENT BUS (§32, §106)
     ========================================================= */

  public emitEvent(event: Event): void {
    this.events.unshift(event); // Newest first
    if (this.events.length > this.MAX_EVENTS) {
      this.events.pop(); // Drop oldest to prevent memory leaks
    }

    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[LunaraOSEngine] Error in event listener for ${event.type}:`, error);
      }
    });
  }

  public onEvent(eventType: EventType, callback: (event: Event) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  public getRecentEvents(limit: number = 50): Event[] {
    return this.events.slice(0, limit);
  }

  /* =========================================================
     UTILITIES
     ========================================================= */

  public clear(): void {
    this.agents.clear();
    this.tasks.clear();
    this.events = [];
    this.listeners.clear();
    console.log('[LunaraOSEngine] Cleared all state.');
  }
}

// Singleton instance for global access
export const osEngine = new LunaraOSEngine();