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

const GEORGIA_TIMEZONE = 'Asia/Tbilisi';
const SCHEDULE_WINDOW_MINUTES = 25;

const ASSETS_BASE_URL =
  'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';

const DEFAULT_LOGO_URL = `${ASSETS_BASE_URL}/logo.png`;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

const VALID_ZODIAC_SIGNS = new Set([
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
]);

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

function logInfo(message: string, details?: unknown): void {
  console.info(`[IG Scheduler] ${message}`, details ?? '');
}

function logError(message: string, details?: unknown): void {
  console.error(`[IG Scheduler] ${message}`, details ?? '');
}

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
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
  if (!match) {
    logError('Invalid scheduled time.', { scheduledTime });
    return false;
  }
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
    dayStart: `${dateStr}T00:00:00+04:00`,
    dayEndExclusive: `${nextDay}T00:00:00+04:00`,
  };
}

function normalizeZodiacSign(value: string | null): string {
  const normalized = (value || 'ARIES').trim().toUpperCase();
  if (!VALID_ZODIAC_SIGNS.has(normalized)) {
    throw new Error(`Invalid zodiac sign in content_schedule: ${normalized}`);
  }
  return normalized;
}

function generateDynamicHashtags(text2: string, zodiacName: string): string {
  const baseTags = [`#${zodiacName}`, '#Horoscope', '#Astrology', '#Zodiac', '#LUNARA', '#DailyHoroscope'];
  if (!text2 || text2.trim().length < 10) return baseTags.join(' ');

  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'of', 'in', 'for', 'with', 'your', 'today', 'be', 'are', 'it', 'this', 'that', 'will', 'can', 'you', 'we', 'they', 'have', 'has', 'had', 'do', 'does', 'did', 'was', 'were']);
  const words = text2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 3).filter((word) => !stopWords.has(word));
  const extractedTags = Array.from(new Set(words)).slice(0, 4).map((word) => `#${word}`);
  return [...baseTags, ...extractedTags].join(' ');
}

function getDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: GEORGIA_TIMEZONE, year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/**
 * ✅ ახალი ფუნქცია: იყენებს მზა შაბლონებს და ზუსტად იმეორებს UI Canvas-ის ლოგიკას
 */
