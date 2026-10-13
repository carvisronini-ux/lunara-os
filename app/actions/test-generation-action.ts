// /home/carvisronini-ux/lunara-os/app/actions/test-generation-action.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';
import { getBestAvailableModel, reclassifyModelToImage } from '@/services/agents/model-router';
import { imageGenerator } from '@/services/agents/image-generator';

export async function testGenerationAction(testType: 'text' | 'image') {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    logs.push(`[${new Date().toLocaleTimeString('ka-GE', { hour12: false })}] ${msg}`);
    console.log(`[TEST GEN] ${msg}`);
  };

  await credentialVault.ready;
  addLog(`იწყება ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} გენერაციის ტესტი საცავის მონაცემებით...`);

  try {
    if (testType === 'text') {
      // 1. ვიღებთ საუკეთესო ჩეთის მოდელს პირდაპირ ჩვენი საცავიდან/რაუტერიდან
      const modelInfo = await getBestAvailableModel('chat');
      
      if (!modelInfo) {
        addLog('❌ საცავში ჩეთის მოდელები ვერ მოიძებნა.');
        return { success: false, error: 'No chat models available in the vault', logs };
      }

      addLog(`✅ საცავიდან არჩეულია მოდელი: ${modelInfo.provider} -> ${modelInfo.modelName}`);
      
      // 2. ვაგებთ Endpoint-ს ზუსტად ისე, როგორც Orchestrator-შია (რათა ლოგიკა იყოს იდენტური)
      let chatEndpoint = `https://api.${modelInfo.provider}.com/v1/chat/completions`;
      if (modelInfo.provider === 'groq') chatEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (modelInfo.provider === 'mistral') chatEndpoint = 'https://api.mistral.ai/v1/chat/completions';
      else if (modelInfo.provider === 'deepseek') chatEndpoint = 'https://api.deepseek.com/v1/chat/completions';
      else if (modelInfo.provider === 'openai') chatEndpoint = 'https://api.openai.com/v1/chat/completions';
      else if (modelInfo.provider === 'gemini' || modelInfo.provider === 'google') {
        chatEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelInfo.modelName}:generateContent?key=${modelInfo.apiKey}`;
      }

      // 3. ვაგებთ Request-ს პროვაიდერის მიხედვით
      let requestBody: any;
      let headers: Record<string, string>;

      if (modelInfo.provider === 'gemini' || modelInfo.provider === 'google') {
        requestBody = {
          contents: [{ parts: [{ text: 'დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.' }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        };
        headers = { 'Content-Type': 'application/json' };
      } else {
        requestBody = {
          model: modelInfo.modelName,
          messages: [{ role: 'user', content: 'დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.' }],
          temperature: 0.7,
          max_tokens: 100
        };
        headers = {
          'Authorization': `Bearer ${modelInfo.apiKey}`,
          'Content-Type': 'application/json'
        };
      }

      addLog('📤 იგზავნება მოთხოვნა არჩეულ პროვაიდერზე...');
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        // თუ მოდელი ამბობს რომ ჩეთი არ შეუძლია, ავტომატურად გადაგვაქვს ის Image კატეგორიაში (თვითაღდგენა)
        if (errText.toLowerCase().includes('not supported') || errText.toLowerCase().includes('image')) {
          addLog(`⚠️ მოდელი "${modelInfo.modelName}" არ არის ჩეთის მოდელი. სისტემა ავტომატურად ასწორებს მონაცემთა ბაზას...`);
          await reclassifyModelToImage(modelInfo.credentialId, modelInfo.modelName);
          return { success: false, error: 'Model reclassified as Image. Please try again.', logs, reclassified: true };
        }
        throw new Error(`API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      
      // 4. ვკითხულობთ პასუხს პროვაიდერის ფორმატის მიხედვით
      let text = 'No content generated';
      if (modelInfo.provider === 'gemini' || modelInfo.provider === 'google') {
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content generated';
      } else {
        text = data.choices?.[0]?.message?.content || 'No content generated';
      }
      
      addLog('✅ ტექსტი წარმატებით დაგენერირდა საცავის მოდელით!');
      return { success: true, type: 'text', result: text, modelName: modelInfo.modelName, provider: modelInfo.provider, logs };

    } else {
      // ==========================================
      // ფოტოს გენერაციის ტესტი
      // ==========================================
      addLog('🔍 საცავიდან იძებნება საუკეთესო ფოტოს გენერაციის მოდელი...');
      const testPrompt = "A beautiful, mystical cosmic landscape with glowing stars and a crescent moon, digital art, high quality, 8k resolution";
      
      addLog('📤 იწყება ფოტოს გენერაცია (იყენებს ზუსტად იგივე imageGenerator ლოგიკას, რასაც აგენტი)...');
      
      // აქ პირდაპირ ვიძახებთ ჩვენს უკვე აგებულ და გამართულ კლასს
      const genResult = await imageGenerator.generateImage(testPrompt, 'test-panel');
      
      if (genResult.success && genResult.imageBuffer) {
        const base64Image = `data:image/png;base64,${genResult.imageBuffer.toString('base64')}`;
        addLog(`✅ ფოტო წარმატებით შეიქმნა მოდელით: ${genResult.provider || 'Unknown'}`);
        return { success: true, type: 'image', result: base64Image, logs: genResult.generationLogs || logs };
      } else {
        addLog(`❌ ფოტოს გენერაცია ვერ მოხერხდა: ${genResult.error}`);
        return { success: false, error: genResult.error, logs: genResult.generationLogs || logs };
      }
    }
  } catch (error: any) {
    addLog(`❌ კრიტიკული შეცდომა: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}