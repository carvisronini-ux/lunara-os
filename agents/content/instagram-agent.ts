// /home/carvisronini-ux/lunara-os/agents/content/instagram-agent.ts
import { createClient } from '@supabase/supabase-js';
import { Canvas, Image } from 'skia-canvas';
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

      console.log('[Step 3]  Fetching base image and logo...');
      onProgress?.('fetching', `📥 Fetching base image and logo...`);
      
      console.log(`[Step 3a] Fetching base image for ${zodiac.name}...`);
      const baseImageBuffer = await this.getZodiacImage(zodiac.name);
      console.log(`[Step 3a] ✅ Base image fetched. Size: ${baseImageBuffer.length} bytes`);
      
      console.log(`[Step 3b] Fetching logo from ${LOGO_URL}...`);
      const logoResponse = await fetch(LOGO_URL);
      const logoBuffer = logoResponse.ok ? Buffer.from(await logoResponse.arrayBuffer()) : null;
      console.log(`[Step 3b] ✅ Logo fetched. Size: ${logoBuffer ? logoBuffer.length : 0} bytes`);

      console.log('[Step 4] 🎨 Composing final image with skia-canvas...');
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
    console.log('[addTextAndLogoToImage] Starting image composition with skia-canvas...');
    
    const canvas = new Canvas(1080, 1350);
    const ctx = canvas.getContext('2d');

    // 1. საბაზისო სურათის დახატვა
    const bgImage = new Image();
    bgImage.src = baseBuffer;
    ctx.drawImage(bgImage, 0, 0, 1080, 1350);

    // 2. ტექსტის სტილის მორგება (თეთრი ტექსტი შავი კონტურით, ჩაშენებული Arial შრიფტი)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';

    const centerX = 1080 / 2;
    const height = 1350;

    // ტექსტი 1 (Header)
    ctx.font = 'bold 42px Arial';
    ctx.strokeText(aiContent.text1, centerX, height * 0.35);
    ctx.fillText(aiContent.text1, centerX, height * 0.35);

    // ტექსტი 2 (Body) - სიტყვების გადატანით
    ctx.font = 'normal 32px Arial';
    const lines = this.getLines(ctx, aiContent.text2, 1080 * 0.85);
    const startY = height * 0.55;
    const lineHeight = 45;
    
    lines.forEach((line, i) => {
      const y = startY + (i * lineHeight);
      ctx.strokeText(line, centerX, y);
      ctx.fillText(line, centerX, y);
    });

    // თარიღი
    const now = new Date();
    const dateStr = period === 'daily' 
      ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : `${now.getDate()}-${new Date(now.setDate(now.getDate() + 7)).getDate()} ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    
    ctx.font = 'bold 24px Arial';
    ctx.strokeText(dateStr, centerX, height * 0.92);
    ctx.fillText(dateStr, centerX, height * 0.92);

    // 3. ლოგოს დახატვა (თუ მოგვეწოდა)
    if (logoBuffer) {
      try {
        const logoImg = new Image();
        logoImg.src = logoBuffer;
        const logoSize = Math.min(1080 * 0.12, 60);
        const logoX = 1080 - logoSize - (1080 * 0.03);
        const logoY = 1350 * 0.03;
        const radius = logoSize / 2;
        
        // მრგვალი ლოგოს ეფექტი
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + radius, logoY + radius, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
        console.log('[addTextAndLogoToImage] ✅ Logo drawn successfully.');
      } catch (e) {
        console.warn('[addTextAndLogoToImage] ⚠️ Logo drawing skipped due to format issue.');
      }
    }

    // 4. Canvas-ის პირდაპირ JPEG-ში ექსპორტი (skia-canvas აკეთებს ამას ჩაშენებული შრიფტებით)
    console.log('[addTextAndLogoToImage] Exporting canvas to JPEG buffer...');
    const finalBuffer = await canvas.toBuffer('image/jpeg', { quality: 0.9 });
      
    console.log(`[addTextAndLogoToImage] Final image composited. Size: ${finalBuffer.length} bytes`);
    return finalBuffer;
  }

  // დამხმარე ფუნქცია ტექსტის ხაზებად დასაყოფად Canvas-ისთვის
  private getLines(ctx: any, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
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
      console.log('\n [InstagramAgent] === დაწყება: ოროსკოპის პოსტის გენერაცია ===');
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
    const canvas = new Canvas(1080, 1350);
    const ctx = canvas.getContext('2d');

    const bgImage = new Image();
    bgImage.src = baseImageBuffer;
    ctx.drawImage(bgImage, 0, 0, 1080, 1350);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';
    const centerX = 1080 / 2;
    const height = 1350;

    ctx.font = 'bold 36px Arial';
    ctx.strokeText("What's happening today with", centerX, height * 0.35);
    ctx.fillText("What's happening today with", centerX, height * 0.35);

    ctx.font = 'normal 32px Arial';
    const lines = this.getLines(ctx, horoscopeText, 1080 * 0.85);
    const startY = height * 0.55;
    lines.forEach((line, i) => {
      const y = startY + (i * 45);
      ctx.strokeText(line, centerX, y);
      ctx.fillText(line, centerX, y);
    });

    return await canvas.toBuffer('image/jpeg', { quality: 0.9 });
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
      'LIBRA': 'არმონია და ბალანსი დღეს შენი მთავარი მიზანია.',
      'SCORPIO': 'ღრმა ტრანსფორმაცია გელით.',
      'SAGITTARIUS': 'თავგადასავალი გეძახის.',
      'CAPRICORN': 'შენი შრომისმოყვარეობა დღეს ნაყოფს გამოიღებს.',
      'AQUARIUS': 'შენი უნიკალური ხედვა დღეს სხვებს შთააგონებს.',
      'PISCES': 'შენი შემოქმედებითი ენერგია დღეს პიკზეა.'
    };
    return mockTexts[zodiacName] || 'დღეს კარგი დღეა ახალი შესაძლებლობებისთვის.';
  }
}