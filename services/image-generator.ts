// /home/carvisronini-ux/lunara-os/services/image-generator.ts
import { createCanvas, loadImage, registerFont } from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';
import type { SupabaseClient } from '@supabase/supabase-js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

// ============================================================
// Configuration
// ============================================================

const ASSETS_BASE_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';
const TEMPLATE_FOLDER = process.env.IG_TEMPLATE_FOLDER || 'zodiac-signs';
const DEFAULT_LOGO_URL = `${ASSETS_BASE_URL}/logo.png`;

const FONT_REGULAR_URL = process.env.IG_FONT_REGULAR_URL || `${ASSETS_BASE_URL}/fonts/post-regular.ttf`;
const FONT_ITALIC_URL = process.env.IG_FONT_ITALIC_URL || `${ASSETS_BASE_URL}/fonts/post-italic.ttf`;
const FONT_FAMILY = 'PostSerif';
const FALLBACK_FONT_STACK = 'Georgia, "Times New Roman", serif';

const FETCH_TIMEOUT_MS = 15000;
const MIN_DIMENSION = 320;
const MAX_DIMENSION = 4096;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const TEXT_MAX_WIDTH_RATIO = 0.90; // 5% padding on each side
const TEXT1_LINE_HEIGHT = 1.3;
const TEXT2_LINE_HEIGHT = 1.4;
const TEXT1_MAX_LINES = 2;
const TEXT2_MAX_LINES = 5;

const VALID_ZODIAC_SIGNS = new Set([
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
]);

const ALLOWED_ASSET_HOSTS = new Set<string>([
  new URL(ASSETS_BASE_URL).host,
  ...(process.env.IG_ALLOWED_ASSET_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean),
]);

// ============================================================
// Types
// ============================================================

export interface VisualConfig {
  text1FontSize: number;
  text2FontSize: number;
  text1TopPercent: number;
  text2TopPercent: number;
  showDate: boolean;
  showLogo: boolean;
  logoUrl: string;
  dateFontSize?: number;
  textColor?: string;
}

export interface GenerateImageOptions {
  zodiacSign: string;
  text1: string;
  text2: string;
  dateText?: string;
  width: number;
  height: number;
  visualConfig: VisualConfig;
  templateUrl?: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  size: number;
  sizeKB: number;
  format: 'jpeg';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

// ============================================================
// Helpers
// ============================================================

function isAllowedAssetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ALLOWED_ASSET_HOSTS.has(url.host);
  } catch {
    return false;
  }
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function downloadFont(url: string, fileName: string): Promise<string> {
  const ext = path.extname(new URL(url).pathname) || '.ttf';
  const filePath = path.join(os.tmpdir(), `${fileName}${ext}`);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    await fs.writeFile(filePath, await fetchBuffer(url));
    return filePath;
  }
}

let fontsPromise: Promise<boolean> | null = null;

async function ensureFonts(): Promise<boolean> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const [regular, italic] = await Promise.allSettled([
        downloadFont(FONT_REGULAR_URL, 'post-regular'),
        downloadFont(FONT_ITALIC_URL, 'post-italic'),
      ]);

      let registered = false;
      if (regular.status === 'fulfilled') {
        registerFont(regular.value, { family: FONT_FAMILY, style: 'normal' });
        registered = true;
      }
      if (italic.status === 'fulfilled') {
        registerFont(italic.value, { family: FONT_FAMILY, style: 'italic' });
        registered = true;
      } else if (regular.status === 'fulfilled') {
        registerFont(regular.value, { family: FONT_FAMILY, style: 'italic' });
      }

      if (!registered) console.warn('[image-generator] Custom fonts unavailable. Using fallback font stack.');
      return registered;
    })();
  }

  const ok = await fontsPromise;
  if (!ok) fontsPromise = null;
  return ok;
}

export function getTemplateUrl(zodiacSign: string): string {
  return `${ASSETS_BASE_URL}/${TEMPLATE_FOLDER}/${zodiacSign.toLowerCase()}.png`;
}

