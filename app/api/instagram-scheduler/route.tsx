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

const GEORGIA_TIMEZONE = 'Asia/Tbilisi';
const SCHEDULE_WINDOW_MINUTES = 15;
const DEFAULT_LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

type SchedulerLog = {
  platform: 'instagram';
  post_type: 'post';
  scheduled_time: string;
  status: 'skipped' | 'published' | 'failed';
  message: string;
  execution_time_ms?: number;
};

function logInfo(message: string, details?: unknown) {
  console.info(`[IG Scheduler] ${message}`, details ?? '');
}

function logError(message: string, details?: unknown) {
  console.error(`[IG Scheduler] ${message}`, details ?? '');
}

// ✅ ზუსტად იგივე ფუნქცია, რაც InstagramPanel.tsx-შია დინამიური ჰეშთეგებისთვის
function generateDynamicHashtags(text2: string, zodiacName: string): string {
  const baseTags = [`#${zodiacName}`, "#Horoscope", "#Astrology", "#Zodiac", "#LUNARA", "#DailyHoroscope"];
  if (!text2 || text2.trim().length < 10) return [...baseTags].join(" ");

  const stopWords = new Set([
    "the", "is", "at", "which", "on", "and", "a", "to", "of", "in", "for", "with", "your", "today", "be", "are", 
    "it", "this", "that", "will", "can", "you", "we", "they", "have", "has", "had", "do", "does", "did", "was", "were"
  ]);

  const words = text2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").split(/\s+/);
  const extractedTags = words.filter(word => word.length > 3).filter(word => !stopWords.has(word)).map(word => `#${word}`);
  const uniqueExtractedTags = Array.from(new Set(extractedTags)).slice(0, 4);
  return [...baseTags, ...uniqueExtractedTags].join(" ");
}

function getCurrentGeorgiaTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: GEORGIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hours = Number(getPart('hour'));
  const minutes = Number(getPart('minute'));
  const weekday = getPart('weekday');

  const weekdayIndex: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

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
    logError('არასწორი დაგეგმილი დრო', { scheduledTime });
    return false;
  }
  const scheduledTotalMinutes = Number(match[1]) * 60 + Number(match[2]);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const difference = currentTotalMinutes - scheduledTotalMinutes;
  return difference >= 0 && difference <= SCHEDULE_WINDOW_MINUTES;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL;
  const serviceRoleKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase-ის გარემოს ცვლადები კონფიგურირებული არ არის');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseClient();
    const { dbDayOfWeek, dateStr, hours, minutes, now } = getCurrentGeorgiaTime();

    if (dbDayOfWeek === undefined) {
      throw new Error('საქართველოს დროის სარტყელში კვირის დღის განსაზღვრა ვერ მოხერხდა');
    }

    const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    logInfo(`შემოწმება დაიწყო. დრო: ${currentTimeStr}, დღე: ${dbDayOfWeek}`);

    const { data: schedules, error: fetchError } = await supabase
      .from('content_schedule')
      .select('time, content_type, zodiac_sign, is_active')
      .eq('is_active', true)
      .eq('day_of_week', dbDayOfWeek)
      .eq('content_type', 'post')
      .order('time', { ascending: true });

    if (fetchError) {
      throw new Error(`განრიგის წაკითხვა ვერ მოხერხდა: ${fetchError.message}`);
    }

    const results: Array<Record<string, unknown>> = [];
    const logsToInsert: SchedulerLog[] = [];

    for (const schedule of schedules ?? []) {
      const scheduledTime = schedule.time as string;
      const zodiacSign = schedule.zodiac_sign as string | null;
      const targetZodiac = zodiacSign || 'ARIES';

      // 1. დროის ფანჯრის შემოწმება
      if (!isTimeInWindow(scheduledTime, hours, minutes)) {
        results.push({ post: scheduledTime, status: 'skipped', reason: 'Not in time window' });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'skipped', message: 'Not in time window' });
        continue;
      }

      // 2. დღიური დუბლიკატის შემოწმება
      const dayStart = `${dateStr}T00:00:00+04:00`;
      const nextDay = getNextDate(dateStr);
      const dayEndExclusive = `${nextDay}T00:00:00+04:00`;

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

      if (duplicateCheckError) {
        throw new Error(`დუბლიკატის შემოწმება ვერ მოხერხდა: ${duplicateCheckError.message}`);
      }

      if (alreadyPublished) {
        logInfo(`დღეს უკვე გამოქვეყნებულია: ${scheduledTime} (${targetZodiac})`);
        results.push({ post: scheduledTime, status: 'skipped', reason: 'Already published today' });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'skipped', message: 'Already published today' });
        continue;
      }

      logInfo(`პოსტის დამუშავება დაიწყო: ${scheduledTime} (${targetZodiac})`);

      try {
        // 3. AI აგენტის კონფიგურაციის წაკითხვა
        const { data: config, error: configError } = await supabase
          .from('agent_config')
          .select('master_prompt, thinking_style, skills_constraints')
          .eq('agent_type', 'post')
          .single();

        if (configError || !config) {
          throw new Error(`Post Agent-ის კონფიგურაცია ვერ ჩაიტვირთა${configError?.message ? `: ${configError.message}` : ''}`);
        }

        // 4. Text 1-ის გენერირება
        const text1 = await generateViralText1(targetZodiac, config);
        if (typeof text1 !== 'string' || !text1.trim()) {
          throw new Error('Text 1-ის გენერაცია ვერ მოხერხდა ან ცარიელი ტექსტი დაბრუნდა');
        }

        // 5. Text 2-ის გენერირება
        const text2 = await generateHoroscopeText2(targetZodiac, text1, config);
        if (typeof text2 !== 'string' || !text2.trim()) {
          throw new Error('Text 2-ის გენერაცია ვერ მოხერხდა ან ცარიელი ტექსტი დაბრუნდა');
        }

        // 6. Instagram-ის სურათის გენერირება (100% UI Canvas-ის იდენტური სტილით)
        logInfo('სურათი გენერირდება სერვერზე (UI Canvas-ის იდენტური სტილით)');
        const imageUrl = `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${targetZodiac.toLowerCase()}.png`;

        const imageResponse = new ImageResponse(
          (
            <div style={{ display: 'flex', width: '1080px', height: '1350px', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}>
              <img src={imageUrl} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {/* გრადიენტი ზუსტად Canvas-ის მსგავსად: 0%-60% გამჭვირვალე, 100%-ზე 0.5 სიმუქე */}
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)' }} />
              
              {/* ლოგო: 130px, top 2%, right 2% */}
              <img src={DEFAULT_LOGO_URL} style={{ position: 'absolute', top: '2%', right: '2%', width: '130px', height: '130px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
              
              {/* Text 1: შავი (#000000), 72px, italic, top 40% */}
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '900px', fontSize: '72px', fontStyle: 'italic', fontFamily: 'serif', color: '#000000', textAlign: 'center', lineHeight: '1.3', fontWeight: 500 }}>
                {text1.trim()}
              </div>
              
              {/* Text 2: შავი (#000000), 60px, top 66% */}
              <div style={{ position: 'absolute', top: '66%', left: '50%', transform: 'translateX(-50%)', width: '85%', maxWidth: '918px', fontSize: '60px', fontFamily: 'serif', color: '#000000', textAlign: 'center', lineHeight: '1.4' }}>
                {text2.trim()}
              </div>

              {/* თარიღი: შავი (#000000), 36px, italic, bottom 6% */}
              <div style={{ position: 'absolute', bottom: '6%', left: '50%', transform: 'translateX(-50%)', fontSize: '36px', fontStyle: 'italic', fontFamily: 'serif', color: '#000000', textAlign: 'center' }}>
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          ),
          { width: 1080, height: 1350 }
        );

        const imageBuffer = await imageResponse.arrayBuffer();
        const fileName = `post-${targetZodiac.toLowerCase()}-${Date.now()}.png`;
        const storagePath = `posts/${fileName}`;
        const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

        // 7. სურათის Supabase Storage-ში ატვირთვა
        const { error: uploadError } = await supabase.storage
          .from('lunara-assets')
          .upload(storagePath, imageBlob, { contentType: 'image/png', upsert: false });

        if (uploadError) {
          throw new Error(`სურათის ატვირთვა ვერ მოხერხდა: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('lunara-assets').getPublicUrl(storagePath);
        const finalImageUrl = urlData.publicUrl;
        logInfo(`სურათი აიტვირთა: ${finalImageUrl}`);

        // 8. აქტიური Instagram ანგარიშის მოძიება
        const { data: profile, error: profileError } = await supabase
          .from('instagram_accounts')
          .select('instagram_user_id, instagram_access_token, username')
          .eq('status', 'active')
          .single();

        if (profileError || !profile) {
          throw new Error('აქტიური Instagram ანგარიში ვერ მოიძებნა');
        }

        // 9. პოსტის გამოქვეყნება
        const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
        
        // ✅ დინამიური ჰეშთეგების გენერაცია (ზუსტად UI-ს მსგავსად)
        const hashtags = generateDynamicHashtags(text2, targetZodiac);
        const caption = `${text1.trim()}\n\n${text2.trim()}\n\n${hashtags}`.trim();

        const publishResult = await agent.publishPost(finalImageUrl, caption);

        if (!publishResult.success) {
          throw new Error(publishResult.error || 'პოსტის გამოქვეყნებისას უცნობი შეცდომა მოხდა');
        }

        logInfo(`Instagram პოსტი გამოქვეყნდა. ID: ${publishResult.postId}`);

        // 10. წარმატებული პოსტის აღრიცხვა
        const { error: publishedInsertError } = await supabase.from('published_content').insert({
          content_type: 'post',
          zodiac_sign: targetZodiac,
          caption,
          image_url: finalImageUrl,
          instagram_post_id: publishResult.postId,
          status: 'published',
          agent_used: 'server_scheduler',
          published_at: now.toISOString(),
        });

        if (publishedInsertError) {
          logError('პოსტი გამოქვეყნდა, მაგრამ მონაცემთა ბაზაში ჩაწერა ვერ მოხერხდა', publishedInsertError);
          results.push({ post: scheduledTime, status: 'published', postId: publishResult.postId, warning: 'Published, but DB insert failed' });
          logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'published', message: `Published (ID: ${publishResult.postId}); DB insert failed` });
          continue;
        }

        results.push({ post: scheduledTime, status: 'published', postId: publishResult.postId });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'published', message: `Success (ID: ${publishResult.postId})` });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logError(`პოსტის დამუშავება ვერ მოხერხდა: ${scheduledTime}`, err);

        await supabase.from('published_content').insert({
          content_type: 'post',
          zodiac_sign: targetZodiac,
          caption: 'Failed to generate/publish',
          status: 'failed',
          agent_used: 'server_scheduler',
          error_message: errorMessage,
          published_at: now.toISOString(),
        });

        results.push({ post: scheduledTime, status: 'failed', error: errorMessage });
        logsToInsert.push({ platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime, status: 'failed', message: errorMessage });
      }
    }

    // 11. Scheduler-ის ლოგების ერთიანად შენახვა
    if (logsToInsert.length > 0) {
      const durationMs = Date.now() - startTime;
      const logsWithTime = logsToInsert.map((log) => ({ ...log, execution_time_ms: durationMs }));

      const { error: logsInsertError } = await supabase.from('scheduler_logs').insert(logsWithTime);
      if (logsInsertError) {
        logError('Instagram Scheduler-ის ლოგების შენახვა ვერ მოხერხდა', logsInsertError);
      } else {
        logInfo('Instagram Scheduler-ის ლოგები წარმატებით შეინახა');
      }
    }

    // 12. საბოლოო პასუხი
    return NextResponse.json(
      {
        success: true,
        timestamp: now.toISOString(),
        georgiaTime: currentTimeStr,
        results,
        durationMs: Date.now() - startTime,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Instagram Scheduler-ში კრიტიკული შეცდომა მოხდა', error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}