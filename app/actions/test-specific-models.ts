// /home/carvisronini-ux/lunara-os/app/actions/test-specific-models.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

export async function testSpecificModelsAction(
  credentialId: string, 
  modelNames: string[], 
  testType: 'text' | 'image'
) {
  const logs: string[] = [];
  const addLog = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('ka-GE', { hour12: false })}] ${msg}`);

  await credentialVault.ready;
  const cred = credentialVault.getMetadata().find((c: any) => c.credential_id === credentialId);
  
  if (!cred) return { success: false, error: 'Credential not found', results: [], logs };

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) return { success: false, error: 'API Key not found', results: [], logs };

  const results: any[] = [];
  const provider = cred.provider.toLowerCase();
  
  // Endpoint-ის განსაზღვრა პროვაიდერის მიხედვით
  let endpoint = 'https://api.mistral.ai/v1/chat/completions';
  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/v1/chat/completions';
  } else if (provider === 'cloudflare') {
    const accountId = cred.metadata?.accountId;
    if (accountId) {
      endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/`;
    }
  } else if (provider !== 'mistral') {
    const base = cred.metadata?.baseUrl || `https://api.${provider}.com/v1`;
    endpoint = `${base}${cred.metadata?.chatEndpoint || '/chat/completions'}`;
  }

  addLog(`იწყება ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} ტესტირება ${modelNames.length} მოდელზე...`);

  for (const modelName of modelNames) {
    addLog(`ვამოწმებ: ${modelName}...`);
    const startTime = Date.now();
    
    try {
      let requestBody: any;
      let currentEndpoint = endpoint;

      if (testType === 'text') {
        if (provider === 'gemini' || provider === 'google') {
          currentEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          requestBody = {
            contents: [{ parts: [{ text: 'დაწერე მხოლოდ სიტყვა: YES' }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
          };
        } else if (provider === 'cloudflare') {
          currentEndpoint = `${endpoint}${modelName}`;
          requestBody = { messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }] };
        } else {
          requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }],
            temperature: 0.1,
            max_tokens: 10
          };
        }
      } else {
        // ფოტოს გენერაციის სატესტო მოთხოვნა
        requestBody = { 
          model: modelName, 
          prompt: "A beautiful test image, high quality",
          size: "512x512"
        };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (provider !== 'gemini' && provider !== 'google') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(currentEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000) // 15 წამიანი ტაიმაუტი
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        // მარტივი ვალიდაცია: მივიღეთ თუ არა მოსალოდნელი სტრუქტურა?
        const isValid = testType === 'text' 
          ? (data.choices?.[0]?.message?.content?.length > 0 || data.candidates?.[0]?.content?.parts?.[0]?.text?.length > 0 || data.result?.response?.length > 0)
          : (data.data?.[0]?.url || data.data?.[0]?.b64_json || data.image || data.result?.image);

        if (isValid) {
          addLog(`✅ ${modelName} წარმატებულია (${latency}ms)`);
          results.push({ model: modelName, passed: true, latency, response: 'Success' });
        } else {
          addLog(`⚠️ ${modelName} დააბრუნა არასწორი ფორმატი`);
          results.push({ model: modelName, passed: false, latency, error: 'Invalid response format' });
        }
      } else {
        // ✅ აქ გავასწორეთ შეცდომა: errText ახლა გამოიყენება ლოგში
        const errText = await response.text();
        addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${response.status} - ${errText.substring(0, 100)}`);
        results.push({ model: modelName, passed: false, latency, error: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      addLog(`💥 ${modelName} შეცდომა: ${error.message}`);
      results.push({ model: modelName, passed: false, latency, error: error.message });
    }
    
    // 300 მილიწამიანი დაყოვნება მომდევნო მოთხოვნამდე (Rate Limit-ის თავიდან ასაცილებლად)
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 🏆 დალაგების ლოგიკა: ჯერ წარმატებულები (სიჩქარის მიხედვით ზრდადობით), შემდეგ წარუმატებლები
  const sortedResults = results.sort((a, b) => {
    if (a.passed && !b.passed) return -1;
    if (!a.passed && b.passed) return 1;
    if (a.passed && b.passed) return a.latency - b.latency; // ყველაზე სწრაფი პირველი
    return 0;
  });

  // შენახვა მეტამონაცემებში, რომ UI-მ დაიმახსოვროს ეს "ოქროს სია"
  const metaKey = testType === 'text' ? 'chatModels' : 'imageModels';
  const auditKey = testType === 'text' ? 'chatModelAuditResults' : 'imageModelAuditResults';
  
  const currentMeta = cred.metadata || {};
  currentMeta[metaKey] = sortedResults.map(r => r.model);
  currentMeta[auditKey] = sortedResults;

  await (credentialVault as any).updateCredentialMetadata(credentialId, currentMeta);
  addLog(`ტესტი დასრულდა. მეტამონაცემები განახლდა დალაგებული სიით.`);

  return { success: true, results: sortedResults, logs };
}