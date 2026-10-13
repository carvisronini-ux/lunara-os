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
  
  // Mistral-ისთვის (შემდეგში სხვა პროვაიდერებიც აქ დაემატება იგივე ლოგიკით)
  let endpoint = 'https://api.mistral.ai/v1/chat/completions';
  if (provider === 'mistral' && testType === 'image') {
    // თუ მეტამონაცემებში სხვა ენდპოინტია მითითებული, მას გამოვიყენებთ
    endpoint = cred.metadata?.baseUrl 
      ? `${cred.metadata.baseUrl}${cred.metadata.imageEndpoint || '/images/generations'}` 
      : 'https://api.mistral.ai/v1/images/generations';
  }

  addLog(`იწყება ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} ტესტირება ${modelNames.length} მოდელზე...`);

  // თანმიმდევრული ტესტირება (Rate Limit-ის თავიდან ასაცილებლად)
  for (const modelName of modelNames) {
    addLog(`ვამოწმებ: ${modelName}...`);
    const startTime = Date.now();
    
    try {
      let requestBody: any;
      if (testType === 'text') {
        requestBody = {
          model: modelName,
          messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }],
          temperature: 0.1,
          max_tokens: 10
        };
      } else {
        // ფოტოს გენერაციის სატესტო მოთხოვნა (მორგებული იქნება კონკრეტულ API-ზე)
        requestBody = { 
          model: modelName, 
          prompt: "A beautiful test image, high quality",
          size: "512x512"
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000) // 15 წამიანი ტაიმაუტი
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        // მარტივი ვალიდაცია: მივიღეთ თუ არა მოსალოდნელი სტრუქტურა?
        const isValid = testType === 'text' 
          ? (data.choices?.[0]?.message?.content?.length > 0)
          : (data.data?.[0]?.url || data.data?.[0]?.b64_json || data.image);

        if (isValid) {
          addLog(`✅ ${modelName} წარმატებულია (${latency}ms)`);
          results.push({ model: modelName, passed: true, latency, response: 'Success' });
        } else {
          addLog(`⚠️ ${modelName} დააბრუნა არასწორი ფორმატი`);
          results.push({ model: modelName, passed: false, latency, error: 'Invalid response format' });
        }
      } else {
        const errText = await response.text();
        addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${response.status}`);
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