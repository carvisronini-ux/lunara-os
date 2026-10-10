// /home/carvisronini-ux/lunara-os/services/agents/image-generator.ts
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  provider?: string;
  generationLogs: string[];
}

// უნივერსალური API endpoint-ების გენერატორი ნებისმიერი პროვაიდერისთვის
const getProviderEndpoints = (provider: string) => {
  const p = provider.toLowerCase();
  
  const knownEndpoints: Record<string, { models: string; images: string }> = {
    groq: {
      models: 'https://api.groq.com/openai/v1/models',
      images: 'https://api.groq.com/openai/v1/images/generations'
    },
    gemini: {
      models: 'https://generativelanguage.googleapis.com/v1beta/models',
      images: 'https://generativelanguage.googleapis.com/v1beta/models'
    },
    deepseek: {
      models: 'https://api.deepseek.com/v1/models',
      images: 'https://api.deepseek.com/v1/images/generations'
    },
    kie: {
      models: 'https://api.kie.ai/v1/models',
      images: 'https://api.kie.ai/v1/images/generations'
    },
    openai: {
      models: 'https://api.openai.com/v1/models',
      images: 'https://api.openai.com/v1/images/generations'
    },
    huggingface: {
      models: 'https://api-inference.huggingface.co/models',
      images: 'https://api-inference.huggingface.co/models'
    },
    cloudflare: {
      models: 'https://api.cloudflare.com/client/v4/accounts',
      images: 'https://api.cloudflare.com/client/v4/accounts'
    },
    mistral: {
      models: 'https://api.mistral.ai/v1/models',
      images: 'https://api.mistral.ai/v1/images/generations'
    }
  };

  if (knownEndpoints[p]) {
    return knownEndpoints[p];
  }

  return {
    models: `https://api.${p}.com/v1/models`,
    images: `https://api.${p}.com/v1/images/generations`
  };
};

const getAuthHeaders = (provider: string, apiKey: string): Record<string, string> => {
  const p = provider.toLowerCase();
  if (p === 'gemini') return {};
  if (p === 'cloudflare') return { 'Authorization': `Bearer ${apiKey}` };
  return { 'Authorization': `Bearer ${apiKey}` };
};

const filterImageModels = (provider: string, models: any[]): string[] => {
  const p = provider.toLowerCase();
  
  if (p === 'gemini') {
    return models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateImages'))
      .map((m: any) => m.name.replace('models/', ''));
  }

  if (p === 'huggingface') {
    return models
      .filter((m: any) => 
        m.pipeline_tag === 'text-to-image' || 
        m.pipeline_tag === 'image-to-image' ||
        m.id?.toLowerCase().includes('flux') ||
        m.id?.toLowerCase().includes('stable-diffusion') ||
        m.id?.toLowerCase().includes('sdxl')
      )
      .map((m: any) => m.id);
  }

  if (p === 'cloudflare') {
    return models
      .filter((m: any) => 
        m.id?.startsWith('@cf/') && 
        (m.id?.toLowerCase().includes('image') || m.id?.toLowerCase().includes('flux'))
      )
      .map((m: any) => m.id);
  }

  return models
    .filter((m: any) => 
      (m.id || m.name) && (
        (m.id || m.name).toLowerCase().includes('image') ||
        (m.id || m.name).toLowerCase().includes('vision') ||
        (m.id || m.name).toLowerCase().includes('flux') ||
        (m.id || m.name).toLowerCase().includes('dall-e') ||
        (m.id || m.name).toLowerCase().includes('kontext') ||
        (m.id || m.name).toLowerCase().includes('sd') ||
        (m.id || m.name).toLowerCase().includes('generate')
      )
    )
    .map((m: any) => m.id || m.name);
};

const buildGenerationBody = (provider: string, model: string, prompt: string): any => {
  const p = provider.toLowerCase();
  
  if (p === 'gemini') {
    return {
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '4:5', personGeneration: 'allow_all' }
    };
  }

  if (p === 'huggingface') {
    return { inputs: prompt };
  }

  if (p === 'cloudflare') {
    return { prompt };
  }

  return {
    model,
    prompt,
    n: 1,
    size: '1024x1280'
  };
};

