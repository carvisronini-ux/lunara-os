// ============================================================
// LUNARA OS — Mock Proxy (Zero-Budget Simulation)
// Foundation: §5, §26
// Purpose: Simulate API responses without real HTTP calls
// NOTE: In production, this would be replaced with real API calls
// ============================================================

import { accessManager } from './access-manager';
import { credentialVault } from './credential-vault';

export interface ProxyRequest {
  lease_id: string;
  action: string;
  parameters: Record<string, unknown>;
}

export interface ProxyResponse {
  success: boolean;
  data: unknown;
  error?: string;
}

export class MockProxy {
  constructor() {
    console.log('[MockProxy] Initialized (simulation mode)');
  }

  public async execute(request: ProxyRequest): Promise<ProxyResponse> {
    // 1. Validate lease
    if (!accessManager.validateLease(request.lease_id)) {
      return {
        success: false,
        data: null,
        error: "Invalid or expired lease"
      };
    }

    // 2. Get lease details
    const leases = accessManager.getAllLeases();
    const lease = leases.find(l => l.lease_id === request.lease_id);
    if (!lease) {
      return { success: false, data: null, error: "Lease not found" };
    }

    // 3. Update quota
    credentialVault.updateQuota(lease.credential_id);

    // 4. Simulate API response based on provider and action
    const response = this.simulateResponse(lease.provider, request.action, request.parameters);

    console.log(`[MockProxy] ✅ Executed ${request.action} for ${lease.agent_id} via ${lease.provider}`);

    return response;
  }

  private simulateResponse(provider: string, action: string, params: Record<string, unknown>): ProxyResponse {
    // Simulate different API responses
    switch (provider) {
      case "tiktok":
        if (action === "fetch_trending_hashtags") {
          return {
            success: true,
            data: {
              hashtags: [
                { name: "#astrology", views: 15000000, growth: "+12%" },
                { name: "#tarot", views: 8500000, growth: "+8%" },
                { name: "#relationships", views: 22000000, growth: "+15%" }
              ],
              timestamp: Date.now()
            }
          };
        }
        break;

      case "telegram":
        if (action === "send_message") {
          return {
            success: true,
            data: {
              message_id: `msg_${Date.now()}`,
              chat_id: params.chat_id,
              sent_at: Date.now()
            }
          };
        }
        break;

      case "openai":
        if (action === "generate_content") {
          return {
            success: true,
            data: {
              content: "Simulated AI-generated content for demo purposes",
              tokens_used: 150,
              model: "gpt-4"
            }
          };
        }
        break;
    }

    return {
      success: false,
      data: null,
      error: `Unknown action: ${action} for provider: ${provider}`
    };
  }
}

export const mockProxy = new MockProxy();