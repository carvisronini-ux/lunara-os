// ============================================================
// LUNARA OS — Resource Manager (Health & Registry Only)
// Foundation §36-37, §88-91
// Note: Lease management moved to services/credentials/access-manager.ts (§62)
// ============================================================

import type { ProviderHealth } from './contracts';
import { osEngine } from './engine';

// ლოკალური ტიპის განსაზღვრა, რადგან Resource არ არის ექსპორტირებული contracts-დან
export interface Resource {
  resource_id: string;
  name: string;
  type: string;
  health: ProviderHealth;
  last_health_check: number;
  [key: string]: any; // ნებისმიერი დამატებითი ველის დასაშვებად
}

export class ResourceManager {
  private resources: Map<string, Resource> = new Map();

  constructor() {
    console.log('[ResourceManager] 📦 Resource registry initialized');
  }

  // ----------------------------------------------------------
  // §36-37 — Resource Registry
  // ----------------------------------------------------------
  public registerResource(resource: Resource) {
    this.resources.set(resource.resource_id, resource);
    console.log(`[ResourceManager] ✅ Registered resource: ${resource.name}`);
  }

  public getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  public getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  public updateResourceHealth(resourceId: string, health: ProviderHealth) {
    const resource = this.resources.get(resourceId);
    if (resource) {
      const oldHealth = resource.health;
      resource.health = health;
      resource.last_health_check = Date.now();
      
      osEngine.emitEvent({
        event_id: `evt_health_${Date.now()}_${Math.random()}`,
        type: "SYSTEM_HEALTH_CHANGED" as any,
        timestamp: Date.now(),
        agent_id: null,
        task_id: null,
        resource_id: resourceId,
        content_id: null,
        payload: { oldHealth, newHealth: health },
        severity: health === "UNAVAILABLE" ? "critical" as any : "info" as any
      });

      console.log(`[ResourceManager] 📊 Health updated for ${resource.name}: ${health}`);
    }
  }
}

// Singleton instance
export const resourceManager = new ResourceManager();