// /home/carvisronini-ux/lunara-os/agents/content/instagram-agent.ts
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { ImageResponse } from '@vercel/og';
import { InstagramAdapter } from '../../services/distribution/instagram-adapter';
import { generateHoroscopeContent } from '../../lib/instagram/ai-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL!;
const supabaseKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'lunara-assets';
const ZODIAC_SIGNS_FOLDER = 'zodiac-signs';
const LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png';

const ZODIAC_SIGNS = [
  { name: 'ARIES', georgian: 'ვერძი' }, { name: 'TAURUS', georgian: 'კურო' },
  { name: 'GEMINI', georgian: 'ტყუპი' }, { name: 'CANCER', georgian: 'კირჩხიბი' },
  { name: 'LEO', georgian: 'ლომი' }, { name: 'VIRGO', georgian: 'ქალწული' },
  { name: 'LIBRA', georgian: 'სასწორი' }, { name: 'SCORPIO', georgian: 'მორიელი' },
  { name: 'SAGITTARIUS', georgian: 'მშვილდოსანი' }, { name: 'CAPRICORN', georgian: 'თხის რქა' },
  { name: 'AQUARIUS', georgian: 'მერწყული' }, { name: 'PISCES', georgian: 'თევზები' },
];

export class InstagramAgent {
  private instagramAdapter: InstagramAdapter;

  constructor() {
    this.instagramAdapter = new InstagramAdapter();
  }

