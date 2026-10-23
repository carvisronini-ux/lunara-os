import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInstagramImage, uploadImageToSupabase, type VisualConfig } from '@/services/image-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.SUPABASE_OS_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  console.log('\n🚀 ==========================================');
  console.log('🚀 [API ENTRY] /api/generate-image called');
  console.log('🚀 ==========================================\n');

  try {
    const body = await request.json();
    console.log('📥 [API] Received Payload:', JSON.stringify(body, null, 2));

    const { 
      zodiacSign, 
      text1, 
      text2, 
      format = 'post', 
      dateText,
      visualConfig 
    } = body;

    if (!zodiacSign || !text1 || !text2 || !visualConfig) {
      console.error('❌ [API] Validation Failed: Missing required fields');
      return NextResponse.json({ success: false, error: 'Missing required fields or visualConfig' }, { status: 400 });
    }

    const dimensions = format === 'story' ? { width: 1080, height: 1920 } : format === 'carousel' ? { width: 1080, height: 1080 } : { width: 1080, height: 1350 };
    console.log(`📐 [API] Target Dimensions: ${dimensions.width}x${dimensions.height}`);

    const image = await generateInstagramImage({
      zodiacSign: zodiacSign.toUpperCase(),
      text1,
      text2,
      dateText,
      width: dimensions.width,
      height: dimensions.height,
      visualConfig: visualConfig as VisualConfig,
    });

    console.log(`🖼️ [API] Image generated successfully: ${image.sizeKB}KB`);

    const uploadResult = await uploadImageToSupabase(supabase, image, zodiacSign.toUpperCase());

    if (!uploadResult.success) {
      console.error('❌ [API] Upload Failed:', uploadResult.error);
      return NextResponse.json({ success: false, error: uploadResult.error }, { status: 500 });
    }

    console.log(`✅ [API] Upload Success. URL: ${uploadResult.url}`);
    console.log('\n🏁 ==========================================\n');

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.url,
      imageSize: image.sizeKB,
    });

  } catch (error) {
    console.error('💥 [API] CRITICAL ERROR:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}