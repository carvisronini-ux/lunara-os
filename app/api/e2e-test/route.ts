// ============================================================
// LUNARA OS — E2E Test API Route (Server-Side)
// Foundation: §56 (First True E2E Test), §40 (Secrets)
// Purpose: Execute E2E test pipeline server-side with access to env vars
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateWithProvider } from '@/services/credentials/providers/adapter';
import { sendTelegramMessage } from '@/services/distribution/telegram';
import { credentialVault } from '@/services/credentials/credential-vault';

export interface E2ELog {
  step: number;
  agent: string;
  status: 'running' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  latency?: number;
  metadata?: Record<string, any>;
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

    // 1. საუკეთესო API გასაღების პოვნა
    addLog(1, 'System', 'running', 'Finding best available API key...');
    const credentials = credentialVault.getMetadata();
    const activeCred = credentials.find(c => c.status === 'ACTIVE' && c.provider === 'groq') || 
                       credentials.find(c => c.status === 'ACTIVE');
    
    if (!activeCred) {
      addLog(1, 'System', 'error', 'No active credentials found in Vault!');
      return NextResponse.json({ logs });
    }
    
    const modelName = activeCred.metadata?.recommendedModel || '';
    addLog(1, 'System', 'success', `Using ${activeCred.provider} (${modelName || 'default model'})`, undefined, {
      provider: activeCred.provider,
      model: modelName,
      credential_id: activeCred.credential_id
    });

    // 2. Muse: კონტენტის გენერაცია
    addLog(2, 'Muse', 'running', 'Generating content based on prompt...');
    const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
    
    if (!apiKey) {
      addLog(2, 'Muse', 'error', 'Failed to retrieve API key from Vault');
      return NextResponse.json({ logs });
    }

    const museSystemPrompt = "You are Muse, Lunara OS Content Lead. Write a short, mysterious, and engaging Telegram post. Use emojis, keep it concise, and follow Dark Luxury / Cosmic Editorial style. No generic AI clichés.";
    
    const generationStart = Date.now();
    const generation = await generateWithProvider(
      activeCred.provider, 
      apiKey, 
      modelName, 
      prompt, 
      museSystemPrompt
    );
    const generationLatency = Date.now() - generationStart;

    if (!generation.success) {
      addLog(2, 'Muse', 'error', `Generation failed: ${generation.error}`, generationLatency);
      return NextResponse.json({ logs });
    }
    
    addLog(2, 'Muse', 'success', `Content generated successfully (${generation.content.length} chars)`, generationLatency, {
      content_preview: generation.content.substring(0, 100) + '...',
      full_content: generation.content,
      model: generation.model,
      provider: generation.provider
    });

    // 3. Aegis: ხარისხის შემოწმება (QA)
    addLog(3, 'Aegis', 'running', 'Checking content quality and brand fit...');
    
    const qaStart = Date.now();
    const qaPrompt = `Review this text for brand fit, originality and quality. Reply ONLY with "APPROVED" or "REJECTED":\n\n${generation.content}`;
    const qaCheck = await generateWithProvider(
      activeCred.provider, 
      apiKey, 
      modelName, 
      qaPrompt, 
      "You are Aegis, Lunara OS Quality Director. Be strict but fair."
    );
    const qaLatency = Date.now() - qaStart;
    
    const isApproved = qaCheck.content?.toUpperCase().includes('APPROVED');
    if (isApproved) {
      addLog(3, 'Aegis', 'success', 'Content approved by QA', qaLatency, {
        verdict: 'approved',
        qa_response: qaCheck.content
      });
    } else {
      addLog(3, 'Aegis', 'warning', 'QA suggested revisions, but proceeding for E2E test...', qaLatency, {
        verdict: 'revise',
        qa_response: qaCheck.content
      });
    }

    // 4. Echo: Telegram-ზე გამოქვეყნება
    addLog(4, 'Echo', 'running', 'Sending to Telegram channel...');
    
    const telegramStart = Date.now();
    const tgResult = await sendTelegramMessage({ 
      text: generation.content, 
      parse_mode: 'Markdown' 
    });
    const telegramLatency = Date.now() - telegramStart;
    
    if (tgResult.success) {
      addLog(4, 'Echo', 'success', `Published to Telegram! Message ID: ${tgResult.messageId}`, telegramLatency, {
        message_id: tgResult.messageId,
        channel_id: process.env.TELEGRAM_CHANNEL_ID
      });
    } else {
      addLog(4, 'Echo', 'error', `Telegram failed: ${tgResult.error}`, telegramLatency, {
        error: tgResult.error,
        bot_token_configured: !!process.env.TELEGRAM_BOT_TOKEN,
        channel_id_configured: !!process.env.TELEGRAM_CHANNEL_ID
      });
    }

    // 5. საბოლოო სტატისტიკა
    const totalLatency = generationLatency + qaLatency + telegramLatency;
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
      logs: [{
        step: 0,
        agent: 'System',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }]
    }, { status: 500 });
  }
}