// /home/carvisronini-ux/lunara-os/services/agents/model-router.ts
import { credentialVault } from '@/services/credentials/credential-vault';

export async function getBestAvailableModel(taskType: 'chat' | 'image', excludeModelName?: string) {
  await credentialVault.ready;
  const credentials = credentialVault.getMetadata().filter((c: any) => c.status === 'ACTIVE');

  for (const cred of credentials) {
    const meta = cred.metadata || {};
    
    if (taskType === 'chat' && meta.chatModels && meta.chatModels.length > 0) {
      const availableModels = meta.chatModels.filter((m: string) => m !== excludeModelName);
      if (availableModels.length > 0) {
        return {
          provider: cred.provider,
          credentialId: cred.credential_id,
          modelName: availableModels[0], 
          apiKey: (credentialVault as any).getDecryptedValueForTesting?.(cred.credential_id)
        };
      }
    }
    
    if (taskType === 'image' && meta.imageModels && meta.imageModels.length > 0) {
      const availableModels = meta.imageModels.filter((m: string) => m !== excludeModelName);
      if (availableModels.length > 0) {
        return {
          provider: cred.provider,
          credentialId: cred.credential_id,
          modelName: availableModels[0],
          apiKey: (credentialVault as any).getDecryptedValueForTesting?.(cred.credential_id)
        };
      }
    }
  }

  return null;
}

export async function reclassifyModelToChat(credentialId: string, modelName: string) {
  const cred = credentialVault.getMetadata().find((c: any) => c.credential_id === credentialId);
  if (!cred || !cred.metadata) return;

  const meta = cred.metadata;
  meta.imageModels = (meta.imageModels || []).filter((m: string) => m !== modelName);
  
  if (!meta.chatModels) meta.chatModels = [];
  if (!meta.chatModels.includes(modelName)) {
    meta.chatModels.push(modelName);
  }

  await (credentialVault as any).updateCredentialMetadata(credentialId, meta);
  console.log(`[Model Router] ⚠️ მოდელი "${modelName}" ავტომატურად გადატანილია Chat კატეგორიაში.`);
}

// ✅ ახალი: თუ "ჩეთის" მოდელი აღმოჩნდა ფოტოს გენერატორი, გადავიყვანოთ იქ
export async function reclassifyModelToImage(credentialId: string, modelName: string) {
  const cred = credentialVault.getMetadata().find((c: any) => c.credential_id === credentialId);
  if (!cred || !cred.metadata) return;

  const meta = cred.metadata;
  meta.chatModels = (meta.chatModels || []).filter((m: string) => m !== modelName);
  
  if (!meta.imageModels) meta.imageModels = [];
  if (!meta.imageModels.includes(modelName)) {
    meta.imageModels.push(modelName);
  }

  await (credentialVault as any).updateCredentialMetadata(credentialId, meta);
  console.log(`[Model Router] ⚠️ მოდელი "${modelName}" ავტომატურად გადატანილია Image კატეგორიაში.`);
}