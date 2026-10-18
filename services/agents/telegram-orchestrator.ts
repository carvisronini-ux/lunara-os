// /home/carvisronini-ux/lunara-os/services/agents/telegram-orchestrator.ts

import { supabase } from '@/lib/supabase';
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';
import {
  sendTelegramMessage,
  sendTelegramPhoto,
} from '../distribution/telegram';
import { imageGenerator, type ImageGenerationResult as ImgGenResult } from './image-generator';
import { getBestAvailableModel, reclassifyModelToImage } from './model-router';

// ============================================================
// TYPES
// ============================================================

export interface OrchestratorRequest {
  agentType: string;
  postType: string;
  contentTheme?: string;
  zodiacSign?: string;
}

export interface OrchestratorResponse {
  success: boolean;
  messageId?: number;
  error?: string;
  caption?: string;
  imageUrl?: string;
  hasImagePrompt?: boolean;
  imageProvider?: string;
  imageError?: string;
  generationLogs?: string[];
  warnings?: string[];
}

interface GeneratedContent {
  caption: string;
  image_prompt?: string;
  hashtags?: string[];
}

interface TelegramPublishResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const GROQ_TIMEOUT_MS = 60_000;
const ACCESS_LEASE_DURATION_SECONDS = 120;

const TELEGRAM_MESSAGE_LIMIT = 3_800;
const TELEGRAM_CAPTION_LIMIT = 950; 
const MAX_ERROR_LENGTH = 1_500;

const STATIC_ZODIAC_IMAGES = [
  'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiacsigns.png',
  'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiacsign2.png'
];

const CLOUDFLARE_R2_BASE_URL = 'https://pub-8ab8b85d503246b9a786ae8d275f27f7.r2.dev'; 

const TAROT_CARDS = [
  { name: 'The Fool', filename: 'the_fool.png', subtitle: 'BEGINNINGS • INNOCENCE • FREEDOM' },
  { name: 'The Magician', filename: 'the_magician.png', subtitle: 'FOCUS • WILL • CREATION' },
  { name: 'The High Priestess', filename: 'the_high_priestess.png', subtitle: 'INTUITION • MYSTERY • WISDOM' },
  { name: 'The Empress', filename: 'the_empress.png', subtitle: 'ABUNDANCE • NATURE • FERTILITY' },
  { name: 'The Emperor', filename: 'the_emperor.png', subtitle: 'AUTHORITY • STRUCTURE • POWER' },
  { name: 'The Hierophant', filename: 'the_hierophant.png', subtitle: 'TRADITION • GUIDANCE • BELIEF' },
  { name: 'The Lovers', filename: 'the_lovers.png', subtitle: 'UNION • CHOICE • HARMONY' },
  { name: 'The Chariot', filename: 'the_chariot.png', subtitle: 'WILLPOWER • VICTORY • CONTROL' },
  { name: 'Strength', filename: 'strength.png', subtitle: 'COURAGE • COMPASSION • INNER POWER' },
  { name: 'The Hermit', filename: 'the_hermit.png', subtitle: 'SOLITUDE • REFLECTION • TRUTH' },
  { name: 'Wheel of Fortune', filename: 'wheel_of_fortune.png', subtitle: 'CHANGE • CYCLES • DESTINY' },
  { name: 'Justice', filename: 'justice.png', subtitle: 'FAIRNESS • TRUTH • LAW' },
  { name: 'The Hanged Man', filename: 'the_hanged_man.png', subtitle: 'PAUSE • SURRENDER • NEW PERSPECTIVE' },
  { name: 'Death', filename: 'death.png', subtitle: 'TRANSFORMATION • ENDINGS • REBIRTH' },
  { name: 'Temperance', filename: 'temperance.png', subtitle: 'BALANCE • MODERATION • PATIENCE' },
  { name: 'The Devil', filename: 'the_devil.png', subtitle: 'SHADOW • ATTACHMENT • RESTRICTION' },
  { name: 'The Tower', filename: 'the_tower.png', subtitle: 'SUDDEN CHANGE • UPHEAVAL • AWAKENING' },
  { name: 'The Star', filename: 'the_star.png', subtitle: 'HOPE • FAITH • PURPOSE' },
  { name: 'The Moon', filename: 'the_moon.png', subtitle: 'INTUITION • ILLUSION • DREAMS' },
  { name: 'The Sun', filename: 'the_sun.png', subtitle: 'JOY • SUCCESS • VITALITY' },
  { name: 'Judgement', filename: 'judgement.png', subtitle: 'REBIRTH • INNER CALLING • ABSOLUTION' },
  { name: 'The World', filename: 'the_world.png', subtitle: 'COMPLETION • INTEGRATION • ACCOMPLISHMENT' }
];

// ============================================================
// HELPERS
// ============================================================

function logInfo(message: string, details?: unknown): void {
  if (details !== undefined) {
    console.info(`[Orchestrator] ${message}`, details);
    return;
  }
  console.info(`[Orchestrator] ${message}`);
}

