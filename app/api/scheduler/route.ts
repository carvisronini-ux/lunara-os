// /home/carvisronini-ux/lunara-os/app/api/scheduler/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { telegramOrchestrator } from '@/services/agents/telegram-orchestrator';

// ✅ ეს ხაზი კრძალავს Vercel-ის მიერ ამ endpoint-ის პასუხის ქეშირებას (Caching)
export const dynamic = 'force-dynamic';

const GEORGIA_TIMEZONE = 'Asia/Tbilisi';
const SCHEDULE_WINDOW_MINUTES = 15;

// ჰედერები, რომლებიც დამატებით კრძალავს Vercel/ბრაუზერის მიერ პასუხის შენახვას
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
};

function logInfo(message: string, details?: unknown): void {
  console.info(`[Scheduler] ${message}`, details || '');
}

function logError(message: string, details?: unknown): void {
  console.error(`[Scheduler] ${message}`, details || '');
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred.';
}

// მივიღოთ მიმდინარე დრო საქართველოში და გარდავქმნათ UI-ს day_of_week ფორმატში
function getCurrentGeorgiaTime() {
  const now = new Date();
  const georgiaTimeStr = now.toLocaleString('en-US', { timeZone: GEORGIA_TIMEZONE });
  const georgiaDate = new Date(georgiaTimeStr);
  
  // JS getDay(): 0=კვირა, 1=ორშაბათი, ..., 6=შაბათი
  // ჩვენი DB/UI: 0=ორშაბათი, 1=სამშაბათი, ..., 6=კვირა
  const jsDay = georgiaDate.getDay();
  const dbDayOfWeek = (jsDay + 6) % 7; 
  
  const hours = georgiaDate.getHours();
  const minutes = georgiaDate.getMinutes();
  const dateStr = georgiaDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  return { dbDayOfWeek, hours, minutes, dateStr, now };
}

function isTimeInWindow(schedTime: string, currentHours: number, currentMinutes: number, windowMinutes: number): boolean {
  const [schedHourStr, schedMinuteStr] = schedTime.split(':');
  const schedHour = parseInt(schedHourStr, 10);
  const schedMinute = parseInt(schedMinuteStr, 10);
  
  const scheduledTotalMinutes = schedHour * 60 + schedMinute;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const diff = currentTotalMinutes - scheduledTotalMinutes;
  
  return diff >= 0 && diff <= windowMinutes;
}

export async function GET() {
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
    const { dbDayOfWeek, hours, minutes, dateStr, now } = getCurrentGeorgiaTime();
    const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    logInfo(`🕐 მიმდინარე დრო (საქართველო): ${currentTimeStr}, დღე (DB): ${dbDayOfWeek}, თარიღი: ${dateStr}`);

    // 1. წავიკითხოთ მხოლოდ დღევანდელი, აქტიური განრიგები
    const { data: schedules, error: fetchError } = await supabase
      .from('telegram_schedule')
      .select('id, day_of_week, time, post_type, content_category, zodiac_sign, content_theme, last_run_at, is_active')
      .eq('is_active', true)
      .eq('day_of_week', dbDayOfWeek)
      .order('time', { ascending: true });

    if (fetchError) {
      logError('❌ ვერ წაიკითხა განრიგები', fetchError);
      return NextResponse.json({ success: false, error: 'Failed to fetch schedules' }, { 
        status: 500,
        headers: NO_CACHE_HEADERS 
      });
    }

    logInfo(`📋 ნაპოვნია ${schedules?.length || 0} აქტიური განრიგი დღევანდელი დღისთვის`);

    for (const schedule of schedules || []) {
      const { id, post_type, content_category, zodiac_sign, content_theme, time: scheduled_time, last_run_at } = schedule;

      // 2. შევამოწმოთ დროის ფანჯარა
      const isInWindow = isTimeInWindow(scheduled_time, hours, minutes, SCHEDULE_WINDOW_MINUTES);

      if (!isInWindow) {
        results.push({ post_type, scheduled_time, status: 'skipped', message: 'Not in time window' });
        continue;
      }

      // 3. შევამოწმოთ last_run_at (დუბლიკატების თავიდან აცილება)
      if (last_run_at) {
        const lastRunDate = new Date(last_run_at).toISOString().split('T')[0];
        if (lastRunDate === dateStr) {
          logInfo(`✅ უკვე გაგზავნილია დღეს: ${post_type} (${scheduled_time})`);
          results.push({ post_type, scheduled_time, status: 'skipped', message: 'Already published today' });
          continue;
        }
      }

      // 4. დრო მოვიდა! ვაგზავნით პოსტს
      logInfo(`📤 ვაგზავნით: ${post_type} (${scheduled_time})`);

      try {
        const response = await telegramOrchestrator.generateAndPublish({
          agentType: content_category || 'daily_anchor',
          postType: post_type,
          contentTheme: content_theme || undefined,
          zodiacSign: zodiac_sign || undefined,
        });

        if (response.success) {
          logInfo(`✅ წარმატებით გამოქვეყნდა: ${post_type}`, { messageId: response.messageId });
          
          // 5. განვაახლოთ last_run_at და published_at
          const { error: updateError } = await supabase
            .from('telegram_schedule')
            .update({ 
              last_run_at: now.toISOString(),
              published_at: now.toISOString(),
              status: 'published'
            })
            .eq('id', id);

          if (updateError) {
            logError(`⚠️ ვერ განახლდა last_run_at ${post_type}-ისთვის`, updateError);
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
          results.push({ post_type, scheduled_time, status: 'failed', message: response.error || 'Unknown error' });
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logError(`❌ კრიტიკული შეცდომა ${post_type}-ისთვის`, error);
        results.push({ post_type, scheduled_time, status: 'failed', message: errorMessage });
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      total: results.length,
      published: results.filter(r => r.status === 'published').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    };

    logInfo(`🏁 Scheduler დასრულდა ${duration}ms-ში`, summary);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      georgiaTime: currentTimeStr,
      results,
      summary,
      durationMs: duration,
    }, {
      headers: NO_CACHE_HEADERS
    });

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logError('💥 კრიტიკული შეცდომა scheduler-ში', error);
    return NextResponse.json({ success: false, error: errorMessage }, { 
      status: 500,
      headers: NO_CACHE_HEADERS
    });
  }
}