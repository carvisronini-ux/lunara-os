// /home/carvisronini-ux/lunara-os/app/api/instagram-scheduler/route.tsx

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImageResponse } from '@vercel/og';
import sharp from 'sharp';

import {
  generateViralText1,
  generateHoroscopeText2,
} from '@/lib/instagram/ai-generator';

import { InstagramAdapter } from '@/services/distribution/instagram-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const maxDuration = 60; // AI + image render + upload + Instagram publish

// ============================================================
// Configuration
// ============================================================

const GEORGIA_TIMEZONE = 'Asia/Tbilisi';
const GEORGIA_UTC_OFFSET = '+04:00'; // Georgia has no DST
const SCHEDULE_WINDOW_MINUTES = 25;

const CANVAS = { width: 1080, height: 1350 } as const; // Instagram 4:5 portrait
const JPEG_QUALITY = 92;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // Instagram limit

const INSTAGRAM_CAPTION_LIMIT = 2200;

const ASSETS_BUCKET = 'lunara-assets';
const ASSETS_BASE_URL =
  'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';

const DEFAULT_LOGO_URL = `${ASSETS_BASE_URL}/logo.png`;

/**
 * Fonts must be uploaded to the assets bucket (TTF/OTF/WOFF, not WOFF2).
 * Without them the renderer falls back to the default sans-serif, and italic styling will not work.
 */
const FONT_REGULAR_URL = process.env.IG_FONT_REGULAR_URL || `${ASSETS_BASE_URL}/fonts/post-regular.ttf`;
const FONT_ITALIC_URL = process.env.IG_FONT_ITALIC_URL || `${ASSETS_BASE_URL}/fonts/post-italic.ttf`;
const FONT_FAMILY = 'PostSerif';

/** When a schedule rule has no zodiac sign ("Random" in the UI), pick a sign not yet published today. */
const RANDOM_WHEN_EMPTY = true;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

const VALID_ZODIAC_SIGNS = [
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
] as const;
const VALID_ZODIAC_SET = new Set<string>(VALID_ZODIAC_SIGNS);

// ============================================================
// Layout (everything about where text goes lives here)
// ============================================================

type TextElement = {
  x: number;
  y: number;
  w: number;
  h: number;
  maxFontSize: number;
  minFontSize: number;
  lineHeight: number;
  color: string;
  italic?: boolean;
  uppercase?: boolean;
  vAlign?: 'top' | 'center';
  letterSpacing?: number;
  /** average glyph width as a fraction of font size (used for auto-fit estimation) */
  charWidth?: number;
};

type LayoutConfig = {
  title?: TextElement; // zodiac name
  hook: TextElement;   // Text 1
  body: TextElement;   // Text 2
  date: TextElement;
  hint?: TextElement;  // optional static line
  cta?: TextElement;   // optional static line in the bottom bar
  logo: { x: number; y: number; size: number } | null;
};

/** Original layout: template with a full-bleed illustration, text centered over it. */
const CLASSIC_LAYOUT: LayoutConfig = {
  hook: { x: 162, y: 380, w: 756, h: 320, maxFontSize: 72, minFontSize: 44, lineHeight: 1.3, color: '#000000', italic: true, vAlign: 'center' },
  body: { x: 135, y: 860, w: 810, h: 340, maxFontSize: 60, minFontSize: 34, lineHeight: 1.4, color: '#000000', vAlign: 'top' },
  date: { x: 140, y: 1235, w: 800, h: 68, maxFontSize: 36, minFontSize: 28, lineHeight: 1.2, color: '#000000', italic: true, vAlign: 'center' },
  logo: { x: 923, y: 27, size: 130 },
};

/**
 * Layout for the new "empty text zones" templates (cream left column, navy bottom bar).
 * Coordinates are starting values: measure them on your generated templates and adjust.
 */
