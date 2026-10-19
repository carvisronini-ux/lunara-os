// /home/carvisronini-ux/lunara-os/app/api/smart-test/route.tsx

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { telegramOrchestrator } from '@/services/agents/telegram-orchestrator';
import { createClient } from '@supabase/supabase-js';
import { generateViralText1, generateHoroscopeText2 } from '@/lib/instagram/ai-generator';
import { InstagramAdapter } from '@/services/distribution/instagram-adapter';
import { ImageResponse } from '@vercel/og';

const supabaseIG = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.SUPABASE_OS_SERVICE_ROLE_KEY!
);

const DEFAULT_LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

function getCurrentGeorgiaTime() {
  const now = new Date();
  const georgiaTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Tbilisi' });
  const georgiaDate = new Date(georgiaTimeStr);
  const jsDay = georgiaDate.getDay();
  const dbDayOfWeek = (jsDay + 6) % 7;
  const hours = georgiaDate.getHours();
  const minutes = georgiaDate.getMinutes();
  // ✅ წაშლილია seconds, რადგან არ გამოიყენება
  return { dbDayOfWeek, hours, minutes, now };
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

export async function GET() {
  // ✅ წაშლილია seconds დესტრუქტურიზაციიდან
  const { dbDayOfWeek, hours, minutes, now } = getCurrentGeorgiaTime();
  const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const testTimeStr = addMinutes(currentTimeStr, 10); // +10 წუთი

  const results = [];

  try {
    // ============================================
    // ტელეგრამის ტესტი
    // ============================================
    const { data: tgSchedule, error: tgFetchError } = await supabase
      .from('telegram_schedule')
      .select('*')
      .eq('day_of_week', dbDayOfWeek)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (tgFetchError || !tgSchedule) {
      results.push({
        platform: 'telegram',
        success: false,
        error: 'No active schedule found for today',
        timestamp: now.toISOString()
      });
    } else {
      const { error: updateTimeError } = await supabase
        .from('telegram_schedule')
        .update({ time: testTimeStr, last_run_at: null })
        .eq('id', tgSchedule.id);

      if (updateTimeError) {
        results.push({
          platform: 'telegram',
          success: false,
          error: `Failed to update time: ${updateTimeError.message}`,
          timestamp: now.toISOString()
        });
      } else {
        const response = await telegramOrchestrator.generateAndPublish({
          agentType: tgSchedule.content_category || 'daily_anchor',
          postType: tgSchedule.post_type,
          contentTheme: tgSchedule.content_theme || undefined,
          zodiacSign: tgSchedule.zodiac_sign || undefined,
        });

        if (response.success) {
          await supabase
            .from('telegram_schedule')
            .update({ 
              last_run_at: now.toISOString(),
              published_at: now.toISOString(),
              status: 'published'
            })
            .eq('id', tgSchedule.id);

          results.push({
            platform: 'telegram',
            success: true,
            post_type: tgSchedule.post_type,
            content_category: tgSchedule.content_category,
            scheduled_time: tgSchedule.time,
            test_time: testTimeStr,
            message: response.caption?.substring(0, 200) || 'Success',
            messageId: response.messageId,
            timestamp: now.toISOString()
          });
        } else {
          results.push({
            platform: 'telegram',
            success: false,
            post_type: tgSchedule.post_type,
            error: response.error,
            timestamp: now.toISOString()
          });
        }
      }
    }

    // ============================================
    // ინსტაგრამის ტესტი
    // ============================================
    const { data: igSchedule, error: igFetchError } = await supabaseIG
      .from('content_schedule')
      .select('*')
      .eq('day_of_week', dbDayOfWeek)
      .eq('is_active', true)
      .eq('content_type', 'post')
      .limit(1)
      .single();

    if (igFetchError || !igSchedule) {
      results.push({
        platform: 'instagram',
        success: false,
        error: 'No active schedule found for today',
        timestamp: now.toISOString()
      });
    } else {
      const { error: updateTimeError } = await supabaseIG
        .from('content_schedule')
        .update({ time: testTimeStr })
        .eq('id', igSchedule.id);

      if (updateTimeError) {
        results.push({
          platform: 'instagram',
          success: false,
          error: `Failed to update time: ${updateTimeError.message}`,
          timestamp: now.toISOString()
        });
      } else {
        const targetZodiac = igSchedule.zodiac_sign || 'ARIES';
        
        const { data: config } = await supabaseIG
          .from('agent_config')
          .select('master_prompt, thinking_style, skills_constraints')
          .eq('agent_type', 'post')
          .single();

        const text1 = await generateViralText1(targetZodiac, config);
        const text2 = await generateHoroscopeText2(targetZodiac, text1, config);

        const imageUrl = `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${targetZodiac.toLowerCase()}.png`;
        
        const imageResponse = new ImageResponse(
          (
            <div style={{ display: 'flex', flexDirection: 'column', width: '1080px', height: '1350px', backgroundColor: '#0f172a', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              <img src={imageUrl} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
              <img src={DEFAULT_LOGO_URL} style={{ position: 'absolute', top: '30px', right: '30px', width: '100px', height: '100px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
              <div style={{ fontSize: 72, fontStyle: 'italic', color: '#000000', textAlign: 'center', maxWidth: '900px', marginTop: '-100px', fontFamily: 'serif' }}>{text1}</div>
              <div style={{ fontSize: 48, color: '#000000', textAlign: 'center', maxWidth: '900px', marginTop: '40px', fontFamily: 'serif', lineHeight: 1.4 }}>{text2}</div>
              <div style={{ position: 'absolute', bottom: '40px', fontSize: 32, fontStyle: 'italic', color: '#000000', fontFamily: 'serif' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          ),
          { width: 1080, height: 1350 }
        );

        const imageBuffer = await imageResponse.arrayBuffer();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

        const fileName = `test-post-${targetZodiac.toLowerCase()}-${Date.now()}.jpg`;
        await supabaseIG.storage.from('lunara-assets').upload(`posts/${fileName}`, blob, { contentType: 'image/jpeg', upsert: false });

        const { data: urlData } = supabaseIG.storage.from('lunara-assets').getPublicUrl(`posts/${fileName}`);
        const finalImageUrl = urlData.publicUrl;

        const { data: profile } = await supabaseIG
          .from('instagram_accounts')
          .select('instagram_user_id, instagram_access_token')
          .eq('status', 'active')
          .single();

        const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
        const hashtags = `#${targetZodiac} #Horoscope #Astrology #LUNARA`;
        const caption = `${text1}\n\n${text2}\n\n${hashtags}`.trim();

        const publishResult = await agent.publishPost(finalImageUrl, caption);

        if (publishResult.success) {
          await supabaseIG.from('published_content').insert({
            content_type: 'post',
            zodiac_sign: targetZodiac,
            caption: caption,
            image_url: finalImageUrl,
            instagram_post_id: publishResult.postId,
            status: 'published',
            agent_used: 'smart_test',
            published_at: now.toISOString()
          });

          results.push({
            platform: 'instagram',
            success: true,
            post_type: 'post',
            zodiac_sign: targetZodiac,
            scheduled_time: igSchedule.time,
            test_time: testTimeStr,
            postId: publishResult.postId,
            timestamp: now.toISOString()
          });
        } else {
          results.push({
            platform: 'instagram',
            success: false,
            post_type: 'post',
            zodiac_sign: targetZodiac,
            error: publishResult.error,
            timestamp: now.toISOString()
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      current_time: currentTimeStr,
      test_time: testTimeStr,
      db_day_of_week: dbDayOfWeek,
      results,
      timestamp: now.toISOString()
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}