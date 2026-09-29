// ============================================================
// LUNARA OS — E2E Test API Route (Deep Vault Diagnostics)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateWithProvider } from '@/services/credentials/providers/adapter';
import { sendTelegramMessage, sendTelegramPhoto } from '@/services/distribution/telegram';
import { credentialVault } from '@/services/credentials/credential-vault';
import { getInstruction } from '@/services/agents/agent-instructions';
import { generateImage } from '@/services/image/image-generator';

export interface E2ELog {
  step: number;
  agent: string;
  status: 'running' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  latency?: number;
  metadata?: Record<string, any>;
}

function extractPost(content: string): string {
  const postMatch = content.match(/<post>([\s\S]*?)<\/post>/i);
  if (postMatch) return postMatch[1].trim();
  const postStartMatch = content.match(/<post>([\s\S]*)/i);
  if (postStartMatch) return postStartMatch[1].trim();
  const afterThinkingMatch = content.match(/<\/thinking>([\s\S]*)/i);
  if (afterThinkingMatch) return afterThinkingMatch[1].trim();
  return content.trim();
}

function extractThinking(content: string): string | null {
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  return thinkingMatch ? thinkingMatch[1].trim() : null;
}

function extractVerdict(content: string): string {
  const verdictMatch = content.match(/<verdict>([\s\S]*?)<\/verdict>/i);
  return verdictMatch ? verdictMatch[1].trim() : content.trim();
}