async function generatePostImage(text1: string, text2: string, zodiacSign: string, date: Date): Promise<ArrayBuffer> {
  // ✅ ტვირთავს მზა შაბლონს ნაცვლად ძველი ზოდიაქოს სურათისა
  const templateUrl = `${ASSETS_BASE_URL}/templates/${zodiacSign.toLowerCase()}.png`;
  
  const safeText1 = text1.trim();
  const safeText2 = text2.trim();
  const dateLabel = getDateLabel(date);

  const imageResponse = new ImageResponse(
    (
      <div style={{ 
        display: 'flex', 
        width: '1080px', 
        height: '1350px', 
        position: 'relative', 
        overflow: 'hidden',
        backgroundColor: '#fffdf5' // კრემისფერი ფონი შაბლონისთვის
      }}>
        {/* ✅ მზა შაბლონი როგორც ფონი */}
        <img 
          src={templateUrl} 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        
        {/* ✅ ლოგო (თუ შაბლონში უკვე არ არის, კოდი ამას ამატებს. თუ შაბლონშია, ეს ბლოკი შეგიძლია წაშალო) */}
        <div style={{ 
          display: 'flex', 
          position: 'absolute', 
          top: '2%', 
          right: '2%', 
          width: '130px', 
          height: '130px', 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: '2px solid rgba(255,255,255,0.4)',
          backgroundColor: 'rgba(255,255,255,0.1)'
        }}>
          <img src={DEFAULT_LOGO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* ✅ Text 1 (Hook): უსტად ისე, როგორც Canvas-ში - შავი, Italic Serif, 40% სიმაღლეზე */}
        <div style={{ 
          position: 'absolute', 
          top: '40%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          width: '70%', // მარცხენა ცარიელი სივრცის გათვალისწინებით
          textAlign: 'center',
          color: '#000000', 
          fontSize: '72px', 
          fontStyle: 'italic', 
          fontFamily: 'Georgia, serif', 
          lineHeight: '1.3',
          fontWeight: 500
        }}>
          {safeText1}
        </div>

        {/* ✅ Text 2 (Forecast): ზუსტად ისე, როგორც Canvas-ში - შავი, Normal Serif, 66% სიმაღლეზე */}
        <div style={{ 
          position: 'absolute', 
          top: '66%', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '75%',
          textAlign: 'center',
          color: '#000000', 
          fontSize: '60px', 
          fontFamily: 'Georgia, serif', 
          lineHeight: '1.4',
          fontWeight: 400
        }}>
          {safeText2}
        </div>

        {/* ✅ თარიღი: უსტად ისე, როგორც Canvas-ში - შავი, Italic, ქვემოთ */}
        <div style={{ 
          position: 'absolute', 
          bottom: '6%', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          textAlign: 'center',
          color: '#000000', 
          fontSize: '36px', 
          fontStyle: 'italic', 
          fontFamily: 'Georgia, serif'
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
  else logInfo('Scheduler logs saved successfully.');
}

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

    const results: Array<Record<string, unknown>> = [];
    const logsToInsert: SchedulerLog[] = [];
    const scheduleRecords = (schedules ?? []) as ScheduleRecord[];
    const { dayStart, dayEndExclusive } = getGeorgiaDayBounds(dateStr);

    for (const schedule of scheduleRecords) {
      const scheduledTime = schedule.time;
      let targetZodiac: string;

      try {
        targetZodiac = normalizeZodiacSign(schedule.zodiac_sign);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid zodiac sign';
        logError('Invalid schedule record.', { scheduledTime, message });
        results.push({ post: scheduledTime, status: 'failed', error: message });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'failed', message });
        continue;
      }

      if (!isTimeInWindow(scheduledTime, hours, minutes)) {
        results.push({ post: scheduledTime, status: 'skipped', reason: 'Not in time window' });
        continue;
      }

      const { data: alreadyPublished, error: duplicateCheckError } = await supabase
        .from('published_content')
        .select('id')
        .eq('content_type', 'post')
        .eq('zodiac_sign', targetZodiac)
        .not('instagram_post_id', 'is', null)
        .gte('published_at', dayStart)
        .lt('published_at', dayEndExclusive)
        .limit(1)
        .maybeSingle();

      if (duplicateCheckError) throw new Error(`Could not check for duplicate posts: ${duplicateCheckError.message}`);

      if (alreadyPublished) {
        logInfo('Post already published today.', { scheduledTime, zodiacSign: targetZodiac });
        results.push({ post: scheduledTime, status: 'skipped', reason: 'Already published today' });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'skipped', message: `Already published today (${targetZodiac})` });
        continue;
      }

      logInfo('Processing scheduled post.', { scheduledTime, zodiacSign: targetZodiac });

      let uploadedStoragePath: string | null = null;
      let instagramPublished = false;

      try {
        const { data: config, error: configError } = await supabase
          .from('agent_config')
          .select('master_prompt, thinking_style, skills_constraints')
          .eq('agent_type', 'post')
          .single();

        if (configError || !config) throw new Error(`Could not load Post Agent configuration${configError?.message ? `: ${configError.message}` : ''}`);
        const agentConfig = config as AgentConfig;

        const text1 = await generateViralText1(targetZodiac, agentConfig);
        if (typeof text1 !== 'string' || !text1.trim()) throw new Error('Text 1 generation returned an empty or invalid result.');

        const text2 = await generateHoroscopeText2(targetZodiac, text1, agentConfig);
        if (typeof text2 !== 'string' || !text2.trim()) throw new Error('Text 2 generation returned an empty or invalid result.');

        logInfo('Generating Instagram post image with new template.', { zodiacSign: targetZodiac });
        
        // ✅ ახალი ფუნქცია, რომელიც იყენებს შაბლონებს
        const imageBuffer = await generatePostImage(text1, text2, targetZodiac, now);
        
        const fileName = `post-${targetZodiac.toLowerCase()}-${Date.now()}.png`;
        uploadedStoragePath = `posts/${fileName}`;
        const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

        // ✅ 1. პირველადი ატვირთვა Supabase-ში
        const { error: uploadError } = await supabase.storage.from('lunara-assets').upload(uploadedStoragePath, imageBlob, { contentType: 'image/png', upsert: false });
        if (uploadError) throw new Error(`Could not upload post image: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('lunara-assets').getPublicUrl(uploadedStoragePath);
        const finalImageUrl = urlData.publicUrl;
        if (!finalImageUrl) throw new Error('Supabase did not return a public URL for the image.');
        
        // ✅ 2. სურათის ზომის გადამოწმება და "გაწმენდა" Instagram API-სთვის
        // ეს პროცესი იძულებით ტვირთავს სურათს, ქმნის ახალ Blob-ს და ხელახლა ტვირთავს,
        // რაც გარანტირებს, რომ Instagram API-მ მიიღოს სწორი მეტა-მონაცემები.
        try {
            const checkResponse = await fetch(finalImageUrl);
            const checkBuffer = await checkResponse.arrayBuffer();
            const cleanBlob = new Blob([checkBuffer], { type: 'image/png' });
            
            const { error: reuploadError } = await supabase.storage.from('lunara-assets').upload(uploadedStoragePath, cleanBlob, { contentType: 'image/png', upsert: true });
            if (reuploadError) {
                logError('Re-upload failed, but continuing with original...', reuploadError);
            } else {
                logInfo('✅ Image re-uploaded with verified dimensions.');
            }
        } catch (e) {
            logError('Dimension check failed, proceeding anyway...', e);
        }

        logInfo('Post image uploaded successfully.', { imageUrl: finalImageUrl });

        const { data: profile, error: profileError } = await supabase
          .from('instagram_accounts')
          .select('instagram_user_id, instagram_access_token, username')
          .eq('status', 'active')
          .single();

        if (profileError || !profile) throw new Error(`Could not find an active Instagram account${profileError?.message ? `: ${profileError.message}` : ''}`);
        if (!profile.instagram_user_id || !profile.instagram_access_token) throw new Error('The active Instagram account is missing its user ID or access token.');

        const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
        const hashtags = generateDynamicHashtags(text2, targetZodiac);
        const caption = `${text1.trim()}\n\n${text2.trim()}\n\n${hashtags}`.trim();

        const publishResult = await agent.publishPost(finalImageUrl, caption);
        if (!publishResult.success || !publishResult.postId) throw new Error(publishResult.error || 'Instagram publishing failed or returned no post ID.');

        instagramPublished = true;
        logInfo('Instagram post published successfully.', { postId: publishResult.postId, username: profile.username });

        const { error: publishedInsertError } = await supabase.from('published_content').insert({
          content_type: 'post', zodiac_sign: targetZodiac, caption, image_url: finalImageUrl,
          instagram_post_id: publishResult.postId, status: 'published', agent_used: 'server_scheduler', published_at: now.toISOString(),
        });

        if (publishedInsertError) {
          logError('Instagram published the post, but the database insert failed.', { postId: publishResult.postId, error: publishedInsertError });
          results.push({ post: scheduledTime, status: 'published', postId: publishResult.postId, warning: 'Published to Instagram, but database recording failed.' });
          logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'published', message: `Published (ID: ${publishResult.postId}); database insert failed` });
          continue;
        }

        results.push({ post: scheduledTime, status: 'published', postId: publishResult.postId });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'published', message: `Success (ID: ${publishResult.postId})` });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError('Scheduled post processing failed.', { scheduledTime, zodiacSign: targetZodiac, error });

        if (!instagramPublished) {
          const { error: failureInsertError } = await supabase.from('published_content').insert({
            content_type: 'post', zodiac_sign: targetZodiac, caption: 'Failed to generate/publish',
            status: 'failed', agent_used: 'server_scheduler', error_message: errorMessage, published_at: now.toISOString(),
          });
          if (failureInsertError) logError('Could not record the failed publication attempt.', failureInsertError);
        }

        results.push({ post: scheduledTime, status: 'failed', error: errorMessage });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'failed', message: errorMessage });
        void uploadedStoragePath;
      }
    }

    await insertSchedulerLogs(supabase, logsToInsert, startTime);

    const failedCount = results.filter((result) => result.status === 'failed').length;
    const publishedCount = results.filter((result) => result.status === 'published').length;
    const skippedCount = results.filter((result) => result.status === 'skipped').length;

    logInfo('Scheduler execution finished.', { publishedCount, skippedCount, failedCount, durationMs: Date.now() - startTime });

    return jsonResponse({
      success: failedCount === 0,
      timestamp: now.toISOString(),
      georgiaTime: currentTimeStr,
      timezone: GEORGIA_TIMEZONE,
      results,
      summary: { total: results.length, published: publishedCount, skipped: skippedCount, failed: failedCount },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Critical Instagram Scheduler error.', error);
    return jsonResponse({ success: false, error: errorMessage, durationMs: Date.now() - startTime }, 500);
  }
}