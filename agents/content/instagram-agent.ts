// /home/carvisronini-ux/lunara-os/agents/content/instagram-agent.ts
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
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
  private isWasmInitialized = false;

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
      if (!logoResponse.ok) {
        throw new Error(`Failed to fetch logo: ${logoResponse.status} ${logoResponse.statusText}`);
      }
      
      const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
      console.log(`[Step 3b] ✅ Logo buffer size: ${logoBuffer.length} bytes`);

      console.log('[Step 4] 🎨 Composing final image...');
      onProgress?.('composing', `🎨 Composing image (matching manual UI styles)...`);
      const finalImage = await this.addTextAndLogoToImage(baseImageBuffer, logoBuffer, aiContent, zodiac.name, period);
      console.log(`[Step 4] ✅ Image composed successfully. Final size: ${finalImage.length} bytes`);

      console.log('[Step 5] ☁️ Uploading composed image to Supabase storage...');
      onProgress?.('uploading', `☁️ Uploading composed image to storage...`);
      const fileName = `post-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;
      
      console.log(`[Step 5a] Uploading to bucket: ${BUCKET_NAME}, path: ${uploadPath}`);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uploadPath, finalImage, { contentType: 'image/jpeg', upsert: false });
        
      if (uploadError) {
        console.error(`[Step 5a] ❌ Supabase Upload Error:`, uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      console.log(`[Step 5a] ✅ Uploaded to Supabase. Path: ${uploadPath}`);
      
      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath).data.publicUrl;
      console.log(`[Step 5b] ✅ Public URL generated: ${publicUrl}`);
      
      const caption = `${aiContent.text1}\n\n${aiContent.text2}\n\n${aiContent.hashtags.join(' ')}`;
      console.log(`[Step 5c] ✅ Caption prepared. Length: ${caption.length}`);

      console.log('[Step 6] 📤 Publishing to Instagram via Adapter...');
      onProgress?.('publishing', `📤 Publishing to Instagram...`);
      console.log(`[Step 6a] Calling instagramAdapter.publishPost with URL: ${publicUrl}`);
      const publishResult = await this.instagramAdapter.publishPost(publicUrl, caption);
      console.log(`[Step 6b] Instagram Adapter Response:`, publishResult);
      
      if (!publishResult.success) {
        console.error(`[Step 6c] ❌ Publish failed with error:`, publishResult.error);
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
      console.error('\n❌ [InstagramAgent] CRITICAL FAILURE in autoCreateAndPublish:');
      console.error('Error Message:', errorMsg);
      if (error instanceof Error && error.stack) {
        console.error('Stack Trace:', error.stack);
      }
      onProgress?.('error', `❌ Failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  private async addTextAndLogoToImage(
    baseBuffer: Buffer, 
    logoBuffer: Buffer, 
    aiContent: { text1: string, text2: string }, 
    _zodiacName: string, 
    period: 'daily' | 'weekly'
  ): Promise<Buffer> {
    console.log('[addTextAndLogoToImage] Starting image composition...');
    
    const metadata = await sharp(baseBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1350;
    console.log(`[addTextAndLogoToImage] Base image dimensions: ${width}x${height}`);

    if (!this.isWasmInitialized) {
      console.log('[addTextAndLogoToImage] Initializing Resvg WASM...');
      const wasmPath = path.join(process.cwd(), 'node_modules', '@resvg/resvg-wasm', 'index_bg.wasm');
      await initWasm(fs.readFileSync(wasmPath));
      this.isWasmInitialized = true;
    }

    const now = new Date();
    const dateStr = period === 'daily' 
      ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : `${now.getDate()}-${new Date(now.setDate(now.getDate() + 7)).getDate()} ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const logoSize = Math.min(width * 0.12, 50);
    const logoX = width - logoSize - (width * 0.03);
    const logoY = height * 0.03;

    // ✅ მდგრადი ლოგოს დამუშავება: თუ sharp ვერ კითხულობს ბაფერს, ჩვენ უბრალოდ ვტოვებთ მას null-ად და ვაგრძელებთ ტექსტის დარენდერებას.
    let roundedLogo: Buffer | null = null;
    try {
      console.log('[addTextAndLogoToImage] Attempting to process logo with sharp...');
      const pngLogoBuffer = await sharp(logoBuffer).png().toBuffer();
      roundedLogo = await sharp(pngLogoBuffer)
        .resize(logoSize, logoSize, { fit: 'cover' })
        .composite([{ 
          input: Buffer.from(`<svg><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${logoSize/2}" fill="white"/></svg>`), 
          blend: 'dest-in' 
        }])
        .toBuffer();
      console.log('[addTextAndLogoToImage] ✅ Logo processed successfully.');
    } catch (sharpError) {
      console.warn('[addTextAndLogoToImage] ⚠️ Sharp failed to process logo (likely a WASM JPEG parsing bug). Skipping logo to ensure text is rendered.');
      // roundedLogo remains null, and we will skip compositing it.
    }

    const escapedText1 = this.escapeXml(aiContent.text1);
    const escapedText2 = this.escapeXml(aiContent.text2);
    const escapedDate = this.escapeXml(dateStr);

    // SVG მხოლოდ ტექსტისთვის
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="38%" font-family="sans-serif" font-size="32" fill="#FFFFFF" text-anchor="middle" font-weight="bold" stroke="#000000" stroke-width="2px" paint-order="stroke fill">
          ${escapedText1}
        </text>
        
        <text x="50%" y="60%" font-family="sans-serif" font-size="26" fill="#FFFFFF" text-anchor="middle" font-weight="500" stroke="#000000" stroke-width="2px" paint-order="stroke fill">
          ${this.wrapTextForSvg(escapedText2, 35)}
        </text>
        
        <text x="50%" y="95%" font-family="sans-serif" font-size="18" fill="#FFFFFF" text-anchor="middle" font-weight="bold" stroke="#000000" stroke-width="2px" paint-order="stroke fill">
          ${escapedDate}
        </text>
      </svg>
    `;

    console.log('[addTextAndLogoToImage] Rendering text overlay with Resvg...');
    const resvg = new Resvg(svg, { 
      fitTo: { mode: 'width', value: width }
    });
    
    const pngData = resvg.render();
    const textOverlayBuffer = Buffer.from(pngData.asPng());
    console.log(`[addTextAndLogoToImage] Text overlay rendered. Size: ${textOverlayBuffer.length} bytes`);

    console.log('[addTextAndLogoToImage] Compositing final image...');
    const compositeOperations: any[] = [
      { input: textOverlayBuffer, top: 0, left: 0 }
    ];
    
    if (roundedLogo) {
      compositeOperations.unshift({ input: roundedLogo, top: logoY, left: logoX });
      console.log('[addTextAndLogoToImage] Adding rounded logo to composite.');
    } else {
      console.log('[addTextAndLogoToImage] Skipping logo in composite due to processing error.');
    }

    const finalBuffer = await sharp(baseBuffer)
      .composite(compositeOperations)
      .jpeg({ quality: 95 })
      .toBuffer();
    
    console.log(`[addTextAndLogoToImage] Final image composited. Size: ${finalBuffer.length} bytes`);
    
    return finalBuffer;
  }

  private wrapTextForSvg(text: string, maxCharsPerLine: number): string {
    const lines = this.wrapText(text, maxCharsPerLine);
    return lines.map((line, i) => `<tspan x="50%" dy="${i === 0 ? '0' : '1.5em'}">${this.escapeXml(line)}</tspan>`).join('\n');
  }

  private escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
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

    if (!this.isWasmInitialized) {
      const wasmPath = path.join(process.cwd(), 'node_modules', '@resvg/resvg-wasm', 'index_bg.wasm');
      await initWasm(fs.readFileSync(wasmPath));
      this.isWasmInitialized = true;
    }

    const introSvg = this.createSvgText(`What's happening today with`, { x: width / 2, y: height * 0.35, fontSize: 28, fontFamily: 'sans-serif', fill: '#FFFFFF', textAnchor: 'middle', fontWeight: 'bold', stroke: '#000000', strokeWidth: '2px' });

    const textLines = this.wrapText(horoscopeText, 45);
    let horoscopeSvg = '';
    textLines.forEach((line, index) => {
      horoscopeSvg += this.createSvgText(line, { x: width / 2, y: (height * 0.55) + (index * 40), fontSize: 26, fontFamily: 'sans-serif', fill: '#FFFFFF', textAnchor: 'middle', fontWeight: '500', stroke: '#000000', strokeWidth: '2px' });
    });

    const combinedSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${introSvg}${horoscopeSvg}</svg>`;
    const resvg = new Resvg(combinedSvg, { fitTo: { mode: 'width', value: width } });
    const textOverlayBuffer = Buffer.from(resvg.render().asPng());

    return sharp(baseImageBuffer).composite([{ input: textOverlayBuffer, top: 0, left: 0 }]).jpeg({ quality: 95 }).toBuffer();
  }

  private createSvgText(text: string, options: { x: number; y: number; fontSize: number; fontFamily: string; fill: string; textAnchor: string; fontWeight?: string; stroke?: string; strokeWidth?: string }): string {
    const { x, y, fontSize, fontFamily, fill, textAnchor, fontWeight, stroke, strokeWidth } = options;
    let style = `font-family: ${fontFamily}; font-size: ${fontSize}px; fill: ${fill}; text-anchor: ${textAnchor};`;
    if (fontWeight) style += ` font-weight: ${fontWeight};`;
    if (stroke && strokeWidth) style += ` stroke: ${stroke}; stroke-width: ${strokeWidth}; paint-order: stroke fill;`;
    return `<text x="${x}" y="${y}" style="${style}">${this.escapeXml(text)}</text>`;
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