const ZONES_LAYOUT: LayoutConfig = {
  title: { x: 76, y: 54, w: 508, h: 149, maxFontSize: 130, minFontSize: 48, lineHeight: 1.1, color: '#1c1b3a', uppercase: true, vAlign: 'center', letterSpacing: 2, charWidth: 0.68 },
  hook: { x: 76, y: 230, w: 508, h: 189, maxFontSize: 56, minFontSize: 34, lineHeight: 1.2, color: '#1c1b3a', italic: true, vAlign: 'center' },
  date: { x: 76, y: 446, w: 432, h: 81, maxFontSize: 40, minFontSize: 28, lineHeight: 1.2, color: '#1c1b3a', italic: true, vAlign: 'center' },
  body: { x: 76, y: 554, w: 508, h: 284, maxFontSize: 40, minFontSize: 30, lineHeight: 1.35, color: '#1c1b3a', vAlign: 'top' },
  hint: { x: 76, y: 864, w: 508, h: 189, maxFontSize: 38, minFontSize: 28, lineHeight: 1.3, color: '#1c1b3a', vAlign: 'top' },
  cta: { x: 65, y: 1107, w: 950, h: 189, maxFontSize: 44, minFontSize: 30, lineHeight: 1.3, color: '#F6EEDC', vAlign: 'center' },
  logo: null,
};

/** Switch layouts with the IG_POST_LAYOUT environment variable ("classic" | "zones"). */
const ACTIVE_LAYOUT: LayoutConfig = process.env.IG_POST_LAYOUT === 'zones' ? ZONES_LAYOUT : CLASSIC_LAYOUT;

/** Static texts used only when the active layout has a hint/cta zone. */
const STATIC_TEXT = {
  hint: '' as string,
  cta: 'Follow @lunaraosapp for your daily forecast',
};

// ============================================================
// Types
// ============================================================

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

type SchedulerLog = {
  platform: 'instagram';
  post_type: 'post';
  scheduled_time: string;
  status: 'skipped' | 'published' | 'failed';
  message: string;
  execution_time_ms?: number;
};

type ScheduleRecord = {
  time: string;
  content_type: string;
  zodiac_sign: string | null;
  is_active: boolean;
};

type AgentConfig = {
  master_prompt: string;
  thinking_style: string;
  skills_constraints: string;
};

type RunContext = {
  supabase: SupabaseClient;
  now: Date;
  dateStr: string;
  hours: number;
  minutes: number;
  dayStart: string;
  dayEndExclusive: string;
};

type ProcessOutcome = {
  result: Record<string, unknown>;
  log?: SchedulerLog;
};

type FontConfig = {
  name: string;
  data: ArrayBuffer;
  weight: 400;
  style: 'normal' | 'italic';
};

type TargetResolution =
  | { kind: 'sign'; sign: string; isRandom: boolean }
  | { kind: 'skip'; reason: string };

// ============================================================
// Logging / HTTP helpers
// ============================================================

function logInfo(message: string, details?: unknown): void {
  console.info(`[IG Scheduler] ${message}`, details ?? '');
}

function logWarn(message: string, details?: unknown): void {
  console.warn(`[IG Scheduler] ${message}`, details ?? '');
}

function logError(message: string, details?: unknown): void {
  console.error(`[IG Scheduler] ${message}`, details ?? '');
}

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 2, delayMs = 1500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        logWarn(`${label} failed (attempt ${attempt}/${attempts}). Retrying...`, errorMessageOf(error));
        await sleep(delayMs * attempt);
      }
    }
  }
  throw lastError;
}

// ============================================================
// Security
// ============================================================

