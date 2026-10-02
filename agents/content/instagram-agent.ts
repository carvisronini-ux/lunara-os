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
const LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.jpg';

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
    try {
      const zodiac = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
      const period = Math.random() > 0.7 ? 'weekly' : 'daily';
      onProgress?.('selecting', `🎲 Selected: ${zodiac.name} (${period} forecast)`);

      onProgress?.('generating', `✍️ Generating English content for ${zodiac.name}...`);
      const aiContent = await generateHoroscopeContent(zodiac.name, period);

      onProgress?.('fetching', `📥 Fetching base image and logo...`);
      const baseImageBuffer = await this.getZodiacImage(zodiac.name);
      const logoResponse = await fetch(LOGO_URL);
      const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());

      onProgress?.('composing', `🎨 Composing image (matching manual UI styles)...`);
      const finalImage = await this.addTextAndLogoToImage(baseImageBuffer, logoBuffer, aiContent, zodiac.name, period);

      onProgress?.('uploading', `☁️ Uploading composed image to storage...`);
      const fileName = `post-${zodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(uploadPath, finalImage, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      
      const publicUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath).data.publicUrl;
      const caption = `${aiContent.text1}\n\n${aiContent.text2}\n\n${aiContent.hashtags.join(' ')}`;

      onProgress?.('publishing', `📤 Publishing to Instagram...`);
      const publishResult = await this.instagramAdapter.publishPost(publicUrl, caption);
      if (!publishResult.success) throw new Error(`Publish failed: ${publishResult.error}`);

      onProgress?.('done', `✅ Successfully published ${zodiac.name} post!`);
      return { success: true, postId: publishResult.postId, instagramUrl: `https://www.instagram.com/p/${publishResult.postId}`, zodiac: zodiac.name };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.('error', `❌ Failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  // ✅ გამოსწორებულია: _zodiacName (ქვედატირე აღნიშნავს, რომ ცვლადი განზრახ არ გამოიყენება)
  private async addTextAndLogoToImage(
    baseBuffer: Buffer, 
    logoBuffer: Buffer, 
    aiContent: { text1: string, text2: string }, 
    _zodiacName: string, 
    period: 'daily' | 'weekly'
  ): Promise<Buffer> {
    const metadata = await sharp(baseBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1350;

    if (!this.isWasmInitialized) {
      const wasmPath = path.join(process.cwd(), 'node_modules', '@resvg/resvg-wasm', 'index_bg.wasm');
      await initWasm(fs.readFileSync(wasmPath));
      this.isWasmInitialized = true;
    }

    const now = new Date();
    const dateStr = period === 'daily' 
      ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : `${now.getDate()}-${new Date(now.setDate(now.getDate() + 7)).getDate()} ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow1"><feDropShadow dx="2" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.4)"/><feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="rgba(255,255,255,0.95)"/></filter>
          <filter id="shadow2"><feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/><feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="rgba(255,255,255,0.95)"/></filter>
          <filter id="shadow3"><feDropShadow dx="1" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.3)"/><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="rgba(255,255,255,0.9)"/></filter>
        </defs>
        
        <text x="50%" y="40%" font-family="Georgia, serif" font-size="24" fill="#2D2D2D" text-anchor="middle" font-weight="500" letter-spacing="0.02em" filter="url(#shadow1)" stroke="rgba(255,255,255,0.5)" stroke-width="0.6px" paint-order="stroke fill">
          ${this.escapeXml(aiContent.text1)}
        </text>

        <text x="50%" y="66%" font-family="Georgia, serif" font-size="20" fill="#2D2D2D" text-anchor="middle" font-weight="400" filter="url(#shadow2)" stroke="rgba(255,255,255,0.4)" stroke-width="0.4px" paint-order="stroke fill">
          ${this.wrapTextForSvg(aiContent.text2, 35)}
        </text>

        <text x="50%" y="97%" font-family="Georgia, serif" font-size="14" fill="#2D2D2D" text-anchor="middle" font-style="italic" filter="url(#shadow3)" stroke="rgba(255,255,255,0.3)" stroke-width="0.3px" paint-order="stroke fill">
          ${this.escapeXml(dateStr)}
        </text>
      </svg>
    `;

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
    const textOverlayBuffer = Buffer.from(resvg.render().asPng());

    const logoSize = Math.min(width * 0.12, 50);
    const logoX = width - logoSize - (width * 0.03);
    const logoY = height * 0.03;

    const roundedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize)
      .composite([{
        input: Buffer.from(`<svg><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${logoSize/2}" fill="white"/></svg>`),
        blend: 'dest-in'
      }])
      .toBuffer();

    return sharp(baseBuffer)
      .composite([
        { input: roundedLogo, top: logoY, left: logoX },
        { input: textOverlayBuffer, top: 0, left: 0 }
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  private wrapTextForSvg(text: string, maxCharsPerLine: number): string {
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
    return lines.map((line, i) => `<tspan x="50%" dy="${i === 0 ? '0' : '1.5em'}">${this.escapeXml(line)}</tspan>`).join('\n');
  }

  private escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  private async getZodiacImage(zodiacName: string): Promise<Buffer> {
    const filePath = `${ZODIAC_SIGNS_FOLDER}/${zodiacName.toLowerCase()}.png`;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const response = await fetch(data.publicUrl);
    if (!response.ok) throw new Error(`Failed to fetch ${zodiacName}`);
    return Buffer.from(await response.arrayBuffer());
  }
}