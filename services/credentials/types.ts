// ============================================================
// LUNARA OS — Credentials Types
// Foundation: §21, §22, §40, §51
// ============================================================

// ✅ განახლებული: ნებისმიერი სტრიქონი (string), რათა მომავალში კოდის შეცვლის გარეშე დაემატოს ახალი პროვაიდერები (მაგ: "kie", "stability", "midjourney")
export type Provider = string;

export type CredentialStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED";

export type PermissionScope = 
  | "read" 
  | "write" 
  | "execute" 
  | "publish" 
  | "spend" 
  | "access_resource" 
  | "manage_credentials" 
  | "admin";

export interface Credential {
  credential_id: string;
  provider: Provider;
  name: string;
  encrypted_value: string; // §40: არასდროს ინახება plaintext-ში
  scope: PermissionScope;
  status: CredentialStatus;
  owner: "human_executive" | string; // §35: Human executive ფლობს sensitive credentials-ს
  created_at: number;
  last_rotated_at: number | null;
  expires_at: number | null;
  
  // ✅ ახალი: ტესტირების შედეგებისა და მოდელების შესანახად
  metadata?: {
    models?: string[];
    recommendedModel?: string;
    lastTestedAt?: number;
    testSuccess?: boolean;
    testLatency?: number;
  };
}

export interface AccessLease {
  lease_id: string;
  agent_id: string;
  credential_id: string;
  provider: Provider;
  permission: PermissionScope;
  purpose: string;
  task_id: string | null;
  status: "REQUESTED" | "APPROVED" | "ACTIVE" | "EXPIRED" | "REVOKED";
  created_at: number;
  approved_at: number | null;
  activated_at: number | null;
  expires_at: number;
  revoked_at: number | null;
  approved_by: string;
}

export interface CredentialAuditLog {
  log_id: string;
  action: "created" | "rotated" | "revoked" | "lease_requested" | "lease_approved" | "lease_revoked" | "access_attempt";
  actor_id: string;
  target_credential_id: string | null;
  result: "success" | "failure" | "denied";
  reason: string;
  timestamp: number;
}