let warnedAboutMissingSecret = false;

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/**
 * If CRON_SECRET is set, the request must carry it
 * (Authorization: Bearer <secret>, x-cron-secret header, or ?secret= for browser previews).
 * If it is not set, requests are allowed (backwards compatible) and a warning is logged.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (!warnedAboutMissingSecret) {
      logWarn('CRON_SECRET is not set. The scheduler endpoint is publicly callable.');
      warnedAboutMissingSecret = true;
    }
    return true;
  }

  const bearer = request.headers.get('authorization') ?? '';
  const headerSecret = request.headers.get('x-cron-secret') ?? '';
  const querySecret = new URL(request.url).searchParams.get('secret') ?? '';

  return safeEqual(bearer, `Bearer ${secret}`) || safeEqual(headerSecret, secret) || safeEqual(querySecret, secret);
}

// ============================================================
// Supabase
// ============================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL;
  const serviceRoleKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ============================================================
// Time helpers
// ============================================================

function getCurrentGeorgiaTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: GEORGIA_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hours = Number(getPart('hour'));
  const minutes = Number(getPart('minute'));
  const weekday = getPart('weekday');

  const weekdayIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };

  return {
    dbDayOfWeek: weekdayIndex[weekday],
    dateStr: `${year}-${month}-${day}`,
    hours,
    minutes,
    now,
  };
}

function isTimeInWindow(scheduledTime: string, currentHours: number, currentMinutes: number): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(scheduledTime);
  if (!match) {
    logError('Invalid scheduled time.', { scheduledTime });
    return false;
  }
  const scheduledTotalMinutes = Number(match[1]) * 60 + Number(match[2]);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const difference = currentTotalMinutes - scheduledTotalMinutes;
  return difference >= 0 && difference <= SCHEDULE_WINDOW_MINUTES;
}

function getNextDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    nextDayDate.getUTCFullYear(),
    String(nextDayDate.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDayDate.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getGeorgiaDayBounds(dateStr: string) {
  const nextDay = getNextDate(dateStr);
  return {
    dayStart: `${dateStr}T00:00:00${GEORGIA_UTC_OFFSET}`,
    dayEndExclusive: `${nextDay}T00:00:00${GEORGIA_UTC_OFFSET}`,
  };
}

function getDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: GEORGIA_TIMEZONE, year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
}

// ============================================================
// Content helpers
// ============================================================

function normalizeZodiacSign(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!VALID_ZODIAC_SET.has(normalized)) {
    throw new Error(`Invalid zodiac sign in content_schedule: ${normalized}`);
  }
  return normalized;
}

/** Removes markdown leftovers, surrounding quotes and extra whitespace from AI output. */
function sanitizeText(value: string): string {
  return value
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, '')
    .trim();
}

function generateDynamicHashtags(text2: string, zodiacName: string): string {
  const baseTags = [`#${zodiacName}`, '#Horoscope', '#Astrology', '#Zodiac', '#LUNARA', '#DailyHoroscope'];
  if (!text2 || text2.trim().length < 10) return baseTags.join(' ');

  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'of', 'in', 'for', 'with', 'your', 'today', 'be', 'are', 'it', 'this', 'that', 'will', 'can', 'you', 'we', 'they', 'have', 'has', 'had', 'do', 'does', 'did', 'was', 'were']);
  const words = text2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 3).filter((word) => !stopWords.has(word));
  const extractedTags = Array.from(new Set(words)).slice(0, 4).map((word) => `#${word}`);
  return [...baseTags, ...extractedTags].join(' ');
}

function buildCaption(text1: string, text2: string, hashtags: string): string {
  const fixedPart = `\n\n${hashtags}`;
  const room = INSTAGRAM_CAPTION_LIMIT - fixedPart.length;
  let body = `${text1}\n\n${text2}`;
  if (body.length > room) body = `${body.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  return `${body}${fixedPart}`.trim();
}

// ============================================================
// Image rendering
// ============================================================

async function fetchAsset(url: string, timeoutMs = 15000): Promise<{ data: ArrayBuffer; contentType: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`);
  return {
    data: await response.arrayBuffer(),
    contentType: response.headers.get('content-type') || 'image/png',
  };
}

async function toDataUri(url: string): Promise<string> {
  const { data, contentType } = await fetchAsset(url);
  return `data:${contentType};base64,${Buffer.from(data).toString('base64')}`;
}

let fontsPromise: Promise<FontConfig[]> | null = null;

