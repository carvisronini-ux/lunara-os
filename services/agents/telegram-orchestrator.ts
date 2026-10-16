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

  // ✅ ვალიდაცია 12 ნიშნისთვის
  if (postType === 'daily_horoscope_12_signs') {
    const zodiacEmojis = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
    const caption = data.caption as string;
    const missingEmojis = zodiacEmojis.filter(emoji => !caption.includes(emoji));
    
    if (missingEmojis.length > 0) {
      throw new Error(`The AI response is missing zodiac emojis. Caption must include all 12 zodiac signs (♈ to ♓).`);
    }
    
    if (caption.length < 300) {
      throw new Error(`The AI response is too short (${caption.length} chars). For 12-sign horoscope, caption must be at least 300 characters.`);
    }
  }

  // ✅ ვალიდაცია 1 ნიშნისთვის (გამარტივებული და საიმედო)
  if (postType === 'daily_horoscope_single') {
    const caption = data.caption as string;
    const trimmedCaption = caption.trim();
    const zodiacEmojisRegex = /^[♈♉♊♋♌♍♎♏♐♑♒♓]/;
    
    // 1. უნდა იწყებოდეს ზოდიაქოს ემოჯით
    if (!zodiacEmojisRegex.test(trimmedCaption)) {
      throw new Error(`Single sign caption MUST start with a zodiac emoji. Got: "${trimmedCaption.substring(0, 30)}..."`);
    }

    // 2. სიგრძის შეზღუდვა
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
Request Parameters:
- Agent Type: ${request.agentType}
- Post Type: ${request.postType}
- Content Theme: ${request.contentTheme || 'Automatic'}
- Zodiac Sign: ${request.zodiacSign || 'General / All signs'}

Generate the content strictly following the system instructions provided above.
`.trim();
}

// ✅ საბოლოო, 100%-იანი გამოსავალი: შლის ემოჯს + უხილავ Variation Selector-ს (\uFE0F) ხაზის ბოლოში
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

  return safeText.trim();
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
    // ეს რეგექსი იღებს როგორც "♐ Sagittarius:", ისე "♐ **Sagittarius**:" და აკეთებს ბოლდს
    const regex1 = new RegExp(`${emoji}\\s+\\*{0,2}${name}\\*{0,2}\\s*:`, 'gi');
    safeText = safeText.replace(regex1, `${emoji} <b>${name}</b>:`);
    
    const regex2 = new RegExp(`\\*\\*${name}\\*\\*\\s*:`, 'gi');
    safeText = safeText.replace(regex2, `${emoji} <b>${name}</b>:`);
    
    const regex3 = new RegExp(`(^|\\n)\\s*${name}\\s*:`, 'gi');
    safeText = safeText.replace(regex3, `$1${emoji} <b>${name}</b>:`);
  });

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
    addLog(`Starting generation: ${request.agentType} / ${request.postType}`);
    addLog(`Theme: ${request.contentTheme || 'Automatic'}`);
    addLog(`Zodiac sign: ${request.zodiacSign || 'General'}`);

    try {
      if (!request.agentType?.trim() || !request.postType?.trim()) {
        throw new Error('Both agentType and postType are required.');
      }

      addLog('Loading agent configuration from Supabase...');
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

      addLog('Agent configuration loaded successfully.');

      addLog('Loading job-specific instructions from agent_jobs...');
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
        addLog(`✅ დავალების ინსტრუქცია წაიკითხა: ${request.postType} (AI Image: ${useAiImage ? 'ON' : 'OFF'})`);
      } else {
        addLog(`⚠️ დავალების ინსტრუქცია ვერ მოიძებნა ${request.postType}-ისთვის.`);
      }

      addLog('Waiting for CredentialVault initialization...');
      await credentialVault.ready;
      addLog('CredentialVault is ready.');

      if (request.postType === 'daily_horoscope_single') {
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

      // ============================================================
      // ✅ 5. DYNAMIC CHAT MODEL SELECTION & SELF-HEALING LOOP
      // ============================================================
      let chatModelInfo = await getBestAvailableModel('chat');
      let chatAttempts = 0;
      const maxChatAttempts = 3;
      let textGenerationSuccess = false;
      let generatedContent: GeneratedContent | null = null;

      addLog(`🔍 DEBUG: Initial chatModelInfo is ${chatModelInfo ? chatModelInfo.modelName : 'NULL'}`);

      while (chatAttempts < maxChatAttempts && !textGenerationSuccess) {
        if (!chatModelInfo) {
          throw new Error('No chat models available in the vault.');
        }

        const currentProvider = chatModelInfo.provider;
        const currentModelName = chatModelInfo.modelName;
        const currentCredentialId = chatModelInfo.credentialId;

        addLog(`🔄 [ცდა ${chatAttempts + 1}/${maxChatAttempts}] ვცდილობთ ტექსტის გენერაციას: ${currentProvider} -> ${currentModelName}`);

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
          const systemPrompt = [
            config.master_prompt,
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

          const userPrompt = buildUserPrompt(request);
          addLog('Sending content-generation request...');

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

          if (currentProvider === 'cloudflare') {
            rawContent = data?.result?.response;
          } else if (currentProvider === 'gemini' || currentProvider === 'google') {
            rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          } else {
            rawContent = data?.choices?.[0]?.message?.content;
          }

          addLog('Response received. Validating generated JSON...');
          
          if (!rawContent) {
            throw new Error(`მოდელმა დააბრუნა ცარიელი პასუხი. JSON: ${JSON.stringify(data).substring(0, 150)}`);
          }

          generatedContent = parseGeneratedContent(rawContent, request.postType);
          textGenerationSuccess = true;

        } catch (error: any) {
          addLog(`🔍 DEBUG CATCH: Error caught for ${currentModelName}. Message: ${error.message}`);
          if (rawContent) {
            addLog(`🔍 DEBUG RAW: AI-ის ნედლი პასუხი (პირველი 400 სიმბოლო): ${rawContent.substring(0, 400)}...`);
          } else {
            addLog(`🔍 DEBUG RAW: rawContent is undefined or empty.`);
          }
          
          addLog(`⚠️ მოდელმა "${currentModelName}" ვერ დააკმაყოფილა მოთხოვნა. ვცდილობთ შემდეგ საუკეთესო მოდელს...`);
          
          const nextModel = await getBestAvailableModel('chat', currentModelName);
          if (!nextModel) {
             addLog(`❌ DEBUG: No more models available in the vault after ${currentModelName}!`);
          }
          chatModelInfo = nextModel;
          chatAttempts++;
          continue;
        } finally {
          if (leaseId) {
            addLog(`Releasing ${currentProvider} access lease...`);
            try {
              accessManager.revokeLease(leaseId, 'system_cleanup');
              addLog('Access lease released.');
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

      imagePrompt = generatedContent.image_prompt || '';
      if (request.postType === 'daily_horoscope_12_signs') {
        caption = applyBoldFormattingToZodiac(generatedContent.caption);
      } else if (request.postType === 'daily_horoscope_single') {
        caption = applyBoldFormattingToSingleSign(generatedContent.caption);
      } else {
        caption = generatedContent.caption
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      const cleanCaption = caption.replace(/(?:\s*#\w+)+\s*$/, '').trim();
      const hashtags = generatedContent.hashtags || [];
      const hashtagsLine = hashtags.join(' ');
      caption = hashtagsLine ? `${cleanCaption}\n\n${hashtagsLine}` : cleanCaption;

      if (caption.length > TELEGRAM_CAPTION_LIMIT) {
        addWarning(`CRITICAL: Final caption length (${caption.length} chars) exceeds safe limit.`);
      } else {
        addLog(`Content generated successfully. Final caption length: ${caption.length} characters.`);
      }

      if (request.postType === 'daily_horoscope_single') {
        const sign = (request.zodiacSign || 'Aries').toLowerCase().trim();
        const imageUrl = `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/telegram/zodiacsigns/${sign}.png`;
        addLog(`🖼️ Single Sign Horoscope: ვიყენებთ წინასწარ ატვირთულ ფოტოს: ${sign}`);
        
        imageResult = {
          success: true,
          imageUrl: imageUrl,
          provider: 'static_zodiac_sign'
        } as ImgGenResult;
        imageProvider = 'static_zodiac_sign';
      } 
      else if (!useAiImage && request.postType === 'daily_horoscope_12_signs') {
        addLog('🖼️ AI ფოტოს გენერაცია გამორთულია (Toggle OFF). ვიყენებთ სარეზერვო სტატიკურ სურათს.');
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
        addLog('🖼️ AI ფოტოს გენერაცია გამორთულია ამ დავალებისთვის (Toggle OFF). ვაგზავნით მხოლოდ ტექსტს.');
        imageResult = null;
      } 
      else if (imagePrompt) {
        addLog('🤖 ვიწყებთ AI ფოტოს გენერაციას...');
        addLog(`Image prompt preview: ${imagePrompt.slice(0, 120)}...`);

        try {
          const result = await imageGenerator.generateImage(imagePrompt, request.agentType);
          imageResult = result as ImgGenResult;

          if (imageResult.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
            imageProvider = imageResult.provider || 'unknown';
            addLog(`Image generated successfully using ${imageProvider}.`);
          } else {
            imageError = imageResult.error || 'Image generation failed.';
            addWarning(`Image generation failed: ${imageError}`);
            imageResult = null;
          }

          if (result.generationLogs?.length) {
            generationLogs.push(...result.generationLogs);
          }
        } catch (error) {
          imageError = getErrorMessage(error);
          addWarning(`Image generation threw an exception: ${imageError}`);
          imageResult = null;
        }
      } else {
        addWarning('No image_prompt was generated. Publishing text only.');
      }

      addLog('Preparing Telegram publication...');
      const escapedCaption = caption; 

      let publishedMessageId: number | undefined;
      let publishedWithImage = false;

      if (imageResult?.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
        const captionChunks = splitTelegramText(escapedCaption, TELEGRAM_CAPTION_LIMIT);
        const photoCaption = captionChunks[0] || '';

        addLog('Attempting to publish a photo to Telegram...');
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
          addLog('Photo published successfully.');

          const remainingChunks = captionChunks.slice(1);
          if (remainingChunks.length > 0) {
            addWarning(`Caption exceeds limit. Sending ${remainingChunks.length} additional text chunk(s).`);
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
          addWarning(`Photo publication failed. Falling back to text: ${imageError}`);
        }
      }

      if (!publishedWithImage) {
        addLog('Publishing Telegram text message(s)...');
        const textChunks = splitTelegramText(escapedCaption, TELEGRAM_MESSAGE_LIMIT);

        if (textChunks.length === 0) {
          throw new Error('The generated Telegram caption is empty.');
        }

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
          addLog(`Text message ${index + 1}/${textChunks.length} published successfully.`);
        }
      }

      addLog('Recording publication in Supabase...');
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
        addWarning(`Supabase logging failed: ${databaseError.message}`);
      } else {
        addLog('Publication recorded successfully.');
      }

      addLog('Generation and publication workflow completed.');
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