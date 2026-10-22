// /home/carvisronini-ux/lunara-os/app/api/instagram-scheduler/route.tsx

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImageResponse } from '@vercel/og';

import {
  generateViralText1,
  generateHoroscopeText2,
} from '@/lib/instagram/ai-generator';

import { InstagramAdapter } from '@/services/distribution/instagram-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const maxDuration = 60;

// ============================================================
// Configuration
// ============================================================

const GEORGIA_TIMEZONE = 'Asia/Tbilisi';
const GEORGIA_UTC_OFFSET = '+04:00';
const SCHEDULE_WINDOW_MINUTES = 25;

const ASSETS_BASE_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';
const DEFAULT_LOGO_URL = `${ASSETS_BASE_URL}/logo.png`;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

const VALID_ZODIAC_SIGNS = [
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
] as const;
const VALID_ZODIAC_SET = new Set<string>(VALID_ZODIAC_SIGNS);

// ============================================================
// Types
// ============================================================

type SchedulerLog = {
  platform: 'instagram';
  post_type: 'post';
  scheduled_time: string;
  status: 'skipped' | 'published' | 'failed';
  message: string;
  execution_time_ms?: number;
};

type ScheduleRecord = {
  time: string;
  content_type: string;
  zodiac_sign: string | null;
  is_active: boolean;
};

type AgentConfig = {
  master_prompt: string;
  thinking_style: string;
  skills_constraints: string;
};

// ============================================================
// Helpers
// ============================================================

function logInfo(message: string, details?: unknown): void {
  console.info(`[IG Scheduler] ${message}`, details ?? '');
}

function logError(message: string, details?: unknown): void {
  console.error(`[IG Scheduler] ${message}`, details ?? '');
}

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL;
  const serviceRoleKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getCurrentGeorgiaTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: GEORGIA_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hours = Number(getPart('hour'));
  const minutes = Number(getPart('minute'));
  const weekday = getPart('weekday');

  const weekdayIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };

  return {
    dbDayOfWeek: weekdayIndex[weekday],
    dateStr: `${year}-${month}-${day}`,
    hours,
    minutes,
    now,
  };
}

function isTimeInWindow(scheduledTime: string, currentHours: number, currentMinutes: number): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(scheduledTime);
  if (!match) return false;
  
  const scheduledTotalMinutes = Number(match[1]) * 60 + Number(match[2]);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const difference = currentTotalMinutes - scheduledTotalMinutes;
  
  return difference >= 0 && difference <= SCHEDULE_WINDOW_MINUTES;
}

function getNextDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    nextDayDate.getUTCFullYear(),
    String(nextDayDate.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDayDate.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getGeorgiaDayBounds(dateStr: string) {
  const nextDay = getNextDate(dateStr);
  return {
    dayStart: `${dateStr}T00:00:00${GEORGIA_UTC_OFFSET}`,
    dayEndExclusive: `${nextDay}T00:00:00${GEORGIA_UTC_OFFSET}`,
  };
}

function normalizeZodiacSign(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!VALID_ZODIAC_SET.has(normalized)) {
    throw new Error(`Invalid zodiac sign: ${normalized}`);
  }
  return normalized;
}

function sanitizeText(value: string): string {
  return value.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, '').trim();
}

function generateDynamicHashtags(text2: string, zodiacName: string): string {
  const baseTags = [`#${zodiacName}`, '#Horoscope', '#Astrology', '#Zodiac', '#LUNARA', '#DailyHoroscope'];
  if (!text2 || text2.trim().length < 10) return baseTags.join(' ');

  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'of', 'in', 'for', 'with', 'your', 'today', 'be', 'are', 'it', 'this', 'that', 'will', 'can', 'you', 'we', 'they', 'have', 'has', 'had', 'do', 'does', 'did', 'was', 'were']);
  const words = text2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 3).filter((word) => !stopWords.has(word));
  const extractedTags = Array.from(new Set(words)).slice(0, 4).map((word) => `#${word}`);
  return [...baseTags, ...extractedTags].join(' ');
}

// ============================================================
// Image Rendering
// ============================================================