async function loadFonts(): Promise<FontConfig[]> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const [regular, italic] = await Promise.allSettled([
        fetchAsset(FONT_REGULAR_URL),
        fetchAsset(FONT_ITALIC_URL),
      ]);

      const fonts: FontConfig[] = [];
      if (regular.status === 'fulfilled') {
        fonts.push({ name: FONT_FAMILY, data: regular.value.data, weight: 400, style: 'normal' });
      }
      if (italic.status === 'fulfilled') {
        fonts.push({ name: FONT_FAMILY, data: italic.value.data, weight: 400, style: 'italic' });
      } else if (regular.status === 'fulfilled') {
        // no italic file: register the regular face as italic so the renderer never fails the lookup
        fonts.push({ name: FONT_FAMILY, data: regular.value.data, weight: 400, style: 'italic' });
      }

      if (fonts.length === 0) logWarn('Custom fonts could not be loaded. Falling back to the default font.');
      return fonts;
    })();
  }

  const fonts = await fontsPromise;
  if (fonts.length === 0) fontsPromise = null; // retry on the next invocation
  return fonts;
}

/** Estimates how many lines `text` needs inside `width` at `fontSize` (word-wrap simulation). */
function estimateLines(text: string, width: number, fontSize: number, charWidth: number): number {
  const maxChars = Math.max(1, Math.floor(width / (fontSize * charWidth)));
  let lines = 1;
  let current = 0;

  for (const word of text.split(' ')) {
    const length = word.length;
    if (length > maxChars) {
      lines += Math.ceil(length / maxChars) - (current === 0 ? 1 : 0);
      current = length % maxChars;
      continue;
    }
    if (current === 0) current = length;
    else if (current + 1 + length <= maxChars) current += 1 + length;
    else { lines += 1; current = length; }
  }
  return lines;
}

/** Picks the largest font size that fits the box; truncates with an ellipsis only as a last resort. */
function fitText(text: string, element: TextElement): { text: string; fontSize: number } {
  const charWidth = element.charWidth ?? 0.5;
  const display = element.uppercase ? text.toUpperCase() : text;
  const fits = (value: string, size: number) =>
    estimateLines(value, element.w, size, charWidth) * size * element.lineHeight <= element.h;

  for (let size = element.maxFontSize; size >= element.minFontSize; size -= 2) {
    if (fits(display, size)) return { text: display, fontSize: size };
  }

  const words = display.split(' ');
  while (words.length > 1) {
    words.pop();
    const candidate = `${words.join(' ').replace(/[.,;:!?-]+$/, '')}…`;
    if (fits(candidate, element.minFontSize)) return { text: candidate, fontSize: element.minFontSize };
  }
  return { text: display, fontSize: element.minFontSize };
}

function renderTextBox(element: TextElement, text: string, useCustomFont: boolean) {
  const fitted = fitText(text, element);
  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        display: 'flex',
        alignItems: element.vAlign === 'top' ? 'flex-start' : 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          textAlign: 'center',
          color: element.color,
          fontSize: fitted.fontSize,
          lineHeight: element.lineHeight,
          fontStyle: element.italic ? 'italic' : 'normal',
          letterSpacing: element.letterSpacing ?? 0,
          ...(useCustomFont ? { fontFamily: FONT_FAMILY } : {}),
        }}
      >
        {fitted.text}
      </div>
    </div>
  );
}

type RenderInput = {
  zodiacSign: string;
  text1: string;
  text2: string;
  date: Date;
  layout?: LayoutConfig;
};

