// ============================================================
// LUNARA OS — E2E Test Orchestrator
// Foundation: §56 (First True E2E Test), §28 (Echo), §27 (Aegis)
// Purpose: Chain Muse -> Aegis -> Echo in a real-world loop
// ============================================================

import { generateWithProvider } from '../credentials/providers/adapter';
import { sendTelegramMessage } from '../distribution/telegram';
import { credentialVault } from '../credentials/credential-vault';

export interface E2ELog {
  step: number;
  agent: string;
  status: 'running' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: number;
}

export async function runE2ETest(
  prompt: string, 
  onLog: (log: E2ELog) => void
): Promise<void> {
  const addLog = (step: number, agent: string, status: 'running' | 'success' | 'error' | 'warning', message: string) => {
    onLog({ step, agent, status, message, timestamp: Date.now() });
  };

  // 1. საუკეთესო ხელმისაწვდომი API გასაღების პოვნა
  addLog(1, 'System', 'running', 'Finding best available API key...');
  const credentials = credentialVault.getMetadata();
  // ვირჩევთ Groq-ს პრიორიტეტულად, ან ნებისმიერ აქტიურს
  const activeCred = credentials.find(c => c.status === 'ACTIVE' && c.provider === 'groq') || 
                     credentials.find(c => c.status === 'ACTIVE');
  
  if (!activeCred) {
    addLog(1, 'System', 'error', 'No active credentials found in Vault!');
    return;
  }
  
  const modelName = activeCred.metadata?.recommendedModel || '';
  addLog(1, 'System', 'success', `Using ${activeCred.provider} (${modelName || 'default model'})`);

  // 2. Muse: კონტენტის გენერაცია
  addLog(2, 'Muse', 'running', 'Generating content based on prompt...');
  const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
  
  if (!apiKey) {
    addLog(2, 'Muse', 'error', 'Failed to retrieve API key from Vault');
    return;
  }

  const museSystemPrompt = "You are Muse, Lunara OS Content Lead. Write a short, mysterious, and engaging Telegram post. Use emojis, keep it concise, and follow Dark Luxury / Cosmic Editorial style. No generic AI clichés.";
  
  try {
    const generation = await generateWithProvider(
      activeCred.provider, 
      apiKey, 
      modelName, 
      prompt, 
      museSystemPrompt
    );

    if (!generation.success) {
      addLog(2, 'Muse', 'error', `Generation failed: ${generation.error}`);
      return;
    }
    
    addLog(2, 'Muse', 'success', `Content generated successfully (${generation.content.length} chars)`);

    // 3. Aegis: ხარისხის შემოწმება (QA)
    addLog(3, 'Aegis', 'running', 'Checking content quality and brand fit...');
    
    // სწრაფი QA შემოწმება იმავე მოდელით
    const qaPrompt = `Review this text for brand fit, originality and quality. Reply ONLY with "APPROVED" or "REJECTED":\n\n${generation.content}`;
    const qaCheck = await generateWithProvider(
      activeCred.provider, 
      apiKey, 
      modelName, 
      qaPrompt, 
      "You are Aegis, Lunara OS Quality Director. Be strict but fair."
    );
    
    const isApproved = qaCheck.content?.toUpperCase().includes('APPROVED');
    if (isApproved) {
      addLog(3, 'Aegis', 'success', 'Content approved by QA');
    } else {
      addLog(3, 'Aegis', 'warning', 'QA suggested revisions, but proceeding for E2E test...');
    }

    // 4. Echo: Telegram-ზე გამოქვეყნება
    addLog(4, 'Echo', 'running', 'Sending to Telegram channel...');
    const tgResult = await sendTelegramMessage({ 
      text: generation.content, 
      parse_mode: 'Markdown' 
    });
    
    if (tgResult.success) {
      addLog(4, 'Echo', 'success', `Published to Telegram! Message ID: ${tgResult.messageId}`);
    } else {
      addLog(4, 'Echo', 'error', `Telegram failed: ${tgResult.error}`);
    }

  } catch (error) {
    addLog(0, 'System', 'error', error instanceof Error ? error.message : 'Unknown orchestrator error');
  }
}