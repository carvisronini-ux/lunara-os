// /home/carvisronini-ux/lunara-os/app/api/instagram-scheduler/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateViralText1, generateHoroscopeText2 } from '@/lib/instagram/ai-generator';
import { InstagramAdapter } from '@/services/distribution/instagram-adapter';
import { ImageResponse } from '@vercel/og';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.SUPABASE_OS_SERVICE_ROLE_KEY!
);

const GEORGIA_TIMEZONE = 'Asia/Tbilisi';
const SCHEDULE_WINDOW_MINUTES = 15;
const DEFAULT_LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png';

function logInfo(message: string, details?: unknown) {
  console.info(`[IG Scheduler] ${message}`, details || '');
}

function logError(message: string, details?: unknown) {
  console.error(`[IG Scheduler] ${message}`, details || '');
}

function getCurrentGeorgiaTime() {
  const now = new Date();
  const georgiaTimeStr = now.toLocaleString('en-US', { timeZone: GEORGIA_TIMEZONE });
  const georgiaDate = new Date(georgiaTimeStr);
  const jsDay = georgiaDate.getDay();
  const dbDayOfWeek = (jsDay + 6) % 7; // 0=ორშაბათი ... 6=კვირა
  const dateStr = georgiaDate.toISOString().split('T')[0];
  const hours = georgiaDate.getHours();
  const minutes = georgiaDate.getMinutes();
  return { dbDayOfWeek, dateStr, hours, minutes, now };
}

function isTimeInWindow(schedTime: string, currentHours: number, currentMinutes: number) {
  const [schedHourStr, schedMinuteStr] = schedTime.split(':');
  const scheduledTotalMinutes = parseInt(schedHourStr, 10) * 60 + parseInt(schedMinuteStr, 10);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const diff = currentTotalMinutes - scheduledTotalMinutes;
  return diff >= 0 && diff <= SCHEDULE_WINDOW_MINUTES;
}