/** Renders the template + text to PNG, then converts it to a real JPEG (Instagram accepts JPEG only). */
async function generatePostJpeg({ zodiacSign, text1, text2, date, layout = ACTIVE_LAYOUT }: RenderInput): Promise<Buffer> {
  const templateUrl = `${ASSETS_BASE_URL}/templates/${zodiacSign.toLowerCase()}.png`;

  let templateDataUri: string;
  try {
    templateDataUri = await toDataUri(templateUrl);
  } catch (error) {
    throw new Error(`Template for ${zodiacSign} could not be loaded (${errorMessageOf(error)})`);
  }

  let logoDataUri: string | null = null;
  if (layout.logo) {
    try {
      logoDataUri = await toDataUri(DEFAULT_LOGO_URL);
    } catch (error) {
      logWarn('Logo could not be loaded. Rendering without it.', errorMessageOf(error));
    }
  }

  const fonts = await loadFonts();
  const useCustomFont = fonts.length > 0;
  const dateLabel = getDateLabel(date);

  const imageResponse = new ImageResponse(
    (
      <div style={{ display: 'flex', position: 'relative', width: CANVAS.width, height: CANVAS.height, backgroundColor: '#fffdf5' }}>
        <img
          src={templateDataUri}
          width={CANVAS.width}
          height={CANVAS.height}
          style={{ position: 'absolute', top: 0, left: 0, width: CANVAS.width, height: CANVAS.height }}
        />

        {layout.logo && logoDataUri && (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              left: layout.logo.x,
              top: layout.logo.y,
              width: layout.logo.size,
              height: layout.logo.size,
              borderRadius: layout.logo.size,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.4)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <img src={logoDataUri} width={layout.logo.size} height={layout.logo.size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {layout.title && renderTextBox(layout.title, zodiacSign, useCustomFont)}
        {renderTextBox(layout.hook, text1, useCustomFont)}
        {renderTextBox(layout.body, text2, useCustomFont)}
        {renderTextBox(layout.date, dateLabel, useCustomFont)}
        {layout.hint && STATIC_TEXT.hint && renderTextBox(layout.hint, STATIC_TEXT.hint, useCustomFont)}
        {layout.cta && STATIC_TEXT.cta && renderTextBox(layout.cta, STATIC_TEXT.cta, useCustomFont)}
      </div>
    ),
    {
      width: CANVAS.width,
      height: CANVAS.height,
      ...(useCustomFont ? { fonts } : {}),
    }
  );

  const png = Buffer.from(await imageResponse.arrayBuffer());

  const jpeg = await sharp(png)
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  if (jpeg.length > MAX_IMAGE_BYTES) {
    throw new Error(`Rendered image is too large for Instagram (${(jpeg.length / 1024 / 1024).toFixed(1)} MB).`);
  }
  return jpeg;
}

// ============================================================
// Database helpers
// ============================================================

async function insertSchedulerLogs(supabase: SupabaseClient, logs: SchedulerLog[], startTime: number): Promise<void> {
  if (logs.length === 0) return;
  const durationMs = Date.now() - startTime;
  const logsWithTime = logs.map((log) => ({ ...log, execution_time_ms: durationMs }));
  const { error } = await supabase.from('scheduler_logs').insert(logsWithTime);
  if (error) logError('Failed to save scheduler logs.', error);
  else logInfo('Scheduler logs saved successfully.');
}

async function fetchPublishedSignsToday(ctx: RunContext): Promise<Set<string>> {
  const { data, error } = await ctx.supabase
    .from('published_content')
    .select('zodiac_sign')
    .eq('content_type', 'post')
    .not('instagram_post_id', 'is', null)
    .gte('published_at', ctx.dayStart)
    .lt('published_at', ctx.dayEndExclusive);

  if (error) throw new Error(`Could not check for duplicate posts: ${error.message}`);
  return new Set((data ?? []).map((row: { zodiac_sign: string | null }) => (row.zodiac_sign ?? '').toUpperCase()));
}

/**
 * Decides which sign this schedule rule should publish.
 * - Fixed sign: skipped if that sign was already published today.
 * - Empty sign ("Random"): picks a sign not yet published today; skipped if this slot was already served.
 */
async function resolveTarget(ctx: RunContext, schedule: ScheduleRecord): Promise<TargetResolution> {
  const rawSign = (schedule.zodiac_sign ?? '').trim();

  if (rawSign) {
    const sign = normalizeZodiacSign(rawSign);
    const publishedToday = await fetchPublishedSignsToday(ctx);
    if (publishedToday.has(sign)) return { kind: 'skip', reason: `Already published today (${sign})` };
    return { kind: 'sign', sign, isRandom: false };
  }

  if (!RANDOM_WHEN_EMPTY) {
    return { kind: 'sign', sign: normalizeZodiacSign('ARIES'), isRandom: false };
  }

  // Random slot: if something was already published since this slot started, the slot is served.
  const slotStart = new Date(`${ctx.dateStr}T${schedule.time.slice(0, 5)}:00${GEORGIA_UTC_OFFSET}`).toISOString();
  const { data: servedRow, error: slotError } = await ctx.supabase
    .from('published_content')
    .select('id')
    .eq('content_type', 'post')
    .not('instagram_post_id', 'is', null)
    .gte('published_at', slotStart)
    .lt('published_at', ctx.dayEndExclusive)
    .limit(1)
    .maybeSingle();

  if (slotError) throw new Error(`Could not check the schedule slot: ${slotError.message}`);
  if (servedRow) return { kind: 'skip', reason: 'Random slot already published' };

  const publishedToday = await fetchPublishedSignsToday(ctx);
  const remaining = VALID_ZODIAC_SIGNS.filter((sign) => !publishedToday.has(sign));
  if (remaining.length === 0) return { kind: 'skip', reason: 'All 12 signs already published today' };

  const sign = remaining[Math.floor(Math.random() * remaining.length)];
  return { kind: 'sign', sign, isRandom: true };
}

/** Recording a published post is what prevents double publishing, so this is retried. */
async function recordPublishedPost(supabase: SupabaseClient, row: Record<string, unknown>): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.from('published_content').insert(row);
    if (!error) return true;
    logError(`published_content insert failed (attempt ${attempt}/3).`, error);
    await sleep(500 * attempt);
  }
  return false;
}

