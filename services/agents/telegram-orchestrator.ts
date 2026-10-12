// /home/carvisronini-ux/lunara-os/services/agents/telegram-orchestrator.ts

import { supabase } from '@/lib/supabase';
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';
import {
  sendTelegramMessage,
  sendTelegramPhoto,
} from '../distribution/telegram';
import { imageGenerator, type ImageGenerationResult as ImgGenResult } from './image-generator';

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

const DEFAULT_TEXT_PROVIDER = 'groq'; 
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'; 
const GROQ_TIMEOUT_MS = 60_000;
const ACCESS_LEASE_DURATION_SECONDS = 120;

const TELEGRAM_MESSAGE_LIMIT = 3_800;
const TELEGRAM_CAPTION_LIMIT = 950; 
const MAX_ERROR_LENGTH = 1_500;

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

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function parseGeneratedContent(rawContent: unknown): GeneratedContent {
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

  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  return {
    caption: data.caption.trim(),
    image_prompt: typeof data.image_prompt === 'string' ? data.image_prompt.trim() : undefined,
    hashtags,
  };
}

/**
 * ✅ მხოლოდ დინამიური პარამეტრების გადაცემა.
 * ყველა სტატიკური წესი, სტილი და შეზღუდვა მოდის Supabase-დან (systemPrompt).
 */
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

      // --------------------------------------------------------
      // 1. Load agent configuration from Supabase
      // --------------------------------------------------------
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

      // --------------------------------------------------------
      // 2. Load Job-Specific Instructions
      // --------------------------------------------------------
      addLog('Loading job-specific instructions from agent_jobs...');
      let jobImageLogic = '';
      
      const { data: jobData, error: jobError } = await supabase
        .from('agent_jobs')
        .select('image_prompt_logic')
        .eq('agent_type', request.agentType)
        .eq('post_type', request.postType)
        .single();

      if (jobError && jobError.code !== 'PGRST116') {
        addWarning(`⚠️ დავალების ინსტრუქციის წაკითხვის შეცდომა: ${jobError.message}`);
      }

      if (jobData?.image_prompt_logic) {
        jobImageLogic = jobData.image_prompt_logic;
        addLog(`✅ დავალების ინსტრუქცია წაიკითხა: ${request.postType}`);
      } else {
        addLog(`⚠️ დავალების ინსტრუქცია ვერ მოიძებნა ${request.postType}-ისთვის. გამოიყენება ზოგადი წესები.`);
      }

      // --------------------------------------------------------
      // 3. Wait for Credential Vault
      // --------------------------------------------------------
      addLog('Waiting for CredentialVault initialization...');
      await credentialVault.ready;
      addLog('CredentialVault is ready.');

      // --------------------------------------------------------
      // 4. Acquire temporary access lease for Text Generation
      // --------------------------------------------------------
      addLog(`Requesting temporary access lease for ${DEFAULT_TEXT_PROVIDER}...`);
      leaseId = accessManager.requestAccess(
        `${request.agentType}-agent`,
        DEFAULT_TEXT_PROVIDER,
        'spend',
        `Generate Telegram content for ${request.postType}`,
        null,
        ACCESS_LEASE_DURATION_SECONDS
      );

      if (!leaseId) {
        throw new Error(`Could not acquire ${DEFAULT_TEXT_PROVIDER} access. Check AccessManager permissions.`);
      }
      addLog(`${DEFAULT_TEXT_PROVIDER} access lease acquired.`);

      try {
        addLog(`Retrieving ${DEFAULT_TEXT_PROVIDER} credentials from the vault...`);
        const credential = credentialVault.getCredentialByProvider(DEFAULT_TEXT_PROVIDER as any, 'spend');

        if (!credential) {
          throw new Error(`${DEFAULT_TEXT_PROVIDER} credentials were not found. Add a valid credential in the API Vault.`);
        }

        const apiKey = credentialVault.getDecryptedValue(credential.credential_id, `${request.agentType}-agent`);
        if (!apiKey) {
          throw new Error(`Could not decrypt the ${DEFAULT_TEXT_PROVIDER} API key. Check vault permissions.`);
        }

        const targetModel = credential.metadata?.recommendedModel || DEFAULT_GROQ_MODEL;
        addLog(`Using model: ${targetModel} (from metadata or fallback)`);
        addLog('Building generation prompts...');

        const systemPrompt = [
          config.master_prompt,
          '',
          'THINKING STYLE:',
          config.thinking_style || 'Use clear, structured reasoning internally.',
          '',
          'SKILLS & CONSTRAINTS:',
          config.skills_constraints || 'Follow the agent instructions and brand guidelines.',
          '',
          'JOB-SPECIFIC IMAGE INSTRUCTIONS:',
          jobImageLogic || 'Follow general LUNARA visual guidelines.',
          '',
          'OUTPUT FORMAT:',
          'Return only a valid JSON object with caption, image_prompt and hashtags.',
          'Never expose internal reasoning.',
        ].join('\n');

        const userPrompt = buildUserPrompt(request);
        
        addLog('Sending content-generation request...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => { controller.abort(); }, GROQ_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.7
            }),
            signal: controller.signal,
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${GROQ_TIMEOUT_MS / 1000} seconds.`);
          }
          throw new Error(`Could not connect to provider: ${getErrorMessage(error)}`);
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorText = truncateError(await response.text().catch(() => 'No response body'));
          throw new Error(`API returned HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content;

        addLog('Response received. Validating generated JSON...');
        const generatedContent = parseGeneratedContent(rawContent);

        caption = generatedContent.caption;
        imagePrompt = generatedContent.image_prompt || '';

        // ✅ AUTO-FORMAT: Ensure zodiac signs have emojis and bold formatting
        if (request.postType === 'daily_horoscope_12_signs') {
          const zodiacMap = [
            { name: 'Aries', emoji: '♈' }, { name: 'Taurus', emoji: '♉' },
            { name: 'Gemini', emoji: '♊' }, { name: 'Cancer', emoji: '♋' },
            { name: 'Leo', emoji: '♌' }, { name: 'Virgo', emoji: '♍' },
            { name: 'Libra', emoji: '♎' }, { name: 'Scorpio', emoji: '♏' },
            { name: 'Sagittarius', emoji: '♐' }, { name: 'Capricorn', emoji: '♑' },
            { name: 'Aquarius', emoji: '♒' }, { name: 'Pisces', emoji: '♓' }
          ];

          zodiacMap.forEach(({ name, emoji }) => {
            // Match the sign name followed by a colon, with optional existing emoji or asterisks
            const regex = new RegExp(`(^|\\n)\\s*(?:${emoji}\\s*)?\\*{0,2}${name}\\*{0,2}\\s*:`, 'gi');
            caption = caption.replace(regex, `$1${emoji} **${name}**:`);
          });

          // Remove trailing emojis or random symbols at the very end of the caption (preserve hashtags)
          caption = caption.replace(/(\s*[^\w\s#]+\s*)+$/, '').trim();
        }

        // ✅ HASHTAG DEDUPLICATION & FORMATTING
        const cleanCaption = caption.replace(/(?:\s*#\w+)+\s*$/, '').trim();
        const hashtags = generatedContent.hashtags || [];
        const hashtagsLine = hashtags.join(' ');
        const fullCaption = hashtagsLine ? `${cleanCaption}\n\n${hashtagsLine}` : cleanCaption;
        caption = fullCaption;

        // ✅ CRITICAL LENGTH CHECK
        if (caption.length > TELEGRAM_CAPTION_LIMIT) {
          addWarning(`CRITICAL: Final caption length (${caption.length} chars) exceeds safe limit (${TELEGRAM_CAPTION_LIMIT}). It may be split.`);
        } else {
          addLog(`Content generated successfully. Final caption length: ${caption.length} characters.`);
        }

      } finally {
        // ------------------------------------------------------
        // 5. Always release the temporary access lease
        // ------------------------------------------------------
        if (leaseId) {
          addLog(`Releasing ${DEFAULT_TEXT_PROVIDER} access lease...`);
          try {
            accessManager.revokeLease(leaseId, 'system_cleanup');
            addLog('Access lease released.');
          } catch (leaseError) {
            addWarning(`Could not explicitly revoke the lease: ${getErrorMessage(leaseError)}`);
          }
          leaseId = null;
        }
      }

      // --------------------------------------------------------
      // 6. Generate the image
      // --------------------------------------------------------
      if (imagePrompt) {
        addLog('Starting image generation...');
        addLog(`Image prompt preview: ${imagePrompt.slice(0, 120)}...`);

        try {
          const result = await imageGenerator.generateImage(imagePrompt, request.agentType);
          imageResult = result as ImgGenResult;

          if (imageResult.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
            imageProvider = imageResult.provider || 'unknown';
            addLog(`Image generated successfully using ${imageProvider}.`);
          } else {
            imageError = imageResult.error || 'Image generation failed or returned no image.';
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

      // --------------------------------------------------------
      // 7. Prepare Telegram content
      // --------------------------------------------------------
      addLog('Preparing Telegram publication...');
      const escapedCaption = escapeTelegramHtml(caption);

      let publishedMessageId: number | undefined;
      let publishedWithImage = false;

      // --------------------------------------------------------
      // 8. Try publishing the image
      // --------------------------------------------------------
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
            addWarning(`Caption exceeds the photo limit (${TELEGRAM_CAPTION_LIMIT}). Sending ${remainingChunks.length} additional text chunk(s).`);
            for (const chunk of remainingChunks) {
              try {
                const continuationResult = (await sendTelegramMessage({
                  text: chunk,
                  parse_mode: 'HTML',
                })) as TelegramPublishResult;

                if (!continuationResult.success) {
                  addWarning(`Caption continuation failed: ${continuationResult.error || 'Unknown error'}`);
                  break;
                }
              } catch (error) {
                addWarning(`Caption continuation failed: ${getErrorMessage(error)}`);
                break;
              }
            }
          }
        } else {
          imageError = photoResult.error || 'Telegram rejected the photo publication.';
          addWarning(`Photo publication failed. Falling back to text: ${imageError}`);
        }
      }

      // --------------------------------------------------------
      // 9. Text-only fallback
      // --------------------------------------------------------
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
            throw new Error(`Telegram message ${index + 1}/${textChunks.length} failed: ${getErrorMessage(error)}`);
          }

          if (!messageResult.success) {
            throw new Error(`Telegram message ${index + 1}/${textChunks.length} failed: ${messageResult.error || 'Unknown Telegram error'}`);
          }

          if (index === 0) {
            publishedMessageId = messageResult.messageId;
          }
          addLog(`Text message ${index + 1}/${textChunks.length} published successfully.`);
        }
      }

      // --------------------------------------------------------
      // 10. Record publication in Supabase
      // --------------------------------------------------------
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
        addWarning(`Telegram publication succeeded, but Supabase logging failed: ${databaseError.message}`);
      } else {
        addLog('Publication recorded successfully.');
      }

      // --------------------------------------------------------
      // 11. Return structured result
      // --------------------------------------------------------
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