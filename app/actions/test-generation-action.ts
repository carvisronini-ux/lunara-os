// /home/carvisronini-ux/lunara-os/app/actions/test-generation-action.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';
import { imageGenerator } from '@/services/agents/image-generator';

export async function testGenerationAction(testType: 'text' | 'image') {
  const logs: string[] = [];
  
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ka-GE', { hour12: false });
    logs.push(`[${time}] ${msg}`);
    console.log(`[TEST GEN] ${msg}`);
  };

  await credentialVault.ready;
  addLog(`🚀 [TEST] დაიწყო ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} გენერაციის ტესტი.`);

  try {
    if (testType === 'text') {
      addLog("📡 [API VAULT] იგზავნება მოთხოვნა: 'მიმაწოდე ყველა აქტიური პროვაიდერი და მათი ჩეთის მოდელები'.");
      
      const credentials = credentialVault.getMetadata().filter((c: any) => c.status === 'ACTIVE');
      let allChatModels: any[] = [];

      // 1. ვაგროვებთ ყველა მოდელს საცავიდან
      for (const cred of credentials) {
        const meta = cred.metadata || {};
        if (meta.chatModels && Array.isArray(meta.chatModels) && meta.chatModels.length > 0) {
          const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(cred.credential_id);
          
          // ✅ ვიყენებთ ზუსტად იგივე ლოგიკას, რაც credential-actions.ts-შია (მხოლოდ chatUrl-ისთვის)
          const providerLower = cred.provider.toLowerCase();
          let chatUrl = '';
          let isCloudflare = false;
          let isGemini = false;

          if (providerLower === 'cloudflare') {
            const accountId = meta.accountId;
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
            let base = meta.baseUrl;
            if (!base) {
              if (providerLower === 'kie') base = 'https://api.kie.ai/v1';
              else if (providerLower === 'deepseek') base = 'https://api.deepseek.com/v1';
              else if (providerLower === 'openai') base = 'https://api.openai.com/v1';
              else base = `https://api.${providerLower}.com/v1`;
            }
            chatUrl = `${base}${meta.chatEndpoint || '/chat/completions'}`;
          }

          const authHeaderKey = meta.authHeaderKey || 'Authorization';
          const authHeaderValue = meta.authHeaderPrefix ? `${meta.authHeaderPrefix} ${apiKey}` : `Bearer ${apiKey}`;

          for (const modelName of meta.chatModels) {
            allChatModels.push({
              modelName,
              provider: cred.provider,
              credentialId: cred.credential_id,
              apiKey,
              chatUrl,
              authHeaderKey,
              authHeaderValue,
              isCloudflare,
              isGemini
            });
          }
        }
      }

      if (allChatModels.length === 0) {
        addLog("❌ [API VAULT] პასუხი: საცავში ვერ მოიძებნა ვერცერთი აქტიური ჩეთის მოდელი.");
        return { success: false, error: 'No chat models available in the vault', logs };
      }

      addLog(`✅ [API VAULT] პასუხი მიღებულია. ნაპოვნია ${allChatModels.length} პოტენციური მოდელი. ვიწყებთ თანმიმდევრულ ტესტირებას...`);

      const failedModels: any[] = [];
      const testPrompt = "დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.";
      
      // 2. ვცდილობთ თითოეულ მოდელს (ზუსტად იგივე ლოგიკით, რაც საცავის ტესტში)
      for (let i = 0; i < allChatModels.length; i++) {
        const model = allChatModels[i];
        addLog(`\n🔄 [TEST] ვცდილობ მოდელს [${i + 1}/${allChatModels.length}]: ${model.provider} -> ${model.modelName}`);
        
        let targetChatUrl = model.chatUrl;
        if (model.isCloudflare) targetChatUrl = `${model.chatUrl}${model.modelName}`;
        else if (model.isGemini) targetChatUrl = `${model.chatUrl}${model.modelName}:generateContent?key=${model.apiKey}`;

        addLog(`📍 [INFO] Endpoint: ${targetChatUrl}`);

        try {
          // ✅ ზუსტად იგივე Request აგება, რაც credential-actions.ts-შია
          let requestBody: any;
          let headers: Record<string, string>;

          if (model.isCloudflare) {
            requestBody = { messages: [{ role: 'user', content: testPrompt }] };
            headers = { 'Authorization': model.authHeaderValue, 'Content-Type': 'application/json' };
          } else if (model.isGemini) {
            requestBody = { 
              contents: [{ parts: [{ text: testPrompt }] }], 
              generationConfig: { temperature: 0.7, maxOutputTokens: 100 } 
            };
            headers = { 'Content-Type': 'application/json' };
          } else {
            requestBody = {
              model: model.modelName,
              messages: [{ role: 'user', content: testPrompt }],
              temperature: 0.7,
              max_tokens: 100
            };
            headers = {
              [model.authHeaderKey]: model.authHeaderValue,
              'Content-Type': 'application/json'
            };
          }

          addLog(`📤 [REQUEST] იგზავნება POST მოთხოვნა...`);
          addLog(`📦 [REQUEST] Payload: ${JSON.stringify(requestBody).substring(0, 150)}...`);

          const response = await fetch(targetChatUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const data = await response.json();
            
            // ✅ ზუსტად იგივე პასუხის პარსინგი, რაც საცავშია
            let content = '';
            if (model.isCloudflare) content = data.result?.response?.trim() || '';
            else if (model.isGemini) content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            else {
              if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                content = data.choices[0].message.content?.trim() || '';
              } else if (data.error) {
                content = `API Error: ${data.error.message || JSON.stringify(data.error)}`;
              }
            }
            
            if (content && content.length > 0) {
              addLog(`✅ [SUCCESS] მოდელმა წარმატებით დააგენერირა ტექსტი!`);
              addLog(`📝 [RESULT] პასუხი: "${content.substring(0, 100)}..."`);
              return { 
                success: true, 
                type: 'text', 
                result: content, 
                modelName: model.modelName, 
                provider: model.provider, 
                logs 
              };
            } else {
              addLog(`⚠️ [WARNING] მოდელმა დააბრუნა ცარიელი ან არასწორი პასუხი.`);
              failedModels.push({ model: model.modelName, provider: model.provider, reason: 'Empty or invalid response' });
            }
          } else {
            const errText = await response.text();
            addLog(`❌ [FAILURE] მოდელმა ვერ შეასრულა მოთხოვნა. HTTP სტატუსი: ${response.status}`);
            addLog(`📉 [FAILURE] მიზეზი: ${errText.substring(0, 300)}`);
            
            failedModels.push({
              model: model.modelName,
              provider: model.provider,
              reason: `HTTP ${response.status}: ${errText.substring(0, 200)}`
            });
          }

        } catch (error: any) {
          addLog(`💥 [CRITICAL] ქსელური ან სისტემური შეცდომა: ${error.message}`);
          failedModels.push({
            model: model.modelName,
            provider: model.provider,
            reason: `Network/Config error: ${error.message}`
          });
        }
      }

      addLog("\n🏁 [TEST] ტესტი დასრულდა. ვერცერთმა მოდელმა ვერ შეძლო ტექსტის გენერაცია.");
      addLog(`📊 [REPORT] წარუმატებელი მოდელები (${failedModels.length}):`);
      
      failedModels.forEach((fm, idx) => {
        addLog(`  ${idx + 1}. ${fm.provider} -> ${fm.model}`);
        addLog(`     მიზეზი: ${fm.reason}`);
      });
      
      addLog("\n💡 [RECOMMENDATION] გთხოვთ, შეამოწმოთ ზემოთ მოცემული მიზეზები და გადაწყვიტოთ:");
      addLog("   - თუ შეცდომა 404/400-ა, დარწმუნდით, რომ Metadata-ში სწორად არის მითითებული 'baseUrl' და 'chatEndpoint'.");
      addLog("   - თუ შეცდომა 401/403-ა, შეამოწმეთ API გასაღების ვალიდურობა ან ბალანსი.");
      addLog("   - თუ მოდელი ნამდვილად არ მუშაობს, შეგიძლიათ ხელით ამოშალოთ იგი ან გადაიტანოთ საცავიდან.");

      return { 
        success: false, 
        error: 'All chat models failed. Check detailed logs for reasons.', 
        failedModels,
        logs 
      };

    } else {
      // ==========================================
      // ფოტოს გენერაციის ტესტი
      // ==========================================
      addLog("📡 [API VAULT] იგზავნება მოთხოვნა: 'მიმაწოდე საუკეთესო ფოტოს გენერაციის მოდელი'.");
      const testPrompt = "A beautiful, mystical cosmic landscape with glowing stars and a crescent moon, digital art, high quality, 8k resolution";
      
      addLog('📤 [REQUEST] იწყება ფოტოს გენერაცია imageGenerator სერვისის მეშვეობით...');
      const genResult = await imageGenerator.generateImage(testPrompt, 'test-panel');
      
      if (genResult.success && genResult.imageBuffer) {
        const base64Image = `data:image/png;base64,${genResult.imageBuffer.toString('base64')}`;
        addLog(`✅ [SUCCESS] ფოტო წარმატებით შეიქმნა მოდელით: ${genResult.provider || 'Unknown'}`);
        return { success: true, type: 'image', result: base64Image, logs: genResult.generationLogs || logs };
      } else {
        addLog(`❌ [FAILURE] ფოტოს გენერაცია ვერ მოხერხდა: ${genResult.error}`);
        return { success: false, error: genResult.error, logs: genResult.generationLogs || logs };
      }
    }
  } catch (error: any) {
    addLog(`💥 [CRITICAL] კრიტიკული შეცდომა ტესტის პროცესში: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}