// ============================================================
// Per-schedule processing
// ============================================================

async function processSchedule(ctx: RunContext, schedule: ScheduleRecord): Promise<ProcessOutcome> {
  const { supabase, now } = ctx;
  const scheduledTime = schedule.time;

  const baseLog = { platform: 'instagram', post_type: 'post', scheduled_time: scheduledTime } as const;

  if (!isTimeInWindow(scheduledTime, ctx.hours, ctx.minutes)) {
    return { result: { post: scheduledTime, status: 'skipped', reason: 'Not in time window' } };
  }

  let target: TargetResolution;
  try {
    target = await resolveTarget(ctx, schedule);
  } catch (error) {
    const message = errorMessageOf(error);
    logError('Could not resolve the zodiac sign.', { scheduledTime, message });
    return {
      result: { post: scheduledTime, status: 'failed', error: message },
      log: { ...baseLog, status: 'failed', message },
    };
  }

  if (target.kind === 'skip') {
    logInfo('Schedule skipped.', { scheduledTime, reason: target.reason });
    return {
      result: { post: scheduledTime, status: 'skipped', reason: target.reason },
      log: { ...baseLog, status: 'skipped', message: target.reason },
    };
  }

  const targetZodiac = target.sign;
  logInfo('Processing scheduled post.', { scheduledTime, zodiacSign: targetZodiac, random: target.isRandom });

  let uploadedStoragePath: string | null = null;
  let instagramPublished = false;

  try {
    // 1. Agent configuration
    const { data: config, error: configError } = await supabase
      .from('agent_config')
      .select('master_prompt, thinking_style, skills_constraints')
      .eq('agent_type', 'post')
      .single();

    if (configError || !config) {
      throw new Error(`Could not load Post Agent configuration${configError?.message ? `: ${configError.message}` : ''}`);
    }
    const agentConfig = config as AgentConfig;

    // 2. Text generation (retried once on transient AI errors)
    const rawText1 = await withRetry('Text 1 generation', () => generateViralText1(targetZodiac, agentConfig));
    const text1 = typeof rawText1 === 'string' ? sanitizeText(rawText1) : '';
    if (!text1) throw new Error('Text 1 generation returned an empty or invalid result.');

    const rawText2 = await withRetry('Text 2 generation', () => generateHoroscopeText2(targetZodiac, text1, agentConfig));
    const text2 = typeof rawText2 === 'string' ? sanitizeText(rawText2) : '';
    if (!text2) throw new Error('Text 2 generation returned an empty or invalid result.');

    // 3. Image: render, convert to JPEG, upload
    logInfo('Rendering Instagram post image.', { zodiacSign: targetZodiac });
    const jpeg = await generatePostJpeg({ zodiacSign: targetZodiac, text1, text2, date: now });
    logInfo('Image rendered as JPEG.', { sizeKB: Math.round(jpeg.length / 1024) });

    uploadedStoragePath = `posts/post-${targetZodiac.toLowerCase()}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(ASSETS_BUCKET)
      .upload(uploadedStoragePath, jpeg, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw new Error(`Could not upload post image: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(uploadedStoragePath);
    const finalImageUrl = urlData.publicUrl;
    if (!finalImageUrl) throw new Error('Supabase did not return a public URL for the image.');
    logInfo('Post image uploaded successfully.', { imageUrl: finalImageUrl });

    // 4. Instagram account
    const { data: profile, error: profileError } = await supabase
      .from('instagram_accounts')
      .select('instagram_user_id, instagram_access_token, username')
      .eq('status', 'active')
      .single();

    if (profileError || !profile) {
      throw new Error(`Could not find an active Instagram account${profileError?.message ? `: ${profileError.message}` : ''}`);
    }
    if (!profile.instagram_user_id || !profile.instagram_access_token) {
      throw new Error('The active Instagram account is missing its user ID or access token.');
    }

    // 5. Publish (never retried automatically: a retry could create a duplicate post)
    const agent = new InstagramAdapter(profile.instagram_user_id, profile.instagram_access_token);
    const hashtags = generateDynamicHashtags(text2, targetZodiac);
    const caption = buildCaption(text1, text2, hashtags);

    const publishResult = await agent.publishPost(finalImageUrl, caption);
    if (!publishResult.success || !publishResult.postId) {
      throw new Error(publishResult.error || 'Instagram publishing failed or returned no post ID.');
    }

    instagramPublished = true;
    logInfo('Instagram post published successfully.', { postId: publishResult.postId, username: profile.username });

    // 6. Record it (retried, because this record is what blocks duplicate posts)
    const recorded = await recordPublishedPost(supabase, {
      content_type: 'post',
      zodiac_sign: targetZodiac,
      caption,
      image_url: finalImageUrl,
      instagram_post_id: publishResult.postId,
      status: 'published',
      agent_used: 'server_scheduler',
      published_at: now.toISOString(),
    });

    if (!recorded) {
      const warning = 'Published to Instagram, but database recording failed. A duplicate post is possible on the next run.';
      logError(warning, { postId: publishResult.postId, zodiacSign: targetZodiac });
      return {
        result: { post: scheduledTime, status: 'published', postId: publishResult.postId, zodiacSign: targetZodiac, warning },
        log: { ...baseLog, status: 'published', message: `Published (ID: ${publishResult.postId}); DATABASE INSERT FAILED, check for duplicates` },
      };
    }

    return {
      result: { post: scheduledTime, status: 'published', postId: publishResult.postId, zodiacSign: targetZodiac },
      log: { ...baseLog, status: 'published', message: `Success (ID: ${publishResult.postId}, ${targetZodiac})` },
    };
  } catch (error) {
    const errorMessage = errorMessageOf(error);
    logError('Scheduled post processing failed.', { scheduledTime, zodiacSign: targetZodiac, error });

    if (!instagramPublished) {
      // best-effort cleanup of the orphaned image
      if (uploadedStoragePath) {
        const { error: removeError } = await supabase.storage.from(ASSETS_BUCKET).remove([uploadedStoragePath]);
        if (removeError) logWarn('Could not remove the orphaned image.', removeError.message);
      }

      const { error: failureInsertError } = await supabase.from('published_content').insert({
        content_type: 'post',
        zodiac_sign: targetZodiac,
        caption: 'Failed to generate/publish',
        status: 'failed',
        agent_used: 'server_scheduler',
        error_message: errorMessage,
        published_at: now.toISOString(),
      });
      if (failureInsertError) logError('Could not record the failed publication attempt.', failureInsertError);
    }

    return {
      result: { post: scheduledTime, status: 'failed', zodiacSign: targetZodiac, error: errorMessage },
      log: { ...baseLog, status: 'failed', message: errorMessage },
    };
  }
}