async function generatePostImage(text1: string, text2: string, zodiacSign: string, date: Date): Promise<ArrayBuffer> {
  const templateUrl = `${ASSETS_BASE_URL}/templates/${zodiacSign.toLowerCase()}.png`;
  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: GEORGIA_TIMEZONE, year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  const imageResponse = new ImageResponse(
    (
      <div style={{ display: 'flex', position: 'relative', width: 1080, height: 1350, backgroundColor: '#fffdf5' }}>
        {/* 1. შაბლონი */}
        <img src={templateUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        
        {/* 2. ლოგო */}
        <div style={{ position: 'absolute', left: 923, top: 27, width: 130, height: 130, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <img src={DEFAULT_LOGO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* 3. Text 1 (Hook) */}
        <div style={{ 
          position: 'absolute', 
          left: '50%', 
          top: '540px', 
          transform: 'translate(-50%, -50%)', 
          width: '85%',
          textAlign: 'center', 
          color: '#000000', 
          fontSize: '72px', 
          fontStyle: 'italic', 
          fontFamily: 'serif', 
          lineHeight: '1.3',
          fontWeight: 500
        }}>
          {text1}
        </div>

        {/* 4. Text 2 (Body) */}
        <div style={{ 
          position: 'absolute', 
          left: '50%', 
          top: '861px', 
          transform: 'translateX(-50%)', 
          width: '85%',
          textAlign: 'center', 
          color: '#000000', 
          fontSize: '60px',
          fontFamily: 'serif', 
          lineHeight: '1.4',
          fontWeight: 400,
          overflow: 'hidden'
        }}>
          {text2}
        </div>

        {/* 5. თარიღი */}
        <div style={{ 
          position: 'absolute', 
          left: '50%', 
          top: '1269px', 
          transform: 'translate(-50%, -50%)', 
          textAlign: 'center', 
          color: '#000000', 
          fontSize: '36px', 
          fontStyle: 'italic', 
          fontFamily: 'serif'
        }}>
          {dateLabel}
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );

  return imageResponse.arrayBuffer();
}

async function insertSchedulerLogs(supabase: ReturnType<typeof getSupabaseClient>, logs: SchedulerLog[], startTime: number): Promise<void> {
  if (logs.length === 0) return;
  const durationMs = Date.now() - startTime;
  const logsWithTime = logs.map((log) => ({ ...log, execution_time_ms: durationMs }));
  const { error } = await supabase.from('scheduler_logs').insert(logsWithTime);
  if (error) logError('Failed to save scheduler logs.', error);
}

// ============================================================
// Route Handler
// ============================================================

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseClient();
    const { dbDayOfWeek, dateStr, hours, minutes, now } = getCurrentGeorgiaTime();

    if (dbDayOfWeek === undefined) {
      throw new Error('Could not determine the weekday in the Georgia time zone.');
    }

    const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    logInfo('Scheduler execution started.', { georgiaTime: currentTimeStr, dbDayOfWeek, date: dateStr });

    const { data: schedules, error: fetchError } = await supabase
      .from('content_schedule')
      .select('time, content_type, zodiac_sign, is_active')
      .eq('is_active', true)
      .eq('day_of_week', dbDayOfWeek)
      .eq('content_type', 'post')
      .order('time', { ascending: true });

    if (fetchError) throw new Error(`Could not load content schedule: ${fetchError.message}`);

    const { dayStart, dayEndExclusive } = getGeorgiaDayBounds(dateStr);
    const results: Array<Record<string, unknown>> = [];
    const logsToInsert: SchedulerLog[] = [];

    for (const schedule of (schedules ?? []) as ScheduleRecord[]) {
      const scheduledTime = schedule.time;
      let targetZodiac = 'ARIES';

      try {
        targetZodiac = schedule.zodiac_sign ? normalizeZodiacSign(schedule.zodiac_sign) : 'ARIES';
      } catch (error) {
        const message = errorMessageOf(error);
        results.push({ post: scheduledTime, status: 'failed', error: message });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'failed', message });
        continue;
      }

      if (!isTimeInWindow(scheduledTime, hours, minutes)) {
        results.push({ post: scheduledTime, status: 'skipped', reason: 'Not in time window' });
        continue;
      }

      // დუბლიკატის შემოწმება
      const { data: alreadyPublished } = await supabase
        .from('published_content')
        .select('id')
        .eq('content_type', 'post')
        .eq('zodiac_sign', targetZodiac)
        .not('instagram_post_id', 'is', null)
        .gte('published_at', dayStart)
        .lt('published_at', dayEndExclusive)
        .limit(1)
        .maybeSingle();

      if (alreadyPublished) {
        results.push({ post: scheduledTime, status: 'skipped', reason: 'Already published today' });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'skipped', message: `Already published today (${targetZodiac})` });
        continue;
      }

      logInfo('Processing scheduled post.', { scheduledTime, zodiacSign: targetZodiac });

      try {
        const { data: config, error: configError } = await supabase
          .from('agent_config')
          .select('master_prompt, thinking_style, skills_constraints')
          .eq('agent_type', 'post')
          .single();

        if (configError || !config) throw new Error('Could not load Post Agent configuration');
        const agentConfig = config as AgentConfig;

        const rawText1 = await generateViralText1(targetZodiac, agentConfig);
        const text1 = typeof rawText1 === 'string' ? sanitizeText(rawText1) : '';
        if (!text1) throw new Error('Text 1 generation returned empty result.');

        const rawText2 = await generateHoroscopeText2(targetZodiac, text1, agentConfig);
        const text2 = typeof rawText2 === 'string' ? sanitizeText(rawText2) : '';
        if (!text2) throw new Error('Text 2 generation returned empty result.');

        logInfo('Rendering Instagram post image.', { zodiacSign: targetZodiac });
        const imageBuffer = await generatePostImage(text1, text2, targetZodiac, now);
        
        const fileName = `post-${targetZodiac.toLowerCase()}-${Date.now()}.png`;
        const uploadedStoragePath = `posts/${fileName}`;
        
        // ✅ ვიყენებთ Node.js Buffer-ს Blob-ის ნაცვლად უფრო სტაბილური ატვირთვისთვის
        const imageNodeBuffer = Buffer.from(imageBuffer);

        const { error: uploadError } = await supabase.storage.from('lunara-assets').upload(uploadedStoragePath, imageNodeBuffer, { 
          contentType: 'image/png', 
          upsert: false 
        });
        if (uploadError) throw new Error(`Could not upload post image: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('lunara-assets').getPublicUrl(uploadedStoragePath);
        const finalImageUrl = urlData.publicUrl;
        if (!finalImageUrl) throw new Error('Supabase did not return a public URL.');

        // ✅ 3 წამიანი დაყოვნება (ოქროს სტანდარტი)
        // ეს აძლევს Supabase CDN-ს საკმარის დროს, რომ ფაილი გლობალურად ხელმისაწვდომი გახადოს Meta-ს სკრაპერისთვის.
        logInfo('Waiting 3s for Supabase CDN propagation before sending to Instagram...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const { data: profile, error: profileError } = await supabase
          .from('instagram_accounts')
          .select('instagram_user_id, instagram_access_token, username')
          .eq('status', 'active')
          .single();

        if (profileError || !profile || !profile.instagram_user_id || !profile.instagram_access_token) {
          throw new Error('Could not find an active Instagram account with valid credentials.');
        }

        const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
        const hashtags = generateDynamicHashtags(text2, targetZodiac);
        const caption = `${text1}\n\n${text2}\n\n${hashtags}`.trim();

        const publishResult = await agent.publishPost(finalImageUrl, caption);
        if (!publishResult.success || !publishResult.postId) {
          throw new Error(publishResult.error || 'Instagram publishing failed.');
        }

        logInfo('Instagram post published successfully.', { postId: publishResult.postId });

        const { error: publishedInsertError } = await supabase.from('published_content').insert({
          content_type: 'post', zodiac_sign: targetZodiac, caption, image_url: finalImageUrl,
          instagram_post_id: publishResult.postId, status: 'published', agent_used: 'server_scheduler', published_at: now.toISOString(),
        });

        if (publishedInsertError) {
          logError('Published to Instagram, but database insert failed.', publishedInsertError);
          results.push({ post: scheduledTime, status: 'published', postId: publishResult.postId, warning: 'DB insert failed' });
          logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'published', message: `Published (ID: ${publishResult.postId}); DB insert failed` });
        } else {
          results.push({ post: scheduledTime, status: 'published', postId: publishResult.postId });
          logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'published', message: `Success (ID: ${publishResult.postId})` });
        }

      } catch (error) {
        const errorMessage = errorMessageOf(error);
        logError('Scheduled post processing failed.', { scheduledTime, zodiacSign: targetZodiac, error });

        await supabase.from('published_content').insert({
          content_type: 'post', zodiac_sign: targetZodiac, caption: 'Failed to generate/publish',
          status: 'failed', agent_used: 'server_scheduler', error_message: errorMessage, published_at: now.toISOString(),
        });

        results.push({ post: scheduledTime, status: 'failed', error: errorMessage });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'failed', message: errorMessage });
      }
    }

    await insertSchedulerLogs(supabase, logsToInsert, startTime);

    const failedCount = results.filter((r) => r.status === 'failed').length;
    const publishedCount = results.filter((r) => r.status === 'published').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;

    return jsonResponse({
      success: failedCount === 0,
      timestamp: now.toISOString(),
      georgiaTime: currentTimeStr,
      results,
      summary: { total: results.length, published: publishedCount, skipped: skippedCount, failed: failedCount },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logError('Critical Instagram Scheduler error.', error);
    return jsonResponse({ success: false, error: errorMessageOf(error), durationMs: Date.now() - startTime }, 500);
  }
}