function extractVisualConcept(content: string, fallbackText: string): string {
  const conceptMatch = content.match(/<visual_concept>([\s\S]*?)<\/visual_concept>/i);
  if (conceptMatch && conceptMatch[1].trim().length > 30) {
    return conceptMatch[1].trim();
  }
  
  const afterThinking = content.split(/<\/thinking>/i);
  if (afterThinking.length > 1) {
    const cleanRest = afterThinking[1].replace(/<\/?visual_concept>/gi, '').trim();
    if (cleanRest.length > 30) return cleanRest;
  }

  const firstSentence = fallbackText.split('.')[0] || fallbackText;
  return `A cinematic, dark luxury editorial photograph of: ${firstSentence}. Deep blacks, moody cinematic lighting, subtle gold accents, high contrast, premium feel, volumetric lighting, 8k resolution, masterpiece, photorealistic, no text, no watermarks, no logos.`;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const logs: E2ELog[] = [];
    const addLog = (step: number, agent: string, status: E2ELog['status'], message: string, latency?: number, metadata?: Record<string, any>) => {
      logs.push({ step, agent, status, message, timestamp: Date.now(), latency, metadata });
    };

    // 1. საუკეთესო API გასაღების პოვნა (ღრმა დიაგნოსტიკით)
    addLog(1, 'System', 'running', 'Finding best available API key...');
    
    console.log('[System] 🔄 Waiting for Credential Vault to initialize...');
    await credentialVault.ready;
    
    const credentials = credentialVault.getMetadata();
    console.log('[System] 🔍 TOTAL credentials found in Vault:', credentials.length);
    console.log('[System] 📋 Credentials data:', JSON.stringify(credentials, null, 2));
    
    const activeCredentials = credentials.filter(c => c.status === 'ACTIVE');
    console.log('[System] 🔍 ACTIVE credentials found:', activeCredentials.length);

    if (credentials.length === 0) {
      console.error('[System] ❌ Vault is completely empty! Check Supabase connection and RLS policies.');
      addLog(1, 'System', 'error', 'Vault is completely empty. Check Supabase connection and RLS policies.');
      return NextResponse.json({ logs });
    }

    if (activeCredentials.length === 0) {
      console.error('[System] ❌ No ACTIVE credentials found. All credentials might be REVOKED or PENDING.');
      addLog(1, 'System', 'error', `Found ${credentials.length} credentials, but NONE are ACTIVE. Check their status in the UI.`);
      return NextResponse.json({ logs });
    }
    
    const activeCred = activeCredentials.find(c => c.provider === 'groq') || activeCredentials[0];
    const modelName = activeCred.metadata?.recommendedModel || 'default-model';
    const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
    
    if (!apiKey) {
      console.error('[System] ❌ Failed to decrypt API key for:', activeCred.credential_id);
      addLog(1, 'System', 'error', `Failed to decrypt API key for ${activeCred.provider}. Check OS_ENCRYPTION_KEY in .env`);
      return NextResponse.json({ logs });
    }

    addLog(1, 'System', 'success', `Using ${activeCred.provider} (${modelName})`, undefined, {
      provider: activeCred.provider,
      model: modelName,
      credential_id: activeCred.credential_id.substring(0, 8) + '...'
    });

    // 2. Muse
    addLog(2, 'Muse', 'running', 'Generating content based on prompt...');
    const museSystemPrompt = await getInstruction('muse') || "You are Muse, Lunara OS Content Lead.";
    
    const generationStart = Date.now();
    const generation = await generateWithProvider(activeCred.provider, apiKey, modelName, prompt, museSystemPrompt);
    const generationLatency = Date.now() - generationStart;

    if (!generation.success) {
      addLog(2, 'Muse', 'error', `Generation failed: ${generation.error}`, generationLatency);
      return NextResponse.json({ logs });
    }
    
    const publishedContent = extractPost(generation.content);
    const museThinking = extractThinking(generation.content);
    
    addLog(2, 'Muse', 'success', `Content generated successfully (${publishedContent.length} chars)`, generationLatency, {
      content_preview: publishedContent.substring(0, 100) + '...',
      full_content: publishedContent,
      thinking_block: museThinking
    });

    // 3. Aegis
    addLog(3, 'Aegis', 'running', 'Checking content quality and brand fit...');
    const qaStart = Date.now();
    const aegisSystemPrompt = await getInstruction('aegis') || "You are Aegis, Lunara OS Quality Director.";
    
    const qaCheck = await generateWithProvider(
      activeCred.provider, apiKey, modelName, 
      `Evaluate this content:\n\n${publishedContent}`, 
      aegisSystemPrompt
    );
    const qaLatency = Date.now() - qaStart;
    
    const verdictContent = extractVerdict(qaCheck.content);
    const aegisThinking = extractThinking(qaCheck.content);
    const isApproved = verdictContent.toUpperCase().includes('APPROVED');

    addLog(3, 'Aegis', isApproved ? 'success' : 'warning', isApproved ? 'Content approved by QA' : 'QA suggested revisions, proceeding...', qaLatency, {
      verdict: isApproved ? 'approved' : 'revise',
      thinking_block: aegisThinking,
      full_verdict: verdictContent
    });

    // 3.5. Lumen
    addLog(3.5, 'Lumen', 'running', 'Generating visual concept and image...');
    const lumenStart = Date.now();
    
    const lumenSystemPrompt = await getInstruction('lumen') || "You are Lumen, Lunara OS Visual Director.";
    const lumenResponse = await generateWithProvider(
      activeCred.provider, apiKey, modelName,
      `Here is the approved Telegram post:\n\n${publishedContent}\n\nGenerate a visual concept for this post.`,
      lumenSystemPrompt
    );

    const visualConcept = extractVisualConcept(lumenResponse.content, publishedContent);
    const lumenThinking = extractThinking(lumenResponse.content);

    console.log('[Route] 🎨 Lumen visual concept used:', visualConcept.substring(0, 150) + '...');

    const imageResult = await generateImage({
      visualPrompt: visualConcept,
      width: 1024,
      height: 1024,
      style: 'dark-luxury'
    });

    const lumenLatency = Date.now() - lumenStart;

    if (imageResult.success) {
      addLog(3.5, 'Lumen', 'success', `Image generated successfully via ${imageResult.provider}`, lumenLatency, {
        visual_concept: visualConcept,
        thinking_block: lumenThinking,
        image_provider: imageResult.provider,
        image_model: imageResult.model || 'unknown'
      });
    } else {
      addLog(3.5, 'Lumen', 'warning', `Image generation failed, proceeding with text-only fallback`, lumenLatency, {
        error: imageResult.error,
        visual_concept: visualConcept
      });
    }

    // 4. Echo
    addLog(4, 'Echo', 'running', 'Sending to Telegram channel...');
    const telegramStart = Date.now();
    
    let tgResult;
    if (imageResult.success && imageResult.imageBuffer) {
      tgResult = await sendTelegramPhoto({
        imageBuffer: imageResult.imageBuffer,
        caption: publishedContent,
        parse_mode: 'Markdown'
      });
    } else {
      tgResult = await sendTelegramMessage({ 
        text: publishedContent, 
        parse_mode: 'Markdown' 
      });
    }
    
    const telegramLatency = Date.now() - telegramStart;
    
    if (tgResult.success) {
      addLog(4, 'Echo', 'success', `Published to Telegram! Message ID: ${tgResult.messageId}`, telegramLatency, {
        message_id: tgResult.messageId,
        channel_id: process.env.TELEGRAM_CHANNEL_ID,
        included_image: !!imageResult.success
      });
    } else {
      addLog(4, 'Echo', 'error', `Telegram failed: ${tgResult.error}`, telegramLatency, {
        error_details: tgResult.error
      });
    }

    // 5. საბოლოო სტატისტიკა
    const totalLatency = generationLatency + qaLatency + lumenLatency + telegramLatency;
    addLog(5, 'System', 'info', `E2E test completed in ${totalLatency}ms`, totalLatency, {
      total_steps: 5,
      successful_steps: logs.filter(l => l.status === 'success').length,
      failed_steps: logs.filter(l => l.status === 'error').length,
      warning_steps: logs.filter(l => l.status === 'warning').length
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: [{ step: 0, agent: 'System', status: 'error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() }]
    }, { status: 500 });
  }
}