// ============================================================
// Template preview (no AI, no publishing)
// GET /api/instagram-scheduler?preview=LIBRA[&layout=zones][&secret=...]
// ============================================================

const PREVIEW_TEXT_1 = 'Balance comes when you stop waiting for permission.';
const PREVIEW_TEXT_2 =
  'Today favors clear decisions over long debates. Choose one small step you have been postponing and finish it before evening. Calm progress beats perfect timing.';

async function handlePreview(request: Request, signParam: string): Promise<Response> {
  const secretConfigured = Boolean(process.env.CRON_SECRET);
  const previewAllowed = process.env.NODE_ENV !== 'production' || secretConfigured;

  if (!previewAllowed) {
    return jsonResponse({ success: false, error: 'Preview is disabled in production unless CRON_SECRET is configured.' }, 403);
  }

  try {
    const zodiacSign = normalizeZodiacSign(signParam);
    const layoutParam = new URL(request.url).searchParams.get('layout');
    const layout = layoutParam === 'zones' ? ZONES_LAYOUT : layoutParam === 'classic' ? CLASSIC_LAYOUT : ACTIVE_LAYOUT;

    const jpeg = await generatePostJpeg({ zodiacSign, text1: PREVIEW_TEXT_1, text2: PREVIEW_TEXT_2, date: new Date(), layout });
    return new Response(new Uint8Array(jpeg), {
      status: 200,
      headers: { ...NO_CACHE_HEADERS, 'Content-Type': 'image/jpeg' },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: errorMessageOf(error) }, 400);
  }
}

