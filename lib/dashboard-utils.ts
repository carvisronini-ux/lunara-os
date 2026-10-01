// lib/dashboard-utils.ts
import type { EventType } from "@/core/contracts"; // ✅ AgentStatus ამოღებულია, რადგან არ გამოიყენება
import type { EventLog } from "./office-data";

export function formatTime(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function getStatusColor(status: string) {
  switch (status) {
    case "WORKING":
    case "STARTING":
      return "#facc15"; // yellow-400
    case "IDLE":
      return "#94a3b8"; // slate-400
    case "COMPLETED":
      return "#34d399"; // emerald-400
    case "PAUSED":
      return "#f97316"; // orange-500
    case "ERROR":
    case "FAILED":
      return "#f87171"; // red-400
    case "WAITING_FOR_APPROVAL":
    case "WAITING_FOR_RESOURCE":
    case "WAITING_FOR_REVIEW":
      return "#60a5fa"; // blue-400
    default:
      return "#94a3b8";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "WORKING":
      return "🟡 მუშაობს";
    case "STARTING":
      return "🟡 იწყებს";
    case "IDLE":
      return "⚪ უმოქმედო";
    case "COMPLETED":
      return "🟢 დასრულებული";
    case "PAUSED":
      return "🟠 შეჩერებული";
    case "ERROR":
      return "🔴 შეცდომა";
    case "FAILED":
      return "🔴 წარუმატებელი";
    case "WAITING_FOR_APPROVAL":
      return "🔵 ელოდება დამტკიცებას";
    case "WAITING_FOR_RESOURCE":
      return "🔵 ელოდება რესურსს";
    case "WAITING_FOR_REVIEW":
      return "🔵 ელოდება გადახედვას";
    default:
      return status;
  }
}

export function mapEngineTypeToUI(type: EventType): EventLog["type"] {
  const mapping: Record<string, EventLog["type"]> = {
    TASK_CREATED: "task",
    TASK_STARTED: "task",
    TASK_COMPLETED: "task",
    TASK_FAILED: "error",
    TASK_RETRIED: "task",
    TASK_ESCALATED: "emergency",
    AGENT_REGISTERED: "system",
    AGENT_STATUS_CHANGED: "system",
    AGENT_HEARTBEAT: "system",
    EMERGENCY_ACTIVATED: "emergency",
    EMERGENCY_DEACTIVATED: "system",
    RESOURCE_REQUESTED: "resource",
    RESOURCE_GRANTED: "resource",
    RESOURCE_REVOKED: "resource",
    RESOURCE_HEALTH_CHANGED: "resource",
    KNOWLEDGE_VERSION_CREATED: "knowledge",
    KNOWLEDGE_UPDATED: "knowledge",
    KNOWLEDGE_PROMOTED: "knowledge",
    CONTENT_CREATED: "content",
    CONTENT_REVIEW_REQUESTED: "quality",
    CONTENT_APPROVED: "quality",
    CONTENT_REJECTED: "quality",
    CONTENT_REVIEWED: "quality",
    PATTERN_DISCOVERED: "learning",
    AGENT_VERSION_CREATED: "learning",
    AGENT_PROMOTED: "learning",
    AGENT_EVALUATED: "learning",
    OPPORTUNITY_DISCOVERED: "intelligence",
    OPPORTUNITY_VALIDATED: "intelligence",
    OPPORTUNITY_APPROVED: "approval",
    OPPORTUNITY_REJECTED: "approval",
    CONTENT_FAMILY_CREATED: "content",
    DISTRIBUTION_SCHEDULED: "distribution",
    CONTENT_PUBLISHED: "distribution",
    DISTRIBUTION_FAILED: "error",
    NYX_ANALYSIS_STARTED: "intelligence",
    NYX_ANALYSIS_COMPLETED: "intelligence",
    SIGNAL_RECEIVED: "intelligence",
    SIGNAL_REJECTED: "intelligence",
  };
  return mapping[type] || "system";
}

export function generateMessageFromEvent(event: any): string {
  const type = event.type as string;
  const payload = event.payload || {};
  
  switch (type) {
    case "TASK_CREATED":
      return `📝 შეიქმნა ამოცანა: ${payload.title || "უცნობი"}`;
    case "TASK_STARTED":
      return `▶️ აგენტმა ${payload.agent_id || "უცნობმა"} დაიწყო ამოცანა: ${payload.task_id || "უცნობი"}`;
    case "TASK_COMPLETED":
      return `✅ აგენტმა ${payload.agent_id || "უცნობმა"} დაასრულა ამოცანა: ${payload.task_id || "უცნობი"}`;
    case "TASK_FAILED":
      return `❌ ამოცანა ვერ შესრულდა: ${payload.task_id || "უცნობი"} — ${payload.error_message || "უცნობი შეცდომა"}`;
    case "TASK_RETRIED":
      return `🔄 ამოცანის ხელახლა მცდელობა: ${payload.task_id || "უცნობი"} (მცდელობა #${payload.retry_count || 1})`;
    case "TASK_ESCALATED":
      return `⬆️ ამოცანა ესკალირებულია: ${payload.task_id || "უცნობი"}`;
    case "AGENT_REGISTERED":
      return `🤖 აგენტი რეგისტრირებულია: ${payload.agent_id || "უცნობი"}`;
    case "AGENT_STATUS_CHANGED":
      return `🔄 აგენტის ${payload.agent_id || "უცნობი"} სტატუსი შეიცვალა: ${payload.old_status} → ${payload.new_status}`;
    case "EMERGENCY_ACTIVATED":
      return `🚨 საგანგებო რეჟიმი აქტივირებულია: ${payload.reason || "უცნობი მიზეზი"}`;
    case "EMERGENCY_DEACTIVATED":
      return `✅ საგანგებო რეჟიმი დეაქტივირებულია`;
    case "RESOURCE_REQUESTED":
      return `📦 რესურსი მოთხოვნილია: ${payload.resource_id || "უცნობი"} აგენტის ${payload.agent_id || "უცნობი"} მიერ`;
    case "RESOURCE_GRANTED":
      return `✅ რესურსი გაცემულია: ${payload.resource_id || "უცნობი"}`;
    case "RESOURCE_REVOKED":
      return `🚫 რესურსი გაუქმებულია: ${payload.resource_id || "უცნობი"}`;
    case "KNOWLEDGE_VERSION_CREATED":
      return `📚 ცოდნის ახალი ვერსია: ${payload.knowledge_id || "უცნობი"} (v${payload.version || "?"})`;
    case "KNOWLEDGE_UPDATED":
      return `📝 ცოდნა განახლდა: ${payload.knowledge_id || "უცნობი"}`;
    case "CONTENT_CREATED":
      return `✨ კონტენტი შეიქმნა: ${payload.content_id || "უცნობი"}`;
    case "CONTENT_REVIEW_REQUESTED":
      return `🛡️ კონტენტის გადახედვა მოთხოვნილია: ${payload.content_id || "უცნობი"}`;
    case "CONTENT_APPROVED":
      return `✅ კონტენტი დამტკიცებულია: ${payload.content_id || "უცნობი"}`;
    case "CONTENT_REJECTED":
      return `❌ კონტენტი უარყოფილია: ${payload.content_id || "უცნობი"}`;
    case "PATTERN_DISCOVERED":
      return `🧩 ახალი პატერნი აღმოჩენილია: ${payload.pattern_id || "უცნობი"}`;
    case "AGENT_VERSION_CREATED":
      return `🆕 აგენტის ახალი ვერსია: ${payload.agent_id || "უცნობი"} (v${payload.version || "?"})`;
    case "AGENT_PROMOTED":
      return `🎖️ აგენტი დაწინაურდა: ${payload.agent_id || "უცნობი"}`;
    case "OPPORTUNITY_DISCOVERED":
      return `🔍 Nyx-მა აღმოაჩინა შესაძლებლობა: ${payload.topic || "უცნობი"}`;
    case "OPPORTUNITY_VALIDATED":
      return `✅ შესაძლებლობა ვალიდირებულია: ${payload.topic || "უცნობი"}`;
    case "OPPORTUNITY_APPROVED":
      return `🎯 შესაძლებლობა დამტკიცებულია: ${payload.topic || "უცნობი"}`;
    case "OPPORTUNITY_REJECTED":
      return `❌ შესაძლებლობა უარყოფილია: ${payload.topic || "უცნობი"}`;
    case "CONTENT_FAMILY_CREATED":
      return `✍️ Muse-მ შექმნა Content Family: ${payload.family_id || "უცნობი"}`;
    case "DISTRIBUTION_SCHEDULED":
      return `📡 Echo-მ დაგეგმა გამოქვეყნება: ${payload.channel_id || "უცნობი"}`;
    case "CONTENT_PUBLISHED":
      return `🚀 კონტენტი გამოქვეყნდა: ${payload.post_id || "უცნობი"}`;
    case "DISTRIBUTION_FAILED":
      return `❌ გამოქვეყნება ვერ მოხერხდა: ${payload.error || "უცნობი შეცდომა"}`;
    case "NYX_ANALYSIS_STARTED":
      return `🔍 Nyx-მა დაიწყო ტრენდების ანალიზი`;
    case "NYX_ANALYSIS_COMPLETED":
      return `✅ Nyx-მა დაასრულა ანალიზი: ${payload.valid_opportunities || 0} შესაძლებლობა აღმოჩენილია`;
    case "SIGNAL_RECEIVED":
      return `📡 სიგნალი მიღებულია: ${payload.source || "უცნობი"}`;
    case "SIGNAL_REJECTED":
      return `🚫 სიგნალი უარყოფილია: ${payload.reason || "უცნობი მიზეზი"}`;
    default:
      return `📌 მოვლენა: ${type}`;
  }
}