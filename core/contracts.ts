// ============================================================
// LUNARA OS — Core Contracts
// Foundation v1.0 — Phase 1
// ============================================================
// These contracts define the stable interfaces of Lunara OS.
// Implementations may change; contracts remain stable.
// Reference: Foundation §112 — "The system should be designed
// around contracts, not implementations."
// ============================================================

/* ============================================================
   §14 — Agent Statuses
   Every agent has an operational status used by the Virtual
   Office and the Task Engine.
   ============================================================ */

   export type AgentStatus =
   | "offline"
   | "idle"
   | "starting"
   | "working"
   | "waiting"
   | "waiting_for_resource"
   | "waiting_for_review"
   | "error"
   | "paused"
   | "suspended"
   | "completed";
 
 /* ============================================================
    §51 — Autonomy Levels
    L0 = Manual (human does everything)
    L1 = Assisted (agent suggests, human approves)
    L2 = Automatic with approval (agent acts, human approves high-risk)
    L3 = Autonomous within policy (agent acts freely within bounds)
    L4 = High autonomy (agent can modify its own policies)
    ============================================================ */
 
 export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;
 
 /* ============================================================
    §16 — Agent Constitution
    Every agent must have a machine-readable constitution.
    This is the permanent identity document of an agent.
    ============================================================ */
 
 export interface AgentConstitution {
   /** Machine-readable permanent ID (e.g., "trend_hunter_v1") */
   agent_id: string;
   
   /** Human-friendly display name (e.g., "Nyx") */
   display_name: string;
   
   /** Semantic version (e.g., "1.0.0") */
   version: string;
   
   /** Department ID */
   department: DepartmentId;
   
   /** One-sentence mission statement */
   mission: string;
   
   /** What this agent is responsible for */
   responsibilities: string[];
   
   /** What this agent receives as input */
   inputs: string[];
   
   /** What this agent produces as output */
   outputs: string[];
   
   /** What this agent can do */
   capabilities: Capability[];
   
   /** What tools this agent can use */
   allowed_tools: string[];
   
   /** What resources this agent can access */
   allowed_resources: ResourceId[];
   
   /** What knowledge sources this agent can read */
   knowledge_sources: KnowledgeId[];
   
   /** Rules this agent must follow */
   rules: string[];
   
   /** Actions this agent is forbidden to perform */
   forbidden_actions: string[];
   
   /** Quality criteria for this agent's output */
   quality_criteria: string[];
   
   /** Key Performance Indicators */
   kpis: KPI[];
   
   /** Who supervises this agent */
   supervisor: string;
   
   /** Who controls this agent's operations */
   controller: string;
   
   /** Who reviews this agent's output */
   reviewer: string;
   
   /** Where to escalate if this agent fails */
   escalation_path: string[];
   
   /** Autonomy level (§51) */
   autonomy_level: AutonomyLevel;
   
   /** What to do when this agent fails */
   failure_policy: FailurePolicy;
 }
 
 /* ============================================================
    §67 — Capability
    Agents advertise capabilities. The Task Engine selects
    agents based on capability matching.
    ============================================================ */
 
 export type Capability =
   | "research.trends"
   | "research.competitors"
   | "research.audience"
   | "strategy.plan"
   | "strategy.evaluate"
   | "content.write"
   | "content.rewrite"
   | "content.hook"
   | "creative.direction"
   | "creative.image_prompt"
   | "creative.visual_concept"
   | "production.image"
   | "production.video"
   | "production.voice"
   | "production.music"
   | "production.subtitle"
   | "production.render"
   | "quality.self_check"
   | "quality.peer_review"
   | "quality.brand_check"
   | "quality.platform_check"
   | "quality.originality"
   | "quality.final_gate"
   | "publishing.telegram"
   | "publishing.tiktok"
   | "publishing.youtube"
   | "publishing.instagram"
   | "publishing.pinterest"
   | "publishing.x"
   | "analytics.collect"
   | "analytics.analyze"
   | "analytics.report"
   | "learning.discover_patterns"
   | "learning.experiment"
   | "learning.train_agent"
   | "resource.request"
   | "resource.verify"
   | "resource.cost_control"
   | "resource.security_monitor";
 
 /* ============================================================
    §33 — Task Lifecycle
    Every operational action becomes a task.
    ============================================================ */
 
 export type TaskStatus =
   | "created"
   | "queued"
   | "claimed"
   | "running"
   | "waiting"
   | "review"
   | "completed"
   | "failed"
   | "retrying"
   | "failed_permanently"
   | "escalated";
 
 export type TaskPriority = "low" | "normal" | "high" | "critical";
 
 export type ErrorCategory =
   | "TRANSIENT"
   | "RATE_LIMIT"
   | "AUTHENTICATION"
   | "PERMISSION"
   | "INVALID_INPUT"
   | "PROVIDER_ERROR"
   | "SYSTEM_ERROR"
   | "LOGIC_ERROR";
 
 export interface Task {
   /** Unique task ID */
   task_id: string;
   
   /** Idempotency key (§34) — prevents duplicate execution */
   idempotency_key: string;
   
   /** Human-readable title */
   title: string;
   
   /** Detailed description */
   description: string;
   
   /** Current status */
   status: TaskStatus;
   
   /** Priority level */
   priority: TaskPriority;
   
   /** Agent ID assigned to this task */
   agent_id: string | null;
   
   /** Department that owns this task */
   department: DepartmentId;
   
   /** Capability required to complete this task */
   required_capability: Capability;
   
   /** Task payload (structured data) */
   payload: Record<string, unknown>;
   
   /** Expected outputs */
   expected_outputs: string[];
   
   /** Dependencies — tasks that must complete before this one */
   depends_on: string[];
   
   /** Progress percentage (0-100) */
   progress: number;
   
   /** Retry count */
   retry_count: number;
   
   /** Maximum retries before escalation */
   max_retries: number;
   
   /** Last error category */
   last_error_category: ErrorCategory | null;
   
   /** Last error message */
   last_error_message: string | null;
   
   /** Timestamps */
   created_at: number;
   started_at: number | null;
   completed_at: number | null;
   deadline: number | null;
 }
 
 /* ============================================================
    §32 — Event Bus
    Events are immutable historical facts.
    Commands are requests to perform actions.
    ============================================================ */
 
 export type EventType =
   // Task events
   | "TASK_CREATED"
   | "TASK_STARTED"
   | "TASK_COMPLETED"
   | "TASK_FAILED"
   | "TASK_RETRIED"
   | "TASK_ESCALATED"
   // Resource events
   | "RESOURCE_REQUESTED"
   | "RESOURCE_GRANTED"
   | "RESOURCE_REVOKED"
   | "LEASE_CREATED"
   | "LEASE_EXPIRED"
   | "LEASE_REVOKED"
   // Asset events
   | "ASSET_REQUESTED"
   | "ASSET_CREATED"
   | "ASSET_APPROVED"
   | "ASSET_REJECTED"
   // Content events
   | "CONTENT_CREATED"
   | "CONTENT_REVIEW_REQUESTED"
   | "CONTENT_APPROVED"
   | "CONTENT_REJECTED"
   // Publishing events
   | "PUBLISH_REQUESTED"
   | "PUBLISHED"
   | "PUBLISH_FAILED"
   // Analytics events
   | "ANALYTICS_AVAILABLE"
   | "PATTERN_DISCOVERED"
   // Knowledge events
   | "KNOWLEDGE_UPDATED"
   | "KNOWLEDGE_VERSION_CREATED"
   // Agent events
   | "AGENT_REGISTERED"
   | "AGENT_STATUS_CHANGED"
   | "AGENT_VERSION_CREATED"
   | "AGENT_EVALUATED"
   | "AGENT_PROMOTED"
   | "AGENT_ROLLED_BACK"
   // System events
   | "SYSTEM_HEALTH_CHANGED"
   | "EMERGENCY_ACTIVATED"
   | "HUMAN_OVERRIDE"
   // Audit events
   | "ACCESS_REQUESTED"
   | "ACCESS_APPROVED"
   | "ACCESS_DENIED"
   | "CREDENTIAL_VERIFIED"
   | "INCIDENT_CREATED";
 
 export interface Event {
   /** Unique event ID */
   event_id: string;
   
   /** Event type */
   type: EventType;
   
   /** Timestamp (Unix ms) */
   timestamp: number;
   
   /** Agent that caused this event */
   agent_id: string | null;
   
   /** Related task ID */
   task_id: string | null;
   
   /** Related resource ID */
   resource_id: string | null;
   
   /** Related content ID */
   content_id: string | null;
   
   /** Event payload */
   payload: Record<string, unknown>;
   
   /** Severity */
   severity: "info" | "warning" | "error" | "critical";
 }
 
 /* ============================================================
    §38-39 — Access Lease
    Agents receive temporary access, not permanent secrets.
    ============================================================ */
 
 export type AccessLeaseStatus =
   | "requested"
   | "approved"
   | "active"
   | "expired"
   | "revoked";
 
 export interface AccessLease {
   /** Unique lease ID */
   lease_id: string;
   
   /** Related access request ID */
   request_id: string;
   
   /** Agent requesting access */
   agent_id: string;
   
   /** Resource being accessed */
   resource_id: ResourceId;
   
   /** Permission being granted */
   permission: string;
   
   /** Purpose of this access */
   purpose: string;
   
   /** Related task ID */
   task_id: string | null;
   
   /** Status */
   status: AccessLeaseStatus;
   
   /** Timestamps */
   created_at: number;
   approved_at: number | null;
   activated_at: number | null;
   expires_at: number;
   revoked_at: number | null;
   
   /** Who approved this lease */
   approved_by: string | null;
   
   /** Audit trail */
   audit_log: AuditEntry[];
 }
 
 /* ============================================================
    §36-45 — Resource & Credential
    ============================================================ */
 
 export type ResourceId =
   | "openai_gpt4"
   | "anthropic_claude"
   | "telegram_bot_api"
   | "tiktok_api"
   | "youtube_api"
   | "instagram_api"
   | "pinterest_api"
   | "x_api"
   | "cloudflare_r2"
   | "supabase_os"
   | "github_storage";
 
 export type ProviderHealth = "healthy" | "degraded" | "unavailable";
 
 export interface Resource {
   /** Resource ID */
   resource_id: ResourceId;
   
   /** Human-readable name */
   name: string;
   
   /** Provider type */
   type: "ai_provider" | "platform" | "storage" | "database" | "analytics";
   
   /** Provider name */
   provider: string;
   
   /** Current health status */
   health: ProviderHealth;
   
   /** Current usage */
   usage: number;
   
   /** Quota limit */
   quota: number;
   
   /** Capabilities this resource provides */
   capabilities: Capability[];
   
   /** Cost per unit */
   cost_per_unit: number;
   
   /** Last health check timestamp */
   last_health_check: number | null;
   
   /** Configuration (no secrets) */
   config: Record<string, unknown>;
 }
 
 /* ============================================================
    §40 — Credential Metadata
    Actual secrets live in secure storage.
    Database contains only metadata.
    ============================================================ */
 
 export interface CredentialMetadata {
   /** Credential ID */
   credential_id: string;
   
   /** Provider name */
   provider: string;
   
   /** Credential name */
   credential_name: string;
   
   /** Credential type */
   credential_type: "api_key" | "oauth_token" | "bearer_token" | "basic_auth";
   
   /** Scope of this credential */
   scope: string[];
   
   /** Current status */
   status: "active" | "expired" | "revoked" | "invalid";
   
   /** Last verification timestamp */
   last_verified: number | null;
   
   /** Expiration timestamp */
   expires_at: number | null;
   
   /** Quota associated with this credential */
   quota: number | null;
   
   /** Health status */
   health: ProviderHealth;
 }
 
 /* ============================================================
    §68 — Permission Model
    Permissions are capability-based and least-privilege.
    ============================================================ */
 
 export interface Permission {
   /** Permission ID */
   permission_id: string;
   
   /** Agent ID */
   agent_id: string;
   
   /** What this agent can do */
   can: string[];
   
   /** What this agent cannot do */
   cannot: string[];
   
   /** Conditions under which this permission is valid */
   conditions: PermissionCondition[];
   
   /** Expiration (null = permanent) */
   expires_at: number | null;
 }
 
 export interface PermissionCondition {
   /** Condition type */
   type: "time" | "resource" | "task" | "department" | "policy";
   
   /** Condition value */
   value: unknown;
 }
 
 /* ============================================================
    §69 — Policy Engine
    The Policy Engine decides WHO CAN DO WHAT WITH WHICH
    RESOURCE UNDER WHICH CONDITIONS FOR HOW LONG.
    ============================================================ */
 
 export interface Policy {
   /** Policy ID */
   policy_id: string;
   
   /** Policy name */
   name: string;
   
   /** Policy description */
   description: string;
   
   /** Who this policy applies to */
   applies_to: "all_agents" | "department" | "agent" | "role";
   
   /** Target ID (department_id or agent_id) */
   target_id: string | null;
   
   /** What action this policy controls */
   action: string;
   
   /** What resource this policy controls */
   resource: ResourceId | "any";
   
   /** Policy rules */
   rules: PolicyRule[];
   
   /** Policy status */
   status: "active" | "inactive" | "archived";
   
   /** Version */
   version: string;
 }
 
 export interface PolicyRule {
   /** Rule type */
   type: "allow" | "deny" | "require_approval" | "rate_limit" | "budget_limit";
   
   /** Rule conditions */
   conditions: Record<string, unknown>;
   
   /** Rule value */
   value: unknown;
 }
 
 /* ============================================================
    §31 — Universal Agent Protocol
    Every agent communicates using the same protocol.
    ============================================================ */
 
 export type MessageType =
   | "TASK_REQUEST"
   | "TASK_RESULT"
   | "RESOURCE_REQUEST"
   | "RESOURCE_GRANT"
   | "REVIEW_REQUEST"
   | "REVIEW_RESULT"
   | "STATUS_UPDATE"
   | "HEARTBEAT";
 
 export interface Message {
   /** Unique message ID */
   message_id: string;
   
   /** Request ID (for correlating request/response) */
   request_id: string;
   
   /** Message type */
   type: MessageType;
   
   /** Sender agent ID */
   sender: string;
   
   /** Recipient agent ID */
   recipient: string;
   
   /** Timestamp */
   timestamp: number;
   
   /** Priority */
   priority: TaskPriority;
   
   /** Related task ID */
   task_id: string | null;
   
   /** Message payload */
   payload: Record<string, unknown>;
   
   /** Required permissions */
   required_permissions: string[];
   
   /** Deadline */
   deadline: number | null;
 }
 
 /* ============================================================
    §5-6 — Asset
    Large media is externalized through Asset Service.
    ============================================================ */
 
 export type AssetStatus =
   | "requested"
   | "generating"
   | "created"
   | "qa"
   | "approved"
   | "published"
   | "active"
   | "archived"
   | "deleted";
 
 export interface Asset {
   /** Asset ID */
   asset_id: string;
   
   /** Asset type */
   type: "image" | "video" | "audio" | "document" | "other";
   
   /** File size in bytes */
   size: number;
   
   /** MIME type */
   mime_type: string;
   
   /** Owner agent ID */
   owner_agent_id: string;
   
   /** Related content ID */
   content_id: string | null;
   
   /** Retention class */
   retention_class: "permanent" | "long_term" | "short_term" | "temporary";
   
   /** Current provider */
   provider: string;
   
   /** Provider object ID */
   provider_object_id: string;
   
   /** URL or reference */
   url: string;
   
   /** Checksum */
   checksum: string;
   
   /** Status */
   status: AssetStatus;
   
   /** Timestamps */
   created_at: number;
   updated_at: number;
   expires_at: number | null;
 }
 
 /* ============================================================
    §29-30 — Knowledge
    Centralized knowledge with versioning.
    ============================================================ */
 
 export type KnowledgeId =
   | "brand_bible"
   | "content_bible"
   | "product_knowledge"
   | "tarot_knowledge"
   | "astrology_knowledge"
   | "audience_knowledge"
   | "platform_rules"
   | "competitor_intelligence"
   | "historical_performance"
   | "provider_documentation"
   | "agent_policies";
 
 export type KnowledgeStatus =
   | "draft"
   | "active"
   | "outdated"
   | "archived"
   | "rejected";
 
 export interface KnowledgeDocument {
   /** Knowledge ID */
   knowledge_id: KnowledgeId;
   
   /** Version */
   version: string;
   
   /** Status */
   status: KnowledgeStatus;
   
   /** Source */
   source: string;
   
   /** Title */
   title: string;
   
   /** Content */
   content: string;
   
   /** Confidence level (0-1) */
   confidence: number;
   
   /** Owner agent ID */
   owner: string;
   
   /** Timestamps */
   created_at: number;
   updated_at: number;
   expires_at: number | null;
 }
 
 /* ============================================================
    §71 — Error
    Every error gets structured representation.
    ============================================================ */
 
 export type ErrorSeverity = "info" | "warning" | "error" | "critical";
 
 export interface SystemError {
   /** Error ID */
   error_id: string;
   
   /** Related task ID */
   task_id: string | null;
   
   /** Related agent ID */
   agent_id: string | null;
   
   /** Error category */
   category: ErrorCategory;
   
   /** Severity */
   severity: ErrorSeverity;
   
   /** Error message */
   message: string;
   
   /** Provider (if applicable) */
   provider: string | null;
   
   /** Is this error retryable? */
   retryable: boolean;
   
   /** Attempt number */
   attempt: number;
   
   /** Timestamp */
   created_at: number;
 }
 
 /* ============================================================
    §72 — Escalation Path
    Errors escalate through defined paths.
    ============================================================ */
 
 export type EscalationLevel =
   | "self_recovery"
   | "controller"
   | "department_head"
   | "executive_core"
   | "human";
 
 export interface Escalation {
   /** Escalation ID */
   escalation_id: string;
   
   /** Related error ID */
   error_id: string;
   
   /** Related task ID */
   task_id: string;
   
   /** Current escalation level */
   level: EscalationLevel;
   
   /** Escalation history */
   history: EscalationEntry[];
   
   /** Resolution */
   resolution: string | null;
   
   /** Timestamps */
   created_at: number;
   resolved_at: number | null;
 }
 
 export interface EscalationEntry {
   /** Level */
   level: EscalationLevel;
   
   /** Timestamp */
   timestamp: number;
   
   /** Action taken */
   action: string;
   
   /** Actor (agent or human) */
   actor: string;
 }
 
 /* ============================================================
    §103 — System State Machine
    Highest-level system state.
    ============================================================ */
 
 export type SystemState =
   | "healthy"
   | "degraded"
   | "partial_outage"
   | "maintenance"
   | "emergency";
 
 /* ============================================================
    §73 — Circuit Breaker
    Prevents wasting quotas on failing providers.
    ============================================================ */
 
 export type CircuitState = "closed" | "open" | "half_open";
 
 export interface CircuitBreaker {
   /** Provider ID */
   provider: string;
   
   /** Current state */
   state: CircuitState;
   
   /** Failure count */
   failure_count: number;
   
   /** Success count */
   success_count: number;
   
   /** Last failure timestamp */
   last_failure: number | null;
   
   /** Last success timestamp */
   last_success: number | null;
   
   /** Threshold before opening circuit */
   failure_threshold: number;
   
   /** Timeout before trying half_open */
   timeout_ms: number;
 }
 
 /* ============================================================
    §47 — Quality Score
    Multi-dimensional quality assessment.
    ============================================================ */
 
 export interface QualityScore {
   /** Content ID */
   content_id: string;
   
   /** Individual dimension scores (0-100) */
   hook: number;
   retention_potential: number;
   originality: number;
   clarity: number;
   emotional_impact: number;
   shareability: number;
   visual_strength: number;
   brand_fit: number;
   platform_fit: number;
   cta: number;
   safety: number;
   
   /** Overall score (configurable formula) */
   total: number;
   
   /** Scoring agent ID */
   scored_by: string;
   
   /** Timestamp */
   scored_at: number;
 }
 
 /* ============================================================
    §83 — Campaign
    Strategic container for coordinated work.
    ============================================================ */
 
 export interface Campaign {
   /** Campaign ID */
   campaign_id: string;
   
   /** Campaign name */
   name: string;
   
   /** Campaign goal */
   goal: string;
   
   /** Target audience */
   audience: string;
   
   /** Target platforms */
   platforms: string[];
   
   /** Content count */
   content_count: number;
   
   /** Status */
   status: "planning" | "active" | "completed" | "archived";
   
   /** Timestamps */
   created_at: number;
   started_at: number | null;
   completed_at: number | null;
 }
 
 /* ============================================================
    §106 — Audit Log
    Append-only audit records.
    ============================================================ */
 
 export interface AuditEntry {
   /** Audit ID */
   audit_id: string;
   
   /** Who performed the action */
   actor: string;
   
   /** What action was performed */
   action: string;
   
   /** Target of the action */
   target: string;
   
   /** Result of the action */
   result: "success" | "failure" | "denied";
   
   /** Why this action was taken */
   reason: string | null;
   
   /** Timestamp */
   timestamp: number;
   
   /** Related task ID */
   task_id: string | null;
   
   /** Related resource ID */
   resource_id: string | null;
 }
 
 /* ============================================================
    §44 — Cost Record
    Every resource call produces a cost record.
    ============================================================ */
 
 export interface CostRecord {
   /** Record ID */
   record_id: string;
   
   /** Provider */
   provider: string;
   
   /** Model used */
   model: string;
   
   /** Related task ID */
   task_id: string;
   
   /** Agent that made the call */
   agent_id: string;
   
   /** Input units (tokens, API calls, etc.) */
   input_units: number;
   
   /** Output units */
   output_units: number;
   
   /** Estimated cost */
   estimated_cost: number;
   
   /** Actual cost */
   actual_cost: number;
   
   /** Related content ID */
   content_id: string | null;
   
   /** Timestamp */
   timestamp: number;
 }
 
 /* ============================================================
    §49 — Content Passport
    Every content item gets a permanent passport.
    ============================================================ */
 
 export interface ContentPassport {
   /** Content ID */
   content_id: string;
   
   /** Campaign ID */
   campaign_id: string | null;
   
   /** Concept ID */
   concept_id: string | null;
   
   /** Version */
   version: string;
   
   /** Creator agent ID */
   creator_agent: string;
   
   /** Reviewer agent IDs */
   reviewers: string[];
   
   /** Knowledge versions used */
   knowledge_versions: string[];
   
   /** Asset IDs */
   assets: string[];
   
   /** Target platforms */
   platforms: string[];
   
   /** Status */
   status: "draft" | "review" | "approved" | "published" | "archived";
   
   /** Publication records */
   publication_records: PublicationRecord[];
   
   /** Performance metrics */
   performance: PerformanceMetrics | null;
   
   /** Learning records */
   learning_records: string[];
 }
 
 export interface PublicationRecord {
   /** Platform */
   platform: string;
   
   /** Publication ID on platform */
   publication_id: string;
   
   /** Published at */
   published_at: number;
   
   /** Status */
   status: "published" | "failed" | "deleted";
 }
 
 export interface PerformanceMetrics {
   /** Views */
   views: number;
   
   /** Likes */
   likes: number;
   
   /** Comments */
   comments: number;
   
   /** Shares */
   shares: number;
   
   /** Saves */
   saves: number;
   
   /** Average view duration (seconds) */
   avg_view_duration: number;
   
   /** Completion rate (0-1) */
   completion_rate: number;
   
   /** Rewatch rate (0-1) */
   rewatch_rate: number;
   
   /** Collected at */
   collected_at: number;
 }
 
 /* ============================================================
    §107 — Agent Decision Summary
    Structured decision summaries instead of raw chain-of-thought.
    ============================================================ */
 
 export interface AgentDecisionSummary {
   /** Decision made */
   decision: string;
   
   /** Reason for decision */
   reason: string;
   
   /** Evidence supporting decision */
   evidence: string[];
   
   /** Confidence level (0-1) */
   confidence: number;
   
   /** Policy used */
   policy_used: string | null;
   
   /** Alternatives considered */
   alternatives_considered: string[];
 }
 
 /* ============================================================
    §53 — Agent Heartbeat
    Agents emit heartbeats for health monitoring.
    ============================================================ */
 
 export interface AgentHeartbeat {
   /** Agent ID */
   agent_id: string;
   
   /** Current status */
   status: AgentStatus;
   
   /** Current task ID */
   current_task: string | null;
   
   /** Last activity timestamp */
   last_activity: number;
   
   /** Health score (0-100) */
   health: number;
   
   /** Timestamp */
   timestamp: number;
 }
 
 /* ============================================================
    Department IDs
    ============================================================ */
 
 export type DepartmentId =
   | "executive"
   | "intelligence"
   | "strategy"
   | "content"
   | "creative"
   | "production"
   | "resources"
   | "knowledge"
   | "quality"
   | "distribution"
   | "analytics"
   | "learning"
   | "training"
   | "system_ops";
 
 /* ============================================================
    KPI Definition
    ============================================================ */
 
 export interface KPI {
   /** KPI name */
   name: string;
   
   /** KPI description */
   description: string;
   
   /** Target value */
   target: number;
   
   /** Current value */
   current: number;
   
   /** Unit */
   unit: string;
 }
 
 /* ============================================================
    Failure Policy
    ============================================================ */
 
 export interface FailurePolicy {
   /** Max retries before escalation */
   max_retries: number;
   
   /** Retry delay in ms */
   retry_delay_ms: number;
   
   /** Escalation path */
   escalation_path: EscalationLevel[];
   
   /** Whether to notify human on failure */
   notify_human: boolean;
 }
 
 /* ============================================================
    Export all contracts for use throughout the system
    ============================================================ */
 
 export const LUNARA_OS_CONTRACTS_VERSION = "1.0.0";