const parseImageResponse = (provider: string, data: any): { url?: string; b64?: string } | null => {
  const p = provider.toLowerCase();
  
  if (p === 'gemini') {
    if (data.predictions?.[0]?.bytesBase64Encoded) {
      return { b64: data.predictions[0].bytesBase64Encoded };
    }
  }

  if (p === 'huggingface') {
    if (data.url) return { url: data.url };
    if (data.output?.url) return { url: data.output.url };
  }

  if (p === 'cloudflare') {
    if (data.result?.output?.url) return { url: data.result.output.url };
    if (data.result?.output?.image) return { b64: data.result.output.image };
  }

  if (data.data?.[0]?.url) return { url: data.data[0].url };
  if (data.data?.[0]?.b64_json) return { b64: data.data[0].b64_json };
  
  return null;
};

export class ImageGenerator {
  async generateImage(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const logs: string[] = [];
    logs.push(`🎨 იწყება სურათის გენერაცია აგენტისთვის: ${agentType}`);
    logs.push(`📝 Prompt: ${imagePrompt.substring(0, 80)}...`);
    logs.push(`🔍 ვიწყებ API საცავის სრულ სკანირებას...`);

    await credentialVault.ready;

    const allCredentials = this.getAllCredentials();
    
    if (allCredentials.length === 0) {
      logs.push(`❌ API საცავი ცარიელია.`);
      return { success: false, error: 'No credentials found in vault', generationLogs: logs };
    }

    logs.push(`📦 საცავში ნაპოვნია ${allCredentials.length} API გასაღები.`);

    const providersMap = new Map<string, any[]>();
    allCredentials.forEach(cred => {
      const provider = cred.provider.toLowerCase();
      if (!providersMap.has(provider)) {
        providersMap.set(provider, []);
      }
      providersMap.get(provider)!.push(cred);
    });

    const providerNames = Array.from(providersMap.keys()).map(p => p.toUpperCase()).join(', ');
    logs.push(`🏢 ნაპოვნი პროვაიდერები: ${providerNames}`);
    logs.push(`🔎 ვამოწმებ თითოეულ პროვაიდერს სურათის გენერაციის შესაძლებლობაზე...\n`);

    let attemptNumber = 0;
    const totalProviders = providersMap.size;

    for (const [provider, creds] of providersMap.entries()) {
      attemptNumber++;
      const providerUpper = provider.toUpperCase();
      logs.push(`═══════════════════════════════════════`);
      logs.push(`🔄 [${attemptNumber}/${totalProviders}] ვამოწმებ ${providerUpper}-ს...`);
      logs.push(`═══════════════════════════════════════`);

      const endpoints = getProviderEndpoints(provider);
      logs.push(`📡 ${providerUpper}: API Endpoint: ${endpoints.models}`);

      for (const cred of creds) {
        try {
          const leaseId = accessManager.requestAccess(
            `${agentType}-img-${provider}`,
            provider,
            cred.scope || 'spend',
            'Image Gen Scan',
            null,
            60
          );
          
          if (!leaseId) {
            logs.push(`⚠️ ${providerUpper}: ლიზის მიღება ვერ მოხერხდა.`);
            continue;
          }

          try {
            const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-${provider}`);
            if (!apiKey) {
              logs.push(`⚠️ ${providerUpper}: გასაღების დეშიფრაცია ვერ მოხერხდა.`);
              continue;
            }

            logs.push(`🔑 ${providerUpper}: გასაღები წარმატებით დეშიფრირდა.`);
            logs.push(`📡 ${providerUpper}: ვითხოვ მოდელების სიას...`);
            
            const modelsUrl = (provider === 'gemini') 
              ? `${endpoints.models}?key=${apiKey}`
              : endpoints.models;
            
            const authHeaders = getAuthHeaders(provider, apiKey);
            
            const modelsRes = await fetch(modelsUrl, {
              headers: authHeaders
            });

            if (!modelsRes.ok) {
              logs.push(`❌ ${providerUpper}: მოდელების სიის მიღება ვერ მოხერხდა (HTTP ${modelsRes.status}).`);
              continue;
            }

            const modelsData = await modelsRes.json();
            
            const modelsArray = modelsData.data || modelsData.models || modelsData.result || (Array.isArray(modelsData) ? modelsData : []);
            
            logs.push(`📋 ${providerUpper}: მიღებულია ${modelsArray.length} მოდელი.`);

            const imageModels = filterImageModels(provider, modelsArray);

            if (imageModels.length === 0) {
              logs.push(`⚠️ ${providerUpper}: არ დაუბრუნებია სურათის გენერაციის მოდელები.`);
              
              // ✅ DEEP DEBUG ბლოკი: თუ მოდელები არსებობს, მაგრამ ფილტრმა ვერ ამოიცნო, ვაჩვენებთ ნიმუშებს
              if (modelsArray.length > 0) {
                const sampleModels = modelsArray.slice(0, 5).map((m: any) => m.id || m.name || JSON.stringify(m)).join(' | ');
                logs.push(`🔍 DEBUG ${providerUpper}: ფილტრმა ვერ ამოიცნო მოდელები. API-ს მიერ დაბრუნებული ნიმუშები: [${sampleModels}]`);
              }
              continue;
            }

            const targetModel = imageModels[0];
            logs.push(`✅ ${providerUpper}: დააბრუნა სურათის მოდელი: ${targetModel}`);
            logs.push(`🤖 ${providerUpper}: ვცდილობ გენერაციას...`);

            let genUrl = endpoints.images;
            if (provider === 'gemini') {
              genUrl = `${endpoints.images}/${targetModel}:generateImages?key=${apiKey}`;
            } else if (provider === 'huggingface') {
              genUrl = `${endpoints.images}/${targetModel}`;
            } else if (provider === 'cloudflare') {
              genUrl = `${endpoints.images}/${cred.metadata?.accountId || 'default'}/ai/run/${targetModel}`;
            }

            logs.push(`📤 ${providerUpper}: ვგზავნი გენერაციის მოთხოვნას...`);

            const genRes = await fetch(genUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...authHeaders
              },
              body: JSON.stringify(buildGenerationBody(provider, targetModel, imagePrompt))
            });

            if (!genRes.ok) {
              const errorText = await genRes.text();
              logs.push(`❌ ${providerUpper}: გენერაცია ვერ მოხერხდა (HTTP ${genRes.status}).`);
              logs.push(`   შეცდომა: ${errorText.substring(0, 150)}`);
              continue;
            }

            const genData = await genRes.json();
            const imageData = parseImageResponse(provider, genData);

            if (!imageData) {
              logs.push(`❌ ${providerUpper}: პასუხში სურათი ვერ ვიპოვე.`);
              continue;
            }

            logs.push(`🎉 ${providerUpper}: სურათი წარმატებით შეიქმნა!`);
            logs.push(`═══════════════════════════════════════\n`);
            
            const result: ImageGenerationResult = {
              success: true,
              provider: provider,
              generationLogs: logs
            };

            if (imageData.url) result.imageUrl = imageData.url;
            if (imageData.b64) result.imageBuffer = Buffer.from(imageData.b64, 'base64');

            return result;

          } finally {
            accessManager.revokeLease(leaseId, 'system_cleanup');
          }
        } catch (error: any) {
          logs.push(`❌ ${providerUpper}: კრიტიკული შეცდომა: ${error.message}`);
        }
      }
    }

    logs.push(`\n═══════════════════════════════════════`);
    logs.push(`❌ ვერცერთმა პროვაიდერმა ვერ შექმნა სურათი.`);
    logs.push(`═══════════════════════════════════════`);
    
    return {
      success: false,
      error: 'All providers failed to generate image.',
      generationLogs: logs
    };
  }

  private getAllCredentials(): any[] {
    try {
      if (typeof (credentialVault as any).getAllCredentials === 'function') {
        return (credentialVault as any).getAllCredentials() || [];
      }
      if ((credentialVault as any).credentials && Array.isArray((credentialVault as any).credentials)) {
        return (credentialVault as any).credentials;
      }
      if (typeof (credentialVault as any).getCredentials === 'function') {
        return (credentialVault as any).getCredentials() || [];
      }

      const allCreds: any[] = [];
      const knownProviders = ['groq', 'gemini', 'deepseek', 'kie', 'openai', 'anthropic', 'mistral', 'cohere', 'huggingface', 'cloudflare'];
      
      for (const provider of knownProviders) {
        try {
          const cred = credentialVault.getCredentialByProvider(provider, 'spend');
          if (cred) {
            allCreds.push(cred);
          }
        } catch (e) {
          // ვტოვებთ
        }
      }
      
      return allCreds;
    } catch (error) {
      console.error('[ImageGenerator] Failed to get all credentials:', error);
      return [];
    }
  }
}

export const imageGenerator = new ImageGenerator();