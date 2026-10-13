// /home/carvisronini-ux/lunara-os/app/actions/test-specific-models.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

// ============================================
// კონსტანტები და დამხმარე ფუნქციები
// ============================================

const HF_CHAT_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';
const HF_IMAGE_BASE = 'https://router.huggingface.co/hf-inference/models';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const TEXT_TIMEOUT_MS = 30000;
const IMAGE_TIMEOUT_MS = 60000;
const PAUSE_BETWEEN_MODELS_MS = 500;
const TRANSIENT_RETRY_DELAY_MS = 2000;

/** ტექსტის ტესტში ამ ტიპის მოდელები არ მონაწილეობენ (TTS, ფოტო, ვიდეო, embedding). */
const NON_TEXT_MODEL_PATTERN = /tts|nano-banana|image|imagen|veo|embedding|aqa/i;
/** Imagen მოდელები :predict-ით მუშაობს, დანარჩენი ფოტო-მოდელები generateContent-ით. */
const IMAGEN_PATTERN = /imagen/i;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const describeNetworkError = (e: any) =>
  e?.cause ? `${e.message} (Cause: ${e.cause?.code || e.cause})` : (e?.message || String(e));

const isTimeoutError = (e: any) =>
  e?.name === 'TimeoutError' || String(e?.message || '').toLowerCase().includes('timeout');

/** ცდილობს API-ს JSON შეცდომიდან მხოლოდ message-ის ამოღებას. */
const extractErrorMessage = (raw: string, max = 160): string => {
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.error?.message || parsed?.error || parsed?.message;
    if (msg) return String(typeof msg === 'string' ? msg : JSON.stringify(msg)).substring(0, max);
  } catch { /* არ არის JSON */ }
  return raw.replace(/\s+/g, ' ').substring(0, max);
};

const statusHint = (status: number): string => {
  switch (status) {
    case 400: return '(არასწორი მოთხოვნა ან მოდელი ამ ტიპს არ უჭერს მხარს)';
    case 401:
    case 403: return '(ავტორიზაციის შეცდომა)';
    case 404: return '(მოდელი აღარ არსებობს ან მიუწვდომელია)';
    case 429: return '(კვოტა ან მოთხოვნების ლიმიტი ამოწურულია)';
    case 500: return '(სერვერის შიდა შეცდომა)';
    case 503: return '(მოდელი გადატვირთულია, სცადე მოგვიანებით)';
    default: return '';
  }
};

