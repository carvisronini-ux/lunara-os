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

  if (postType === 'daily_horoscope_12_signs') {
    const zodiacEmojis = ['', '♉', '♊', '', '♌', '♍', '', '♏', '♐', '', '♒', '♓'];
    const caption = data.caption as string;
    const missingEmojis = zodiacEmojis.filter(emoji => !caption.includes(emoji));
    
    if (missingEmojis.length > 0) {
      throw new Error(`The AI response is missing zodiac emojis. Caption must include all 12 zodiac signs (♈ to ♓).`);
    }
    
    if (caption.length < 300) {
      throw new Error(`The AI response is too short (${caption.length} chars). For 12-sign horoscope, caption must be at least 300 characters.`);
    }
  }

  if (postType === 'daily_horoscope_single') {
    const caption = data.caption as string;
    if (caption.length > 450) {
      throw new Error(`Single sign caption is too long (${caption.length} chars). Max 450 characters allowed.`);
    }
  }

  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(h => h.startsWith('#') ? h.trim() : `#${h.trim()}`)
    : [];

  return {
    caption: data.caption.trim(),
    image_prompt: typeof data.image_prompt === 'string' ? data.image_prompt.trim() : undefined,
    hashtags,
  };
}

function buildUserPrompt(request: OrchestratorRequest): string {
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

// ✅ საბოლოო ვერსია: ასწორებს ყველა ფორმატს და ასუფთავებს space-ებს
function applyBoldFormattingToSingleSign(rawCaption: string): string {
  let safeText = rawCaption
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const zodiacMap = [
    { name: 'Aries', emoji: '♈' }, { name: 'Taurus', emoji: '♉' },
    { name: 'Gemini', emoji: '♊' }, { name: 'Cancer', emoji: '' },
    { name: 'Leo', emoji: '♌' }, { name: 'Virgo', emoji: '♍' },
    { name: 'Libra', emoji: '♎' }, { name: 'Scorpio', emoji: '' },
    { name: 'Sagittarius', emoji: '♐' }, { name: 'Capricorn', emoji: '♑' },
    { name: 'Aquarius', emoji: '♒' }, { name: 'Pisces', emoji: '♓' }
  ];

  zodiacMap.forEach(({ name, emoji }) => {
    // 1. "♑ Capricorn:" ან "♑ **Capricorn**:" -> "♑ <b>Capricorn</b>:"
    const regex1 = new RegExp(`${emoji}\\s+\\*{0,2}${name}\\*{0,2}\\s*:`, 'gi');
    safeText = safeText.replace(regex1, `${emoji} <b>${name}</b>:`);
    
    // 2. "**Capricorn**:" -> "♑ <b>Capricorn</b>:"
    const regex2 = new RegExp(`\\*\\*${name}\\*\\*\\s*:`, 'gi');
    safeText = safeText.replace(regex2, `${emoji} <b>${name}</b>:`);
    
    // 3. "Capricorn:" (ხაზის დასაწყისში) -> "♑ <b>Capricorn</b>:"
    const regex3 = new RegExp(`(^|\\n)\\s*${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex3, `$1${emoji} <b>${name}</b>:`);
    
    // 4. "Capricorn, " (მძიმით) -> "♑ <b>Capricorn</b>: "
    const regex4 = new RegExp(`(^|\\n)\\s*${name}\\s*,`, 'gi');
    safeText = safeText.replace(regex4, `$1${emoji} <b>${name}</b>: `);
    
    // 5. "♑Capricorn:" (space-ის გარეშე) -> "♑ <b>Capricorn</b>:"
    const regex5 = new RegExp(`${emoji}${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex5, `${emoji} <b>${name}</b>:`);
  });

  // ✅ ვშლით ზედმეტ ემოჯებს ხაზის ბოლოში
  safeText = safeText.replace(/[♈♉♊♌♍♎♏♐♑♒♓]\uFE0F?\s*$/gm, '');

  // ✅ ვშლით ყველა ზედმეტ space-ს colon-ის შემდეგ (2 ან მეტი space -> 1 space)
  safeText = safeText.replace(/:\s{2,}/g, ': ');

  // ✅ ვშლით ზედმეტ space-ებს ხაზის დასაწყისში
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
    { name: 'Leo', emoji: '' }, { name: 'Virgo', emoji: '♍' },
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

  // ✅ ვშლით ედმეტ space-ებს colon-ის შემდეგ
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
    addLog(` Content Theme: ${request.contentTheme || 'Automatic'}`);
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

      addLog('📥 ნაბიჯი 2: ვიტვირთავ დავალების სპეციფიკურ ინსტრუქციებს...');
      let jobImageLogic = '';
      let useAiImage = true; 
      
      const { data: jobData, error: jobError } = await supabase
        .from('agent_jobs')
        .select('image_prompt_logic, use_ai_image')
        .eq('agent_type', request.agentType)
        .eq('post_type', request.postType)
        .single();

      if (jobError && jobError.code !== 'PGRST116') {
        addWarning(`⚠️ დავალების ინსტრუქციის წაკითხვის შეცდომა: ${jobError.message}`);
      }

      if (jobData) {
        jobImageLogic = jobData.image_prompt_logic || '';
        useAiImage = jobData.use_ai_image ?? true;
        addLog(`✅ დავალების ინსტრუქცია წაიკითხა: ${request.postType}`);
        addLog(`🔘 AI Image Toggle: ${useAiImage ? 'ON' : 'OFF'}`);
        addLog(`📝 Image Prompt Logic Length: ${jobImageLogic.length} characters`);
      } else {
        addLog(`⚠️ დავალების ინსტრუქცია ვერ მოიძებნა ${request.postType}-ისთვის.`);
      }

      addLog('⏳ ნაბიჯი 3: ველოდები CredentialVault-ის ინიციალიზაციას...');
      await credentialVault.ready;
      addLog('✅ CredentialVault მზადაა.');

      if (request.postType === 'daily_horoscope_single') {
        addLog('🎯 ნაბიჯი 4: ვამოწმებ ზოდიაქოს ნიშანს...');
        const validSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
        let targetSign = (request.zodiacSign || '').toLowerCase().trim();

        if (!targetSign || !validSigns.includes(targetSign) || targetSign === 'general') {
          targetSign = validSigns[Math.floor(Math.random() * validSigns.length)];
          addLog(`️ Zodiac sign missing/invalid in schedule. Randomly selected: ${targetSign}`);
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
            'THINKING STYLE:',
            config.thinking_style || 'Use clear, structured reasoning internally.',
            '',
            'SKILLS & CONSTRAINTS:',
            config.skills_constraints || 'Follow the agent instructions.',
            '',
            'JOB-SPECIFIC IMAGE INSTRUCTIONS:',
            jobImageLogic || 'Follow general LUNARA visual guidelines.',
            '',
            'OUTPUT FORMAT:',
            'Return only a valid JSON object with caption, image_prompt and hashtags.',
          ].join('\n');

          addLog(`📄 სისტემური პრომპტის სიგრძე: ${systemPrompt.length} სიმბოლო`);

          addLog(' ვაგებ მომხმარებლის პრომპტს...');
          const userPrompt = buildUserPrompt(request);
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

          addLog(' ვამოწმებ ვალიდაციას...');
          generatedContent = parseGeneratedContent(rawContent, request.postType);
          addLog('✅ ვალიდაცია წარმატებით გაიარა!');
          addLog(`📝 Caption Length: ${generatedContent.caption.length} characters`);
          addLog(`📝 Hashtags Count: ${generatedContent.hashtags?.length || 0}`);
          
          textGenerationSuccess = true;
          addLog('✅ ტექსტის გენერაცია წარმატებით დასრულდა!');

        } catch (error: any) {
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
        throw new Error('All available chat models failed to generate content.');
      }

      addLog('================================================');
      addLog(' ნაბიჯი 6: ვაფორმატებ caption-ს...');
      addLog('================================================');
      
      addLog(` Raw Caption (პირველი 200 სიმბოლო):\n${generatedContent.caption.substring(0, 200)}...`);
      
      imagePrompt = generatedContent.image_prompt || '';
      
      if (request.postType === 'daily_horoscope_12_signs') {
        addLog('🎨 ვიყენებ 12 ნიშნის ფორმატირებას...');
        caption = applyBoldFormattingToZodiac(generatedContent.caption);
      } else if (request.postType === 'daily_horoscope_single') {
        addLog('🎨 ვიყენებ 1 ნიშნის ფორმატირებას...');
        caption = applyBoldFormattingToSingleSign(generatedContent.caption);
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
      addLog('️ ნაბიჯი 7: ვამუშავებ ფოტოს ოგიკას...');
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
      else if (!useAiImage && request.postType === 'daily_horoscope_12_signs') {
        addLog('️ AI ფოტოს გენერაცია გამორთულია (Toggle OFF). ვიყენებ სარეზერვო სტატიკურ სურათს.');
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
        addWarning('️ image_prompt არ არის. ვაგზავნით მხოლოდ ტექსტს.');
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
          addLog(` Message ID: ${publishedMessageId}`);

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
          addWarning(`️ ფოტოს პუბლიკაცია ვერ მოხერხდა. ვბრუნდებით ტექსტზე: ${imageError}`);
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