export async function GET() {
  const startTime = Date.now();
  const { dbDayOfWeek, dateStr, hours, minutes, now } = getCurrentGeorgiaTime();
  const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  logInfo(`🚀 დაიწყო შემოწმება. დრო: ${currentTimeStr}, დღე (DB): ${dbDayOfWeek}`);

  try {
    // 1. წავიკითხოთ დღევანდელი აქტიური განრიგი
    const { data: schedules, error: fetchError } = await supabase
      .from('content_schedule')
      .select('id, day_of_week, time, content_type, zodiac_sign, content_theme, goal')
      .eq('is_active', true)
      .eq('day_of_week', dbDayOfWeek)
      .eq('content_type', 'post') // ჯერ მხოლოდ პოსტებზე ფოკუსირება
      .order('time', { ascending: true });

    if (fetchError) throw new Error(`განრიგის წაკითხვა ვერ მოხერხდა: ${fetchError.message}`);

    const results = [];

    for (const schedule of schedules || []) {
      const { id, time: scheduled_time, zodiac_sign, content_theme } = schedule;

      // 2. დროის შემოწმება
      if (!isTimeInWindow(scheduled_time, hours, minutes)) {
        results.push({ post: scheduled_time, status: 'skipped', reason: 'Not in time window' });
        continue;
      }

      // 3. დუბლიკატების შემოწმება (დღეს უკვე დაიპოსტა?)
      const { data: alreadyPublished } = await supabase
        .from('published_content')
        .select('id')
        .eq('content_type', 'post')
        .eq('zodiac_sign', zodiac_sign || 'RANDOM')
        .gte('published_at', `${dateStr}T00:00:00`)
        .lt('published_at', `${dateStr}T23:59:59`)
        .maybeSingle();

      if (alreadyPublished) {
        logInfo(`✅ უკვე დაიპოსტა დღეს: ${scheduled_time} (${zodiac_sign})`);
        results.push({ post: scheduled_time, status: 'skipped', reason: 'Already published today' });
        continue;
      }

      logInfo(`📤 იწყება დამუშავება: ${scheduled_time} (${zodiac_sign || 'Random'})`);

      try {
        // 4. AI ტექსტის გენერაცია
        const targetZodiac = zodiac_sign || 'ARIES'; // Fallback for random
        
        // კონფიგურაციის წამოღება (როგორც ბრაუზერში)
        const { data: config } = await supabase
          .from('agent_config')
          .select('master_prompt, thinking_style, skills_constraints')
          .eq('agent_type', 'post')
          .single();

        const text1 = await generateViralText1(targetZodiac, config);
        if (!text1) throw new Error('Text 1 generation failed');
        
        const text2 = await generateHoroscopeText2(targetZodiac, text1, config);
        if (!text2) throw new Error('Text 2 generation failed');

        // 5. სურათის გენერაცია სერვერზე (@vercel/og)
        logInfo('🎨 იქმნება სურათი სერვერზე...');
        const imageUrl = `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${targetZodiac.toLowerCase()}.png`;
        
        // აქ ვიყენებთ @vercel/og-ს Canvas-ის ნაცვლად
        const imageResponse = new ImageResponse(
          (
            <div style={{ display: 'flex', flexDirection: 'column', width: '1080px', height: '1350px', backgroundColor: '#0f172a', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              <img src={imageUrl} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
              
              {/* ლოგო */}
              <img src={DEFAULT_LOGO_URL} style={{ position: 'absolute', top: '30px', right: '30px', width: '100px', height: '100px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
              
              {/* ტექსტი 1 */}
              <div style={{ fontSize: 72, fontStyle: 'italic', color: '#000000', textAlign: 'center', maxWidth: '900px', marginTop: '-100px', fontFamily: 'serif' }}>
                {text1}
              </div>
              
              {/* ტექსტი 2 */}
              <div style={{ fontSize: 48, color: '#000000', textAlign: 'center', maxWidth: '900px', marginTop: '40px', fontFamily: 'serif', lineHeight: 1.4 }}>
                {text2}
              </div>

              {/* თარიღი */}
              <div style={{ position: 'absolute', bottom: '40px', fontSize: 32, fontStyle: 'italic', color: '#000000', fontFamily: 'serif' }}>
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          ),
          { width: 1080, height: 1350 }
        );

        const imageBuffer = await imageResponse.arrayBuffer();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

        // 6. ატვირთვა Supabase Storage-ში
        const fileName = `post-${targetZodiac.toLowerCase()}-${Date.now()}.jpg`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('lunara-assets')
          .upload(`posts/${fileName}`, blob, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) throw new Error(`ატვირთვა ვერ მოხერხდა: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('lunara-assets').getPublicUrl(`posts/${fileName}`);
        const finalImageUrl = urlData.publicUrl;
        logInfo(`✅ სურათი აიტვირთა: ${finalImageUrl}`);

        // 7. პუბლიკაცია (ზუსტად ისე, როგორც შენს publish/route.ts-შია)
        // ვიღებთ კრედენშალებს (ავიღებთ პირველ აქტიურ პროფილს, ან შეგიძლია კონკრეტული username მიუთითო)
        const { data: profile, error: profileError } = await supabase
          .from('instagram_accounts')
          .select('instagram_user_id, instagram_access_token, username')
          .eq('status', 'active')
          .single();

        if (profileError || !profile) throw new Error('აქტიური ინსტაგრამის პროფილი ვერ მოიძებნა');

        const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
        const hashtags = `#${targetZodiac} #Horoscope #Astrology #LUNARA`;
        const caption = `${text1}\n\n${text2}\n\n${hashtags}`.trim();

        const publishResult = await agent.publishPost(finalImageUrl, caption);

        if (publishResult.success) {
          logInfo(`🎉 წარმატებით დაიპოსტა! Post ID: ${publishResult.postId}`);
          
          // 8. ჩაწერა ისტორიაში
          await supabase.from('published_content').insert({
            content_type: 'post',
            zodiac_sign: targetZodiac,
            caption: caption,
            image_url: finalImageUrl,
            instagram_post_id: publishResult.postId,
            status: 'published',
            agent_used: 'server_scheduler',
            published_at: now.toISOString()
          });

          results.push({ post: scheduled_time, status: 'published', postId: publishResult.postId });
        } else {
          throw new Error(publishResult.error || 'უცნობი შეცდომა პუბლიკაციისას');
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logError(`❌ შეცდომა ${scheduled_time}-ის დამუშავებისას`, err);
        
        await supabase.from('published_content').insert({
          content_type: 'post',
          zodiac_sign: zodiac_sign || 'RANDOM',
          caption: 'Failed to generate/publish',
          status: 'failed',
          agent_used: 'server_scheduler',
          error_message: errorMsg,
          published_at: now.toISOString()
        });

        results.push({ post: scheduled_time, status: 'failed', error: errorMsg });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      georgiaTime: currentTimeStr,
      results,
      durationMs: Date.now() - startTime
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logError('💥 კრიტიკული შეცდომა სქედულერში', error);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}