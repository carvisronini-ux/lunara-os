// lib/dashboard-utils.ts
import type { EventType } from "@/core/contracts";
import type { AgentStatus, EventLog } from "./office-data";

export function formatTime(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "IDLE": return "#94a3b8";
    case "WORKING": return "#facc15";
    case "WAITING": return "#60a5fa";
    case "WAITING_FOR_RESOURCE": return "#f97316";
    case "WAITING_FOR_REVIEW": return "#a855f7";
    case "COMPLETED": return "#34d399";
    case "ERROR": return "#f87171";
    case "PAUSED": return "#fbbf24";
    case "SUSPENDED": return "#ef4444";
    case "STARTING": return "#c084fc";
    case "OFFLINE": return "#475569";
    default: return "#94a3b8";
  }
}

export function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case "IDLE": return "⏸️ უმოქმედო";
    case "WORKING": return "⚡ მუშაობს";
    case "WAITING": return "⏳ მოლოდინში";
    case "WAITING_FOR_RESOURCE": return "🔐 რესურსის მოლოდინში";
    case "WAITING_FOR_REVIEW": return "🔍 გადახედვის მოლოდინში";
    case "COMPLETED": return "✅ დასრულებული";
    case "ERROR": return "❌ შეცდომა";
    case "PAUSED": return "⏸️ შეჩერებული";
    case "SUSPENDED": return "🚫 შეწყვეტილი";
    case "STARTING": return "🚀 იწყება";
    case "OFFLINE": return "⚫ ოფლაინ";
    default: return status;
  }
}

export function mapEngineTypeToUI(type: EventType): EventLog["type"] {
  if (type.includes("TASK")) return "task";
  if (type.includes("AGENT")) return "agent";
  if (type.includes("EMERGENCY")) return "emergency";
  if (type.includes("RESOURCE")) return "resource";
  if (type.includes("KNOWLEDGE")) return "learning";
  if (type.includes("CONTENT")) return "quality";
  if (type.includes("PATTERN") || type.includes("LEARNING") || type.includes("OPPORTUNITY")) return "learning";
  return "system";
}

export function generateMessageFromEvent(event: any): string {
  switch (event.type) {
    case "TASK_CREATED": return `📋 ამოცანა შექმნილია: ${event.payload?.title}`;
    case "TASK_STARTED": return `⚡ ამოცანა დაიწყო აგენტმა ${event.agent_id}`;
    case "TASK_COMPLETED": return `✅ ამოცანა დაასრულა აგენტმა ${event.agent_id}`;
    case "TASK_FAILED": return `❌ ამოცანა ჩავარდა აგენტისთვის ${event.agent_id}`;
    default: return `სისტემური მოვლენა: ${event.type}`;
  }
}