-- =====================================================
-- LUNARA OS FOUNDATION v1.0
-- Initial Database Schema
-- Migration: 001_initial_schema.sql
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Agent Status
CREATE TYPE agent_status AS ENUM (
  'OFFLINE',
  'IDLE',
  'STARTING',
  'WORKING',
  'WAITING',
  'WAITING_FOR_RESOURCE',
  'WAITING_FOR_REVIEW',
  'ERROR',
  'PAUSED',
  'SUSPENDED',
  'COMPLETED'
);

-- Task Status
CREATE TYPE task_status AS ENUM (
  'CREATED',
  'QUEUED',
  'CLAIMED',
  'RUNNING',
  'WAITING',
  'REVIEW',
  'COMPLETED',
  'FAILED',
  'RETRYING',
  'FAILED_PERMANENTLY',
  'ESCALATED'
);

-- Event Type
CREATE TYPE event_type AS ENUM (
  'TASK_CREATED',
  'TASK_STARTED',
  'TASK_COMPLETED',
  'TASK_FAILED',
  'RESOURCE_REQUESTED',
  'RESOURCE_GRANTED',
  'RESOURCE_REVOKED',
  'ASSET_REQUESTED',
  'ASSET_CREATED',
  'ASSET_APPROVED',
  'CONTENT_CREATED',
  'CONTENT_REVIEW_REQUESTED',
  'CONTENT_APPROVED',
  'CONTENT_REJECTED',
  'PUBLISH_REQUESTED',
  'PUBLISHED',
  'ANALYTICS_AVAILABLE',
  'PATTERN_DISCOVERED',
  'KNOWLEDGE_UPDATED',
  'AGENT_VERSION_CREATED',
  'AGENT_EVALUATED',
  'AGENT_PROMOTED',
  'AGENT_ROLLED_BACK'
);

-- Access Lease Status
CREATE TYPE access_lease_status AS ENUM (
  'REQUESTED',
  'APPROVED',
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

-- Knowledge Status
CREATE TYPE knowledge_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'OUTDATED',
  'ARCHIVED',
  'REJECTED'
);

-- Content Status
CREATE TYPE content_status AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED'
);

-- Asset Status
CREATE TYPE asset_status AS ENUM (
  'REQUESTED',
  'GENERATING',
  'CREATED',
  'QA',
  'APPROVED',
  'PUBLISHED',
  'ACTIVE',
  'ARCHIVED',
  'DELETED'
);

-- Provider Health
CREATE TYPE provider_health AS ENUM (
  'HEALTHY',
  'DEGRADED',
  'UNAVAILABLE',
  'SUSPENDED'
);

-- Error Severity
CREATE TYPE error_severity AS ENUM (
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL'
);

-- Autonomy Level
CREATE TYPE autonomy_level AS ENUM (
  'L0_MANUAL',
  'L1_ASSISTED',
  'L2_AUTO_WITH_APPROVAL',
  'L3_AUTONOMOUS_WITHIN_POLICY',
  'L4_HIGH_AUTONOMY'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Departments
CREATE TABLE departments (
  department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_department_id UUID REFERENCES departments(department_id),
  head_agent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name VARCHAR(100) NOT NULL,
  machine_id VARCHAR(100) NOT NULL UNIQUE,
  department_id UUID NOT NULL REFERENCES departments(department_id),
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  status agent_status NOT NULL DEFAULT 'OFFLINE',
  autonomy_level autonomy_level NOT NULL DEFAULT 'L1_ASSISTED',
  mission TEXT,
  responsibilities JSONB,
  supervisor_agent_id UUID REFERENCES agents(agent_id),
  controller_agent_id UUID REFERENCES agents(agent_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ,
  UNIQUE(machine_id, version)
);

-- Agent Versions
CREATE TABLE agent_versions (
  version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  constitution JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  benchmark_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  UNIQUE(agent_id, version)
);

-- Agent Capabilities
CREATE TABLE agent_capabilities (
  capability_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  capability_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, capability_name)
);

-- Agent Permissions
CREATE TABLE agent_permissions (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  permission_name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, permission_name, resource_type)
);

-- Agent Relationships
CREATE TABLE agent_relationships (
  relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  related_agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, related_agent_id, relationship_type)
);

