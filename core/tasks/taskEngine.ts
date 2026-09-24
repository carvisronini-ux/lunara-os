import { supabaseOs } from '@/core/database/client';
import { TaskSchema, TaskCreateSchema, TaskStatusSchema, type Task, type TaskCreate, type TaskStatus } from './types';
import { emitEvent } from '@/core/events/eventBus';
import { v4 as uuidv4 } from 'uuid';

/**
 * Task Engine - Lunara OS-ის ამოცანათა მართვის სისტემა
 * 
 * ეს ფუნქცია ქმნის ახალ ამოცანას ბაზაში და აგზავნის TASK_CREATED მოვლენას.
 * 
 * @param taskData - ამოცანის მონაცემები (TaskCreate სქემის მიხედვით)
 * @returns შექმნილი ამოცანის ობიექტი (Task)
 * @throws Error თუ ამოცანის შექმნა ვერ მოხერხდა
 */
export async function createTask(taskData: TaskCreate): Promise<Task> {
  try {
    // 1. ვალიდაცია
    const validatedData = TaskCreateSchema.parse(taskData);

    // 2. ამოცანის სრული ობიექტის შექმნა
    const fullTask: Task = {
      task_id: uuidv4(),
      ...validatedData,
      status: 'CREATED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      retry_count: 0,
    };

    // 3. ჩაწერა Supabase-ში
    const { data, error } = await supabaseOs
      .from('tasks')
      .insert([fullTask])
      .select()
      .single();

    if (error) {
      console.error('[TaskEngine] Failed to create task:', error);
      throw new Error(`Task creation failed: ${error.message}`);
    }

    const validatedTask = TaskSchema.parse(data);

    // 4. მოვლენის გაგზავნა
    await emitEvent({
      event_type: "TASK_CREATED" as any,
      source_agent_id: validatedTask.creator_agent_id,
      task_id: validatedTask.task_id,
      payload: {
        title: validatedTask.title,
        priority: validatedTask.priority,
        department_id: validatedTask.department_id,
      },
    });

    console.log(`[TaskEngine] Task created: ${validatedTask.title} (ID: ${validatedTask.task_id})`);
    
    return validatedTask;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[TaskEngine] Error creating task: ${error.message}`);
      throw error;
    }
    throw new Error('[TaskEngine] Unknown error occurred');
  }
}

/**
 * ამოცანის სტატუსის განახლება
 * 
 * ეს ფუნქცია ცვლის ამოცანის სტატუსს და აგზავნის შესაბამის მოვლენას.
 * 
 * @param taskId - ამოცანის ID
 * @param newStatus - ახალი სტატუსი
 * @param agentId - აგენტის ID, რომელიც ასრულებს ცვლილებას
 * @returns განახლებული ამოცანის ობიექტი
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  agentId: string
): Promise<Task> {
  try {
    // 1. ვალიდაცია
    TaskStatusSchema.parse(newStatus);

    // 2. ამოცანის მოძიება
    const { data: existingTask, error: fetchError } = await supabaseOs
      .from('tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (fetchError || !existingTask) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // 3. სტატუსის განახლება
    const { data, error } = await supabaseOs
      .from('tasks')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'RUNNING' ? { started_at: new Date().toISOString() } : {}),
        ...(newStatus === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {}),
        ...(newStatus === 'FAILED' ? { failed_at: new Date().toISOString() } : {}),
      })
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('[TaskEngine] Failed to update task status:', error);
      throw new Error(`Task status update failed: ${error.message}`);
    }

    const validatedTask = TaskSchema.parse(data);

    // 4. მოვლენის გაგზავნა
    const eventType = `TASK_${newStatus}` as any;
    await emitEvent({
      event_type: eventType,
      source_agent_id: agentId,
      task_id: taskId,
      payload: {
        previous_status: existingTask.status,
        new_status: newStatus,
      },
    });

    console.log(`[TaskEngine] Task ${taskId} status updated to ${newStatus}`);
    
    return validatedTask;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[TaskEngine] Error updating task status: ${error.message}`);
      throw error;
    }
    throw new Error('[TaskEngine] Unknown error occurred');
  }
}

/**
 * ამოცანის დელეგირება აგენტზე
 * 
 * @param taskId - ამოცანის ID
 * @param agentId - აგენტის ID, რომელსაც ენიჭება ამოცანა
 * @returns განახლებული ამოცანის ობიექტი
 */
export async function assignTask(taskId: string, agentId: string): Promise<Task> {
  try {
    const { data, error } = await supabaseOs
      .from('tasks')
      .update({
        assigned_agent_id: agentId,
        status: 'CLAIMED',
        updated_at: new Date().toISOString(),
      })
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('[TaskEngine] Failed to assign task:', error);
      throw new Error(`Task assignment failed: ${error.message}`);
    }

    const validatedTask = TaskSchema.parse(data);

    // მოვლენის გაგზავნა
    await emitEvent({
      event_type: "TASK_CREATED" as any, // ან TASK_ASSIGNED თუ ასეთი event_type არსებობს
      source_agent_id: agentId,
      task_id: taskId,
      payload: {
        action: 'task_assigned',
        assigned_to: agentId,
      },
    });

    console.log(`[TaskEngine] Task ${taskId} assigned to agent ${agentId}`);
    
    return validatedTask;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[TaskEngine] Error assigning task: ${error.message}`);
      throw error;
    }
    throw new Error('[TaskEngine] Unknown error occurred');
  }
}