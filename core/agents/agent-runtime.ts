// ============================================================
// LUNARA OS — Agent Runtime (Lease-Based Execution)
// Foundation: §33, §38-39, §101
// ============================================================

import { osEngine } from '../engine';
import { accessManager } from '@/services/credentials/access-manager';
import { mockProxy } from '@/services/credentials/mock-proxy';
import type { TaskStatus } from '../contracts';

export class AgentRuntime {
  private activeAgents: Set<string> = new Set();
  private processingTasks: Set<string> = new Set();

  constructor() {
    console.log('[AgentRuntime] Initialized with lease-based execution');
    osEngine.onEvent("TASK_CREATED", (event) => this.handleNewTask(event));
  }

  public registerAgent(agentId: string) {
    this.activeAgents.add(agentId);
  }

  private async handleNewTask(event: any) {
    const taskId = event.task_id;
    const agentId = event.agent_id;

    if (!taskId || !agentId || !this.activeAgents.has(agentId)) return;
    if (this.processingTasks.has(taskId)) return;

    this.processingTasks.add(taskId);
    osEngine.updateTaskStatus(taskId, "RUNNING", agentId);

    // Request lease for this task
    const provider = this.getProviderForAgent(agentId);
    const permission = this.getPermissionForTask(taskId);
    
    const leaseId = accessManager.requestAccess(
      agentId,
      provider,
      permission,
      `task_${taskId}`,
      taskId,
      300 // 5 minutes
    );

    if (!leaseId) {
      console.error(`[AgentRuntime] ❌ Failed to get lease for ${agentId}`);
      osEngine.updateTaskStatus(taskId, "FAILED", agentId);
      this.processingTasks.delete(taskId);
      return;
    }

    // Simulate work with real lease validation
    const workDuration = this.getWorkDuration(agentId);
    console.log(`[AgentRuntime] 🤖 ${agentId} working on ${taskId} with lease ${leaseId}`);

    setTimeout(async () => {
      // Execute mock API call (simulated)
      const response = await mockProxy.execute({
        lease_id: leaseId,
        action: this.getActionForTask(taskId),
        parameters: { task_id: taskId }
      });

      if (response.success) {
        osEngine.updateTaskStatus(taskId, "COMPLETED", agentId);
        console.log(`[AgentRuntime] ✅ ${agentId} completed ${taskId}`);
      } else {
        osEngine.updateTaskStatus(taskId, "FAILED", agentId);
        console.error(`[AgentRuntime] ❌ ${agentId} failed ${taskId}: ${response.error}`);
      }

      this.processingTasks.delete(taskId);
    }, workDuration);
  }

  private getProviderForAgent(agentId: string): string {
    const providers: Record<string, string> = {
      'nyx': 'tiktok',
      'sage': 'openai',
      'muse': 'openai',
      'vega': 'openai',
      'aegis': 'openai',
      'echo': 'telegram',
      'nova': 'telegram',
      'iris': 'openai'
    };
    return providers[agentId] || 'openai';
  }

  private getPermissionForTask(taskId: string): string {
    return "research.trends"; // Simplified for demo
  }

  private getActionForTask(taskId: string): string {
    return "fetch_trending_hashtags"; // Simplified for demo
  }

  private getWorkDuration(agentId: string): number {
    const durations: Record<string, number> = {
      'nyx': 2500,
      'sage': 3000,
      'muse': 3500,
      'vega': 2000,
      'aegis': 1500,
      'echo': 1000,
      'nova': 2000,
      'iris': 2500
    };
    return durations[agentId] || 2000;
  }
}

export const agentRuntime = new AgentRuntime();