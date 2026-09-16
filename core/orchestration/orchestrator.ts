import { createTask, updateTaskStatus, assignTask } from '@/core/tasks/taskEngine';
import { emitEvent, getEvents } from '@/core/events/eventBus';
import { type TaskCreate, type Task, type TaskStatus } from '@/core/tasks/types';
import { type Event, type EventType } from '@/core/events/types';

/**
 * Orchestrator - Lunara OS-ის ცენტრალური ორკესტრატორი
 * 
 * ეს კლასი პასუხისმგებელია:
 * - მოვლენების მიღებაზე და დამუშავებაზე
 * - ამოცანების ავტომატურ შექმნაზე მოვლენების საფუძველზე
 * - სამუშაო ნაკადების (workflows) მართვაზე
 * - შეცდომების დამუშავებაზე და ესკალაციაზე
 */
export class Orchestrator {
  private isRunning: boolean = false;

  constructor() {
    console.log('[Orchestrator] Initialized');
  }

  /**
   * სამუშაო ნაკადის (pipeline) შესრულება
   * 
   * ეს ფუნქცია ქმნის ამოცანების ჯაჭვს და აკავშირებს მათ ერთმანეთთან.
   * 
   * @param workflowName - სამუშაო ნაკადის სახელი
   * @param initialPayload - საწყისი მონაცემები
   * @param creatorAgentId - შემქმნელი აგენტის ID
   * @param departmentId - დეპარტამენტის ID
   */
  async executePipeline(
    workflowName: string,
    initialPayload: unknown,
    creatorAgentId: string,
    departmentId: string
  ): Promise<void> {
    try {
      console.log(`[Orchestrator] Starting pipeline: ${workflowName}`);

      // 1. პირველი ამოცანის შექმნა
      const firstTask = await createTask({
        workflow_id: workflowName,
        creator_agent_id: creatorAgentId,
        department_id: departmentId,
        title: `Pipeline: ${workflowName} - Stage 1`,
        description: `Automated pipeline execution for ${workflowName}`,
        priority: 'normal',
        payload: initialPayload as Record<string, unknown>,
        idempotency_key: `${workflowName}:${Date.now()}`,
      });

      // 2. ამოცანის დაწყება
      await updateTaskStatus(firstTask.task_id, 'RUNNING', creatorAgentId);

      // 3. აქ შეიძლება დამატდეს ლოგიკა შემდეგი ამოცანების შესაქმნელად
      // მაგალითად, როდესაც პირველი ამოცანა დასრულდება, შეიქმნას მეორე

      console.log(`[Orchestrator] Pipeline ${workflowName} started successfully`);
    } catch (error) {
      console.error(`[Orchestrator] Pipeline execution failed:`, error);
      
      // შეცდომის მოვლენის გაგზავნა
      await emitEvent({
        event_type: 'TASK_FAILED',
        source_agent_id: creatorAgentId,
        payload: {
          workflow: workflowName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * მოვლენის დამუშავება
   * 
   * ეს ფუნქცია იღებს მოვლენას და გადაწყვეტს, რა ქმედება უნდა განხორციელდეს.
   * 
   * @param event - დასამუშავებელი მოვლენა
   */
  async handleEvent(event: Event): Promise<void> {
    try {
      console.log(`[Orchestrator] Handling event: ${event.event_type}`);

      switch (event.event_type) {
        case 'TASK_COMPLETED':
          // როდესაც ამოცანა სრულდება, შეიძლება შეიქმნას ახალი ამოცანა
          await this.onTaskCompleted(event);
          break;

        case 'TASK_FAILED':
          // როდესაც ამოცანა ვერ სრულდება, შეიძლება განმეორდეს ან ესკალირდეს
          await this.onTaskFailed(event);
          break;

        case 'RESOURCE_REQUESTED':
          // რესურსის მოთხოვნის დამუშავება
          await this.onResourceRequested(event);
          break;

        default:
          console.log(`[Orchestrator] Event ${event.event_type} handled (no specific action)`);
      }
    } catch (error) {
      console.error(`[Orchestrator] Error handling event:`, error);
      throw error;
    }
  }

  /**
   * ამოცანის დასრულების დამუშავება
   */
  private async onTaskCompleted(event: Event): Promise<void> {
    console.log(`[Orchestrator] Task completed: ${event.task_id}`);
    // აქ შეიძლება დამატდეს ლოგიკა შემდეგი ამოცანის შესაქმნელად
  }

  /**
   * ამოცანის ვერშეასრულების დამუშავება
   */
  private async onTaskFailed(event: Event): Promise<void> {
    console.log(`[Orchestrator] Task failed: ${event.task_id}`);
    // აქ შეიძლება დამატდეს retry ლოგიკა ან ესკალაცია
  }

  /**
   * რესურსის მოთხოვნის დამუშავება
   */
  private async onResourceRequested(event: Event): Promise<void> {
    console.log(`[Orchestrator] Resource requested: ${event.event_id}`);
    // აქ შეიძლება დამატდეს რესურსის მენეჯმენტის ლოგიკა
  }

  /**
   * სისტემის ჯანმრთელობის შემოწმება
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const orchestrator = new Orchestrator();