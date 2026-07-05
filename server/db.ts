import fs from 'fs';
import path from 'path';
import { 
  User, Company, Team, Plan, Server, Model, ApiKey, 
  UsageLog, AuditLog, PromptTemplate, Conversation, Message, SystemSettings, Notification 
} from '../src/types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Initial Mock Data Generator
const generateInitialData = () => {
  const plans: Plan[] = [
    { id: 'plan-basic', name: 'Plano Básico', maxTokensPerMonth: 10_000_000, maxRequestsPerMinute: 60, maxApiKeys: 5, priceUSD: 49 },
    { id: 'plan-pro', name: 'Plano Pro', maxTokensPerMonth: 50_000_000, maxRequestsPerMinute: 180, maxApiKeys: 25, priceUSD: 199 },
    { id: 'plan-enterprise', name: 'Plano Enterprise', maxTokensPerMonth: 500_000_000, maxRequestsPerMinute: 600, maxApiKeys: 100, priceUSD: 999 },
  ];

  const companies: Company[] = [
    { id: 'comp-1', name: 'Acme AI Corporation', slug: 'acme-corp', status: 'ACTIVE', planId: 'plan-pro', createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
    { id: 'comp-2', name: 'Inovação Digital Ltda', slug: 'inovacao-digital', status: 'ACTIVE', planId: 'plan-basic', createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString() },
  ];

  const teams: Team[] = [
    { id: 'team-1', name: 'Engenharia de LLM', companyId: 'comp-1', createdAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString() },
    { id: 'team-2', name: 'Produto & Analytics', companyId: 'comp-1', createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString() },
    { id: 'team-3', name: 'Desenvolvimento Web', companyId: 'comp-2', createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString() },
  ];

  const users: User[] = [
    { id: 'user-mega', name: 'Administrador Global', email: 'mega@aicontrol.com', role: 'MEGA_SUPER', companyId: null, teamId: null, status: 'ACTIVE', createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString() },
    
    // Acme Corp Users
    { id: 'user-super-1', name: 'Carlos Andrade', email: 'carlos@acme.com', role: 'SUPER_ADMIN', companyId: 'comp-1', teamId: null, status: 'ACTIVE', createdAt: new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString() },
    { id: 'user-admin-1', name: 'Juliana Torres', email: 'juliana@acme.com', role: 'ADMIN', companyId: 'comp-1', teamId: 'team-1', status: 'ACTIVE', createdAt: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString() },
    { id: 'user-eq-1', name: 'Lucas Pinheiro', email: 'lucas@acme.com', role: 'EQUIPE', companyId: 'comp-1', teamId: 'team-1', status: 'ACTIVE', createdAt: new Date(Date.now() - 26 * 24 * 3600 * 1000).toISOString() },
    { id: 'user-eq-2', name: 'Amanda Reis', email: 'amanda@acme.com', role: 'EQUIPE', companyId: 'comp-1', teamId: 'team-2', status: 'ACTIVE', createdAt: new Date(Date.now() - 24 * 24 * 3600 * 1000).toISOString() },

    // Inovacao Digital Users
    { id: 'user-super-2', name: 'Roberto Lima', email: 'roberto@inovacao.com', role: 'SUPER_ADMIN', companyId: 'comp-2', teamId: null, status: 'ACTIVE', createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString() },
    { id: 'user-eq-3', name: 'Mariana Costa', email: 'mariana@inovacao.com', role: 'EQUIPE', companyId: 'comp-2', teamId: 'team-3', status: 'ACTIVE', createdAt: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString() },
  ];

  const servers: Server[] = [
    { 
      id: 'srv-alpha', 
      hostname: 'gpu-cluster-alpha', 
      ip: '10.140.0.4', 
      port: 8000, 
      gpuModel: 'NVIDIA H100 80GB PCIe', 
      vramTotalGB: 80, 
      vramUsedGB: 45.2, 
      cpuModel: 'Intel Xeon Platinum 8480+', 
      cpuUsagePercent: 32, 
      ramTotalGB: 512, 
      ramUsedGB: 184.5, 
      os: 'Ubuntu 22.04.3 LTS', 
      temperatureCelsius: 64, 
      gpuUsagePercent: 78, 
      status: 'ONLINE', 
      lastHeartbeat: new Date().toISOString(),
      latencyMs: 14 
    },
    { 
      id: 'srv-beta', 
      hostname: 'gpu-cluster-beta', 
      ip: '10.140.0.5', 
      port: 8000, 
      gpuModel: 'NVIDIA A100-SXM4-80GB', 
      vramTotalGB: 80, 
      vramUsedGB: 12.8, 
      cpuModel: 'AMD EPYC 9654', 
      cpuUsagePercent: 12, 
      ramTotalGB: 256, 
      ramUsedGB: 64.2, 
      os: 'Ubuntu 22.04.3 LTS', 
      temperatureCelsius: 48, 
      gpuUsagePercent: 24, 
      status: 'ONLINE', 
      lastHeartbeat: new Date().toISOString(),
      latencyMs: 18 
    },
    { 
      id: 'srv-edge', 
      hostname: 'edge-rtx4090-01', 
      ip: '192.168.1.150', 
      port: 11434, 
      gpuModel: 'NVIDIA RTX 4090 24GB', 
      vramTotalGB: 24, 
      vramUsedGB: 18.1, 
      cpuModel: 'AMD Ryzen 9 7950X', 
      cpuUsagePercent: 18, 
      ramTotalGB: 64, 
      ramUsedGB: 28.3, 
      os: 'Debian 12 Stable', 
      temperatureCelsius: 58, 
      gpuUsagePercent: 62, 
      status: 'ONLINE', 
      lastHeartbeat: new Date().toISOString(),
      latencyMs: 25 
    },
  ];

  const models: Model[] = [
    { 
      id: 'mod-llama3-70b', 
      name: 'meta-llama/Llama-3-70b-instruct', 
      displayName: 'Llama 3 70B Instruct (vLLM)', 
      description: 'Modelo topo de linha auto-hospedado via vLLM para raciocínio complexo.', 
      endpoint: 'http://10.140.0.4:8000/v1', 
      type: 'CHAT', 
      temperatureDefault: 0.7, 
      maxTokens: 4096, 
      contextWindow: 8192, 
      gpuUtilized: '1x H100 (80GB)', 
      serverId: 'srv-alpha', 
      status: 'ONLINE', 
      requestsCount: 28430, 
      queueSize: 1, 
      tokensPerSecond: 45.2,
      latencyMs: 320
    },
    { 
      id: 'mod-mistral-7b', 
      name: 'mistralai/Mistral-7B-Instruct-v0.2', 
      displayName: 'Mistral 7B Instruct (vLLM)', 
      description: 'Modelo leve extremamente rápido para tarefas diárias e classificação.', 
      endpoint: 'http://10.140.0.4:8000/v1', 
      type: 'CHAT', 
      temperatureDefault: 0.5, 
      maxTokens: 2048, 
      contextWindow: 4096, 
      gpuUtilized: 'Shared H100', 
      serverId: 'srv-alpha', 
      status: 'ONLINE', 
      requestsCount: 125900, 
      queueSize: 0, 
      tokensPerSecond: 72.8,
      latencyMs: 140
    },
    { 
      id: 'mod-ollama-llama3-8b', 
      name: 'llama3:8b', 
      displayName: 'Llama 3 8B (Ollama Edge)', 
      description: 'Executando localmente no servidor de borda para baixíssima latência.', 
      endpoint: 'http://192.168.1.150:11434/api', 
      type: 'CHAT', 
      temperatureDefault: 0.7, 
      maxTokens: 2048, 
      contextWindow: 4096, 
      gpuUtilized: '1x RTX 4090 (24GB)', 
      serverId: 'srv-edge', 
      status: 'ONLINE', 
      requestsCount: 14200, 
      queueSize: 0, 
      tokensPerSecond: 58.1,
      latencyMs: 180
    },
    { 
      id: 'mod-nomic-embed', 
      name: 'nomic-ai/nomic-embed-text-v1.5', 
      displayName: 'Nomic Embed Text (TGI)', 
      description: 'Modelo de embeddings de alta fidelidade com janela de contexto expandida.', 
      endpoint: 'http://10.140.0.5:8000/v1', 
      type: 'EMBEDDING', 
      temperatureDefault: 0, 
      maxTokens: 512, 
      contextWindow: 8192, 
      gpuUtilized: 'Shared A100', 
      serverId: 'srv-beta', 
      status: 'ONLINE', 
      requestsCount: 94820, 
      queueSize: 0, 
      tokensPerSecond: 0,
      latencyMs: 45
    },
  ];

  // API Keys pre-generated
  const apiKeys: ApiKey[] = [
    {
      id: 'key-1',
      name: 'Chave Produção Backend',
      description: 'Chave utilizada no backend principal do cliente Acme.',
      keyPrefix: 'sk-cc-acme-prod',
      userId: 'user-super-1',
      companyId: 'comp-1',
      role: 'SUPER_ADMIN',
      permissions: ['chat', 'embeddings'],
      allowedModels: ['*'],
      dailyLimitTokens: 1_000_000,
      monthlyLimitTokens: 20_000_000,
      rateLimitRpm: 120,
      allowedIps: [],
      expiresAt: null,
      status: 'ACTIVE',
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'key-2',
      name: 'Chave Desenvolvimento Lucas',
      description: 'Chave para testes locais e desenvolvimento.',
      keyPrefix: 'sk-cc-lucas-dev',
      userId: 'user-eq-1',
      companyId: 'comp-1',
      role: 'EQUIPE',
      permissions: ['chat'],
      allowedModels: ['mod-mistral-7b', 'mod-ollama-llama3-8b'],
      dailyLimitTokens: 200_000,
      monthlyLimitTokens: 5_000_000,
      rateLimitRpm: 30,
      allowedIps: [],
      expiresAt: null,
      status: 'ACTIVE',
      lastUsedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
    }
  ];

  const usageLogs: UsageLog[] = [];
  const auditLogs: AuditLog[] = [];

  // Seed some historic usage logs for the dashboard charts
  const modelsList = ['mod-llama3-70b', 'mod-mistral-7b', 'mod-ollama-llama3-8b'];
  const companiesList = ['comp-1', 'comp-2'];
  const usersList = ['user-super-1', 'user-admin-1', 'user-eq-1', 'user-eq-2'];
  
  // Create 50 usage logs distributed over the last 12 hours
  for (let i = 50; i >= 1; i--) {
    const logTime = new Date(Date.now() - i * 14 * 60 * 1000); // approx every 14 mins
    const mId = modelsList[Math.floor(Math.random() * modelsList.length)];
    const cId = companiesList[Math.floor(Math.random() * companiesList.length)];
    const uId = usersList[Math.floor(Math.random() * usersList.length)];
    
    const inputTokens = Math.floor(Math.random() * 500) + 100;
    const outputTokens = Math.floor(Math.random() * 800) + 150;
    const latency = Math.floor(Math.random() * 1200) + 300;

    usageLogs.push({
      id: `log-${50 - i + 1}`,
      companyId: cId,
      teamId: cId === 'comp-1' ? 'team-1' : 'team-3',
      userId: uId,
      apiKeyId: cId === 'comp-1' ? 'key-1' : null,
      modelId: mId,
      serverId: mId === 'mod-ollama-llama3-8b' ? 'srv-edge' : 'srv-alpha',
      prompt: 'Olá, me ajude a analisar este algoritmo de ordenação.',
      response: 'Com certeza! Aqui está uma análise detalhada do Bubble Sort contra Quicksort...',
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      durationMs: latency,
      latencyMs: latency,
      httpStatus: 200,
      ip: '187.54.21.90',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: logTime.toISOString()
    });
  }

  // Audits
  auditLogs.push(
    { id: 'aud-1', userId: 'user-mega', userName: 'Administrador Global', userEmail: 'mega@aicontrol.com', companyId: null, action: 'USER_LOGIN', details: 'Login efetuado com sucesso.', ip: '179.220.14.33', createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
    { id: 'aud-2', userId: 'user-super-1', userName: 'Carlos Andrade', userEmail: 'carlos@acme.com', companyId: 'comp-1', action: 'API_KEY_CREATED', details: 'Criou nova API Key: Chave Produção Backend', ip: '187.54.21.90', createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
    { id: 'aud-3', userId: 'user-mega', userName: 'Administrador Global', userEmail: 'mega@aicontrol.com', companyId: null, action: 'SERVER_ADDED', details: 'Cadastrou servidor: gpu-cluster-alpha', ip: '127.0.0.1', createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }
  );

  const prompts: PromptTemplate[] = [
    { id: 'pr-1', title: 'Formatador de Código', category: 'Desenvolvimento', promptText: 'Atue como um formatador de código experiente. Ajuste o espaçamento, indentação e adicione tipagem estrita TypeScript no seguinte trecho de código:', description: 'Corrige indentação e formatação estruturada de código.', createdAt: new Date().toISOString() },
    { id: 'pr-2', title: 'Resumo Executivo', category: 'Escrita', promptText: 'Por favor, resuma o seguinte texto de reuniões técnicas em 3 tópicos de ações principais e 1 parágrafo geral de decisões:', description: 'Transforma longos logs de chat de reunião em resumos objetivos.', createdAt: new Date().toISOString() },
  ];

  const systemSettings: SystemSettings = {
    id: 'global-settings',
    maintenanceMode: false,
    autoFailover: true,
    loadBalancingStrategy: 'ROUND_ROBIN',
    redisCacheEnabled: true,
    alertEmailEnabled: true,
    alertWebhookUrl: 'https://webhook.site/acme-alerts',
    webhookEnabled: false,
    webhookUrl: ''
  };

  const notifications: Notification[] = [
    { id: 'not-1', title: 'Servidor Conectado', message: 'Servidor gpu-cluster-alpha conectou-se com sucesso e reportou 3 GPUs ativas.', type: 'SUCCESS', read: false, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: 'not-2', title: 'Alerta de Temperatura', message: 'Servidor rtx4090-01 atingiu 74ºC sob carga elevada.', type: 'WARNING', read: false, createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString() }
  ];

  const conversations: Conversation[] = [];
  const messages: Message[] = [];

  return {
    plans,
    companies,
    teams,
    users,
    servers,
    models,
    apiKeys,
    usageLogs,
    auditLogs,
    prompts,
    systemSettings,
    notifications,
    conversations,
    messages
  };
};

// Ensure directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Load database
export const loadDb = () => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading db.json, generating new database', e);
      const data = generateInitialData();
      saveDb(data);
      return data;
    }
  } else {
    const data = generateInitialData();
    saveDb(data);
    return data;
  }
};