// ============================================
// მთავარი Action
// ============================================

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
  const isHuggingFace = provider === 'huggingface' || provider === 'hugging face' || provider === 'hf';
  const isGemini = provider === 'gemini' || provider === 'google';
  const meta = cred.metadata || {};
  let skippedCount = 0;
  
  addLog(`იწყება ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} ტესტირება ${modelNames.length} მოდელზე...`);

  for (const modelName of modelNames) {
    // არატექსტური მოდელები (TTS, nano-banana, imagen...) ტექსტის ტესტს არ გადის
    if (testType === 'text' && NON_TEXT_MODEL_PATTERN.test(modelName)) {
      addLog(`⏭️ ${modelName} გამოტოვებულია (არატექსტური მოდელი)`);
      skippedCount++;
      continue;
    }

    addLog(`ვამოწმებ: ${modelName}...`);
    const startTime = Date.now();
    
    try {
      let endpoint = '';
      let requestBody: any;
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // ============================================
      // HUGGING FACE - Inference Providers Router
      // ტექსტი: OpenAI-თავსებადი /v1/chat/completions
      // ფოტო:   router.huggingface.co/hf-inference/models/{model}
      // (ძველი api-inference.huggingface.co აღარ არსებობს)
      // ============================================
      if (isHuggingFace) {
        headers['Authorization'] = `Bearer ${apiKey}`;

        let hfEndpoint: string;
        if (testType === 'text') {
          hfEndpoint = HF_CHAT_ENDPOINT;
          requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: 'Reply with only one word: YES' }],
            max_tokens: 16,
            temperature: 0.1,
          };
        } else {
          hfEndpoint = `${HF_IMAGE_BASE}/${modelName.split('/').map(encodeURIComponent).join('/')}`;
          requestBody = { inputs: 'A beautiful cosmic landscape, high quality' };
          headers['X-Wait-For-Model'] = 'true';
        }

        let hfResponse: Response;
        try {
          hfResponse = await fetch(hfEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(testType === 'text' ? TEXT_TIMEOUT_MS : IMAGE_TIMEOUT_MS),
          });
        } catch (fetchError: any) {
          const msg = describeNetworkError(fetchError);
          addLog(`💥 ${modelName} ქსელური შეცდომა: ${msg}`);
          results.push({ model: modelName, passed: false, latency: Date.now() - startTime, error: `Network error: ${msg}` });
          await sleep(PAUSE_BETWEEN_MODELS_MS);
          continue;
        }

        const hfLatency = Date.now() - startTime;

        if (hfResponse.ok) {
          let isValid = false;

          if (testType === 'text') {
            const data = await hfResponse.json();
            if (data?.error) {
              addLog(`⚠️ ${modelName} დააბრუნა შეცდომა 200 OK პასუხში: ${data.error.message || JSON.stringify(data.error).substring(0, 150)}`);
            } else {
              isValid = data?.choices?.[0]?.message?.content?.length > 0;
              if (!isValid) addLog(`⚠️ ${modelName} დააბრუნა ცარიელი/არასწორი ფორმატი. პასუხი: ${JSON.stringify(data).substring(0, 150)}`);
            }
          } else {
            const contentType = hfResponse.headers.get('content-type') || '';
            if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
              isValid = true;
            } else {
              const data = await hfResponse.json();
              isValid = !data?.error;
              if (!isValid) addLog(`⚠️ ${modelName} დააბრუნა შეცდომა: ${JSON.stringify(data.error).substring(0, 150)}`);
            }
          }

          if (isValid) {
            addLog(`✅ ${modelName} წარმატებულია (${hfLatency}ms)`);
            results.push({ model: modelName, passed: true, latency: hfLatency, response: 'Success' });
          } else {
            results.push({ model: modelName, passed: false, latency: hfLatency, error: 'Invalid response format' });
          }
        } else {
          const errText = await hfResponse.text();
          const snippet = extractErrorMessage(errText, 150);

          if (hfResponse.status === 400 || hfResponse.status === 404) {
            addLog(`❌ ${modelName} არ არის ხელმისაწვდომი Router-ზე (HTTP ${hfResponse.status}). აირჩიე მოდელი, რომელსაც Inference Providers-ზე provider ემსახურება. ${snippet}`);
            results.push({ model: modelName, passed: false, latency: hfLatency, error: 'Model not available on router' });
          } else if (hfResponse.status === 401 || hfResponse.status === 403) {
            addLog(`❌ ${modelName} ავტორიზაციის შეცდომა (${hfResponse.status}). შეამოწმე, რომ HF ტოკენს აქვს "Inference Providers" უფლება.`);
            results.push({ model: modelName, passed: false, latency: hfLatency, error: 'Authorization failed' });
          } else if (hfResponse.status === 402) {
            addLog(`❌ ${modelName}: HF კრედიტები ამოიწურა ან provider ფასიანია (402).`);
            results.push({ model: modelName, passed: false, latency: hfLatency, error: 'Payment required (402)' });
          } else if (hfResponse.status === 429) {
            addLog(`⏳ ${modelName}: მოთხოვნების ლიმიტი გადაჭარბებულია (429). სცადე მოგვიანებით.`);
            results.push({ model: modelName, passed: false, latency: hfLatency, error: 'Rate limited (429)' });
          } else if (hfResponse.status === 503) {
            addLog(`⏳ ${modelName} იტვირთება (503). სცადე რამდენიმე წუთში.`);
            results.push({ model: modelName, passed: false, latency: hfLatency, error: 'Model loading (503)' });
          } else {
            addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${hfResponse.status} - ${snippet}`);
            results.push({ model: modelName, passed: false, latency: hfLatency, error: `HTTP ${hfResponse.status}` });
          }
        }

        await sleep(PAUSE_BETWEEN_MODELS_MS);
        continue; // HF დამუშავებულია, გადავდივართ შემდეგზე
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

        endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = testType === 'text'
          ? { messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }], max_tokens: 10 }
          : { prompt: 'A beautiful cosmic landscape with stars and moon, high quality digital art' };
      }
      // ============================================
      // GEMINI
      // API გასაღები გადადის header-ით (URL-ში არა), რომ ლოგებსა და შეცდომებში არ გამოჩნდეს.
      // ============================================
      else if (isGemini) {
        headers['x-goog-api-key'] = apiKey;

        if (testType === 'text') {
          endpoint = `${GEMINI_BASE}/${modelName}:generateContent`;
          // 256 ტოკენი, რადგან "thinking" მოდელები ლიმიტის ნაწილს ფიქრზე ხარჯავენ
          requestBody = {
            contents: [{ parts: [{ text: 'დაწერე მხოლოდ სიტყვა: YES' }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
          };
        } else if (IMAGEN_PATTERN.test(modelName)) {
          endpoint = `${GEMINI_BASE}/${modelName}:predict`;
          requestBody = { instances: [{ prompt: 'A beautiful cosmic landscape' }], parameters: { sampleCount: 1 } };
        } else {
          // Gemini ფოტო-მოდელები (nano-banana და მსგავსი) generateContent-ით მუშაობს
          endpoint = `${GEMINI_BASE}/${modelName}:generateContent`;
          requestBody = {
            contents: [{ parts: [{ text: 'A beautiful cosmic landscape with stars and moon' }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          };
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

        headers['Authorization'] = `Bearer ${apiKey}`;
        if (testType === 'text') {
          endpoint = `${base}${meta.chatEndpoint || '/chat/completions'}`;
          requestBody = { model: modelName, messages: [{ role: 'user', content: 'დაწერე მხოლოდ სიტყვა: YES' }], temperature: 0.1, max_tokens: 10 };
        } else {
          endpoint = `${base}${meta.imageEndpoint || '/images/generations'}`;
          requestBody = { model: modelName, prompt: 'A beautiful cosmic landscape with stars and moon', size: '512x512', n: 1 };
        }
      }

      // ============================================
      // გაგზავნა: timeout-ზე და დროებით 500/503-ზე თითო განმეორებითი ცდა
      // ============================================
      const timeout = testType === 'text' ? TEXT_TIMEOUT_MS : IMAGE_TIMEOUT_MS;
      const send = (ms: number) =>
        fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(ms) });

      let response: Response;
      let retried = false;

      try {
        response = await send(timeout);
      } catch (fetchError: any) {
        if (!isTimeoutError(fetchError)) throw fetchError;

        retried = true;
        addLog(`⏱️ ${modelName} - პირველი ცდა: timeout. ვცდილობ მეორედ...`);
        try {
          response = await send(timeout * 1.5);
        } catch (retryError: any) {
          const latency = Date.now() - startTime;
          addLog(`⚠️ ${modelName} - მეორე ცდაც ჩავარდა: ${retryError.message}`);
          results.push({ model: modelName, passed: false, latency, error: 'Timeout after retry' });
          await sleep(PAUSE_BETWEEN_MODELS_MS);
          continue;
        }
      }

      if ((response.status === 500 || response.status === 503) && !retried) {
        retried = true;
        addLog(`⏳ ${modelName} დროებითი შეცდომა (HTTP ${response.status}). ვცდილობ მეორედ ${TRANSIENT_RETRY_DELAY_MS / 1000}წმ-ში...`);
        await sleep(TRANSIENT_RETRY_DELAY_MS);
        try {
          response = await send(timeout);
        } catch (retryError: any) {
          const latency = Date.now() - startTime;
          addLog(`⚠️ ${modelName} - განმეორებითი ცდა ჩავარდა: ${retryError.message}`);
          results.push({ model: modelName, passed: false, latency, error: 'Failed after retry' });
          await sleep(PAUSE_BETWEEN_MODELS_MS);
          continue;
        }
      }

      const latency = Date.now() - startTime;

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let isValid = false;
        
        if (testType === 'text') {
          const data = await response.json();
          
          if (data.error) {
            isValid = false;
            addLog(`⚠️ ${modelName} დააბრუნა შეცდომა 200 OK პასუხში: ${data.error.message || 'Unknown'}`);
          } else if (provider === 'cloudflare') {
            isValid = data.result?.response?.length > 0;
          } else if (isGemini) {
            // ტექსტი შეიძლება არ იყოს parts[0]-ში (მაგ. thinking მოდელებზე), ამიტომ ვამოწმებთ ყველა part-ს
            isValid = data.candidates?.[0]?.content?.parts?.some((p: any) => p?.text?.length > 0) === true;
            if (!isValid) {
              addLog(`⚠️ ${modelName} პასუხი (ტექსტის გარეშე): ${JSON.stringify(data).substring(0, 200)}`);
            }
          } else {
            isValid = data.choices?.[0]?.message?.content?.length > 0 || data.choices?.[0]?.delta?.content?.length > 0;
            
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
            } else if (isGemini) {
              isValid =
                data.predictions?.[0]?.bytesBase64Encoded?.length > 0 ||
                data.candidates?.[0]?.content?.parts?.some((p: any) => p?.inlineData?.data?.length > 0) === true;
            } else {
              isValid = !!(data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0]?.url);
            }
            if (!isValid) {
              addLog(`⚠️ ${modelName} პასუხი (ფოტოს გარეშე): ${JSON.stringify(data).substring(0, 200)}`);
            }
          }
        }

        if (isValid) {
          if (!retried) addLog(`✅ ${modelName} წარმატებულია (${latency}ms)`);
          else addLog(`⚠️ ${modelName} წარმატებულია განმეორებითი ცდის შემდეგ (${latency}ms)`);
          
          results.push({ model: modelName, passed: true, latency, response: 'Success' });
        } else {
          results.push({ model: modelName, passed: false, latency, error: 'Invalid response format' });
        }
      } else {
        const errText = await response.text();
        addLog(`❌ ${modelName} ვერ მოხერხდა: HTTP ${response.status} ${statusHint(response.status)} - ${extractErrorMessage(errText)}`);
        results.push({ model: modelName, passed: false, latency, error: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      const errorMsg = describeNetworkError(error);
      addLog(`💥 ${modelName} შეცდომა: ${errorMsg}`);
      results.push({ model: modelName, passed: false, latency, error: errorMsg });
    }
    
    await sleep(PAUSE_BETWEEN_MODELS_MS);
  }

  // ============================================
  // შედეგების დალაგება და მეტამონაცემების განახლება
  // ============================================
  const sortedResults = results.sort((a, b) => {
    if (a.passed && !b.passed) return -1;
    if (!a.passed && b.passed) return 1;
    if (a.passed && b.passed) return a.latency - b.latency;
    return 0;
  });

  const passedModels = sortedResults.filter(r => r.passed).map(r => r.model);

  const metaKey = testType === 'text' ? 'chatModels' : 'imageModels';
  const auditKey = testType === 'text' ? 'chatModelAuditResults' : 'imageModelAuditResults';
  
  const currentMeta = cred.metadata || {};
  // სამუშაო მოდელების სიაში მხოლოდ გავლილი მოდელები შედის.
  // თუ არცერთი არ გავიდა, არსებული სია არ იშლება.
  if (passedModels.length > 0) {
    currentMeta[metaKey] = passedModels;
  }
  currentMeta[auditKey] = sortedResults;

  await (credentialVault as any).updateCredentialMetadata(credentialId, currentMeta);

  const skippedNote = skippedCount > 0 ? ` (გამოტოვებულია ${skippedCount} არატექსტური)` : '';
  if (passedModels.length > 0) {
    addLog(`ტესტი დასრულდა: ${passedModels.length}/${sortedResults.length} მოდელი გავიდა${skippedNote}. სია განახლდა.`);
  } else {
    addLog(`ტესტი დასრულდა: არცერთი მოდელი არ გავიდა (0/${sortedResults.length})${skippedNote}. სამუშაო მოდელების არსებული სია უცვლელია, განახლდა მხოლოდ აუდიტის შედეგები.`);
  }

  return { success: true, results: sortedResults, logs };
}