// ============================================================
// LUNARA OS — MASTER CONTRACTS (Architecture Lock v1.0)
// Foundation: Lunara Master Bible v2.0 & Foundation v1.0
// Purpose: Immutable interfaces for Core OS communication
// Reference: §112 — "The system should be designed around contracts, not implementations."
// ============================================================

/* ============================================================
   §14, §51 — Agent Statuses & Autonomy
   ============================================================ */

   export type AgentStatus =
   | "OFFLINE"
   | "IDLE"
   | "STARTING"
   | "WORKING"
   | "WAITING"
   | "WAITING_FOR_RESOURCE"
   | "WAITING_FOR_REVIEW"
   | "ERROR"
   | "PAUSED"
   | "SUSPENDED"
   | "COMPLETED";
 
 export type AutonomyLevel = 0 | 1 | 2 | 3 | 4; // L0: Manual -> L4: High Autonomy
 
 /* ============================================================
    §19 — Department IDs
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
    §16 — Agent Constitution
    ============================================================ */
 
 export interface AgentConstitution {
   agent_id: string;
   display_name: string;
   version: string;
   department: DepartmentId;
   mission: string;
   responsibilities: string[];
   inputs: string[];
   outputs: string[];
   capabilities: Capability[];
   allowed_tools: string[];
   allowed_resources: ResourceId[];
   knowledge_sources: KnowledgeId[];
   rules: string[];
   forbidden_actions: string[];
   quality_criteria: string[];
   kpis: KPI[];
   supervisor: string;
   controller: string;
   reviewer: string;
   escalation_path: string[];
   autonomy_level: AutonomyLevel;
   failure_policy: FailurePolicy;
 }
 
 export interface AgentHeartbeat {
   agent_id: string;
   status: AgentStatus;
   current_task_id: string | null;
   last_activity: number;
   health_score: number; // 0-100
   timestamp: number;
 }
 
 /* ============================================================
    §67 — Capability Registry
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
    §33, §34, §35, §62 — Task Engine & Lifecycle
    ============================================================ */
 
 export type TaskStatus =
   | "CREATED"
   | "QUEUED"
   | "CLAIMED"
   | "RUNNING"
   | "WAITING"
   | "REVIEW"
   | "COMPLETED"
   | "FAILED"
   | "RETRYING"
   | "FAILED_PERMANENTLY"
   | "ESCALATED";
 
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
   task_id: string;
   idempotency_key: string; // §34: Prevents duplicate execution
   title: string;
   description: string;
   status: TaskStatus;
   priority: TaskPriority;
   creator_agent_id: string;
   assigned_agent_id: string | null;
   department: DepartmentId;
   required_capability: Capability;
   payload: Record<string, unknown>;
   expected_outputs: string[];
   depends_on: string[]; // §62: Task dependencies
   progress: number; // 0-100
   retry_count: number;
   max_retries: number;
   error_category: ErrorCategory | null;
   error_message: string | null;
   created_at: number;
   started_at: number | null;
   completed_at: number | null;
   deadline: number | null;
 }
 
 /* ============================================================
    §32, §106 — Event Bus & Audit
    ============================================================ */
 
 export type EventType =
   | "TASK_CREATED" | "TASK_STARTED" | "TASK_COMPLETED" | "TASK_FAILED" | "TASK_RETRIED" | "TASK_ESCALATED"
   | "AGENT_REGISTERED" | "AGENT_STATUS_CHANGED" | "AGENT_VERSION_CREATED" | "AGENT_PROMOTED" | "AGENT_ROLLED_BACK"
   | "RESOURCE_REQUESTED" | "RESOURCE_GRANTED" | "RESOURCE_REVOKED" | "LEASE_CREATED" | "LEASE_EXPIRED"
   | "ASSET_REQUESTED" | "ASSET_CREATED" | "ASSET_APPROVED" | "ASSET_REJECTED"
   | "CONTENT_CREATED" | "CONTENT_REVIEW_REQUESTED" | "CONTENT_APPROVED" | "CONTENT_REJECTED"
   | "PUBLISH_REQUESTED" | "PUBLISHED" | "PUBLISH_FAILED"
   | "ANALYTICS_AVAILABLE" | "PATTERN_DISCOVERED"
   | "KNOWLEDGE_UPDATED" | "KNOWLEDGE_VERSION_CREATED"
   | "ACCESS_REQUESTED" | "ACCESS_APPROVED" | "ACCESS_DENIED" | "CREDENTIAL_VERIFIED" | "INCIDENT_CREATED"
   | "SYSTEM_HEALTH_CHANGED" | "EMERGENCY_ACTIVATED" | "HUMAN_OVERRIDE";
 
 export type EventSeverity = "info" | "warning" | "error" | "critical";
 
 export interface Event {
   event_id: string;
   type: EventType;
   timestamp: number;
   agent_id: string | null;
   task_id: string | null;
   resource_id: string | null;
   content_id: string | null;
   payload: Record<string, unknown>;
   severity: EventSeverity;
 }
 
 export interface AuditEntry {
   audit_id: string;
   actor: string;
   action: string;
   target: string;
   result: "success" | "failure" | "denied";
   reason: string | null;
   timestamp: number;
   task_id: string | null;
   resource_id: string | null;
 }
 
 /* ============================================================
    §38, §39, §40, §44 — Resources, Credentials & Cost
    ============================================================ */
 
 export type ResourceId =
   | "openai_gpt4" | "anthropic_claude" | "telegram_bot_api" | "telegram_stars_api"
   | "tiktok_api" | "youtube_api" | "instagram_api" | "pinterest_api" | "x_api"
   | "cloudflare_r2" | "supabase_os" | "github_storage";
 
 export type ProviderHealth = "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "SUSPENDED";
 export type LeaseStatus = "REQUESTED" | "APPROVED" | "ACTIVE" | "EXPIRED" | "REVOKED";
 
 export interface ResourceProvider {
   provider_id: ResourceId;
   name: string;
   type: "ai_model" | "storage" | "social_platform" | "database" | "analytics";
   health: ProviderHealth;
   capabilities: Capability[];
   quota_limit: number;
   quota_used: number;
   cost_per_unit: number;
   last_health_check: number;
 }
 
 export interface AccessLease {
   lease_id: string;
   request_id: string;
   agent_id: string;
   resource_id: ResourceId;
   permission: string;
   purpose: string;
   task_id: string | null;
   status: LeaseStatus;
   created_at: number;
   approved_at: number | null;
   activated_at: number | null;
   expires_at: number;
   revoked_at: number | null;
   approved_by: string | null;
 }
 
 export interface CostRecord {
   record_id: string;
   provider: string;
   model: string;
   task_id: string;
   agent_id: string;
   input_units: number;
   output_units: number;
   estimated_cost: number;
   actual_cost: number;
   content_id: string | null;
   timestamp: number;
 }
 
 /* ============================================================
    §31, §108 — Universal Agent Protocol
    ============================================================ */
 
 export type MessageType =
   | "TASK_REQUEST" | "TASK_RESULT" | "RESOURCE_REQUEST" | "RESOURCE_GRANT"
   | "REVIEW_REQUEST" | "REVIEW_RESULT" | "STATUS_UPDATE" | "HEARTBEAT";
 
 export interface Message {
   message_id: string;
   request_id: string;
   type: MessageType;
   sender: string;
   recipient: string;
   timestamp: number;
   priority: TaskPriority;
   task_id: string | null;
   payload: Record<string, unknown>;
   required_permissions: string[];
   deadline: number | null;
 }
 
 /* ============================================================
    §5, §6, §9, §10 — Asset Service & Lifecycle
    ============================================================ */
 
 export type AssetStatus = "requested" | "generating" | "created" | "qa" | "approved" | "published" | "active" | "archived" | "deleted";
 
 export interface Asset {
   asset_id: string;
   type: "image" | "video" | "audio" | "document" | "other";
   size: number;
   mime_type: string;
   owner_agent_id: string;
   content_id: string | null;
   retention_class: "permanent" | "long_term" | "short_term" | "temporary";
   provider: string;
   provider_object_id: string;
   url: string;
   checksum: string;
   status: AssetStatus;
   created_at: number;
   updated_at: number;
   expires_at: number | null;
 }
 
 /* ============================================================
    §29, §30, §45 — Knowledge OS
    ============================================================ */
 
 export type KnowledgeId =
   | "brand_bible" | "content_bible" | "product_knowledge" | "tarot_knowledge"
   | "astrology_knowledge" | "audience_knowledge" | "platform_rules"
   | "competitor_intelligence" | "historical_performance" | "provider_documentation" | "agent_policies";
 
 export type KnowledgeStatus = "draft" | "active" | "outdated" | "archived" | "rejected";
 
 export interface KnowledgeDocument {
   knowledge_id: KnowledgeId;
   version: string;
   status: KnowledgeStatus;
   source: string;
   title: string;
   content: string;
   confidence: number; // 0-1
   owner: string;
   created_at: number;
   updated_at: number;
   expires_at: number | null;
 }
 
 /* ============================================================
    §47, §49, §83 — Quality, Content Passport & Campaigns
    ============================================================ */
 
 export interface QualityScore {
   content_id: string;
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
   total: number;
   scored_by: string;
   scored_at: number;
 }
 
 export interface ContentPassport {
   content_id: string;
   campaign_id: string | null;
   concept_id: string | null;
   version: string;
   creator_agent: string;
   reviewers: string[];
   knowledge_versions: KnowledgeId[];
   assets: string[];
   platforms: string[];
   status: "draft" | "review" | "approved" | "published" | "archived";
   publication_records: PublicationRecord[];
   performance: PerformanceMetrics | null;
   learning_records: string[];
 }
 
 export interface PublicationRecord {
   platform: string;
   publication_id: string;
   published_at: number;
   status: "published" | "failed" | "deleted";
 }
 
 export interface PerformanceMetrics {
   views: number;
   likes: number;
   comments: number;
   shares: number;
   saves: number;
   avg_view_duration: number;
   completion_rate: number;
   rewatch_rate: number;
   collected_at: number;
 }
 
 export interface Campaign {
   campaign_id: string;
   name: string;
   goal: string;
   audience: string;
   platforms: string[];
   content_count: number;
   status: "planning" | "active" | "completed" | "archived";
   created_at: number;
   started_at: number | null;
   completed_at: number | null;
 }
 
 /* ============================================================
    §71, §72, §73, §103, §107 — Errors, Escalation, Circuit Breakers
    ============================================================ */
 
 export type ErrorSeverity = "info" | "warning" | "error" | "critical";
 export type EscalationLevel = "self_recovery" | "controller" | "department_head" | "executive_core" | "human";
 export type SystemState = "healthy" | "degraded" | "partial_outage" | "maintenance" | "emergency";
 export type CircuitState = "closed" | "open" | "half_open";
 
 export interface SystemError {
   error_id: string;
   task_id: string | null;
   agent_id: string | null;
   category: ErrorCategory;
   severity: ErrorSeverity;
   message: string;
   provider: string | null;
   retryable: boolean;
   attempt: number;
   created_at: number;
 }
 
 export interface Escalation {
   escalation_id: string;
   error_id: string;
   task_id: string;
   level: EscalationLevel;
   history: EscalationEntry[];
   resolution: string | null;
   created_at: number;
   resolved_at: number | null;
 }
 
 export interface EscalationEntry {
   level: EscalationLevel;
   timestamp: number;
   action: string;
   actor: string;
 }
 
 export interface CircuitBreaker {
   provider: string;
   state: CircuitState;
   failure_count: number;
   success_count: number;
   last_failure: number | null;
   last_success: number | null;
   failure_threshold: number;
   timeout_ms: number;
 }
 
 export interface AgentDecisionSummary {
   decision: string;
   reason: string;
   evidence: string[];
   confidence: number;
   policy_used: string | null;
   alternatives_considered: string[];
 }
 
 /* ============================================================
    §68, §69 — Permissions & Policies
    ============================================================ */
 
 export interface Permission {
   permission_id: string;
   agent_id: string;
   can: string[];
   cannot: string[];
   conditions: PermissionCondition[];
   expires_at: number | null;
 }
 
 export interface PermissionCondition {
   type: "time" | "resource" | "task" | "department" | "policy";
   value: unknown;
 }
 
 export interface Policy {
   policy_id: string;
   name: string;
   description: string;
   applies_to: "all_agents" | "department" | "agent" | "role";
   target_id: string | null;
   action: string;
   resource: ResourceId | "any";
   rules: PolicyRule[];
   status: "active" | "inactive" | "archived";
   version: string;
 }
 
 export interface PolicyRule {
   type: "allow" | "deny" | "require_approval" | "rate_limit" | "budget_limit";
   conditions: Record<string, unknown>;
   value: unknown;
 }
 
 export interface FailurePolicy {
   max_retries: number;
   retry_delay_ms: number;
   escalation_path: EscalationLevel[];
   notify_human: boolean;
 }
 
 export interface KPI {
   name: string;
   description: string;
   target: number;
   current: number;
   unit: string;
 }
 
 /* ============================================================
    v2.0 ADDITIONS: §8, §10, §11, §13, §14, §15 — Media Network & Monetization
    ============================================================ */
 
 export type ChannelId = "human_mind" | "love" | "astrology" | "tarot" | "mystery" | "lunara";
 
 export interface Channel {
   channel_id: ChannelId;
   name: string;
   audience_job: string;
   content_identity: string;
   primary_kpi: string;
   status: "active" | "paused" | "archived";
 }
 
 export interface ContentAtom {
   atom_id: string;
   core_insight: string;
   target_audience_problem: string;
   created_by: string;
   created_at: number;
 }
 
 export interface ContentFamily {
   family_id: string;
   atom_id: string;
   variants: Record<ChannelId, string>; // channel_id -> content_id
   created_at: number;
 }
 
 export interface CompetitorSnapshot {
   snapshot_id: string;
   channel_name: string;
   subscribers: number;
   growth_7d: number;
   growth_30d: number;
   avg_reach: number;
   engagement_rate: number;
   monetization_methods: string[];
   collected_at: number;
   confidence: number;
 }
 
 export interface RevenueRecord {
   record_id: string;
   layer: "telegram_ads" | "sponsored_posts" | "star_subscriptions" | "mini_app_premium" | "paid_readings";
   amount: number;
   currency: "XTR" | "USD";
   source_channel: ChannelId | null;
   timestamp: number;
 }
 
 export interface GrowthExperiment {
   experiment_id: string;
   hypothesis: string;
   variant_a: string;
   variant_b: string;
   metric_tracked: string;
   status: "running" | "completed" | "aborted";
   result: string | null;
   started_at: number;
   completed_at: number | null;
 }
 
 /* ============================================================
    Export Version
    ============================================================ */
 
 export const LUNARA_OS_CONTRACTS_VERSION = "1.0.0";