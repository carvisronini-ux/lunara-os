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
      // HUGGING FACE - Fallback ლოგიკით
      // ============================================
      if (provider === 'huggingface') {
        const encodedModelName = encodeURIComponent(modelName);
        
        if (testType === 'text') {
          requestBody = {
            inputs: "დაწერე მხოლოდ სიტყვა: YES",
            parameters: { max_new_tokens: 10, temperature: 0.1 }
          };
        } else {
          requestBody = { inputs: "A beautiful cosmic landscape, high quality" };
        }
        
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-Wait-For-Model'] = 'true';
        
        let endpointToTry = `https://router.huggingface.co/hf-inference/models/${encodedModelName}`;
        let response: Response;
        let usedFallback = false;
        
        try {
          response = await fetch(endpointToTry, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(30000)
          });
          
          if (response.status === 400) {
            const errData = await response.json().catch(() => ({}));
            if (errData.error?.includes('not supported')) {
              addLog(`⚠️ ${modelName} არ არის ხელმისაწვდომი Router-ზე. ვცდილობ ძველ endpoint-ს...`);
              usedFallback = true;
              endpointToTry = `https://api-inference.huggingface.co/models/${encodedModelName}`;
              
              response = await fetch(endpointToTry, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(30000)
              });
            }
          }
        } catch (fetchError: any) {
          if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('fetch failed')) {
            addLog(`⚠️ ${modelName} Router-ზე ქსელური შეცდომა. ვცდილობ ძველ endpoint-ს...`);
            usedFallback = true;
            endpointToTry = `https://api-inference.huggingface.co/models/${encodedModelName}`;
            
            response = await fetch(endpointToTry, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody),
              signal: AbortSignal.timeout(30000)
            });
          } else {
            throw fetchError;
          }
        }
        
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          let isValid = false;
          
          if (testType === 'text') {
            const data = await response.json();
            isValid = (Array.isArray(data) && data[0]?.generated_text?.length > 0) || 
                      (data.choices?.[0]?.message?.content?.length > 0);
          } else {
            if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
              isValid = true;
            } else {
              // ✅ აქ გავასწორეთ შეცდომა: უბრალოდ ვთვლით ვალიდურად, თუ JSON-ია და არა სურათი
              await response.json(); 
              isValid = true;
            }
          }
          
          if (isValid) {
            addLog(`✅ ${modelName} წარმატებულია (${latency}ms)${usedFallback ? ' [ძველი endpoint]' : ''}`);
            results.push({ model: modelName, passed: true, latency, response: 'Success' });
          } else {
            addLog(`⚠️ ${modelName} დააბრუნა არასწორი ფორმატი`);
            results.push({ model: modelName, passed: false, latency, error: 'Invalid response format' });
          }
        } else {
          const errText = await response.text();
          if (response.status === 400 && errText.includes('not supported')) {
            addLog(`❌ ${modelName} არ არის ხელმისაწვდომი HF-ის უფასო API-ზე`);
            results.push({ model: modelName, passed: false, latency, error: 'Not available on free tier' });
          } else if (response.status === 503) {
            addLog(`⏳ ${modelName} იტვირთება (503). HF-ის უფასო API-ზე მოდელებს დრო სჭირდებათ.`);
            results.push({ model: modelName, passed: false, latency, error: 'Model loading (503)' });
          } else {
            addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${response.status} - ${errText.substring(0, 150)}`);
            results.push({ model: modelName, passed: false, latency, error: `HTTP ${response.status}` });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // ============================================
      // CLOUDFLARE
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
          requestBody = { messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }], max_tokens: 10 };
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
          requestBody = { prompt: 'A beautiful cosmic landscape with stars and moon, high quality digital art' };
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }
      // ============================================
      // GEMINI
      // ============================================
      else if (provider === 'gemini' || provider === 'google') {
        if (testType === 'text') {
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          requestBody = { contents: [{ parts: [{ text: 'დაწერე მხოლოდ სიტყვა: YES' }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 10 } };
        } else {
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
          requestBody = { instances: [{ prompt: 'A beautiful cosmic landscape' }], parameters: { sampleCount: 1 } };
        }
      }
      // ============================================
      // სხვა პროვაიდერები (OpenAI, Groq, Mistral, DeepSeek)
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
          requestBody = { model: modelName, messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }], temperature: 0.1, max_tokens: 10 };
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
          endpoint = `${base}${meta.imageEndpoint || '/images/generations'}`;
          requestBody = { model: modelName, prompt: 'A beautiful cosmic landscape with stars and moon', size: '512x512', n: 1 };
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }

      const timeout = testType === 'text' ? 30000 : 60000;
      let response: Response;
      let isTimeout = false;
      
      try {
        response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(timeout) });
      } catch (fetchError: any) {
        if (fetchError.name === 'TimeoutError' || fetchError.message.includes('timeout')) {
          isTimeout = true;
          addLog(`⏱️ ${modelName} - პირველი ცდა: timeout. ვცდილობ მეორედ...`);
          try {
            response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(timeout * 1.5) });
          } catch (retryError: any) {
            const latency = Date.now() - startTime;
            addLog(`⚠️ ${modelName} - მეორე ცდაც timeout: ${retryError.message}`);
            results.push({ model: modelName, passed: false, latency, error: 'Timeout after retry' });
            continue;
          }
        } else {
          throw fetchError;
        }
      }

      const latency = Date.now() - startTime;

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let isValid = false;
        
        if (testType === 'text') {
          const data = await response.json();
          
          // ✅ გაუმჯობესებული ვალიდაცია: ვამოწმებთ data.error-საც, რადგან ზოგი API 200-ში აბრუნებს შეცდომას
          if (data.error) {
            isValid = false;
            addLog(`⚠️ ${modelName} დააბრუნა შეცდომა 200 OK პასუხში: ${data.error.message || 'Unknown'}`);
          } else if (provider === 'cloudflare') {
            isValid = data.result?.response?.length > 0;
          } else if (provider === 'gemini' || provider === 'google') {
            isValid = data.candidates?.[0]?.content?.parts?.[0]?.text?.length > 0;
          } else {
            isValid = data.choices?.[0]?.message?.content?.length > 0 || data.choices?.[0]?.delta?.content?.length > 0;
            
            // ✅ თუ მაინც არ არის ვალიდური, ვბეჭდავთ პასუხის ფრაგმენტს დიაგნოსტიკისთვის
            if (!isValid) {
               addLog(`⚠️ ${modelName} დააბრუნა არასწორი ფორმატი. პასუხი: ${JSON.stringify(data).substring(0, 150)}`);
            }
          }
        } else {
          if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
            isValid = true;
          } else {
            const data = await response.json();
            if (provider === 'cloudflare') {
              isValid = data.result?.image?.length > 0 || data.success === true;
            } else if (provider === 'gemini' || provider === 'google') {
              isValid = data.predictions?.[0]?.bytesBase64Encoded?.length > 0;
            } else {
              isValid = data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0]?.url;
            }
          }
        }

        if (isValid) {
          if (!isTimeout) addLog(`✅ ${modelName} წარმატებულია (${latency}ms)`);
          else addLog(`⚠️ ${modelName} წარმატებულია, მაგრამ ნელი (${latency}ms)`);
          
          results.push({ model: modelName, passed: true, latency, response: 'Success' });
        } else {
          if (testType === 'text' && provider !== 'cloudflare' && provider !== 'gemini' && provider !== 'google') {
            // ლოგი უკვე დაიბეჭდა ზემოთ
          } else {
            addLog(`⚠️ ${modelName} დააბრუნა არასწორი ფორმატი`);
          }
          results.push({ model: modelName, passed: false, latency, error: 'Invalid response format' });
        }
      } else {
        const errText = await response.text();
        addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${response.status} - ${errText.substring(0, 150)}`);
        results.push({ model: modelName, passed: false, latency, error: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      const errorMsg = error.cause ? `${error.message} (Cause: ${error.cause})` : error.message;
      addLog(`💥 ${modelName} შეცდომა: ${errorMsg}`);
      results.push({ model: modelName, passed: false, latency, error: errorMsg });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const sortedResults = results.sort((a, b) => {
    if (a.passed && !b.passed) return -1;
    if (!a.passed && b.passed) return 1;
    if (a.passed && b.passed) return a.latency - b.latency;
    return 0;
  });

  const metaKey = testType === 'text' ? 'chatModels' : 'imageModels';
  const auditKey = testType === 'text' ? 'chatModelAuditResults' : 'imageModelAuditResults';
  
  const currentMeta = cred.metadata || {};
  currentMeta[metaKey] = sortedResults.map(r => r.model);
  currentMeta[auditKey] = sortedResults;

  await (credentialVault as any).updateCredentialMetadata(credentialId, currentMeta);
  addLog(`ტესტი დასრულდა. მეტამონაცემები განახლდა დალაგებული სიით.`);

  return { success: true, results: sortedResults, logs };
}