  async autoCreateAndPublish(onProgress?: (step: string, message: string) => void) {
    console.log('\n🚀 [InstagramAgent] === STARTING AUTO CREATE & PUBLISH ===');
    try {
      console.log('[Step 1] 🎲 Selecting random zodiac and period...');
      const zodiac = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
      const period = Math.random() > 0.7 ? 'weekly' : 'daily';
      console.log(`[Step 1] ✅ Selected: ${zodiac.name} (${zodiac.georgian}), Period: ${period}`);
      onProgress?.('selecting', `🎲 Selected: ${zodiac.name} (${period} forecast)`);

      console.log('[Step 2] ✍️ Generating AI content...');
      onProgress?.('generating', `✍️ Generating English content for ${zodiac.name}...`);
      const aiContent = await generateHoroscopeContent(zodiac.name, period);
      console.log(`[Step 2] ✅ AI Content Generated:`, { text1: aiContent.text1, text2: aiContent.text2, hashtags: aiContent.hashtags });

      console.log('[Step 3] 📥 Fetching base image and logo...');
      onProgress?.('fetching', `📥 Fetching base image and logo...`);
      
      console.log(`[Step 3a] Fetching base image for ${zodiac.name}...`);
      const baseImageBuffer = await this.getZodiacImage(zodiac.name);
      console.log(`[Step 3a] ✅ Base image fetched. Size: ${baseImageBuffer.length} bytes`);
      
      console.log(`[Step 3b] Fetching logo from ${LOGO_URL}...`);
      const logoResponse = await fetch(LOGO_URL);
      const logoBuffer = logoResponse.ok ? Buffer.from(await logoResponse.arrayBuffer()) : null;
      console.log(`[Step 3b] ✅ Logo fetched. Size: ${logoBuffer ? logoBuffer.length : 0} bytes`);

      console.log('[Step 4] 🎨 Composing final image with @vercel/og...');
      onProgress?.('composing', `🎨 Composing image...`);
      const finalImage = await this.addTextAndLogoToImage(baseImageBuffer, logoBuffer, aiContent, zodiac.name, period);
      console.log(`[Step 4] ✅ Image composed successfully. Final size: ${finalImage.length} bytes`);

      console.log('[Step 5] ☁️ Uploading composed image to Supabase storage...');
      onProgress?.('uploading', `☁️ Uploading composed image to storage...`);
      const fileName = `post-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uploadPath, finalImage, { contentType: 'image/jpeg', upsert: false });
        
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      console.log(`[Step 5a] ✅ Uploaded to Supabase. Path: ${uploadPath}`);
      
      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath).data.publicUrl;
      console.log(`[Step 5b] ✅ Public URL generated: ${publicUrl}`);
      
      const caption = `${aiContent.text1}\n\n${aiContent.text2}\n\n${aiContent.hashtags.join(' ')}`;
      console.log(`[Step 5c] ✅ Caption prepared. Length: ${caption.length}`);

      console.log('[Step 6] 📤 Publishing to Instagram via Adapter...');
      onProgress?.('publishing', `📤 Publishing to Instagram...`);
      const publishResult = await this.instagramAdapter.publishPost(publicUrl, caption);
      
      if (!publishResult.success) {
        throw new Error(`Publish failed: ${publishResult.error}`);
      }

      console.log('[Step 7] 🎉 Auto Create & Publish completed successfully!');
      onProgress?.('done', `✅ Successfully published ${zodiac.name} post!`);
      return { 
        success: true, 
        postId: publishResult.postId, 
        instagramUrl: `https://www.instagram.com/p/${publishResult.postId}`, 
        zodiac: zodiac.name 
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('\n❌ [InstagramAgent] CRITICAL FAILURE:', errorMsg);
      onProgress?.('error', `❌ Failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  private async addTextAndLogoToImage(
    baseBuffer: Buffer, 
    logoBuffer: Buffer | null, 
    aiContent: { text1: string, text2: string }, 
    _zodiacName: string, 
    period: 'daily' | 'weekly'
  ): Promise<Buffer> {
    console.log('[addTextAndLogoToImage] Starting image composition with @vercel/og...');
    
    const metadata = await sharp(baseBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1350;

    const now = new Date();
    const dateStr = period === 'daily' 
      ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : `${now.getDate()}-${new Date(now.setDate(now.getDate() + 7)).getDate()} ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    console.log('[addTextAndLogoToImage] Loading local Roboto .ttf fonts (100% reliable, no network fetch)...');
    // ✅ ვკითხულობთ შრიფტს პირდაპირ node_modules-იდან. ეს გამორიცხავს ქსელურ შეცდომებს!
    const fontRegularPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'roboto', 'latin-400.ttf');
    const fontBoldPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'roboto', 'latin-700.ttf');

    if (!fs.existsSync(fontRegularPath) || !fs.existsSync(fontBoldPath)) {
      throw new Error('Roboto font files not found. Please run: npm install @fontsource/roboto');
    }

    const fontRegularBuffer = fs.readFileSync(fontRegularPath);
    const fontBoldBuffer = fs.readFileSync(fontBoldPath);

    console.log('[addTextAndLogoToImage] Generating text overlay with ImageResponse...');
    
    const response = new ImageResponse(
      {
        type: 'div',
        props: {
          style: { 
            width: width, 
            height: height, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: 40
          },
          children: [
            { 
              type: 'div', 
              props: { 
                style: { 
                  fontSize: 42, 
                  fontWeight: 'bold', 
                  color: '#FFFFFF', 
                  textAlign: 'center', 
                  textShadow: '3px 3px 6px #000000', 
                  marginBottom: 40 
                }, 
                children: aiContent.text1 
              } 
            },
            { 
              type: 'div', 
              props: { 
                style: { 
                  fontSize: 32, 
                  color: '#FFFFFF', 
                  textAlign: 'center', 
                  textShadow: '2px 2px 4px #000000', 
                  lineHeight: 1.4,
                  maxWidth: width * 0.9
                }, 
                children: aiContent.text2 
              } 
            },
            { 
              type: 'div', 
              props: { 
                style: { 
                  fontSize: 24, 
                  fontWeight: 'bold', 
                  color: '#FFFFFF', 
                  textAlign: 'center', 
                  textShadow: '2px 2px 4px #000000', 
                  marginTop: 'auto' 
                }, 
                children: dateStr 
              } 
            }
          ]
        }
      } as any,
      {
        width: width,
        height: height,
        fonts: [
          { name: 'Roboto', data: fontRegularBuffer, weight: 400, style: 'normal' },
          { name: 'Roboto', data: fontBoldBuffer, weight: 700, style: 'normal' }
        ]
      }
    );

    const arrayBuffer = await response.arrayBuffer();
    const textOverlayBuffer = Buffer.from(arrayBuffer);
    console.log(`[addTextAndLogoToImage] Text overlay rendered. Size: ${textOverlayBuffer.length} bytes`);

    const compositeOperations: any[] = [
      { input: textOverlayBuffer, top: 0, left: 0 }
    ];

    if (logoBuffer) {
      try {
        const pngLogoBuffer = await sharp(logoBuffer).png().toBuffer();
        const logoSize = Math.min(width * 0.12, 60);
        const logoX = width - logoSize - (width * 0.03);
        const logoY = height * 0.03;
        
        const roundedLogo = await sharp(pngLogoBuffer)
          .resize(logoSize, logoSize, { fit: 'cover' })
          .composite([{ 
            input: Buffer.from(`<svg><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${logoSize/2}" fill="white"/></svg>`), 
            blend: 'dest-in' 
          }])
          .toBuffer();
          
        compositeOperations.unshift({ input: roundedLogo, top: logoY, left: logoX });
        console.log('[addTextAndLogoToImage] ✅ Logo added to composite.');
      } catch (e) {
        console.warn('[addTextAndLogoToImage] ⚠️ Logo skipped due to processing error.');
      }
    }

    const finalBuffer = await sharp(baseBuffer)
      .composite(compositeOperations)
      .jpeg({ quality: 90 })
      .toBuffer();
      
    console.log(`[addTextAndLogoToImage] Final image composited. Size: ${finalBuffer.length} bytes`);
    return finalBuffer;
  }