-- Tasks
CREATE TABLE tasks (
  task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID,
  creator_agent_id UUID NOT NULL REFERENCES agents(agent_id),
  assigned_agent_id UUID REFERENCES agents(agent_id),
  department_id UUID NOT NULL REFERENCES departments(department_id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'CREATED',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  payload JSONB,
  required_permissions JSONB,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_log JSONB DEFAULT '[]'::jsonb,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3
);

-- Task Runs
CREATE TABLE task_runs (
  run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  result JSONB,
  artifacts JSONB,
  warnings JSONB,
  metrics JSONB
);

-- Task Dependencies
CREATE TABLE task_dependencies (
  dependency_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Events
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type event_type NOT NULL,
  source_agent_id UUID REFERENCES agents(agent_id),
  target_agent_id UUID REFERENCES agents(agent_id),
  task_id UUID REFERENCES tasks(task_id),
  content_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL,
  sender_agent_id UUID NOT NULL REFERENCES agents(agent_id),
  recipient_agent_id UUID NOT NULL REFERENCES agents(agent_id),
  message_type VARCHAR(100) NOT NULL,
  task_id UUID REFERENCES tasks(task_id),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Resources
CREATE TABLE resources (
  resource_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_name VARCHAR(100) NOT NULL UNIQUE,
  resource_type VARCHAR(100) NOT NULL,
  provider_id UUID,
  description TEXT,
  configuration JSONB,
  health provider_health NOT NULL DEFAULT 'HEALTHY',
  quota_limit INTEGER,
  quota_used INTEGER DEFAULT 0,
  cost_per_unit DECIMAL(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_health_check TIMESTAMPTZ
);

-- Resource Providers
CREATE TABLE resource_providers (
  provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_name VARCHAR(100) NOT NULL UNIQUE,
  provider_type VARCHAR(100) NOT NULL,
  base_url VARCHAR(255),
  configuration JSONB,
  health provider_health NOT NULL DEFAULT 'HEALTHY',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resource Capabilities
CREATE TABLE resource_capabilities (
  capability_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(resource_id) ON DELETE CASCADE,
  capability_name VARCHAR(100) NOT NULL,
  parameters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource_id, capability_name)
);

-- Credential Metadata
CREATE TABLE credential_metadata (
  credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES resource_providers(provider_id),
  credential_name VARCHAR(100) NOT NULL,
  credential_type VARCHAR(100) NOT NULL,
  scope JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  last_verified TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  quota_limit INTEGER,
  quota_used INTEGER DEFAULT 0,
  health provider_health NOT NULL DEFAULT 'HEALTHY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, credential_name)
);

-- Access Requests
CREATE TABLE access_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  resource_id UUID NOT NULL REFERENCES resources(resource_id),
  permission VARCHAR(100) NOT NULL,
  purpose TEXT,
  duration_seconds INTEGER,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT
);

-- Access Leases
CREATE TABLE access_leases (
  lease_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES access_requests(request_id),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  resource_id UUID NOT NULL REFERENCES resources(resource_id),
  permission VARCHAR(100) NOT NULL,
  status access_lease_status NOT NULL DEFAULT 'REQUESTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Knowledge Documents
CREATE TABLE knowledge_documents (
  knowledge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  domain VARCHAR(100) NOT NULL,
  summary TEXT,
  status knowledge_status NOT NULL DEFAULT 'DRAFT',
  source VARCHAR(255),
  confidence DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  owner_agent_id UUID REFERENCES agents(agent_id)
);

-- Knowledge Versions
CREATE TABLE knowledge_versions (
  version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_id UUID NOT NULL REFERENCES knowledge_documents(knowledge_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES agents(agent_id),
  UNIQUE(knowledge_id, version)
);

-- Knowledge Sources
CREATE TABLE knowledge_sources (
  source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_id UUID NOT NULL REFERENCES knowledge_documents(knowledge_id) ON DELETE CASCADE,
  source_type VARCHAR(100) NOT NULL,
  source_url VARCHAR(500),
  source_reference TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence DECIMAL(3, 2)
);

-- Content Items
CREATE TABLE content_items (
  content_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID,
  concept VARCHAR(255),
  title VARCHAR(255),
  description TEXT,
  status content_status NOT NULL DEFAULT 'DRAFT',
  creator_agent_id UUID NOT NULL REFERENCES agents(agent_id),
  content_type VARCHAR(50) NOT NULL,
  platform VARCHAR(50),
  viral_score DECIMAL(5, 2),
  quality_score DECIMAL(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Content Versions
CREATE TABLE content_versions (
  version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(content_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES agents(agent_id),
  UNIQUE(content_id, version)
);

-- Campaigns
CREATE TABLE campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goal TEXT,
  target_audience JSONB,
  platforms JSONB,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content Reviews
CREATE TABLE content_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(content_id) ON DELETE CASCADE,
  reviewer_agent_id UUID NOT NULL REFERENCES agents(agent_id),
  review_type VARCHAR(100) NOT NULL,
  score DECIMAL(5, 2),
  feedback TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(content_id, reviewer_agent_id, review_type)
);

-- Experiments
CREATE TABLE experiments (
  experiment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  hypothesis TEXT NOT NULL,
  variables JSONB NOT NULL,
  control_group JSONB,
  test_group JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  results JSONB,
  conclusion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assets
CREATE TABLE assets (
  asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_items(content_id),
  asset_type VARCHAR(50) NOT NULL,
  file_format VARCHAR(50),
  file_size_bytes BIGINT,
  status asset_status NOT NULL DEFAULT 'REQUESTED',
  provider_id UUID REFERENCES resource_providers(provider_id),
  provider_object_id VARCHAR(255),
  url VARCHAR(500),
  checksum VARCHAR(100),
  retention_class VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Asset Versions
CREATE TABLE asset_versions (
  version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  asset_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, version)
);

-- Asset Provider Locations
CREATE TABLE asset_provider_locations (
  location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES resource_providers(provider_id),
  provider_object_id VARCHAR(255) NOT NULL,
  url VARCHAR(500),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, provider_id)
);

-- Publishing Jobs
CREATE TABLE publishing_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(content_id),
  platform VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  provider_adapter VARCHAR(100),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Publication Records
CREATE TABLE publication_records (
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(content_id),
  platform VARCHAR(50) NOT NULL,
  platform_content_id VARCHAR(255) NOT NULL,
  platform_url VARCHAR(500),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(content_id, platform, platform_content_id)
);

-- Analytics Sources
CREATE TABLE analytics_sources (
  source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name VARCHAR(100) NOT NULL UNIQUE,
  source_type VARCHAR(100) NOT NULL,
  configuration JSONB,
  health provider_health NOT NULL DEFAULT 'HEALTHY',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics Records
CREATE TABLE analytics_records (
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_items(content_id),
  platform VARCHAR(50),
  source_id UUID REFERENCES analytics_sources(source_id),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20, 4) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Performance Snapshots
CREATE TABLE performance_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(content_id),
  platform VARCHAR(50),
  snapshot_date DATE NOT NULL,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  click_through_rate DECIMAL(5, 4),
  average_view_duration DECIMAL(10, 2),
  completion_rate DECIMAL(5, 4),
  rewatch_rate DECIMAL(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(content_id, platform, snapshot_date)
);

-- Learning Records
CREATE TABLE learning_records (
  learning_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  source_content_ids UUID[],
  hypothesis TEXT,
  experiment_id UUID REFERENCES experiments(experiment_id),
  status VARCHAR(50) NOT NULL DEFAULT 'DISCOVERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- Training Runs
CREATE TABLE training_runs (
  run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  training_type VARCHAR(100) NOT NULL,
  dataset_description TEXT,
  parameters JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results JSONB,
  new_version_id UUID REFERENCES agent_versions(version_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Benchmarks
CREATE TABLE agent_benchmarks (
  benchmark_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  benchmark_name VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  score DECIMAL(10, 4) NOT NULL,
  baseline_score DECIMAL(10, 4),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_data JSONB,
  UNIQUE(agent_id, benchmark_name, metric_name, tested_at)
);

-- Agent Evaluations
CREATE TABLE agent_evaluations (
  evaluation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  version_id UUID REFERENCES agent_versions(version_id),
  evaluator_agent_id UUID REFERENCES agents(agent_id),
  evaluation_criteria JSONB NOT NULL,
  scores JSONB NOT NULL,
  overall_score DECIMAL(5, 2),
  recommendation VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Promotions
CREATE TABLE agent_promotions (
  promotion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(agent_id),
  from_version VARCHAR(20),
  to_version VARCHAR(20) NOT NULL,
  promotion_type VARCHAR(50) NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES agents(agent_id),
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_agent_id UUID REFERENCES agents(agent_id),
  actor_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents
CREATE TABLE incidents (
  incident_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity error_severity NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  source_agent_id UUID REFERENCES agents(agent_id),
  affected_resource_id UUID,
  affected_system VARCHAR(100),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Alerts
CREATE TABLE system_alerts (
  alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(100) NOT NULL,
  severity error_severity NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(100),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES agents(agent_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Budgets
CREATE TABLE budgets (
  budget_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_name VARCHAR(100) NOT NULL UNIQUE,
  budget_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  period VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  used_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage Records
CREATE TABLE usage_records (
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(agent_id),
  resource_id UUID REFERENCES resources(resource_id),
  usage_type VARCHAR(100) NOT NULL,
  quantity DECIMAL(20, 6) NOT NULL,
  unit VARCHAR(50),
  cost DECIMAL(10, 6),
  task_id UUID REFERENCES tasks(task_id),
  content_id UUID REFERENCES content_items(content_id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Agents
CREATE INDEX idx_agents_department ON agents(department_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_machine_id ON agents(machine_id);

-- Tasks
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_agent ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_department ON tasks(department_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Events
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_task_id ON events(task_id);

-- Content
CREATE INDEX idx_content_status ON content_items(status);
CREATE INDEX idx_content_creator ON content_items(creator_agent_id);
CREATE INDEX idx_content_platform ON content_items(platform);

-- Assets
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_content_id ON assets(content_id);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);

-- Audit
CREATE INDEX idx_audit_actor ON audit_logs(actor_agent_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- Analytics
CREATE INDEX idx_analytics_content ON analytics_records(content_id);
CREATE INDEX idx_analytics_platform ON analytics_records(platform);
CREATE INDEX idx_analytics_recorded_at ON analytics_records(recorded_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert Core Departments
INSERT INTO departments (name, display_name, description) VALUES
('executive_core', 'Executive Core', 'Strategic coordination and oversight'),
('intelligence', 'Intelligence', 'Trend research and market intelligence'),
('strategy', 'Strategy', 'Strategic planning and decision-making'),
('content', 'Content', 'Content creation and writing'),
('creative', 'Creative', 'Creative direction and visual design'),
('production', 'Production', 'Asset production and rendering'),
('resources', 'Resources & Credentials', 'Resource and credential management'),
('knowledge', 'Knowledge', 'Organizational knowledge management'),
('quality', 'Quality & Governance', 'Quality control and governance'),
('distribution', 'Distribution', 'Publishing and distribution'),
('analytics', 'Analytics', 'Performance analytics and insights'),
('learning', 'Learning & Evolution', 'Learning and continuous improvement');

-- Insert First Agents (Section 55)
INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Astra', 'astra_v1', department_id, '1.0.0', 'IDLE', 'L2_AUTO_WITH_APPROVAL', 'Executive Coordinator - System orchestration and priority management'
FROM departments WHERE name = 'executive_core';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Nyx', 'nyx_v1', department_id, '1.0.0', 'IDLE', 'L3_AUTONOMOUS_WITHIN_POLICY', 'Trend Intelligence - Market and trend research'
FROM departments WHERE name = 'intelligence';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Sage', 'sage_v1', department_id, '1.0.0', 'IDLE', 'L2_AUTO_WITH_APPROVAL', 'Chief Strategist - Strategic planning and decision-making'
FROM departments WHERE name = 'strategy';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Muse', 'muse_v1', department_id, '1.0.0', 'IDLE', 'L3_AUTONOMOUS_WITHIN_POLICY', 'Head of Content - Content creation and writing'
FROM departments WHERE name = 'content';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Vega', 'vega_v1', department_id, '1.0.0', 'IDLE', 'L2_AUTO_WITH_APPROVAL', 'Creative Director - Visual creative direction'
FROM departments WHERE name = 'creative';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Atlas', 'atlas_v1', department_id, '1.0.0', 'IDLE', 'L2_AUTO_WITH_APPROVAL', 'Resource Director - Resource management and allocation'
FROM departments WHERE name = 'resources';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Cipher', 'cipher_v1', department_id, '1.0.0', 'IDLE', 'L1_ASSISTED', 'Credential Manager - Secure credential management'
FROM departments WHERE name = 'resources';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Aegis', 'aegis_v1', department_id, '1.0.0', 'IDLE', 'L2_AUTO_WITH_APPROVAL', 'Quality Director - Quality control and governance'
FROM departments WHERE name = 'quality';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Echo', 'echo_v1', department_id, '1.0.0', 'IDLE', 'L2_AUTO_WITH_APPROVAL', 'Distribution Manager - Publishing and distribution'
FROM departments WHERE name = 'distribution';

INSERT INTO agents (display_name, machine_id, department_id, version, status, autonomy_level, mission)
SELECT 'Nova', 'nova_v1', department_id, '1.0.0', 'IDLE', 'L3_AUTONOMOUS_WITHIN_POLICY', 'Performance Analyst - Analytics and performance insights'
FROM departments WHERE name = 'analytics';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This migration creates the complete foundation schema for Lunara OS v1.0
-- All core entities from Section 50 and 60 are included
-- Run this migration in your Supabase OS project SQL editor