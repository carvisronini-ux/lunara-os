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

      // 1. დინამიურად ვაგროვებთ მოდელებს მხოლოდ მეტამონაცემების საფუძველზე (ნულოვანი Hardcoding)
      for (const cred of credentials) {
        const meta = cred.metadata || {};
        if (meta.chatModels && Array.isArray(meta.chatModels) && meta.chatModels.length > 0) {
          const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(cred.credential_id);
          
          // დინამიური მისამართის აგება მეტამონაცემებიდან
          const base = meta.baseUrl || `https://api.${cred.provider.toLowerCase()}.com/v1`;
          const chatEndpoint = `${base}${meta.chatEndpoint || '/chat/completions'}`;
          const authHeaderKey = meta.authHeaderKey || 'Authorization';
          const authHeaderValue = meta.authHeaderPrefix ? `${meta.authHeaderPrefix} ${apiKey}` : `Bearer ${apiKey}`;

          for (const modelName of meta.chatModels) {
            allChatModels.push({
              modelName,
              provider: cred.provider,
              credentialId: cred.credential_id,
              apiKey,
              chatEndpoint,
              authHeaderKey,
              authHeaderValue
            });
          }
        }
      }

      if (allChatModels.length === 0) {
        addLog("❌ [API VAULT] პასუხი: საცავში ვერ მოიძებნა ვერცერთი აქტიური ჩეთის მოდელი.");
        return { success: false, error: 'No chat models available in the vault', logs };
      }

      addLog(`✅ [API VAULT] პასუხი მიღებულია. ნაპოვნია ${allChatModels.length} პოტენციური მოდელი. ვიწყებთ თანმიმდევრულ ტესტირებას...`);

      // 2. ვცდილობთ თითოეულ მოდელს და ვაფიქსირებთ შედეგებს (არაფერს ვშლით ავტომატურად)
      const failedModels: any[] = [];
      
      for (let i = 0; i < allChatModels.length; i++) {
        const model = allChatModels[i];
        addLog(`\n🔄 [TEST] ვცდილობ მოდელს [${i + 1}/${allChatModels.length}]: ${model.provider} -> ${model.modelName}`);
        addLog(`📍 [INFO] Endpoint: ${model.chatEndpoint}`);

        try {
          const requestBody = {
            model: model.modelName,
            messages: [{ role: 'user', content: 'დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.' }],
            temperature: 0.7,
            max_tokens: 100
          };

          const headers: Record<string, string> = {
            [model.authHeaderKey]: model.authHeaderValue,
            'Content-Type': 'application/json'
          };

          addLog(`📤 [REQUEST] იგზავნება POST მოთხოვნა...`);
          addLog(`📦 [REQUEST] Payload: ${JSON.stringify(requestBody).substring(0, 150)}...`);

          const response = await fetch(model.chatEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const data = await response.json();
            // დინამიურად ვეძებთ პასუხს სხვადასხვა ფორმატში (OpenAI, Cloudflare, ა.შ.)
            const text = data.choices?.[0]?.message?.content || data.result?.response || data.text || '';
            
            if (text && text.trim().length > 0) {
              addLog(`✅ [SUCCESS] მოდელმა წარმატებით დააგენერირა ტექსტი!`);
              addLog(`📝 [RESULT] პასუხი: "${text.trim().substring(0, 100)}..."`);
              return { 
                success: true, 
                type: 'text', 
                result: text.trim(), 
                modelName: model.modelName, 
                provider: model.provider, 
                logs 
              };
            } else {
              addLog(`⚠️ [WARNING] მოდელმა დააბრუნა ცარიელი პასუხი.`);
              failedModels.push({
                model: model.modelName,
                provider: model.provider,
                reason: 'Empty response'
              });
            }
          } else {
            // თუ ვერ მოხერხდა, ვიღებთ დეტალურ მიზეზს
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
            reason: `Network error: ${error.message}`
          });
        }
      }

      // 3. თუ ყველა მოდელი ვერ იმუშავა, ვაბრუნებთ დეტალურ ანგარიშს (არაფერს ვშლით)
      addLog("\n🏁 [TEST] ტესტი დასრულდა. ვერცერთმა მოდელმა ვერ შეძლო ტექსტის გენერაცია.");
      addLog(`📊 [REPORT] წარუმატებელი მოდელები (${failedModels.length}):`);
      
      failedModels.forEach((fm, idx) => {
        addLog(`  ${idx + 1}. ${fm.provider} -> ${fm.model}`);
        addLog(`     მიზეზი: ${fm.reason}`);
      });
      
      addLog("\n💡 [RECOMMENDATION] გთხოვთ, შეამოწმოთ ზემოთ მოცემული მიზეზები და გადაწყვიტოთ:");
      addLog("   - თუ შეცდომა დროებითია (429, 503), სცადეთ ხელახლა რამდენიმე წუთში.");
      addLog("   - თუ შეცდომა 404-ა, შეამოწმეთ Metadata-ში baseUrl და chatEndpoint.");
      addLog("   - თუ შეცდომა 401/403-ა, შეამოწმეთ API გასაღების ვალიდურობა.");
      addLog("   - თუ მოდელი ნამდვილად არ მუშაობს, შეგიძლიათ ხელით ამოშალოთ იგი საცავიდან.");

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