  private async getZodiacImage(zodiacName: string): Promise<Buffer> {
    const filePath = `${ZODIAC_SIGNS_FOLDER}/${zodiacName.toLowerCase()}.png`;
    console.log(`[getZodiacImage] Fetching public URL for: ${filePath}`);
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    console.log(`[getZodiacImage] Public URL: ${data.publicUrl}`);
    const response = await fetch(data.publicUrl);
    if (!response.ok) {
      console.error(`[getZodiacImage] Failed to fetch image. Status: ${response.status}`);
      throw new Error(`Failed to fetch ${zodiacName}: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[getZodiacImage] Successfully fetched ${buffer.length} bytes`);
    return buffer;
  }

  async generatePreview(topic: string, _style: string = 'default') {
    try {
      console.log('\n🎨 [InstagramAgent] === დაწყება: ჰოროსკოპის პოსტის გენერაცია ===');
      const zodiac = this.getZodiacFromTopic(topic);
      
      const zodiacImageBuffer = await this.getZodiacImage(zodiac.name);
      const horoscopeText = await this.generateHoroscopeText(zodiac.name, topic);
      const finalImage = await this.addTextToImage(zodiacImageBuffer, horoscopeText);

      const fileName = `preview-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `previews/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(uploadPath, finalImage, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath).data.publicUrl;
      const caption = `${zodiac.name} ${zodiac.georgian} - დღის ჰოროსკოპი\n\n${horoscopeText}\n\n#LUNARA #Horoscope #${zodiac.georgian} #Astrology #DailyHoroscope`;

      return { success: true, imageUrl: publicUrl, caption: caption, zodiac: zodiac.georgian };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('\n❌ [InstagramAgent] Preview error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async publishExisting(imageUrl: string, caption: string) {
    try {
      const publishResult = await this.instagramAdapter.publishPost(imageUrl, caption);
      if (publishResult.success) {
        return { success: true, postId: publishResult.postId, instagramUrl: `https://www.instagram.com/p/${publishResult.postId}` };
      } else {
        throw new Error(`Publish failed: ${publishResult.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [InstagramAgent] Publish error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private async addTextToImage(baseImageBuffer: Buffer, horoscopeText: string): Promise<Buffer> {
    const metadata = await sharp(baseImageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1350;

    console.log('[addTextToImage] Loading local Roboto .ttf fonts...');
    const fontRegularPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'roboto', 'latin-400.ttf');
    const fontBoldPath = path.join(process.cwd(), 'node_modules', '@fontsource', 'roboto', 'latin-700.ttf');

    const fontRegularBuffer = fs.readFileSync(fontRegularPath);
    const fontBoldBuffer = fs.readFileSync(fontBoldPath);

    console.log('[addTextToImage] Generating text overlay with ImageResponse...');
    
    const response = new ImageResponse(
      {
        type: 'div',
        props: {
          style: { 
            width: width, 
            height: height, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: 40
          },
          children: [
            { 
              type: 'div', 
              props: { 
                style: { 
                  fontSize: 36, 
                  fontWeight: 'bold', 
                  color: '#FFFFFF', 
                  textAlign: 'center', 
                  textShadow: '3px 3px 6px #000000', 
                  marginBottom: 40 
                }, 
                children: "What's happening today with" 
              } 
            },
            { 
              type: 'div', 
              props: { 
                style: { 
                  fontSize: 32, 
                  color: '#FFFFFF', 
                  textAlign: 'center', 
                  textShadow: '2px 2px 4px #000000', 
                  lineHeight: 1.4,
                  maxWidth: width * 0.9
                }, 
                children: horoscopeText 
              } 
            }
          ]
        }
      } as any,
      {
        width: width,
        height: height,
        fonts: [
          { name: 'Roboto', data: fontRegularBuffer, weight: 400, style: 'normal' },
          { name: 'Roboto', data: fontBoldBuffer, weight: 700, style: 'normal' }
        ]
      }
    );

    const arrayBuffer = await response.arrayBuffer();
    const textOverlayBuffer = Buffer.from(arrayBuffer);

    return sharp(baseImageBuffer)
      .composite([{ input: textOverlayBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  private getZodiacFromTopic(topic: string) {
    const topicUpper = topic.toUpperCase();
    for (const sign of ZODIAC_SIGNS) {
      if (topicUpper.includes(sign.name) || topicUpper.includes(sign.georgian)) return sign;
    }
    return ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
  }

  private async generateHoroscopeText(zodiacName: string, _topic: string): Promise<string> {
    const mockTexts: Record<string, string> = {
      'ARIES': 'დღეს ენერგია შენს მხარესაა. ნუ შეგეშინდება ახალი დასაწყისის.',
      'TAURUS': 'სტაბილურობა და კომფორტი დღეს შენი მთავარი თემებია.',
      'GEMINI': 'კომუნიკაცია დღეს შენი ძლიერი მხარეა.',
      'CANCER': 'შენი ინტუიცია დღეს განსაკუთრებით მწვავეა.',
      'LEO': 'შენი ბუნებრივი ქარიზმა დღეს ყველას ყურადღებას მიიპყრობს.',
      'VIRGO': 'დეტალებზე ორიენტირება დღეს შენს უდიდეს ძალას წარმოადგენს.',
      'LIBRA': 'ჰარმონია და ბალანსი დღეს შენი მთავარი მიზანია.',
      'SCORPIO': 'ღრმა ტრანსფორმაცია გელით.',
      'SAGITTARIUS': 'თავგადასავალი გეძახის.',
      'CAPRICORN': 'შენი შრომისმოყვარეობა დღეს ნაყოფს გამოიღებს.',
      'AQUARIUS': 'შენი უნიკალური ხედვა დღეს სხვებს შთააგონებს.',
      'PISCES': 'შენი შემოქმედებითი ენერგია დღეს პიკზეა.'
    };
    return mockTexts[zodiacName] || 'დღეს კარგი დღეა ახალი შესაძლებლობებისთვის.';
  }
}