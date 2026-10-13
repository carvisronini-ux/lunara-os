// /home/carvisronini-ux/lunara-os/app/actions/audit-chat-models.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

export async function auditChatModelsAction(credentialId: string) {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    logs.push(`[${new Date().toLocaleTimeString('ka-GE', { hour12: false })}] ${msg}`);
  };

  await credentialVault.ready;
  const credentials = credentialVault.getMetadata();
  const cred = credentials.find((c: any) => c.credential_id === credentialId);
  
  if (!cred || !cred.metadata?.chatModels || cred.metadata.chatModels.length === 0) {
    return { success: false, error: 'No chat models found to audit', results: [], logs };
  }

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) {
    return { success: false, error: 'Failed to retrieve API key', results: [], logs };
  }

  const chatModels = cred.metadata.chatModels;
  const results: any[] = [];
  const testPrompt = "დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.";

  addLog(`🚀 იწყება ${chatModels.length} Chat მოდელის აუდიტი: ${cred.provider}`);

  const providerLower = cred.provider.toLowerCase();
  let chatUrl = '';
  let isCloudflare = false;
  let isGemini = false;

  if (providerLower === 'cloudflare') {
    const accountId = cred.metadata.accountId;
    if (accountId) {
      chatUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/`;
      isCloudflare = true;
    }
  } else if (providerLower === 'groq') {
    chatUrl = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (providerLower === 'gemini' || providerLower === 'google') {
    chatUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
    isGemini = true;
  } else if (providerLower === 'mistral') {
    chatUrl = 'https://api.mistral.ai/v1/chat/completions';
  } else {
    let base = cred.metadata.baseUrl;
    if (!base) {
      if (providerLower === 'kie') base = 'https://api.kie.ai/v1';
      else if (providerLower === 'deepseek') base = 'https://api.deepseek.com/v1';
      else if (providerLower === 'openai') base = 'https://api.openai.com/v1';
      else base = `https://api.${providerLower}.com/v1`;
    }
    chatUrl = `${base}${cred.metadata.chatEndpoint || '/chat/completions'}`;
  }

  const authHeaderKey = cred.metadata.authHeaderKey || 'Authorization';
  const authHeaderValue = cred.metadata.authHeaderPrefix ? `${cred.metadata.authHeaderPrefix} ${apiKey}` : `Bearer ${apiKey}`;

  // ვამოწმებთ თანმიმდევრობით, რათა თავიდან ავიცილოთ Rate Limit (429) შეცდომები
  for (const modelName of chatModels) {
    addLog(`🔄 ვამოწმებ: ${modelName}...`);
    
    let targetChatUrl = chatUrl;
    if (isCloudflare) targetChatUrl = `${chatUrl}${modelName}`;
    else if (isGemini) targetChatUrl = `${chatUrl}${modelName}:generateContent?key=${apiKey}`;

    let requestBody: any;
    let headers: Record<string, string>;

    if (isCloudflare) {
      requestBody = { messages: [{ role: 'user', content: testPrompt }] };
      headers = { 'Authorization': authHeaderValue, 'Content-Type': 'application/json' };
    } else if (isGemini) {
      requestBody = { 
        contents: [{ parts: [{ text: testPrompt }] }], 
        generationConfig: { temperature: 0.7, maxOutputTokens: 50 } 
      };
      headers = { 'Content-Type': 'application/json' };
    } else {
      requestBody = {
        model: modelName,
        messages: [{ role: 'user', content: testPrompt }],
        temperature: 0.7,
        max_tokens: 50
      };
      headers = {
        [authHeaderKey]: authHeaderValue,
        'Content-Type': 'application/json'
      };
    }

    const startTime = Date.now();
    try {
      const response = await fetch(targetChatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        let content = '';
        if (isCloudflare) content = data.result?.response?.trim() || '';
        else if (isGemini) content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        else content = data.choices?.[0]?.message?.content?.trim() || '';

        if (content && content.length > 0) {
          addLog(`✅ წარმატებული: ${modelName} (${latency}ms)`);
          results.push({ model: modelName, passed: true, latency, response: content.substring(0, 50) });
        } else {
          addLog(`⚠️ ცარიელი პასუხი: ${modelName}`);
          results.push({ model: modelName, passed: false, latency, error: 'Empty response' });
        }
      } else {
        const errText = await response.text();
        addLog(`❌ წარუმატებელი: ${modelName} (HTTP ${response.status})`);
        results.push({ model: modelName, passed: false, latency, error: `HTTP ${response.status}: ${errText.substring(0, 100)}` });
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      addLog(`💥 შეცდომა: ${modelName} - ${error.message}`);
      results.push({ model: modelName, passed: false, latency, error: error.message });
    }
    
    // მცირე დაყოვნება (200ms) პროვაიდერის დასატვირთად და Rate Limit-ის თავიდან ასაცილებლად
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // დავალაგოთ შედეგები: ჯერ წარმატებულები (სისწრაფის მიხედვით), შემდეგ წარუმატებლები
  results.sort((a, b) => {
    if (a.passed && !b.passed) return -1;
    if (!a.passed && b.passed) return 1;
    if (a.passed && b.passed) return a.latency - b.latency;
    return 0;
  });

  // განვაახლოთ მეტამონაცემები დალაგებული სიით და აუდიტის შედეგებით
  const sortedChatModels = results.map(r => r.model);
  
  await (credentialVault as any).updateCredentialMetadata(credentialId, {
    ...cred.metadata,
    chatModels: sortedChatModels,
    chatModelAuditResults: results // ინახება UI-სთვის, რომ ვიცოდეთ რომელია მწვანე/წითელი
  });

  addLog(`✅ აუდიტი დასრულდა! ${results.filter(r => r.passed).length}/${results.length} მოდელი მუშაობს.`);

  return { success: true, results, logs };
}