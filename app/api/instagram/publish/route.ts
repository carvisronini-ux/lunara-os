// /home/carvisronini-ux/lunara-os/app/api/instagram/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { InstagramAdapter } from '@/services/distribution/instagram-adapter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.SUPABASE_OS_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 🚨 ვიღებთ ჰედერებს და სხეულს ლოგირებისთვის
    const headers = Object.fromEntries(request.headers.entries());
    const userAgent = headers['user-agent'] || 'Unknown User-Agent';
    
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    const body = JSON.parse(bodyText);

    const { imageUrl, text1, text2, generatedHashtags, profileUsername } = body;
    const caption = `${text1}\n\n${text2}\n\n${generatedHashtags || ''}`.trim();
    
    if (!imageUrl || !caption || !profileUsername) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing imageUrl, caption (text1/text2), or profileUsername' 
      }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('instagram_accounts')
      .select('instagram_user_id, instagram_access_token')
      .eq('username', profileUsername)
      .single();

    if (error || !profile || !profile.instagram_user_id || !profile.instagram_access_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Instagram credentials are not configured for this profile in the database.' 
      }, { status: 400 });
    }
    
    const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
    const result = await agent.publishPost(imageUrl, caption);
    
    if (result.success) {
      // ✅ აქ ვაბრუნებთ debugInfo-ს, რათა ფრონტენდმა იხილოს
      return NextResponse.json({ 
        success: true, 
        postId: result.postId,
        debugInfo: `🖥️ [SERVER] Request processed successfully. Source: ${userAgent}`
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        debugInfo: `🖥️ [SERVER] Publish failed at adapter level. Source: ${userAgent}`
      }, { status: 500 });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMsg,
      debugInfo: `🖥️ [SERVER] Critical crash. Source: ${error instanceof Error ? error.name : 'Unknown'}`
    }, { status: 500 });
  }
}