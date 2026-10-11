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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 60_000;
const ACCESS_LEASE_DURATION_SECONDS = 120;

// Telegram limits are measured after entity parsing.
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

/**
 * Escape generated text before sending it using Telegram HTML mode.
 */
function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Split HTML-escaped text into safe chunks.
 */
function splitTelegramText(text: string, maxLength: number): string[] {
  if (!text) {
    return [];
  }

  const tokens =
    text.match(/&(?:amp|lt|gt|quot|#39);|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) ?? [];

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

/**
 * Normalize and validate the AI-generated JSON response.
 */
function parseGeneratedContent(rawContent: unknown): GeneratedContent {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error('The AI returned an empty response.');
  }

  let normalized = rawContent.trim();

  // Handle accidental Markdown code fences.
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
 * Create the prompt from the agent configuration stored in Supabase.
 */
function buildUserPrompt(request: OrchestratorRequest): string {
  return `
Task: Create a high-quality Telegram post for the Lunara astrology brand.

Category: ${request.agentType}
Post type: ${request.postType}
Theme: ${request.contentTheme || 'Choose an appropriate theme for this category'}
Zodiac sign: ${request.zodiacSign || 'General / All signs'}

CONTENT REQUIREMENTS:
- Write an engaging, empathetic, natural-sounding post.
- Aim for 150-200 words when appropriate for the selected post type.
- Adapt the content to the specified category, theme and zodiac sign.
- Avoid repetitive, generic AI language.
- Do not present astrology or tarot as scientifically proven facts.
- Do not make guaranteed predictions or absolute claims about the future.
- Do not make medical, financial or other high-stakes promises.
- Include a clear, natural call to action where appropriate.
- Write the caption in the language specified by the agent configuration.
- Use relevant hashtags. Include #LUNARA where appropriate.

IMAGE REQUIREMENTS:
- Create a detailed English image-generation prompt.
- Use a consistent mystical, cosmic, dark-luxury visual identity.
- Prefer deep midnight tones, sophisticated lighting and elegant celestial imagery.
- Avoid clutter, excessive visual effects and generic stock-image aesthetics.
- Do not request text, lettering, logos or watermarks inside the image.
- Make the composition suitable for a Telegram social-media post.
- Adapt the visual subject to the actual post theme.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object.
Do not include Markdown fences or explanations.
Use exactly these three keys:
{
  "caption": "The complete post text",
  "image_prompt": "Detailed English visual-generation prompt",
  "hashtags": ["#LUNARA", "#RelevantHashtag"]
}

Ensure that all JSON strings are properly escaped.
`.trim();
}

// ============================================================
// TELEGRAM ORCHESTRATOR
// ============================================================

export class TelegramOrchestrator {
  /**
   * Generates content, optionally generates an image,
   * publishes the result to Telegram and records the publication.
   */
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
      // --------------------------------------------------------
      // 1. Validate the request
      // --------------------------------------------------------
      if (!request.agentType?.trim() || !request.postType?.trim()) {
        throw new Error('Both agentType and postType are required.');
      }

      // --------------------------------------------------------
      // 2. Load agent configuration
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
      // 3. Wait for the credential vault
      // --------------------------------------------------------
      addLog('Waiting for CredentialVault initialization...');
      await credentialVault.ready;
      addLog('CredentialVault is ready.');

      // --------------------------------------------------------
      // 4. Acquire temporary access to Groq
      // --------------------------------------------------------
      addLog('Requesting temporary Groq access lease...');

      leaseId = accessManager.requestAccess(
        `${request.agentType}-agent`,
        'groq',
        'spend',
        `Generate Telegram content for ${request.postType}`,
        null,
        ACCESS_LEASE_DURATION_SECONDS
      );

      if (!leaseId) {
        throw new Error('Could not acquire Groq access. Check AccessManager permissions and logs.');
      }

      addLog('Groq access lease acquired.');

      // --------------------------------------------------------
      // 5. Generate content with Groq
      // --------------------------------------------------------
      try {
        addLog('Retrieving Groq credentials from the vault...');

        const credential = credentialVault.getCredentialByProvider('groq', 'spend');

        if (!credential) {
          throw new Error('Groq credentials were not found. Add a valid credential in the API Vault.');
        }

        const apiKey = credentialVault.getDecryptedValue(credential.credential_id, `${request.agentType}-agent`);

        if (!apiKey) {
          throw new Error('Could not decrypt the Groq API key. Check vault permissions.');
        }

        const targetModel = credential.metadata?.recommendedModel || DEFAULT_GROQ_MODEL;

        addLog(`Using Groq model: ${targetModel}`);
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
          'OUTPUT FORMAT:',
          'Return only a valid JSON object with caption, image_prompt and hashtags.',
          'Never expose internal reasoning.',
        ].join('\n');

        const userPrompt = buildUserPrompt(request);

        addLog('Sending content-generation request to Groq...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, GROQ_TIMEOUT_MS);

        let response: Response;

        try {
          response = await fetch(GROQ_API_URL, {
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
              // NOTE: response_format is intentionally omitted to prevent Groq's strict 
              // server-side JSON validation from throwing 400 errors on minor formatting quirks.
              // Our parseGeneratedContent function safely handles Markdown fences and validation.
            }),
            signal: controller.signal,
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Groq request timed out after ${GROQ_TIMEOUT_MS / 1000} seconds.`);
          }
          throw new Error(`Could not connect to Groq: ${getErrorMessage(error)}`);
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorText = truncateError(await response.text().catch(() => 'No response body'));
          throw new Error(`Groq API returned HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content;

        addLog('Groq response received. Validating generated JSON...');

        const generatedContent = parseGeneratedContent(rawContent);

        caption = generatedContent.caption;
        imagePrompt = generatedContent.image_prompt || '';

        const hashtags = generatedContent.hashtags || [];
        const fullCaption = [caption, ...hashtags].filter(Boolean).join('\n\n');
        caption = fullCaption;

        addLog(`Content generated successfully. Caption length: ${caption.length} characters.`);

      } finally {
        // ------------------------------------------------------
        // 6. Always release the temporary access lease
        // ------------------------------------------------------
        if (leaseId) {
          addLog('Releasing Groq access lease...');
          try {
            accessManager.revokeLease(leaseId, 'system_cleanup');
            addLog('Groq access lease released.');
          } catch (leaseError) {
            addWarning(`Could not explicitly revoke the Groq lease: ${getErrorMessage(leaseError)}`);
          }
          leaseId = null;
        }
      }

      // --------------------------------------------------------
      // 7. Generate the image
      // --------------------------------------------------------
      if (imagePrompt) {
        addLog('Starting image generation...');
        addLog(`Image prompt preview: ${imagePrompt.slice(0, 120)}`);

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
      // 8. Prepare Telegram content
      // --------------------------------------------------------
      addLog('Preparing Telegram publication...');
      const escapedCaption = escapeTelegramHtml(caption);

      let publishedMessageId: number | undefined;
      let publishedWithImage = false;

      // --------------------------------------------------------
      // 9. Try publishing the image
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
            addLog(`Caption exceeds the photo limit. Sending ${remainingChunks.length} additional text chunk(s).`);
            for (const chunk of remainingChunks) {
              try {
                const continuationResult = (await sendTelegramMessage({
                  text: chunk,
                  parse_mode: 'HTML',
                })) as TelegramPublishResult;

                if (!continuationResult.success) {
                  addWarning(`Photo was published, but a caption continuation failed: ${continuationResult.error || 'Unknown error'}`);
                  break;
                }
              } catch (error) {
                addWarning(`Photo was published, but a caption continuation failed: ${getErrorMessage(error)}`);
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
      // 10. Text-only fallback
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
      // 11. Record publication in Supabase
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
      // 12. Return structured result to the caller
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

// ============================================================
// SINGLETON
// ============================================================

export const telegramOrchestrator = new TelegramOrchestrator();