// Save database
export const saveDb = (data: any) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// Helper to trigger alert notifications
const triggerAlertNotification = (data: any, title: string, message: string, type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS') => {
  if (!data.notifications) data.notifications = [];

  // Prevent duplicate notifications of same title within last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).getTime();
  const duplicate = data.notifications.find((n: Notification) => 
    n.title === title && 
    new Date(n.createdAt).getTime() > twoMinutesAgo
  );
  if (duplicate) return;

  const newNotif: Notification = {
    id: `not-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };

  data.notifications.unshift(newNotif);
  if (data.notifications.length > 50) {
    data.notifications = data.notifications.slice(0, 50);
  }

  // Log email sending to terminal
  console.log(`\x1b[33m[ALERT EMAIL SENT]\x1b[0m Destinatário: admin@aicontrol.com | Assunto: [${type}] ${title} | Mensagem: ${message}`);

  // Disparar Webhook real se configurado nas configurações do gateway
  const webhookUrl = data.systemSettings?.alertWebhookUrl;
  if (webhookUrl && webhookUrl.trim().startsWith('http')) {
    console.log(`\x1b[36m[ALERT WEBHOOK TRIGGERED]\x1b[0m Enviando payload para: ${webhookUrl}`);
    
    // Chamada POST de rede real via global fetch do Node
    if (typeof globalThis.fetch === 'function') {
      globalThis.fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'gateway_alert',
          id: newNotif.id,
          title,
          message,
          type,
          timestamp: newNotif.createdAt
        })
      })
      .then(res => {
        console.log(`[ALERT WEBHOOK] Resposta recebida do webhook com status: ${res.status}`);
      })
      .catch(err => {
        console.warn(`[ALERT WEBHOOK] Erro ao disparar webhook real: ${err.message}`);
      });
    }
  }
};

// Dynamic Server Performance update simulator
// Periodically updates telemetry to simulate a true production system
export const startTelemetrySimulator = () => {
  // Let's keep a tick counter to trigger random heartbeat failures or resource spikes
  let tick = 0;

  setInterval(() => {
    try {
      tick++;
      const data = loadDb();
      if (!data.servers || data.servers.length === 0) return;

      // 1. Telemetry Simulation
      data.servers = data.servers.map((srv: Server) => {
        // Simulate random temporary OFFLINE / Heartbeat Failure on 50th tick for 4 ticks, just for demo purposes
        let simulatedStatus = srv.status;
        if (srv.id === 'srv-edge') {
          if (tick % 45 === 0) {
            simulatedStatus = 'OFFLINE';
          } else if ((tick - 1) % 45 === 0 || (tick - 2) % 45 === 0) {
            // keep offline for 3 ticks
            simulatedStatus = 'OFFLINE';
          } else if (srv.status === 'OFFLINE') {
            simulatedStatus = 'ONLINE'; // auto-recover
          }
        }

        if (simulatedStatus !== 'ONLINE') {
          // If offline, metrics slide to zero, latency goes high
          return {
            ...srv,
            status: simulatedStatus,
            cpuUsagePercent: 0,
            gpuUsagePercent: 0,
            ramUsedGB: 0,
            latencyMs: 999,
            temperatureCelsius: 28,
            lastHeartbeat: new Date(Date.now() - 30000).toISOString() // stale heartbeat
          };
        }
        
        // Slightly fluctuate parameters for realism
        let cpuDelta = (Math.random() - 0.5) * 8;
        let gpuDelta = (Math.random() - 0.5) * 12;
        let tempDelta = (Math.random() - 0.5) * 4;
        let latencyDelta = (Math.random() - 0.5) * 6;

        // Random spike simulation
        if (tick % 20 === 0 && srv.id === 'srv-alpha') {
          // Force a high utilization spike on GPU/CPU for alert demo
          gpuDelta = 30;
          cpuDelta = 25;
          tempDelta = 10;
          latencyDelta = 50;
        }

        const newCpu = Math.min(100, Math.max(1, Math.round(srv.cpuUsagePercent + cpuDelta)));
        const newGpu = Math.min(100, Math.max(0, Math.round(srv.gpuUsagePercent + gpuDelta)));
        const newTemp = Math.min(95, Math.max(35, Math.round(srv.temperatureCelsius + tempDelta)));
        const newLat = Math.min(250, Math.max(4, Math.round(srv.latencyMs + latencyDelta)));
        
        // Calculate dynamic VRAM based on GPU usage
        const vramBase = srv.vramTotalGB * 0.15; // static overhead
        const vramLoad = srv.vramTotalGB * 0.75 * (newGpu / 100);
        const newVram = Math.min(srv.vramTotalGB, parseFloat((vramBase + vramLoad).toFixed(1)));

        // Dynamic RAM memory
        const newRam = Math.min(srv.ramTotalGB, parseFloat((srv.ramUsedGB + (Math.random() - 0.5) * 3).toFixed(1)));

        return {
          ...srv,
          cpuUsagePercent: newCpu,
          gpuUsagePercent: newGpu,
          temperatureCelsius: newTemp,
          latencyMs: newLat,
          vramUsedGB: newVram,
          ramUsedGB: newRam,
          lastHeartbeat: new Date().toISOString()
        };
      });

      // Fluctuate tokens per second and latency on models
      if (data.models && data.models.length > 0) {
        data.models = data.models.map((mod: Model) => {
          if (mod.status !== 'ONLINE') return mod;
          
          const tpsDelta = (Math.random() - 0.5) * 5;
          const latencyDelta = (Math.random() - 0.5) * 15;

          const newTps = mod.type === 'CHAT' 
            ? Math.min(120, Math.max(10, parseFloat((mod.tokensPerSecond + tpsDelta).toFixed(1))))
            : 0;
          const newLat = Math.min(800, Math.max(10, Math.round(mod.latencyMs + latencyDelta)));

          return {
            ...mod,
            tokensPerSecond: newTps,
            latencyMs: newLat
          };
        });
      }

      // 2. Alert & Notifications engine checks
      data.servers.forEach((srv: Server) => {
        // A. Heartbeat Failure
        if (srv.status !== 'ONLINE') {
          triggerAlertNotification(
            data,
            'Falha de Heartbeat Detectada',
            `O servidor '${srv.hostname}' (${srv.ip}) parou de responder às chamadas de ping do API Gateway. Status: ${srv.status}.`,
            'ERROR'
          );
        } else {
          // B. High CPU / GPU / RAM usage
          if (srv.gpuUsagePercent > 90) {
            triggerAlertNotification(
              data,
              'Alerta: Alta Utilização de GPU',
              `O servidor '${srv.hostname}' atingiu ${srv.gpuUsagePercent}% de processamento em sua GPU (${srv.gpuModel}). Alto risco de enfileiramento de prompts.`,
              'WARNING'
            );
          }
          if (srv.cpuUsagePercent > 90) {
            triggerAlertNotification(
              data,
              'Alerta: Sobrecarga de CPU',
              `O processamento de CPU do nó '${srv.hostname}' ultrapassou 90% (Atualmente em ${srv.cpuUsagePercent}%).`,
              'WARNING'
            );
          }
          if (srv.ramUsedGB / srv.ramTotalGB > 0.9) {
            triggerAlertNotification(
              data,
              'Alerta: Esgotamento de Memória RAM',
              `O nó '${srv.hostname}' atingiu ${Math.round((srv.ramUsedGB / srv.ramTotalGB) * 100)}% de uso de memória física RAM.`,
              'WARNING'
            );
          }
          // C. High Latency
          if (srv.latencyMs > 120) {
            triggerAlertNotification(
              data,
              'Alerta: Latência Elevada de Rede',
              `O ping de controle para '${srv.hostname}' atingiu ${srv.latencyMs}ms, podendo degradar a experiência de streaming de tokens das LLMs.`,
              'WARNING'
            );
          }
        }
      });

      // D. Consumption limits (per key or plan)
      const todayStr = new Date().toISOString().split('T')[0];
      const dailyTokensMap: Record<string, number> = {};
      
      if (data.usageLogs) {
        data.usageLogs.forEach((log: any) => {
          if (log.apiKeyId && log.createdAt.startsWith(todayStr)) {
            dailyTokensMap[log.apiKeyId] = (dailyTokensMap[log.apiKeyId] || 0) + log.totalTokens;
          }
        });
      }

      if (data.apiKeys) {
        data.apiKeys.forEach((key: ApiKey) => {
          if (key.status !== 'ACTIVE') return;
          const dailyTokens = dailyTokensMap[key.id] || 0;
          const limit = key.dailyLimitTokens;
          
          if (dailyTokens >= limit) {
            triggerAlertNotification(
              data,
              'Crítico: Limite de Consumo Diário Atingido',
              `A chave corporativa '${key.name}' atingiu o limite máximo de ${limit.toLocaleString()} tokens configurado para o dia de hoje. Novas conexões serão rejeitadas.`,
              'ERROR'
            );
          } else if (dailyTokens >= limit * 0.8) {
            triggerAlertNotification(
              data,
              'Aviso: Limite de Consumo Próximo',
              `A chave corporativa '${key.name}' consumiu mais de 80% da sua quota de tokens diária (${dailyTokens.toLocaleString()} / ${limit.toLocaleString()} tokens).`,
              'WARNING'
            );
          }
        });
      }

      saveDb(data);
    } catch (e) {
      // Slid gracefully
    }
  }, 4000); // update telemetry every 4 seconds
};