function logWarn(message: string, details?: unknown): void {
  if (details !== undefined) {
    console.warn(`[Orchestrator] ${message}`, details);
    return;
  }
  console.warn(`[Orchestrator] ${message}`);
}

function logError(message: string, details?: unknown): void {
  if (details !== undefined) {
    console.error(`[Orchestrator] ${message}`, details);
    return;
  }
  console.error(`[Orchestrator] ${message}`);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred.';
}

function truncateError(message: string): string {
  if (message.length <= MAX_ERROR_LENGTH) {
    return message;
  }
  return `${message.slice(0, MAX_ERROR_LENGTH)}...`;
}

function splitTelegramText(text: string, maxLength: number): string[] {
  if (!text) {
    return [];
  }

  const tokens = text.match(/&(?:amp|lt|gt|quot|#39);|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) ?? [];
  const chunks: string[] = [];
  let current = '';

  for (const token of tokens) {
    if (current.length + token.length > maxLength && current.length > 0) {
      chunks.push(current);
      current = '';
    }
    current += token;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function parseGeneratedContent(rawContent: unknown, postType?: string): GeneratedContent {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error('The AI returned an empty response.');
  }

  let normalized = rawContent.trim();
  normalized = normalized
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('The AI returned invalid JSON. Check the model response and prompt.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The AI response must be a JSON object.');
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data.caption !== 'string' || !data.caption.trim()) {
    throw new Error('The AI response does not contain a valid caption.');
  }

  if (data.image_prompt !== undefined && data.image_prompt !== null && typeof data.image_prompt !== 'string') {
    throw new Error('The AI returned an invalid image_prompt field.');
  }

  if (data.hashtags !== undefined && !Array.isArray(data.hashtags)) {
    throw new Error('The AI returned an invalid hashtags field.');
  }

  let finalCaption = data.caption as string;

  if (postType === 'daily_horoscope_12_signs') {
    const zodiacMap = [
      { name: 'Aries', emoji: '♈' }, { name: 'Taurus', emoji: '♉' },
      { name: 'Gemini', emoji: '♊' }, { name: 'Cancer', emoji: '♋' },
      { name: 'Leo', emoji: '♌' }, { name: 'Virgo', emoji: '♍' },
      { name: 'Libra', emoji: '♎' }, { name: 'Scorpio', emoji: '♏' },
      { name: 'Sagittarius', emoji: '♐' }, { name: 'Capricorn', emoji: '♑' },
      { name: 'Aquarius', emoji: '♒' }, { name: 'Pisces', emoji: '♓' }
    ];

    const missingEmojis = zodiacMap.filter(z => !finalCaption.includes(z.emoji));
    
    if (missingEmojis.length > 0) {
      let fixedCaption = finalCaption;
      let injectedCount = 0;

      missingEmojis.forEach(z => {
        const regex = new RegExp(`(^|\\n)\\s*${z.name}\\s*[:\\,]`, 'gi');
        if (regex.test(fixedCaption)) {
          fixedCaption = fixedCaption.replace(new RegExp(`\\b${z.name}\\b`, 'g'), `${z.emoji} ${z.name}`);
          injectedCount++;
        }
      });

      if (injectedCount > 0) {
        finalCaption = fixedCaption;
      }
    }

    const finalMissing = zodiacMap.filter(z => !finalCaption.includes(z.emoji));
    if (finalMissing.length > 3) {
      throw new Error(`The AI response is missing too many zodiac emojis (${finalMissing.length} missing) and auto-fix failed.`);
    }
    
    if (finalCaption.length < 300) {
      throw new Error(`The AI response is too short (${finalCaption.length} chars). For 12-sign horoscope, caption must be at least 300 characters.`);
    }
  }

  if (postType === 'daily_horoscope_single') {
    if (finalCaption.length > 450) {
      throw new Error(`Single sign caption is too long (${finalCaption.length} chars). Max 450 characters allowed.`);
    }
  }

  if (postType === 'daily_tarot_card') {
    if (finalCaption.length > 900) {
      throw new Error(`Tarot caption is too long (${finalCaption.length} chars). Max 900 characters allowed.`);
    }
  }

  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(h => h.startsWith('#') ? h.trim() : `#${h.trim()}`)
    : [];

  return {
    caption: finalCaption.trim(),
    image_prompt: typeof data.image_prompt === 'string' ? data.image_prompt.trim() : undefined,
    hashtags,
  };
}

function buildUserPrompt(request: OrchestratorRequest, selectedTarotCard?: { name: string, filename: string, subtitle: string }): string {
  if (request.postType === 'daily_tarot_card' && selectedTarotCard) {
    return `
CRITICAL: YOU MUST RESPOND ONLY IN ENGLISH. 

You are LUNARA, a wise cosmic guide. Write a compelling, engaging daily guidance message based SPECIFICALLY on the Tarot Card: ${selectedTarotCard.name}.

MANDATORY OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown, no extra text.

JSON STRUCTURE:
{
  "caption": "🃏 <b>${selectedTarotCard.name}</b>\\n\\n[2-3 engaging paragraphs in English. First paragraph: Explain the card's core meaning and energy in a relatable way. Second paragraph: Provide practical, actionable guidance for today - how can the user apply this card's wisdom? Third paragraph (optional): Add a deeper insight or warning. Total: 60-100 words].\\n\\n<b>Reflection Question:</b> [One thought-provoking question in English that encourages self-reflection]",
  "hashtags": ["#LUNARA", "#DailyTarot", "#${selectedTarotCard.name.replace(/\s+/g, '')}", "#TarotReading"]
}

STRICT RULES:
1. LANGUAGE: 100% ENGLISH ONLY.
2. FORMAT: Start exactly with: 🃏 <b>[Card Name]</b> (use HTML bold tags, NOT asterisks)
3. LENGTH: 60-100 words for the main text (not counting the question). Make it engaging, not generic.
4. TONE: Mystical yet practical, empowering, insightful. Avoid clichés.
5. CONTENT: Be specific to THIS card's meaning. Don't write generic advice.
6. QUESTION: Make it personal and thought-provoking, not yes/no question.
7. HASHTAGS: Must be an array of strings starting with '#'.

EXAMPLE OUTPUT:
{
  "caption": "🃏 <b>The Emperor</b>\\n\\nStructure creates freedom today. This card reminds us that true power comes from establishing clear boundaries and taking command of chaos. When you build solid foundations with intention and authority, you transform raw plans into sustainable reality.\\n\\nTake charge of your environment. Set firm limits, create order from disorder, and lead with confidence. Your ability to establish structure now will support your long-term goals.\\n\\n<b>Reflection Question:</b> Where in your life do you need to establish firmer boundaries to create lasting freedom?",
  "hashtags": ["#LUNARA", "#DailyTarot", "#TheEmperor", "#TarotReading"]
}
`.trim();
  }

  return `
CRITICAL: YOU MUST RESPOND ONLY IN ENGLISH. DO NOT USE GEORGIAN OR ANY OTHER LANGUAGE.

Request Parameters:
- Agent Type: ${request.agentType}
- Post Type: ${request.postType}
- Content Theme: ${request.contentTheme || 'Automatic'}
- Zodiac Sign: ${request.zodiacSign || 'General / All signs'}

Generate the content strictly following the system instructions provided above. ALL OUTPUT MUST BE IN ENGLISH.
`.trim();
}

function applyBoldFormattingToSingleSign(rawCaption: string): string {
  let safeText = rawCaption
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const zodiacMap = [
    { name: 'Aries', emoji: '♈' }, { name: 'Taurus', emoji: '♉' },
    { name: 'Gemini', emoji: '♊' }, { name: 'Cancer', emoji: '♋' },
    { name: 'Leo', emoji: '♌' }, { name: 'Virgo', emoji: '♍' },
    { name: 'Libra', emoji: '♎' }, { name: 'Scorpio', emoji: '♏' },
    { name: 'Sagittarius', emoji: '♐' }, { name: 'Capricorn', emoji: '♑' },
    { name: 'Aquarius', emoji: '♒' }, { name: 'Pisces', emoji: '♓' }
  ];

  zodiacMap.forEach(({ name, emoji }) => {
    const regex1 = new RegExp(`${emoji}\\s+\\*{0,2}${name}\\*{0,2}\\s*:`, 'gi');
    safeText = safeText.replace(regex1, `${emoji} <b>${name}</b>:`);
    const regex2 = new RegExp(`\\*\\*${name}\\*\\*\\s*:`, 'gi');
    safeText = safeText.replace(regex2, `${emoji} <b>${name}</b>:`);
    const regex3 = new RegExp(`(^|\\n)\\s*${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex3, `$1${emoji} <b>${name}</b>:`);
    const regex4 = new RegExp(`(^|\\n)\\s*${name}\\s*,`, 'gi');
    safeText = safeText.replace(regex4, `$1${emoji} <b>${name}</b>: `);
    const regex5 = new RegExp(`${emoji}${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex5, `${emoji} <b>${name}</b>:`);
  });

  safeText = safeText.replace(/[♈♉♊♋♌♍♎♏♐♑♒♓]\uFE0F?\s*$/gm, '');
  safeText = safeText.replace(/:\s{2,}/g, ': ');
  safeText = safeText.replace(/^\s+/gm, '');

  return safeText.trim();
}

function applyBoldFormattingToZodiac(rawCaption: string): string {
  let safeText = rawCaption
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  safeText = safeText.replace(/[♈♉♊♋♌♍♎♏♐♑♒♓]\uFE0F?\s*$/gm, '');

  const zodiacMap = [
    { name: 'Aries', emoji: '♈' }, { name: 'Taurus', emoji: '♉' },
    { name: 'Gemini', emoji: '♊' }, { name: 'Cancer', emoji: '♋' },
    { name: 'Leo', emoji: '♌' }, { name: 'Virgo', emoji: '♍' },
    { name: 'Libra', emoji: '♎' }, { name: 'Scorpio', emoji: '♏' },
    { name: 'Sagittarius', emoji: '♐' }, { name: 'Capricorn', emoji: '♑' },
    { name: 'Aquarius', emoji: '♒' }, { name: 'Pisces', emoji: '♓' }
  ];

  zodiacMap.forEach(({ name, emoji }) => {
    const regex1 = new RegExp(`(${emoji})\\s+${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex1, `$1 <b>${name}</b>:`);
    const regex2 = new RegExp(`\\*\\*${name}\\*\\*\\s*:`, 'gi');
    safeText = safeText.replace(regex2, `${emoji} <b>${name}</b>:`);
    const regex3 = new RegExp(`(^|\\n)\\s*${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex3, `$1${emoji} <b>${name}</b>:`);
  });

  safeText = safeText.replace(/:\s{2,}/g, ': ');
  return safeText.trim();
}

// ============================================================
// TELEGRAM ORCHESTRATOR
// ============================================================

export class TelegramOrchestrator {
  async generateAndPublish(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const generationLogs: string[] = [];
    const warnings: string[] = [];

    let leaseId: string | null = null;
    let caption = '';
    let imagePrompt = '';
    let imageResult: ImgGenResult | null = null;
    let imageError: string | undefined;
    let imageProvider = 'none';

    const addLog = (message: string): void => {
      const timestamp = new Date().toISOString();
      generationLogs.push(`[${timestamp}] ${message}`);
      logInfo(message);
    };

    const addWarning = (message: string): void => {
      warnings.push(message);
      logWarn(message);
    };

    addLog('================================================');
    addLog('🚀 AI იწყებს კონტენტის გენერაციას და პუბლიკაციას...');
    addLog(`📋 Agent Type: ${request.agentType}`);
    addLog(`📋 Post Type: ${request.postType}`);
    addLog(`📋 Content Theme: ${request.contentTheme || 'Automatic'}`);
    addLog(`📋 Zodiac Sign: ${request.zodiacSign || 'General'}`);
    addLog('================================================');

    try {
      if (!request.agentType?.trim() || !request.postType?.trim()) {
        throw new Error('Both agentType and postType are required.');
      }

      addLog('📥 ნაბიჯი 1: ვიტვირთავ აგენტის კონფიგურაციას Supabase-იდან...');
      const { data: config, error: configError } = await supabase
        .from('agent_config')
        .select('*')
        .eq('agent_type', request.agentType)
        .single();

      if (configError || !config) {
        throw new Error(`Failed to load agent configuration: ${configError?.message || 'Configuration not found'}`);
      }

      if (typeof config.master_prompt !== 'string' || !config.master_prompt.trim()) {
        throw new Error(`Agent "${request.agentType}" has no master_prompt configured.`);
      }

      addLog('✅ აგენტის კონფიგურაცია წარმატებით ჩაიტვირთა.');
      addLog(`📝 Master Prompt Length: ${config.master_prompt.length} characters`);

      addLog('📥 ნაბიჯი 2: ვიტვირთავ დავალების სპეციფიკურ ინსტრუქციებს (აღწერასაც!)...');
      let jobDescription = '';
      let useAiImage = true; 
      
      const { data: jobData, error: jobError } = await supabase
        .from('agent_jobs')
        .select('description, image_prompt_logic, use_ai_image')
        .eq('agent_type', request.agentType)
        .eq('post_type', request.postType)
        .single();

      if (jobError && jobError.code !== 'PGRST116') {
        addWarning(`⚠️ დავალების ინსტრუქციის წაკითხვის შეცდომა: ${jobError.message}`);
      }

      if (jobData) {
        jobDescription = jobData.description || '';
        useAiImage = jobData.use_ai_image ?? true;
        addLog(`✅ დავალების ინსტრუქცია წაიკითხა: ${request.postType}`);
        addLog(`🔘 AI Image Toggle: ${useAiImage ? 'ON' : 'OFF'}`);
        addLog(`📝 Description Length: ${jobDescription.length} characters`);
      } else {
        addLog(`⚠️ დავალების ინსტრუქცია ვერ მოიძებნა ${request.postType}-ისთვის.`);
      }

      addLog('⏳ ნაბიჯი 3: ველოდები CredentialVault-ის ინიციალიზაციას...');
      await credentialVault.ready;
      addLog('✅ CredentialVault მზადაა.');

      let selectedTarotCard = null;
      if (request.postType === 'daily_tarot_card') {
        selectedTarotCard = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        addLog(`🃏 ნაბიჯი 4: შემთხვევით არჩეული ტაროს კარტი: ${selectedTarotCard.name}`);
      } else if (request.postType === 'daily_horoscope_single') {
        addLog('🎯 ნაბიჯი 4: ვამოწმებ ზოდიაქოს ნიშანს...');
        const validSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
        let targetSign = (request.zodiacSign || '').toLowerCase().trim();

        if (!targetSign || !validSigns.includes(targetSign) || targetSign === 'general') {
          targetSign = validSigns[Math.floor(Math.random() * validSigns.length)];
          addLog(`⚠️ Zodiac sign missing/invalid in schedule. Randomly selected: ${targetSign}`);
        } else {
          addLog(`✅ Specific zodiac sign provided in schedule: ${targetSign}`);
        }

        request.zodiacSign = targetSign.charAt(0).toUpperCase() + targetSign.slice(1);
        addLog(`🧠 AI-ს გადაეცა კონკრეტული ნიშანი: ${request.zodiacSign}`);
      }

      addLog('🤖 ნაბიჯი 5: ვირჩევ საუკეთესო ჩეთ მოდელს...');
      let chatModelInfo = await getBestAvailableModel('chat');
      addLog(`✅ საუკეთესო მოდელი: ${chatModelInfo?.modelName || 'NULL'} (${chatModelInfo?.provider || 'unknown'})`);
      
      let chatAttempts = 0;
      const maxChatAttempts = 3;
      let textGenerationSuccess = false;
      let generatedContent: GeneratedContent | null = null;
      let lastError = 'Unknown error';

      while (chatAttempts < maxChatAttempts && !textGenerationSuccess) {
        if (!chatModelInfo) {
          throw new Error('No chat models available in the vault.');
        }

        const currentProvider = chatModelInfo.provider;
        const currentModelName = chatModelInfo.modelName;
        const currentCredentialId = chatModelInfo.credentialId;

        addLog('================================================');
        addLog(`🔄 ცდა ${chatAttempts + 1}/${maxChatAttempts}: ${currentProvider} -> ${currentModelName}`);
        addLog('================================================');

        leaseId = accessManager.requestAccess(
          `${request.agentType}-agent`,
          currentProvider as any,
          'spend',
          `Generate Telegram content for ${request.postType}`,
          null,
          ACCESS_LEASE_DURATION_SECONDS
        );

        if (!leaseId) {
          addWarning(`Could not acquire lease for ${currentProvider}. Trying next...`);
          chatModelInfo = await getBestAvailableModel('chat', currentModelName);
          chatAttempts++;
          continue;
        }

        let rawContent: string | undefined;

        try {
          addLog('📝 ვაგებ სისტემურ პრომპტს...');
          const systemPrompt = [
            config.master_prompt,
            '',
            'CRITICAL LANGUAGE RULE: ALL OUTPUT MUST BE STRICTLY IN ENGLISH. DO NOT USE GEORGIAN.',
            '',
            'SPECIFIC JOB INSTRUCTIONS (FOLLOW THESE STRICTLY):',
            jobDescription || 'Follow general LUNARA guidelines.',
            '',
            'OUTPUT FORMAT:',
            'Return only a valid JSON object with caption, image_prompt and hashtags.',
          ].join('\n');

          addLog(`📄 სისტემური პრომპტის სიგრძე: ${systemPrompt.length} სიმბოლო`);

          addLog('📝 ვაგებ მომხმარებლის პრომპტს...');
          const userPrompt = buildUserPrompt(request, selectedTarotCard || undefined);
          addLog(`📄 მომხმარებლის პრომპტის სიგრძე: ${userPrompt.length} სიმბოლო`);

          addLog('🌐 ვაგებ API მოთხოვნას...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => { controller.abort(); }, GROQ_TIMEOUT_MS);

          const cred = credentialVault.getMetadata().find((c: any) => c.credential_id === currentCredentialId);
          const meta = cred?.metadata || {};

          let chatEndpoint = '';
          let requestBody: any;
          let headers: Record<string, string> = { 'Content-Type': 'application/json' };

          if (currentProvider === 'cloudflare') {
            const accountId = meta.accountId;
            if (!accountId) throw new Error('Cloudflare accountId not found in metadata');
            chatEndpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${currentModelName}`;
            requestBody = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] };
            headers['Authorization'] = `Bearer ${chatModelInfo.apiKey}`;
          } else if (currentProvider === 'gemini' || currentProvider === 'google') {
            chatEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModelName}:generateContent?key=${chatModelInfo.apiKey}`;
            requestBody = { contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }], generationConfig: { temperature: 0.3 } };
          } else {
            const base = meta.baseUrl || `https://api.${currentProvider}.com/v1`;
            chatEndpoint = `${base}${meta.chatEndpoint || '/chat/completions'}`;
            const authKey = meta.authHeaderKey || 'Authorization';
            const authPrefix = meta.authHeaderPrefix ? `${meta.authHeaderPrefix} ` : 'Bearer ';
            headers[authKey] = `${authPrefix}${chatModelInfo.apiKey}`;
            requestBody = { model: currentModelName, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.3 };
          }

          const maskedEndpoint = chatEndpoint.replace(/key=[^&]+/, 'key=***');
          addLog(`🔗 API Endpoint: ${maskedEndpoint}`);
          addLog(`📤 Request Body Size: ${JSON.stringify(requestBody).length} bytes`);
          addLog('📤 ვაგზავნი მოთხოვნას AI-ს...');

          let response: Response;
          try {
            response = await fetch(chatEndpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: controller.signal });
          } catch (fetchError: any) {
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              throw new Error(`Request timed out after ${GROQ_TIMEOUT_MS / 1000} seconds.`);
            }
            throw new Error(`Could not connect to provider: ${getErrorMessage(fetchError)}`);
          } finally {
            clearTimeout(timeoutId);
          }

          addLog(`📥 მივიღე პასუხი: HTTP ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No response body');
            const errorLower = errorText.toLowerCase();
            
            const isNotAChatModelError = errorLower.includes('not supported') || errorLower.includes('image generation') || errorLower.includes('vision only') || errorLower.includes('invalid model');
            const isQuotaOrBalanceError = response.status === 402 || response.status === 429 || response.status === 503 || response.status === 500 || errorLower.includes('insufficient balance') || errorLower.includes('quota exceeded') || errorLower.includes('rate limit') || errorLower.includes('credit') || errorLower.includes('high demand') || errorLower.includes('unavailable');

            if (isNotAChatModelError) {
              addLog(`⚠️ მოდელი "${currentModelName}" არ არის ჩეთის მოდელი. სისტემა ავტომატურად ასწორებს მონაცემთა ბაზას...`);
              await reclassifyModelToImage(currentCredentialId, currentModelName);
              throw new Error('Model reclassified, retrying next');
            }
            
            if (isQuotaOrBalanceError) {
              addLog(`⚠️ მოდელზე "${currentModelName}" ამოიწურა ლიმიტი/ბალანსი ან გადატვირთულია (HTTP ${response.status}).`);
              throw new Error('Quota/balance error, retrying next');
            }
            
            throw new Error(`API returned HTTP ${response.status}: ${truncateError(errorText)}`);
          }

          const data = await response.json();
          addLog(`📦 Response Size: ${JSON.stringify(data).length} bytes`);

          if (currentProvider === 'cloudflare') {
            rawContent = data?.result?.response;
          } else if (currentProvider === 'gemini' || currentProvider === 'google') {
            rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          } else {
            rawContent = data?.choices?.[0]?.message?.content;
          }

          addLog('✅ პასუხი მიღებულია. ვამოწმებ JSON-ს...');
          
          if (!rawContent) {
            throw new Error(`მოდელმა დააბრუნა ცარიელი პასუხი. JSON: ${JSON.stringify(data).substring(0, 150)}`);
          }

          addLog(`📝 AI-ის ნედლი პასუხი (პირველი 500 სიმბოლო):\n${rawContent.substring(0, 500)}...`);

          addLog('🔍 ვამოწმებ ვალიდაციას...');
          generatedContent = parseGeneratedContent(rawContent, request.postType);
          addLog('✅ ვალიდაცია წარმატებით გაიარა!');
          addLog(`📝 Caption Length: ${generatedContent.caption.length} characters`);
          addLog(`📝 Hashtags Count: ${generatedContent.hashtags?.length || 0}`);
          
          textGenerationSuccess = true;
          addLog('✅ ტექსტის გენერაცია წარმატებით დასრულდა!');

        } catch (error: any) {
          lastError = error.message;
          
          addLog(`❌ შეცდომა ${currentModelName}-ისთვის: ${error.message}`);
          if (rawContent) {
            addLog(`📝 AI-ის ნედლი პასუხი (პირველი 400 სიმბოლო):\n${rawContent.substring(0, 400)}...`);
          } else {
            addLog(`📝 rawContent is undefined or empty.`);
          }
          
          addLog(`⚠️ ვცდილობთ შემდეგ საუკეთესო მოდელს...`);
          
          const nextModel = await getBestAvailableModel('chat', currentModelName);
          if (!nextModel) {
             addLog(`❌ აღარ არის ხელმისაწვდომი მოდელები!`);
          }
          chatModelInfo = nextModel;
          chatAttempts++;
          continue;
        } finally {
          if (leaseId) {
            addLog(`🔓 ვათავისუფლებ ${currentProvider} access lease-ს...`);
            try {
              accessManager.revokeLease(leaseId, 'system_cleanup');
              addLog('✅ Access lease გათავისუფლდა.');
            } catch (leaseError) {
              addWarning(`Could not explicitly revoke the lease: ${getErrorMessage(leaseError)}`);
            }
            leaseId = null;
          }
        }
      }

      if (!textGenerationSuccess || !generatedContent) {
        throw new Error(`All available chat models failed. Last error: ${lastError}`);
      }

      addLog('================================================');
      addLog('🎨 ნაბიჯი 6: ვაფორმატებ caption-ს...');
      addLog('================================================');
      
      addLog(`📝 Raw Caption (პირველი 200 სიმბოლო):\n${generatedContent.caption.substring(0, 200)}...`);
      
      imagePrompt = generatedContent.image_prompt || '';
      
      if (request.postType === 'daily_horoscope_12_signs') {
        addLog('🎨 ვიყენებ 12 ნიშნის ფორმატირებას...');
        caption = applyBoldFormattingToZodiac(generatedContent.caption);
      } else if (request.postType === 'daily_horoscope_single') {
        addLog('🎨 ვიყენებ 1 ნიშნის ფორმატირებას...');
        caption = applyBoldFormattingToSingleSign(generatedContent.caption);
      } else if (request.postType === 'daily_tarot_card') {
        addLog('🎨 ვიყენებ ტაროს ფორმატირებას (HTML ბოლდით)...');
        caption = generatedContent.caption.replace(/&/g, '&amp;');
      } else {
        addLog('🎨 ვიყენებ სტანდარტულ HTML ექსკეიპ ფორმატირებას...');
        caption = generatedContent.caption
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      addLog(`✅ Formatted Caption (პირველი 200 სიმბოლო):\n${caption.substring(0, 200)}...`);

      const cleanCaption = caption.replace(/(?:\s*#\w+)+\s*$/, '').trim();
      const hashtags = generatedContent.hashtags || [];
      const hashtagsLine = hashtags.join(' ');
      caption = hashtagsLine ? `${cleanCaption}\n\n${hashtagsLine}` : cleanCaption;

      addLog(`📝 Final Caption Length: ${caption.length} characters`);

      if (caption.length > TELEGRAM_CAPTION_LIMIT) {
        addWarning(`⚠️ CRITICAL: Final caption length (${caption.length} chars) exceeds safe limit.`);
      } else {
        addLog('✅ Caption სიგრძე ნორმაშია.');
      }

      addLog('================================================');
      addLog('🖼️ ნაბიჯი 7: ვამუშავებ ფოტოს ლოგიკას...');
      addLog('================================================');
      
      if (request.postType === 'daily_horoscope_single') {
        const sign = (request.zodiacSign || 'Aries').toLowerCase().trim();
        const imageUrl = `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/telegram/zodiacsigns/${sign}.png`;
        addLog(`🖼️ Single Sign Horoscope: ვიყენებ წინასწარ ატვირთულ ფოტოს: ${sign}`);
        addLog(`🔗 Image URL: ${imageUrl}`);
        
        imageResult = {
          success: true,
          imageUrl: imageUrl,
          provider: 'static_zodiac_sign'
        } as ImgGenResult;
        imageProvider = 'static_zodiac_sign';
      } 
      else if (request.postType === 'daily_tarot_card' && selectedTarotCard) {
        const imageUrl = `${CLOUDFLARE_R2_BASE_URL}/tarot/${selectedTarotCard.filename}`;
        addLog(`🃏 ვიყენებ Cloudflare R2 სურათს: ${imageUrl}`);
        imageResult = {
          success: true,
          imageUrl: imageUrl,
          provider: 'cloudflare_r2_tarot'
        } as ImgGenResult;
        imageProvider = 'cloudflare_r2_tarot';
      }
      else if (!useAiImage && request.postType === 'daily_horoscope_12_signs') {
        addLog('🖼️ AI ფოტოს გენერაცია გამორთულია (Toggle OFF). ვიყენებ სარეზერვო სტატიკურ სურათს.');
        const randomImage = STATIC_ZODIAC_IMAGES[Math.floor(Math.random() * STATIC_ZODIAC_IMAGES.length)];
        addLog(`🎲 შემთხვევით შერჩეული სტატიკური სურათი: ${randomImage}`);
        
        imageResult = {
          success: true,
          imageUrl: randomImage,
          provider: 'static_fallback'
        } as ImgGenResult;
        imageProvider = 'static_fallback';
      }
      else if (!useAiImage) {
        addLog('🖼️ AI ფოტოს გენერაცია გამორთულია (Toggle OFF). ვაგზავნით მხოლოდ ტექსტს.');
        imageResult = null;
      } 
      else if (imagePrompt) {
        addLog('🤖 ვიწყებ AI ფოტოს გენერაციას...');
        addLog(`📝 Image Prompt: ${imagePrompt.slice(0, 120)}...`);

        try {
          const result = await imageGenerator.generateImage(imagePrompt, request.agentType);
          imageResult = result as ImgGenResult;

          if (imageResult.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
            imageProvider = imageResult.provider || 'unknown';
            addLog(`✅ ფოტო წარმატებით შეიქმნა: ${imageProvider}`);
          } else {
            imageError = imageResult.error || 'Image generation failed.';
            addWarning(`⚠️ ფოტოს გენერაცია ვერ მოხერხდა: ${imageError}`);
            imageResult = null;
          }

          if (result.generationLogs?.length) {
            generationLogs.push(...result.generationLogs);
          }
        } catch (error) {
          imageError = getErrorMessage(error);
          addWarning(`⚠️ ფოტოს გენერაციის შეცდომა: ${imageError}`);
          imageResult = null;
        }
      } else {
        addWarning('⚠️ image_prompt არ არის. ვაგზავნით მხოლოდ ტექსტს.');
      }

      addLog('================================================');
      addLog('📤 ნაბიჯი 8: ვაქვეყნებ Telegram-ში...');
      addLog('================================================');
      
      const escapedCaption = caption; 

      let publishedMessageId: number | undefined;
      let publishedWithImage = false;

      if (imageResult?.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
        addLog('📸 ვცდილობ ფოტოს გამოქვეყნებას...');
        const captionChunks = splitTelegramText(escapedCaption, TELEGRAM_CAPTION_LIMIT);
        const photoCaption = captionChunks[0] || '';

        addLog(`📸 Photo Caption Length: ${photoCaption.length} characters`);
        
        let photoResult: TelegramPublishResult;
        
        try {
          photoResult = (await sendTelegramPhoto({
            caption: photoCaption,
            imageUrl: imageResult.imageUrl,
            imageBuffer: imageResult.imageBuffer as Buffer | undefined,
            parse_mode: 'HTML',
          })) as TelegramPublishResult;
        } catch (error) {
          photoResult = { success: false, error: getErrorMessage(error) };
        }

        if (photoResult.success) {
          publishedWithImage = true;
          publishedMessageId = photoResult.messageId;
          addLog('✅ ფოტო წარმატებით გამოქვეყნდა!');
          addLog(`📝 Message ID: ${publishedMessageId}`);

          const remainingChunks = captionChunks.slice(1);
          if (remainingChunks.length > 0) {
            addWarning(`⚠️ Caption აღემატება ლიმიტს. ვაგზავნი ${remainingChunks.length} დამატებით ტექსტურ ნაწილს.`);
            for (const chunk of remainingChunks) {
              try {
                const continuationResult = (await sendTelegramMessage({
                  text: chunk,
                  parse_mode: 'HTML',
                })) as TelegramPublishResult;

                if (!continuationResult.success) break;
              } catch (error) {
                break;
              }
            }
          }
        } else {
          imageError = photoResult.error || 'Telegram rejected the photo.';
          addWarning(`⚠️ ფოტოს პუბლიკაცია ვერ მოხერხდა. ვბრუნდებით ტექსტზე: ${imageError}`);
        }
      }

      if (!publishedWithImage) {
        addLog('📝 ვაქვეყნებ მხოლოდ ტექსტს...');
        const textChunks = splitTelegramText(escapedCaption, TELEGRAM_MESSAGE_LIMIT);

        if (textChunks.length === 0) {
          throw new Error('The generated Telegram caption is empty.');
        }

        addLog(`📦 ტექსტური ნაწილების რაოდენობა: ${textChunks.length}`);

        for (let index = 0; index < textChunks.length; index++) {
          const chunk = textChunks[index];
          let messageResult: TelegramPublishResult;

          try {
            messageResult = (await sendTelegramMessage({
              text: chunk,
              parse_mode: 'HTML',
            })) as TelegramPublishResult;
          } catch (error) {
            throw new Error(`Telegram message failed: ${getErrorMessage(error)}`);
          }

          if (!messageResult.success) {
            throw new Error(`Telegram message failed: ${messageResult.error || 'Unknown error'}`);
          }

          if (index === 0) {
            publishedMessageId = messageResult.messageId;
          }
          addLog(`✅ ტექსტური ნაწილი ${index + 1}/${textChunks.length} წარმატებით გამოქვეყნდა.`);
        }
      }

      addLog('================================================');
      addLog('💾 ნაბიჯი 9: ვინახავ Supabase-ში...');
      addLog('================================================');
      
      const { error: databaseError } = await supabase.from('published_content').insert({
        agent_type: request.agentType,
        post_type: request.postType,
        platform: 'telegram',
        content_text: caption,
        message_id: publishedMessageId,
        status: 'published',
        published_at: new Date().toISOString(),
      });

      if (databaseError) {
        addWarning(`⚠️ Supabase logging failed: ${databaseError.message}`);
      } else {
        addLog('✅ პუბლიკაცია წარმატებით ჩაიწერა Supabase-ში.');
      }

      addLog('================================================');
      addLog('🎉 გენერაცია და პუბლიკაცია წარმატებით დასრულდა!');
      addLog('================================================');

      return {
        success: true,
        messageId: publishedMessageId,
        caption,
        imageUrl: publishedWithImage ? imageResult?.imageUrl : undefined,
        hasImagePrompt: Boolean(imagePrompt),
        imageProvider: publishedWithImage ? imageProvider : 'none',
        imageError,
        generationLogs,
        warnings,
      };

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addLog('================================================');
      addLog(`❌ გენერაცია/პუბლიკაცია ვერ მოხერხდა: ${errorMessage}`);
      addLog('================================================');
      
      logError('Generation/publication workflow failed.', {
        agentType: request.agentType,
        postType: request.postType,
        error: errorMessage,
      });

      if (leaseId) {
        try {
          accessManager.revokeLease(leaseId, 'system_cleanup');
        } catch (leaseError) {
          logError('Failed to release access lease during error cleanup.', getErrorMessage(leaseError));
        }
      }

      generationLogs.push(`[${new Date().toISOString()}] ERROR: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        caption: caption || undefined,
        hasImagePrompt: Boolean(imagePrompt),
        imageProvider,
        imageError,
        generationLogs,
        warnings,
      };
    }
  }
}

export const telegramOrchestrator = new TelegramOrchestrator();