function drawCover(ctx: CanvasRenderingContext2D, img: { width: number; height: number }, width: number, height: number): void {
  const scale = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  ctx.drawImage(img as any, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const pushLongWord = (word: string) => {
    let chunk = '';
    for (const char of word) {
      if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width > maxWidth) {
      current = pushLongWord(word);
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function ellipsize(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string {
  let value = line.replace(/[\s.,;:!?-]+$/, '');
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    const lastSpace = value.lastIndexOf(' ');
    value = (lastSpace > 0 ? value.slice(0, lastSpace) : value.slice(0, -1)).replace(/[\s.,;:!?-]+$/, '');
  }
  return `${value}…`;
}

interface TextBlockOptions {
  text: string;
  centerX: number;
  anchorY: number;
  vAlign: 'center' | 'top';
  fontSize: number;
  italic: boolean;
  lineHeight: number;
  maxLines: number;
  maxWidth: number;
  color: string;
  fontStack: string;
}

function drawTextBlock(ctx: CanvasRenderingContext2D, options: TextBlockOptions): void {
  const { text, centerX, anchorY, vAlign, fontSize, italic, lineHeight, maxLines, maxWidth, color, fontStack } = options;
  if (!text || !text.trim()) return;

  ctx.font = `${italic ? 'italic ' : ''}${fontSize}px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  let lines = wrapText(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth);
  }

  const lineHeightPx = fontSize * lineHeight;
  const blockHeight = lines.length * lineHeightPx;
  const startY = vAlign === 'center' ? anchorY - blockHeight / 2 : anchorY;
  const halfLeading = (lineHeightPx - fontSize) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeightPx + halfLeading);
  });
}

// ============================================================
// Main generator
// ============================================================

export async function generateInstagramImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const { text1, text2, dateText, visualConfig } = options;

  const zodiacSign = options.zodiacSign.trim().toUpperCase();
  if (!VALID_ZODIAC_SIGNS.has(zodiacSign)) {
    throw new Error(`Invalid zodiac sign: ${options.zodiacSign}`);
  }

  const width = Math.round(options.width);
  const height = Math.round(options.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < MIN_DIMENSION || height < MIN_DIMENSION || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`Invalid canvas size: ${options.width}x${options.height}`);
  }

  const textColor = /^#[0-9a-fA-F]{3,8}$/.test(visualConfig.textColor ?? '') ? (visualConfig.textColor as string) : '#000000';

  const fontsLoaded = await ensureFonts();
  const fontStack = fontsLoaded ? `"${FONT_FAMILY}", ${FALLBACK_FONT_STACK}` : FALLBACK_FONT_STACK;

  const templateUrl = options.templateUrl && isAllowedAssetUrl(options.templateUrl) ? options.templateUrl : getTemplateUrl(zodiacSign);
  let templateBuffer: Buffer;
  try {
    templateBuffer = await fetchBuffer(templateUrl);
  } catch (error) {
    throw new Error(`Template for ${zodiacSign} could not be loaded (${error instanceof Error ? error.message : 'unknown error'})`);
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Template (cover fit)
  const templateImg = await loadImage(templateBuffer);
  drawCover(ctx, templateImg, width, height);

  // 2. Logo
  if (visualConfig.showLogo) {
    try {
      const requestedLogo = visualConfig.logoUrl || DEFAULT_LOGO_URL;
      const logoUrl = isAllowedAssetUrl(requestedLogo) ? requestedLogo : DEFAULT_LOGO_URL;
      
      const logoImg = await loadImage(await fetchBuffer(logoUrl));
      const logoSize = width * 0.12;
      const padding = width * 0.02;
      const logoX = width - logoSize - padding;
      const logoY = padding;

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, width * 0.002);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
      ctx.restore();
    } catch (error) {
      console.warn('[image-generator] Logo could not be drawn. Continuing without it.', error instanceof Error ? error.message : error);
    }
  }

  // ✅ მასშტაბირების კოეფიციენტი: კონსტრუქტორის 400px-იანი პრევიუდან 1080px-იან საბოლოო ზომაზე
  const PREVIEW_WIDTH = 400;
  const scale = width / PREVIEW_WIDTH;
  const maxTextWidth = width * TEXT_MAX_WIDTH_RATIO;
  const centerX = width / 2;

  // 3. Text 1: vertically centered on its anchor (like CSS translateY(-50%)), max 2 lines
  drawTextBlock(ctx, {
    text: text1,
    centerX,
    anchorY: (visualConfig.text1TopPercent / 100) * height,
    vAlign: 'center',
    fontSize: visualConfig.text1FontSize * scale, // ✅ მასშტაბირება დამატებულია
    italic: true,
    lineHeight: TEXT1_LINE_HEIGHT,
    maxLines: TEXT1_MAX_LINES,
    maxWidth: maxTextWidth,
    color: textColor,
    fontStack,
  });

  // 4. Text 2: starts at its anchor and flows downwards, max 5 lines
  drawTextBlock(ctx, {
    text: text2,
    centerX,
    anchorY: (visualConfig.text2TopPercent / 100) * height,
    vAlign: 'top',
    fontSize: visualConfig.text2FontSize * scale, // ✅ მასშტაბირება დამატებულია
    italic: false,
    lineHeight: TEXT2_LINE_HEIGHT,
    maxLines: TEXT2_MAX_LINES,
    maxWidth: maxTextWidth,
    color: textColor,
    fontStack,
  });

  // 5. Date
  if (visualConfig.showDate && dateText) {
    const dateFontSize = (visualConfig.dateFontSize ?? 14) * scale; // ✅ მასშტაბირება დამატებულია (14px არის კონსტრუქტორში)
    ctx.font = `italic ${dateFontSize}px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(dateText, centerX, height - 0.06 * height); // 6% ქვემოდან
  }

  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95, chromaSubsampling: false });

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Generated image is too large for Instagram (${(buffer.length / 1024 / 1024).toFixed(1)} MB).`);
  }

  return {
    buffer,
    size: buffer.length,
    sizeKB: Math.round(buffer.length / 1024),
    format: 'jpeg',
  };
}

// ============================================================
// Upload
// ============================================================

export async function uploadImageToSupabase(
  supabase: SupabaseClient,
  image: GeneratedImage,
  zodiacSign: string,
  bucketName: string = 'lunara-assets'
): Promise<UploadResult> {
  const safeSign = zodiacSign.trim().toLowerCase().replace(/[^a-z]/g, '');
  const fileName = `post-${safeSign}-${Date.now()}.jpg`;
  const uploadPath = `posts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(uploadPath, image.buffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadPath);
  if (!urlData?.publicUrl) return { success: false, error: 'Supabase did not return a public URL.' };

  return { success: true, url: urlData.publicUrl, path: uploadPath };
}