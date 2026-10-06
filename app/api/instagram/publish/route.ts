// /home/carvisronini-ux/lunara-os/app/api/instagram/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { InstagramAdapter } from '@/services/distribution/instagram-adapter';

// ვიყენებთ SERVICE_ROLE_KEY-ს, რათა API-მ შეძლოს RLS-ის გვერდის ავლით მონაცემების წაკითხვა
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.SUPABASE_OS_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ წამოვიღოთ ყველა საჭირო ველი ფრონტენდიდან
    const { imageUrl, text1, text2, generatedHashtags, profileUsername } = body;
    
    // ✅ ავაწყოთ caption თუ პირდაპირ არ არის მოწოდებული
    const caption = `${text1}\n\n${text2}\n\n${generatedHashtags || ''}`.trim();
    
    if (!imageUrl || !caption || !profileUsername) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing imageUrl, caption (text1/text2), or profileUsername' 
      }, { status: 400 });
    }

    console.log(`[Instagram Publish API] Fetching credentials for: ${profileUsername}`);

    // 1. წამოვიღოთ კრედენშიალები Supabase-დან უსაფრთხოდ
    const { data: profile, error } = await supabase
      .from('instagram_accounts')
      .select('instagram_user_id, instagram_access_token')
      .eq('username', profileUsername)
      .single();

    if (error || !profile || !profile.instagram_user_id || !profile.instagram_access_token) {
      console.error('[Instagram Publish API] Credentials not found in database for:', profileUsername);
      return NextResponse.json({ 
        success: false, 
        error: 'Instagram credentials are not configured for this profile in the database.' 
      }, { status: 400 });
    }

    console.log('[Instagram Publish API] Credentials found securely. Starting publish process...');
    
    // 2. გადავცეთ დინამიურად InstagramAdapter-ს
    const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
    const result = await agent.publishPost(imageUrl, caption);
    
    if (result.success) {
      console.log('[Instagram Publish API] Successfully published! Post ID:', result.postId);
      return NextResponse.json(result, { status: 200 });
    } else {
      console.error('[Instagram Publish API] Failed to publish:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram Publish API] Critical Error:', error);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}