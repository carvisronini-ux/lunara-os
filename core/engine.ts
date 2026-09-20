// ============================================================
// LUNARA OS — In-Memory Core Engine (Phase 1)
// Foundation §32 (Event Bus), §33 (Task Engine), §53 (Heartbeat)
// ============================================================

import type { 
    Event, EventType, Task, TaskStatus, AgentStatus, 
    AgentHeartbeat, AgentConstitution 
  } from './contracts';
  
  class LunaraOSEngine {
    private events: Event[] = [];
    private tasks: Map<string, Task> = new Map();
    private agents: Map<string, AgentHeartbeat> = new Map();
    private listeners: Map<EventType, ((event: Event) => void)[]> = new Map();
  
    // ----------------------------------------------------------
    // §32 — Event Bus
    // ----------------------------------------------------------
    public emitEvent(event: Event) {
      this.events.unshift(event); // Newest first
      if (this.events.length > 100) this.events.pop(); // Keep memory bounded
      
      const callbacks = this.listeners.get(event.type) || [];
      callbacks.forEach(cb => cb(event));
    }
  
    public onEvent(type: EventType, callback: (event: Event) => void) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      this.listeners.get(type)!.push(callback);
    }
  
    public getRecentEvents(limit = 20): Event[] {
      return this.events.slice(0, limit);
    }
  
    // ----------------------------------------------------------
    // §33 — Task Engine
    // ----------------------------------------------------------
    public createTask(task: Task) {
      this.tasks.set(task.task_id, task);
      this.emitEvent({
        event_id: `evt_${Date.now()}_${Math.random()}`,
        type: "TASK_CREATED",
        timestamp: Date.now(),
        agent_id: task.agent_id,
        task_id: task.task_id,
        resource_id: null,
        content_id: null,
        payload: { title: task.title },
        severity: "info"
      });
    }
  
    public updateTaskStatus(taskId: string, status: TaskStatus, agentId?: string) {
      const task = this.tasks.get(taskId);
      if (!task) return;
  
      const oldStatus = task.status;
      task.status = status;
      if (agentId) task.agent_id = agentId;
  
      if (status === "running") task.started_at = Date.now();
      if (status === "completed" || status === "failed" || status === "failed_permanently") {
        task.completed_at = Date.now();
      }
  
      let eventType: EventType = "TASK_STARTED";
      if (status === "completed") eventType = "TASK_COMPLETED";
      if (status === "failed" || status === "failed_permanently") eventType = "TASK_FAILED";
      if (status === "retrying") eventType = "TASK_RETRIED";
      if (status === "escalated") eventType = "TASK_ESCALATED";
  
      this.emitEvent({
        event_id: `evt_${Date.now()}_${Math.random()}`,
        type: eventType,
        timestamp: Date.now(),
        agent_id: task.agent_id,
        task_id: taskId,
        resource_id: null,
        content_id: null,
        payload: { oldStatus, newStatus: status },
        severity: status === "failed" || status === "escalated" ? "warning" : "info"
      });
    }
  
    public getTask(taskId: string): Task | undefined {
      return this.tasks.get(taskId);
    }
  
    public getAllTasks(): Task[] {
      return Array.from(this.tasks.values());
    }
  
    // ----------------------------------------------------------
    // §53 — Agent Heartbeat & Registry
    // ----------------------------------------------------------
    public registerAgent(constitution: AgentConstitution, initialStatus: AgentStatus) {
      this.agents.set(constitution.agent_id, {
        agent_id: constitution.agent_id,
        status: initialStatus,
        current_task: null,
        last_activity: Date.now(),
        health: 100,
        timestamp: Date.now()
      });
  
      this.emitEvent({
        event_id: `evt_${Date.now()}_${Math.random()}`,
        type: "AGENT_REGISTERED",
        timestamp: Date.now(),
        agent_id: constitution.agent_id,
        task_id: null,
        resource_id: null,
        content_id: null,
        payload: { name: constitution.display_name, department: constitution.department },
        severity: "info"
      });
    }
  
    public updateAgentHeartbeat(heartbeat: AgentHeartbeat) {
      this.agents.set(heartbeat.agent_id, { ...heartbeat, timestamp: Date.now() });
      
      // Only emit event if status changed to avoid spam
      const prev = this.agents.get(heartbeat.agent_id);
      // Simplified for demo: in real OS, compare with previous state
    }
  
    public getAllAgents(): AgentHeartbeat[] {
      return Array.from(this.agents.values());
    }
  }
  
  // Singleton instance for the application
  export const osEngine = new LunaraOSEngine();