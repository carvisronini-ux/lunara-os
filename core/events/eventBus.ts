import { supabaseOs } from '@/core/database/client';
import { EventSchema, EventCreateSchema, type Event, type EventCreate, type EventType } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event Bus - Lunara OS-ის ცენტრალური მოვლენათა სისტემა
 * 
 * ეს ფუნქცია აგზავნის მოვლენას Supabase-ის events ცხრილში.
 * მოვლენები არის უცვლელი ისტორიული ფაქტები (immutable historical facts).
 * 
 * @param eventData - მოვლენის მონაცემები (EventCreate სქემის მიხედვით)
 * @returns შექმნილი მოვლენის ობიექტი (Event)
 * @throws Error თუ მოვლენის ჩაწერა ვერ მოხერხდა
 */
export async function emitEvent(eventData: EventCreate): Promise<Event> {
  try {
    // 1. ვალიდაცია Zod-ით
    const validatedData = EventCreateSchema.parse(eventData);

    // 2. მოვლენის სრული ობიექტის შექმნა
    const fullEvent: Event = {
      event_id: uuidv4(),
      ...validatedData,
      created_at: new Date().toISOString(),
    };

    // 3. ჩაწერა Supabase-ში
    const { data, error } = await supabaseOs
      .from('events')
      .insert([fullEvent])
      .select()
      .single();

    if (error) {
      console.error('[EventBus] Failed to emit event:', error);
      throw new Error(`Event emission failed: ${error.message}`);
    }

    // 4. ვალიდაცია მიღებული მონაცემების
    const validatedEvent = EventSchema.parse(data);
    
    console.log(`[EventBus] Event emitted: ${validatedEvent.event_type} (ID: ${validatedEvent.event_id})`);
    
    return validatedEvent;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[EventBus] Error emitting event: ${error.message}`);
      throw error;
    }
    throw new Error('[EventBus] Unknown error occurred');
  }
}

/**
 * მიიღებს მოვლენებს ფილტრების მიხედვით
 * 
 * @param filters - ფილტრაციის პარამეტრები
 * @returns მოვლენების მასივი
 */
export async function getEvents(filters: {
  eventType?: EventType;
  agentId?: string;
  taskId?: string;
  limit?: number;
}): Promise<Event[]> {
  try {
    let query = supabaseOs
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.agentId) {
      query = query.or(`source_agent_id.eq.${filters.agentId},target_agent_id.eq.${filters.agentId}`);
    }

    if (filters.taskId) {
      query = query.eq('task_id', filters.taskId);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EventBus] Failed to fetch events:', error);
      throw new Error(`Event fetch failed: ${error.message}`);
    }

    // ვალიდაცია
    const validatedEvents = data.map(event => EventSchema.parse(event));
    
    return validatedEvents;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[EventBus] Error fetching events: ${error.message}`);
      throw error;
    }
    throw new Error('[EventBus] Unknown error occurred');
  }
}