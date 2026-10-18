// /home/carvisronini-ux/lunara-os/app/api/scheduler/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { telegramOrchestrator } from '@/services/agents/telegram-orchestrator';

// ============================================================
// კონფიგურაცია
// ============================================================

// საქართველოს დროის ზონა (UTC+4)
const GEORGIA_TIMEZONE = 'Asia/Tbilisi';

// რამდენი წუთის "ფანჯარა" გვაქვს (თუ cron დაგვიანდა)
const SCHEDULE_WINDOW_MINUTES = 15;

// ============================================================
// დამხმარე ფუნქციები
// ============================================================

function logInfo(message: string, details?: unknown): void {
  if (details !== undefined) {
    console.info(`[Scheduler] ${message}`, details);
    return;
  }
  console.info(`[Scheduler] ${message}`);
}

function logError(message: string, details?: unknown): void {
  if (details !== undefined) {
    console.error(`[Scheduler] ${message}`, details);
    return;
  }
  console.error(`[Scheduler] ${message}`);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred.';
}

// მივიღოთ მიმდინარე დრო საქართველოს დროის ზონაში
function getCurrentGeorgiaTime(): { hours: number; minutes: number; dateStr: string } {
  const now = new Date();
  
  // ფორმატირება საქართველოს დროით
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: GEORGIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  const dateStr = `${year}-${month}-${day}`;
  
  return { hours, minutes, dateStr };
}

// შევამოწმოთ არის თუ არა დრო "ფანჯარაში"
function isTimeInWindow(
  scheduledHour: number,
  scheduledMinute: number,
  currentHour: number,
  currentMinute: number,
  windowMinutes: number
): boolean {
  const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  const diff = currentTotalMinutes - scheduledTotalMinutes;
  
  // თუ სხვაობა 0-დან windowMinutes-მდეა → დროშია
  return diff >= 0 && diff <= windowMinutes;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function GET(request: Request) {
  const startTime = Date.now();
  const results: Array<{
    post_type: string;
    scheduled_time: string;
    status: 'published' | 'skipped' | 'failed';
    message?: string;
    messageId?: number;
  }> = [];

  logInfo('🚀 Scheduler დაიწყო...');

  try {
    // 1. მივიღოთ მიმდინარე დრო
    const { hours, minutes, dateStr } = getCurrentGeorgiaTime();
    const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    logInfo(`🕐 მიმდინარე დრო (საქართველო): ${currentTimeStr} (${dateStr})`);

    // 2. ამოვიღოთ ყველა აქტიური განრიგი
    const { data: schedules, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .eq('is_active', true)
      .order('scheduled_time');

    if (fetchError) {
      logError('❌ ვერ წაიკითხა განრიგები', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch schedules', details: fetchError },
        { status: 500 }
      );
    }

    logInfo(`📋 ნაპოვნია ${schedules?.length || 0} აქტიური განრიგი`);

    // 3. გავიაროთ თითოეულ განრიგზე
    for (const schedule of schedules || []) {
      const { post_type, agent_type, scheduled_time, last_published_at } = schedule;
      
      // პარსინგი: "08:00:00" → { hours: 8, minutes: 0 }
      const [schedHourStr, schedMinuteStr] = scheduled_time.split(':');
      const schedHour = parseInt(schedHourStr, 10);
      const schedMinute = parseInt(schedMinuteStr, 10);

      // 4. შევამოწმოთ არის თუ არა დროში
      const isInWindow = isTimeInWindow(schedHour, schedMinute, hours, minutes, SCHEDULE_WINDOW_MINUTES);

      if (!isInWindow) {
        logInfo(`️ გამოტოვებული: ${post_type} (${scheduled_time}) - არ არის დროში`);
        results.push({
          post_type,
          scheduled_time,
          status: 'skipped',
          message: 'Not in time window',
        });
        continue;
      }

      // 5. შევამოწმოთ არის თუ არა უკვე გამოქვეყნებული დღეს
      if (last_published_at) {
        const lastPublishedDate = new Date(last_published_at);
        const lastPublishedStr = lastPublishedDate.toISOString().split('T')[0];
        
        if (lastPublishedStr === dateStr) {
          logInfo(`✅ უკვე გამოქვეყნებული დღეს: ${post_type} (${scheduled_time})`);
          results.push({
            post_type,
            scheduled_time,
            status: 'skipped',
            message: 'Already published today',
          });
          continue;
        }
      }

      // 6. დრო მოვიდა! ვაგზავნით პოსტს
      logInfo(`📤 ვაგზავნით: ${post_type} (${scheduled_time})`);

      try {
        const response = await telegramOrchestrator.generateAndPublish({
          agentType: agent_type,
          postType: post_type,
        });

        if (response.success) {
          logInfo(`✅ წარმატებით გამოქვეყნდა: ${post_type}`, { messageId: response.messageId });
          
          // 7. განვაახლოთ last_published_at
          const { error: updateError } = await supabase
            .from('schedules')
            .update({ last_published_at: new Date().toISOString() })
            .eq('id', schedule.id);

          if (updateError) {
            logError(`⚠️ ვერ განახლდა last_published_at ${post_type}-ისთვის`, updateError);
          }

          results.push({
            post_type,
            scheduled_time,
            status: 'published',
            message: response.caption?.substring(0, 100) || 'Success',
            messageId: response.messageId,
          });
        } else {
          logError(`❌ ვერ გამოქვეყნდა: ${post_type}`, response.error);
          results.push({
            post_type,
            scheduled_time,
            status: 'failed',
            message: response.error || 'Unknown error',
          });
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logError(`❌ კრიტიკული შეცდომა ${post_type}-ისთვის`, error);
        results.push({
          post_type,
          scheduled_time,
          status: 'failed',
          message: errorMessage,
        });
      }
    }

    const duration = Date.now() - startTime;
    const publishedCount = results.filter(r => r.status === 'published').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    logInfo(`🏁 Scheduler დასრულდა ${duration}ms-ში`, {
      published: publishedCount,
      failed: failedCount,
      skipped: skippedCount,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      georgiaTime: currentTimeStr,
      results,
      summary: {
        total: results.length,
        published: publishedCount,
        failed: failedCount,
        skipped: skippedCount,
      },
      durationMs: duration,
    });

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logError('💥 კრიტიკული შეცდომა scheduler-ში', error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}