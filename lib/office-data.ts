// lib/office-data.ts
import type { TaskStatus, AgentStatus, KnowledgeId, KnowledgeDocument } from "@/core/contracts";

export type Department = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  level: number;
  xp: number;
  xpToNext: number;
  status: AgentStatus;
  taskId: string | null;
  accent: string;
  icon: string;
  missionsCompleted: number;
  autonomyLevel: number;
  currentTask?: string;
};

export type Task = {
  id: string;
  title: string;
  agentId: string;
  status: TaskStatus;
  progress: number;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: number;
};

// ✅ გამოსწორებულია: დამატებულია "knowledge" | "content" | "intelligence" | "distribution"
export type EventLog = {
  id: string;
  timestamp: string;
  type: "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval" | "knowledge" | "content" | "intelligence" | "distribution";
  message: string;
};

export type Resource = {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "unavailable";
  usage: number;
  quota: number;
};

export type EmergencyState = {
  allAgentsPaused: boolean;
  publishingPaused: boolean;
  expensiveTasksStopped: boolean;
  accessRevoked: boolean;
};

export const departments: Department[] = [
  { id: "executive", name: "აღმასრულებელი ცენტრი", icon: "👑", color: "#8b5cf6", description: "სტრატეგია და კოორდინაცია" },
  { id: "intelligence", name: "დაზვერვა", icon: "🔍", color: "#3b82f6", description: "ტრენდების და ბაზრის კვლევა" },
  { id: "strategy", name: "სტრატეგია", icon: "🎯", color: "#a855f7", description: "დაგეგმვა და გადაწყვეტილებები" },
  { id: "content", name: "კონტენტი", icon: "✍️", color: "#f59e0b", description: "სცენარები და ტექსტები" },
  { id: "creative", name: "კრეატივი", icon: "🎨", color: "#ec4899", description: "ვიზუალური მიმართულება" },
  { id: "production", name: "წარმოება", icon: "🎬", color: "#ef4444", description: "აქტივების გენერაცია" },
  { id: "resources", name: "რესურსები", icon: "🔐", color: "#10b981", description: "მონაცემები და წვდომა" },
  { id: "quality", name: "ხარისხის კონტროლი", icon: "🛡️", color: "#06b6d4", description: "QA და მმართველობა" },
  { id: "distribution", name: "გავრცელება", icon: "📡", color: "#84cc16", description: "გამოქვეყნება" },
  { id: "analytics", name: "ანალიტიკა", icon: "📊", color: "#f97316", description: "ეფექტურობის მონაცემები" },
  { id: "learning", name: "სწავლა", icon: "🧬", color: "#14b8a6", description: "ევოლუცია და ტრენინგი" },
];

