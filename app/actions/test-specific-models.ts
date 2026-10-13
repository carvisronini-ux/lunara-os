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
  const meta = cred.metadata || {};
  
  addLog(`იწყება ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} ტესტირება ${modelNames.length} მოდელზე...`);

  for (const modelName of modelNames) {
    addLog(`ვამოწმებ: ${modelName}...`);
    const startTime = Date.now();
    
    try {
      let endpoint = '';
      let requestBody: any;
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // ============================================
      // CLOUDFLARE - სპეციფიკური ლოგიკა
      // ============================================
      if (provider === 'cloudflare') {
        const accountId = meta.accountId;
        if (!accountId) {
          addLog(`❌ ${modelName}: Cloudflare accountId არ არის Metadata-ში`);
          results.push({ model: modelName, passed: false, latency: 0, error: 'Missing accountId' });
          continue;
        }

        if (testType === 'text') {
          endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
          requestBody = { 
            messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }],
            max_tokens: 10
          };
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          // Image generation for Cloudflare
          endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
          requestBody = { 
            prompt: 'A beautiful cosmic landscape with stars and moon, high quality digital art',
            width: 512,
            height: 512,
            num_steps: 4
          };
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }
      // ============================================
      // GEMINI - სპეციფიკური ლოგიკა
      // ============================================
      else if (provider === 'gemini' || provider === 'google') {
        if (testType === 'text') {
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          requestBody = {
            contents: [{ parts: [{ text: 'დაწერე მხოლოდ სიტყვა: YES' }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
          };
        } else {
          // Gemini image generation (Imagen)
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
          requestBody = {
            instances: [{ prompt: 'A beautiful cosmic landscape' }],
            parameters: { sampleCount: 1 }
          };
        }
      }
      // ============================================
      // OPENAI / GROQ / MISTRAL / DEEPSEEK - სტანდარტული ლოგიკა
      // ============================================
      else {
        let base = meta.baseUrl;
        if (!base) {
          if (provider === 'groq') base = 'https://api.groq.com/openai/v1';
          else if (provider === 'mistral') base = 'https://api.mistral.ai/v1';
          else if (provider === 'deepseek') base = 'https://api.deepseek.com/v1';
          else if (provider === 'openai') base = 'https://api.openai.com/v1';
          else base = `https://api.${provider}.com/v1`;
        }

        if (testType === 'text') {
          endpoint = `${base}${meta.chatEndpoint || '/chat/completions'}`;
          requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }],
            temperature: 0.1,
            max_tokens: 10
          };
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          // Image generation (OpenAI-style)
          endpoint = `${base}${meta.imageEndpoint || '/images/generations'}`;
          requestBody = { 
            model: modelName, 
            prompt: 'A beautiful cosmic landscape with stars and moon',
            size: '512x512',
            n: 1
          };
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(20000) // 20 წამიანი ტაიმაუტი ფოტოსთვის
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        // ვალიდაცია პროვაიდერის მიხედვით
        let isValid = false;
        
        if (testType === 'text') {
          // Text validation
          if (provider === 'cloudflare') {
            isValid = data.result?.response?.length > 0;
          } else if (provider === 'gemini' || provider === 'google') {
            isValid = data.candidates?.[0]?.content?.parts?.[0]?.text?.length > 0;
          } else {
            isValid = data.choices?.[0]?.message?.content?.length > 0;
          }
        } else {
          // Image validation
          if (provider === 'cloudflare') {
            isValid = data.result?.image?.length > 0; // Base64 image
          } else if (provider === 'gemini' || provider === 'google') {
            isValid = data.predictions?.[0]?.bytesBase64Encoded?.length > 0;
          } else {
            isValid = data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0]?.url;
          }
        }

        if (isValid) {
          addLog(`✅ ${modelName} წარმატებულია (${latency}ms)`);
          results.push({ model: modelName, passed: true, latency, response: 'Success' });
        } else {
          addLog(`⚠️ ${modelName} დააბრუნა არასწორი ფორმატი`);
          results.push({ model: modelName, passed: false, latency, error: 'Invalid response format' });
        }
      } else {
        const errText = await response.text();
        addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${response.status} - ${errText.substring(0, 150)}`);
        results.push({ model: modelName, passed: false, latency, error: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      addLog(`💥 ${modelName} შეცდომა: ${error.message}`);
      results.push({ model: modelName, passed: false, latency, error: error.message });
    }
    
    // 500ms დაყოვნება (ფოტოს გენერაცია უფრო დიდხანს გრძელდება)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 🏆 დალაგება: ჯერ წარმატებულები (სიჩქარის მიხედვით), შემდეგ წარუმატებლები
  const sortedResults = results.sort((a, b) => {
    if (a.passed && !b.passed) return -1;
    if (!a.passed && b.passed) return 1;
    if (a.passed && b.passed) return a.latency - b.latency;
    return 0;
  });

  // შენახვა Metadata-ში
  const metaKey = testType === 'text' ? 'chatModels' : 'imageModels';
  const auditKey = testType === 'text' ? 'chatModelAuditResults' : 'imageModelAuditResults';
  
  const currentMeta = cred.metadata || {};
  currentMeta[metaKey] = sortedResults.map(r => r.model);
  currentMeta[auditKey] = sortedResults;

  await (credentialVault as any).updateCredentialMetadata(credentialId, currentMeta);
  addLog(`ტესტი დასრულდა. მეტამონაცემები განახლდა დალაგებული სიით.`);

  return { success: true, results: sortedResults, logs };
}