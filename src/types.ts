export type RoleType = 'MEGA_SUPER' | 'SUPER_ADMIN' | 'ADMIN' | 'EQUIPE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  companyId: string | null; // null for MEGA_SUPER
  teamId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  planId: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  companyId: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  maxTokensPerMonth: number;
  maxRequestsPerMinute: number;
  maxApiKeys: number;
  priceUSD: number;
}

export interface Server {
  id: string;
  hostname: string;
  ip: string;
  port: number;
  gpuModel: string;
  vramTotalGB: number;
  vramUsedGB: number;
  cpuModel: string;
  cpuUsagePercent: number;
  ramTotalGB: number;
  ramUsedGB: number;
  os: string;
  temperatureCelsius: number;
  gpuUsagePercent: number;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  lastHeartbeat: string;
  latencyMs: number;
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  description: string;
  endpoint: string;
  type: 'CHAT' | 'EMBEDDING' | 'IMAGE' | 'AUDIO';
  temperatureDefault: number;
  maxTokens: number;
  contextWindow: number;
  gpuUtilized: string;
  serverId: string;
  status: 'ONLINE' | 'OFFLINE';
  requestsCount: number;
  queueSize: number;
  tokensPerSecond: number;
  latencyMs: number;
}

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  keyPrefix: string; // e.g. "sk-cc-..."
  fullKey?: string; // Only shown once at creation
  userId: string;
  companyId: string;
  role: RoleType;
  permissions: string[]; // e.g. "chat", "embeddings", "images", "audio"
  allowedModels: string[]; // Model IDs or ["*"] for all
  dailyLimitTokens: number;
  monthlyLimitTokens: number;
  rateLimitRpm: number;
  allowedIps: string[]; // Empty means any
  expiresAt: string | null;
  status: 'ACTIVE' | 'REVOKED';
  lastUsedAt: string | null;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  companyId: string;
  teamId: string | null;
  userId: string;
  apiKeyId: string | null;
  modelId: string;
  serverId: string;
  prompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  latencyMs: number;
  httpStatus: number;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string | null;
  action: string; // e.g., "USER_LOGIN", "API_KEY_CREATED", "SERVER_ADDED"
  details: string;
  ip: string;
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  promptText: string;
  description: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  userId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  autoFailover: boolean;
  loadBalancingStrategy: 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'LOWEST_LATENCY';
  redisCacheEnabled: boolean;
  alertEmailEnabled: boolean;
  alertWebhookUrl: string;
  webhookEnabled: boolean;
  webhookUrl: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  read: boolean;
  createdAt: string;
}