// ============================================================
// Route handler
// ============================================================

export async function GET(request: Request) {
  const startTime = Date.now();

  if (!isAuthorized(request)) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  const previewSign = new URL(request.url).searchParams.get('preview');
  if (previewSign) return handlePreview(request, previewSign);

  try {
    const supabase = getSupabaseClient();
    const { dbDayOfWeek, dateStr, hours, minutes, now } = getCurrentGeorgiaTime();

    if (dbDayOfWeek === undefined) {
      throw new Error('Could not determine the weekday in the Georgia time zone.');
    }

    const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    logInfo('Scheduler execution started.', { georgiaTime: currentTimeStr, dbDayOfWeek, date: dateStr });

    const { data: schedules, error: fetchError } = await supabase
      .from('content_schedule')
      .select('time, content_type, zodiac_sign, is_active')
      .eq('is_active', true)
      .eq('day_of_week', dbDayOfWeek)
      .eq('content_type', 'post')
      .order('time', { ascending: true });

    if (fetchError) throw new Error(`Could not load content schedule: ${fetchError.message}`);

    const { dayStart, dayEndExclusive } = getGeorgiaDayBounds(dateStr);
    const ctx: RunContext = { supabase, now, dateStr, hours, minutes, dayStart, dayEndExclusive };

    const results: Array<Record<string, unknown>> = [];
    const logsToInsert: SchedulerLog[] = [];

    // Sequential on purpose: each publish must be recorded before the next duplicate check.
    for (const schedule of (schedules ?? []) as ScheduleRecord[]) {
      const outcome = await processSchedule(ctx, schedule);
      results.push(outcome.result);
      if (outcome.log) logsToInsert.push(outcome.log);
    }

    await insertSchedulerLogs(supabase, logsToInsert, startTime);

    const failedCount = results.filter((result) => result.status === 'failed').length;
    const publishedCount = results.filter((result) => result.status === 'published').length;
    const skippedCount = results.filter((result) => result.status === 'skipped').length;

    logInfo('Scheduler execution finished.', { publishedCount, skippedCount, failedCount, durationMs: Date.now() - startTime });

    return jsonResponse({
      success: failedCount === 0,
      timestamp: now.toISOString(),
      georgiaTime: currentTimeStr,
      timezone: GEORGIA_TIMEZONE,
      results,
      summary: { total: results.length, published: publishedCount, skipped: skippedCount, failed: failedCount },
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logError('Critical Instagram Scheduler error.', error);
    return jsonResponse({ success: false, error: errorMessageOf(error), durationMs: Date.now() - startTime }, 500);
  }
}