export const initialAgents: Agent[] = [
  { id: "astra", name: "Astra", role: "აღმასრულებელი კოორდინატორი", department: "executive", level: 7, xp: 742, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#8b5cf6", icon: "👑", missionsCompleted: 24, autonomyLevel: 4, currentTask: "სისტემის პრიორიტეტების მონიტორინგი" },
  { id: "nyx", name: "Nyx", role: "ტრენდების დაზვერვა", department: "intelligence", level: 5, xp: 516, xpToNext: 1000, status: "WORKING", taskId: "task-001", accent: "#3b82f6", icon: "🔍", missionsCompleted: 18, autonomyLevel: 3, currentTask: "TikTok-ის ტრენდების ანალიზი" },
  { id: "orion", name: "Orion", role: "კონკურენტების დაზვერვა", department: "intelligence", level: 4, xp: 384, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#6366f1", icon: "👁️", missionsCompleted: 12, autonomyLevel: 3, currentTask: "დანაწილების მოლოდინში" },
  { id: "sage", name: "Sage", role: "მთავარი სტრატეგი", department: "strategy", level: 6, xp: 628, xpToNext: 1000, status: "WAITING_FOR_REVIEW", taskId: "task-002", accent: "#a855f7", icon: "🎯", missionsCompleted: 20, autonomyLevel: 3, currentTask: "სტრატეგიის წინადადება დამტკიცების მოლოდინში" },
  { id: "muse", name: "Muse", role: "კონტენტის ხელმძღვანელი", department: "content", level: 5, xp: 492, xpToNext: 1000, status: "WORKING", taskId: "task-003", accent: "#f59e0b", icon: "✍️", missionsCompleted: 15, autonomyLevel: 3, currentTask: "3 სცენარის ვარიანტის წერა" },
  { id: "vega", name: "Vega", role: "კრეატიული დირექტორი", department: "creative", level: 6, xp: 584, xpToNext: 1000, status: "WAITING", taskId: "task-004", accent: "#ec4899", icon: "🎨", missionsCompleted: 18, autonomyLevel: 3, currentTask: "სცენარის დამტკიცების მოლოდინში" },
  { id: "atlas", name: "Atlas", role: "რესურსების დირექტორი", department: "resources", level: 7, xp: 712, xpToNext: 1000, status: "WORKING", taskId: "task-005", accent: "#10b981", icon: "🔐", missionsCompleted: 22, autonomyLevel: 2, currentTask: "API მონაცემების გადამოწმება" },
  { id: "cipher", name: "Cipher", role: "მონაცემების მენეჯერი", department: "resources", level: 5, xp: 468, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#059669", icon: "🔑", missionsCompleted: 14, autonomyLevel: 2, currentTask: "წვდომის ლიზინგების მონიტორინგი" },
  { id: "aegis", name: "Aegis", role: "ხარისხის დირექტორი", department: "quality", level: 6, xp: 596, xpToNext: 1000, status: "WORKING", taskId: "task-006", accent: "#06b6d4", icon: "🛡️", missionsCompleted: 19, autonomyLevel: 3, currentTask: "2 კონტენტის ელემენტის გადახედვა" },
  { id: "echo", name: "Echo", role: "გავრცელების მენეჯერი", department: "distribution", level: 5, xp: 524, xpToNext: 1000, status: "COMPLETED", taskId: "task-007", accent: "#84cc16", icon: "📡", missionsCompleted: 16, autonomyLevel: 2, currentTask: "გამოქვეყნებულია Telegram-ზე" },
  { id: "stella", name: "Stella", role: "Instagram დირექტორი", department: "distribution", level: 5, xp: 450, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#ec4899", icon: "📸", missionsCompleted: 0, autonomyLevel: 3, currentTask: "მზად არის Instagram პოსტების შესაქმნელად და გამოსაქვეყნებლად" },
  { id: "nova", name: "Nova", role: "ეფექტურობის ანალიტიკოსი", department: "analytics", level: 4, xp: 412, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#f97316", icon: "📊", missionsCompleted: 11, autonomyLevel: 3, currentTask: "ახალი მონაცემების მოლოდინში" },
  { id: "iris", name: "Iris", role: "სწავლების დირექტორი", department: "learning", level: 5, xp: 548, xpToNext: 1000, status: "WORKING", taskId: "task-008", accent: "#14b8a6", icon: "🧬", missionsCompleted: 17, autonomyLevel: 3, currentTask: "ეფექტურობის კანონზომიერებების ანალიზი" },
  { id: "lumen", name: "Lumen", role: "ვიზუალური დირექტორი", department: "creative", level: 5, xp: 450, xpToNext: 1000, status: "IDLE", taskId: null, accent: "#f472b6", icon: "🌟", missionsCompleted: 0, autonomyLevel: 3, currentTask: "მზად არის ვიზუალური კონცეფციების შესაქმნელად" },
];

export const initialTasks: any[] = [
  { id: "task-001", title: "TikTok-ის ტრენდების სიგნალების ანალიზი", agentId: "nyx", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "task-002", title: "Q4 კონტენტის სტრატეგიის შემუშავება", agentId: "sage", status: "QUEUED", progress: 0, priority: "critical", createdAt: Date.now() - 1000 * 60 * 60 },
  { id: "task-003", title: "Love Signal-ისთვის 3 ჰუკის ვარიანტის დაწერა", agentId: "muse", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 20 },
  { id: "task-004", title: "ახალი სერიის ვიზუალური კონცეფციის შექმნა", agentId: "vega", status: "QUEUED", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 15 },
  { id: "task-005", title: "OpenAI API-ის ჯანმრთელობის გადამოწმება", agentId: "atlas", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 10 },
  { id: "task-006", title: "QA გადახედვა: 2 მოლოდინში მყოფი პოსტი", agentId: "aegis", status: "QUEUED", progress: 0, priority: "high", createdAt: Date.now() - 1000 * 60 * 25 },
  { id: "task-007", title: "Telegram არხზე გამოქვეყნება", agentId: "echo", status: "QUEUED", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 45 },
  { id: "task-008", title: "გასული კვირის კანონზომიერებების ამოღება", agentId: "iris", status: "QUEUED", progress: 0, priority: "normal", createdAt: Date.now() - 1000 * 60 * 35 },
];

export const initialResources: Resource[] = [
  { id: "res-1", name: "OpenAI GPT-4", type: "AI პროვაიდერი", status: "healthy", usage: 742, quota: 1000 },
  { id: "res-2", name: "Anthropic Claude", type: "AI პროვაიდერი", status: "healthy", usage: 328, quota: 1000 },
  { id: "res-3", name: "Telegram Bot API", type: "პლატფორმა", status: "healthy", usage: 156, quota: 500 },
  { id: "res-4", name: "Cloudflare R2", type: "საცავი", status: "degraded", usage: 892, quota: 1000 },
  { id: "res-5", name: "Supabase OS", type: "მონაცემთა ბაზა", status: "healthy", usage: 234, quota: 5000 },
  { id: "res-6", name: "TikTok API", type: "პლატფორმა", status: "unavailable", usage: 0, quota: 100 },
];

export const initialKnowledge: KnowledgeDocument[] = [
  {
    knowledge_id: "brand_bible" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "აღმასრულებელი ცენტრი",
    title: "Lunara ბრენდის ბიბლია",
    content: "მუქი ედიტორიალი, პრემიუმ, მისტიკური მაგრამ თანამედროვე. შეკავებული პალიტრა, ძლიერი ტიპოგრაფია, გამორჩეული სიმბოლოები. თავიდან აიცილეთ ზოგადი 'AI ქალი + გალაქტიკა' გამოსახულებები.",
    confidence: 0.95,
    owner: "astra",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 7,
    expires_at: null
  },
  {
    knowledge_id: "content_bible" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "სტრატეგიის დეპარტამენტი",
    title: "კონტენტის სტრატეგია და ბურჯები",
    content: "30% სიყვარული/ურთიერთობები, 20% ინტერაქტიული/აირჩიე ბარათი, 15% ზოდიაქოს ფსიქოლოგია, 15% ყოველდღიური კოსმოსური სიგნალი, 10% მისტიკა, 10% განათლება. ფოკუსი ორიგინალობაზე, შენარჩუნებასა და გაზიარებადობაზე.",
    confidence: 0.90,
    owner: "sage",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 20,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 5,
    expires_at: null
  },
  {
    knowledge_id: "platform_rules" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "დაზვერვის დეპარტამენტი",
    title: "პლატფორმის სპეციფიკური წესები",
    content: "TikTok: სწრაფი ჰუკები, ტრენდებზე მორგებული ენა, უფრო ნედლი პრეზენტაცია. YouTube Shorts: ნათელი პრემისა, შენარჩუნების ანალიზი. Instagram Reels: ვიზუალური იდენტობა, გაზიარებადობა. Telegram: ინტერაქცია, გამოკითხვები, საზოგადოება.",
    confidence: 0.85,
    owner: "nyx",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 15,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 3,
    expires_at: null
  },
  {
    knowledge_id: "audience_knowledge" as KnowledgeId,
    version: "1.0.0",
    status: "active",
    source: "ანალიტიკის დეპარტამენტი",
    title: "აუდიტორიის შეხედულებები",
    content: "ძირითადი აუდიტორია: 18-34, ურთიერთობებზე ორიენტირებული, დაინტერესებული თვითაღმოჩენით. პიკური ჩართულობა: 19:00-21:00 სამუშაო დღეებში. მაღალი გაზიარების მოტივაცია იდენტობასთან დაკავშირებული კონტენტისთვის.",
    confidence: 0.80,
    owner: "nova",
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 10,
    updated_at: Date.now() - 1000 * 60 * 60 * 24 * 2,
    expires_at: null
  }
];