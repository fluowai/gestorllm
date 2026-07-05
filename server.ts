import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { loadDb, saveDb, startTelemetrySimulator } from './server/db.js';
import { GoogleGenAI } from '@google/genai';
import { 
  User, Company, Team, Plan, Server, Model, ApiKey, 
  UsageLog, AuditLog, PromptTemplate, Conversation, Message, SystemSettings, Notification 
} from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize local database
const db = loadDb();
startTelemetrySimulator();

// Set up Gemini API Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini API client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Gemini API client:', err);
  }
} else {
  console.warn('GEMINI_API_KEY is not defined in the environment. API Gateway will run in Simulation Mode.');
}

// In-Memory Rate Limit Tracker
const rateLimitCache: Record<string, { count: number; resetAt: number }> = {};

// Helper: Custom CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware (Simple Token based on User ID)
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Cabeçalho Authorization ausente ou inválido.' });
  }
  const token = authHeader.split(' ')[1];
  const data = loadDb();
  const user = data.users.find((u: User) => u.id === token);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado ou sessão expirada.' });
  }
  (req as any).user = user;
  next();
};

// ==========================================
// API GATEWAY ENDPOINTS (OpenAI Compatible)
// ==========================================

// Validate API Key Middleware
const validateGatewayKey = (req: Request, res: Response, next: NextFunction) => {
  let keyToken = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    keyToken = authHeader.split(' ')[1];
  } else if (req.headers['x-api-key']) {
    keyToken = req.headers['x-api-key'] as string;
  }

  if (!keyToken) {
    return res.status(401).json({ error: 'Chave de API ausente. Use Authorization Bearer ou x-api-key.' });
  }

  const data = loadDb();
  const apiKey = data.apiKeys.find((k: ApiKey) => k.id === keyToken || k.keyPrefix + '.' + k.id === keyToken || k.id === keyToken.split('.').pop());
  
  if (!apiKey || apiKey.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Chave de API inválida, revogada ou inativa.' });
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'Chave de API expirada.' });
  }

  // Rate Limit check (RPM)
  const now = Date.now();
  const limitKey = `rl:${apiKey.id}`;
  if (!rateLimitCache[limitKey] || rateLimitCache[limitKey].resetAt < now) {
    rateLimitCache[limitKey] = { count: 1, resetAt: now + 60000 };
  } else {
    rateLimitCache[limitKey].count += 1;
    if (rateLimitCache[limitKey].count > apiKey.rateLimitRpm) {
      return res.status(429).json({ error: `Rate limit excedido. Limite de ${apiKey.rateLimitRpm} RPM atingido.` });
    }
  }

  (req as any).apiKey = apiKey;
  next();
};

// GET /api/v1/models (OpenAI Compatible)
app.get('/api/v1/models', (req, res) => {
  const data = loadDb();
  const modelsFormatted = data.models.map((m: Model) => ({
    id: m.id,
    object: 'model',
    created: Math.floor(Date.now() / 1000) - 10000,
    owned_by: 'ai-control-center',
    permission: []
  }));
  res.json({ object: 'list', data: modelsFormatted });
});

// POST /api/v1/chat/completions (OpenAI Compatible with Streaming and Logging)
app.post('/api/v1/chat/completions', validateGatewayKey, async (req: Request, res: Response) => {
  const apiKey: ApiKey = (req as any).apiKey;
  const { model, messages, temperature, max_tokens, stream } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'O parâmetro messages é obrigatório e deve ser um array.' });
  }

  const data = loadDb();
  const selectedModel = data.models.find((m: Model) => m.id === model || m.name === model);
  if (!selectedModel) {
    return res.status(404).json({ error: `Modelo '${model}' não encontrado ou inativo nesta plataforma.` });
  }

  // Check model permissions
  if (!apiKey.allowedModels.includes('*') && !apiKey.allowedModels.includes(selectedModel.id)) {
    return res.status(403).json({ error: `Sua chave de API não tem permissão para usar o modelo '${selectedModel.displayName}'.` });
  }

  const startTime = Date.now();
  const promptText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  // Extract system prompt and convert messages to Gemini contents format
  let systemInstruction = '';
  const geminiContents: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction += msg.content + '\n';
    } else {
      const gRole = msg.role === 'assistant' ? 'model' : 'user';
      geminiContents.push({
        role: gRole,
        parts: [{ text: msg.content }]
      });
    }
  }

  // Fallback to simulation if Gemini is not configured
  if (!ai) {
    const simulatedResponse = `[GATEWAY SIMULATION] Sou o modelo ${selectedModel.displayName}. Recebi sua mensagem de ${messages.length} partes. Esta é uma resposta de teste simulada pelo gateway pois a chave de API GEMINI_API_KEY do servidor não foi configurada.`;
    const inputTokens = Math.round(promptText.length / 4);
    const outputTokens = Math.round(simulatedResponse.length / 4);
    const totalTokens = inputTokens + outputTokens;
    const duration = Date.now() - startTime;

    // Log the transaction
    const newLog: UsageLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: apiKey.companyId,
      teamId: null,
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      modelId: selectedModel.id,
      serverId: selectedModel.serverId,
      prompt: promptText.slice(0, 500),
      response: simulatedResponse,
      inputTokens,
      outputTokens,
      totalTokens,
      durationMs: duration,
      latencyMs: duration,
      httpStatus: 200,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'API Gateway Client',
      createdAt: new Date().toISOString()
    };

    data.usageLogs.push(newLog);
    // Update API Key last used
    const keyIdx = data.apiKeys.findIndex((k: ApiKey) => k.id === apiKey.id);
    if (keyIdx !== -1) data.apiKeys[keyIdx].lastUsedAt = new Date().toISOString();
    saveDb(data);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const words = simulatedResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        const chunk = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: selectedModel.name,
          choices: [{
            index: 0,
            delta: { content: word },
            finish_reason: null
          }]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        await new Promise(r => setTimeout(r, 60));
      }

      const finalChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: selectedModel.name,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } else {
      return res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: selectedModel.name,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: simulatedResponse
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: totalTokens
        }
      });
    }
  }

  // Real Gemini implementation
  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: geminiContents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: temperature !== undefined ? temperature : selectedModel.temperatureDefault,
          maxOutputTokens: max_tokens || selectedModel.maxTokens
        }
      });

      let fullResponseText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        fullResponseText += text;

        const gatewayChunk = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: selectedModel.name,
          choices: [{
            index: 0,
            delta: { content: text },
            finish_reason: null
          }]
        };
        res.write(`data: ${JSON.stringify(gatewayChunk)}\n\n`);
      }

      const finalChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: selectedModel.name,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      // Log transaction asynchronously
      const inputTokens = Math.round(promptText.length / 4);
      const outputTokens = Math.round(fullResponseText.length / 4);
      const duration = Date.now() - startTime;

      const usageLog: UsageLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        companyId: apiKey.companyId,
        teamId: null,
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        modelId: selectedModel.id,
        serverId: selectedModel.serverId,
        prompt: promptText.slice(0, 500),
        response: fullResponseText,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        durationMs: duration,
        latencyMs: duration,
        httpStatus: 200,
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'API Gateway Client',
        createdAt: new Date().toISOString()
      };
      
      const dbFresh = loadDb();
      dbFresh.usageLogs.push(usageLog);
      const keyIdx = dbFresh.apiKeys.findIndex((k: ApiKey) => k.id === apiKey.id);
      if (keyIdx !== -1) dbFresh.apiKeys[keyIdx].lastUsedAt = new Date().toISOString();
      saveDb(dbFresh);

    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: geminiContents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: temperature !== undefined ? temperature : selectedModel.temperatureDefault,
          maxOutputTokens: max_tokens || selectedModel.maxTokens
        }
      });

      const responseText = response.text || '';
      const duration = Date.now() - startTime;

      const inputTokens = Math.round(promptText.length / 4);
      const outputTokens = Math.round(responseText.length / 4);
      const totalTokens = inputTokens + outputTokens;

      const usageLog: UsageLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        companyId: apiKey.companyId,
        teamId: null,
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        modelId: selectedModel.id,
        serverId: selectedModel.serverId,
        prompt: promptText.slice(0, 500),
        response: responseText,
        inputTokens,
        outputTokens,
        totalTokens,
        durationMs: duration,
        latencyMs: duration,
        httpStatus: 200,
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'API Gateway Client',
        createdAt: new Date().toISOString()
      };

      const dbFresh = loadDb();
      dbFresh.usageLogs.push(usageLog);
      const keyIdx = dbFresh.apiKeys.findIndex((k: ApiKey) => k.id === apiKey.id);
      if (keyIdx !== -1) dbFresh.apiKeys[keyIdx].lastUsedAt = new Date().toISOString();
      saveDb(dbFresh);

      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: selectedModel.name,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: responseText
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: totalTokens
        }
      });
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(502).json({ error: 'Erro de comunicação com o provedor de IA.', details: error.message });
  }
});

// ==========================================
// ADMIN & MULTI-TENANT MANAGEMENT API ROUTES
// ==========================================

// --- Auth Routes ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const currentDb = loadDb();
  
  // Custom auth bypass (just matches email)
  const user = currentDb.users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Credenciais inválidas ou conta inativa.' });
  }

  // Create audit log
  const audit: AuditLog = {
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: user.companyId,
    action: 'USER_LOGIN',
    details: 'Login efetuado com sucesso via plataforma.',
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  };
  currentDb.auditLogs.push(audit);
  saveDb(currentDb);

  res.json({
    token: user.id, // Direct ID token bypass
    user
  });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  const currentDb = loadDb();
  const user = currentDb.users.find((u: User) => u.id === token);
  if (!user) return res.status(401).json({ error: 'Sessão inválida' });

  res.json(user);
});

// --- Servers & Models Admin ---
app.get('/api/servers', authenticateUser, (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.servers);
});

app.post('/api/servers', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Apenas Administradores Globais podem gerenciar servidores.' });
  }

  const serverData: Server = req.body;
  const currentDb = loadDb();
  
  const newServer: Server = {
    ...serverData,
    id: `srv-${Date.now()}`,
    vramUsedGB: 0,
    cpuUsagePercent: 0,
    ramUsedGB: 0,
    temperatureCelsius: 40,
    gpuUsagePercent: 0,
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    latencyMs: 12
  };

  currentDb.servers.push(newServer);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: null,
    action: 'SERVER_ADDED',
    details: `Adicionou o servidor: ${newServer.hostname}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.status(201).json(newServer);
});

app.delete('/api/servers/:id', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Apenas Administradores Globais podem gerenciar servidores.' });
  }

  const { id } = req.params;
  const currentDb = loadDb();
  const idx = currentDb.servers.findIndex((s: Server) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Servidor não encontrado.' });

  const srvName = currentDb.servers[idx].hostname;
  currentDb.servers.splice(idx, 1);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: null,
    action: 'SERVER_DELETED',
    details: `Excluiu o servidor: ${srvName}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.json({ success: true });
});

// --- Models ---
app.get('/api/models', authenticateUser, (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.models);
});

app.post('/api/models', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Apenas Administradores Globais podem gerenciar modelos.' });
  }

  const modelData: Model = req.body;
  const currentDb = loadDb();

  const newModel: Model = {
    ...modelData,
    id: `mod-${Date.now()}`,
    status: 'ONLINE',
    requestsCount: 0,
    queueSize: 0,
    tokensPerSecond: modelData.type === 'CHAT' ? 45.0 : 0
  };

  currentDb.models.push(newModel);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: null,
    action: 'MODEL_ADDED',
    details: `Registrou modelo: ${newModel.displayName}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.status(201).json(newModel);
});

app.delete('/api/models/:id', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Apenas Administradores Globais podem gerenciar modelos.' });
  }

  const { id } = req.params;
  const currentDb = loadDb();
  const idx = currentDb.models.findIndex((m: Model) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Modelo não encontrado.' });

  const mName = currentDb.models[idx].displayName;
  currentDb.models.splice(idx, 1);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: null,
    action: 'MODEL_DELETED',
    details: `Excluiu modelo: ${mName}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.json({ success: true });
});

// --- API Keys CRUD ---
app.get('/api/api-keys', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const currentDb = loadDb();

  let keys = [];
  if (user.role === 'MEGA_SUPER') {
    keys = currentDb.apiKeys;
  } else if (user.role === 'SUPER_ADMIN') {
    keys = currentDb.apiKeys.filter((k: ApiKey) => k.companyId === user.companyId);
  } else {
    keys = currentDb.apiKeys.filter((k: ApiKey) => k.userId === user.id);
  }

  res.json(keys);
});

app.post('/api/api-keys', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const keyData: Partial<ApiKey> = req.body;
  const currentDb = loadDb();

  if (user.role === 'EQUIPE') {
    return res.status(403).json({ error: 'Usuários do nível Equipe não podem gerar novas chaves.' });
  }

  const keyId = `key-${Date.now()}`;
  const prefix = keyData.keyPrefix || `sk-cc-${user.companyId ? user.companyId.replace('comp-', '') : 'mega'}`;
  const fullKey = `${prefix}.${Math.random().toString(36).substring(2, 15)}.${keyId}`;

  const newKey: ApiKey = {
    id: keyId,
    name: keyData.name || 'Nova Chave de API',
    description: keyData.description || '',
    keyPrefix: prefix,
    fullKey: fullKey, // returned only once
    userId: user.id,
    companyId: user.companyId || 'comp-mega',
    role: user.role,
    permissions: keyData.permissions || ['chat'],
    allowedModels: keyData.allowedModels || ['*'],
    dailyLimitTokens: keyData.dailyLimitTokens || 1_000_000,
    monthlyLimitTokens: keyData.monthlyLimitTokens || 10_000_000,
    rateLimitRpm: keyData.rateLimitRpm || 60,
    allowedIps: keyData.allowedIps || [],
    expiresAt: keyData.expiresAt || null,
    status: 'ACTIVE',
    lastUsedAt: null,
    createdAt: new Date().toISOString()
  };

  currentDb.apiKeys.push(newKey);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: user.companyId,
    action: 'API_KEY_CREATED',
    details: `Criou a chave de API: ${newKey.name}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.status(201).json(newKey);
});

app.delete('/api/api-keys/:id', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const currentDb = loadDb();

  const keyIdx = currentDb.apiKeys.findIndex((k: ApiKey) => k.id === id);
  if (keyIdx === -1) return res.status(404).json({ error: 'Chave não encontrada.' });

  const key = currentDb.apiKeys[keyIdx];
  // Auth check
  if (user.role !== 'MEGA_SUPER' && key.companyId !== user.companyId) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  // Revoke key
  currentDb.apiKeys[keyIdx].status = 'REVOKED';
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: user.companyId,
    action: 'API_KEY_REVOKED',
    details: `Revogou a chave de API: ${key.name}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.json({ success: true });
});

// --- Companies (MEGA_SUPER only) ---
app.get('/api/companies', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Apenas Mega Superadmin pode ver todas as empresas.' });
  }
  const currentDb = loadDb();
  res.json(currentDb.companies);
});

app.post('/api/companies', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const { name, planId } = req.body;
  const currentDb = loadDb();

  const newComp: Company = {
    id: `comp-${Date.now()}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: 'ACTIVE',
    planId: planId || 'plan-basic',
    createdAt: new Date().toISOString()
  };

  currentDb.companies.push(newComp);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: null,
    action: 'COMPANY_CREATED',
    details: `Criou a empresa: ${newComp.name}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.status(201).json(newComp);
});

// --- Teams ---
app.get('/api/teams', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const currentDb = loadDb();

  let filtered = [];
  if (user.role === 'MEGA_SUPER') {
    filtered = currentDb.teams;
  } else {
    filtered = currentDb.teams.filter((t: Team) => t.companyId === user.companyId);
  }
  res.json(filtered);
});

app.post('/api/teams', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER' && user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores de empresa podem criar equipes.' });
  }

  const { name, companyId } = req.body;
  const finalCompanyId = user.role === 'MEGA_SUPER' ? companyId : user.companyId;

  if (!finalCompanyId) return res.status(400).json({ error: 'ID da empresa é obrigatório.' });

  const currentDb = loadDb();
  const newTeam: Team = {
    id: `team-${Date.now()}`,
    name,
    companyId: finalCompanyId,
    createdAt: new Date().toISOString()
  };

  currentDb.teams.push(newTeam);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: user.companyId,
    action: 'TEAM_CREATED',
    details: `Criou a equipe: ${newTeam.name}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.status(201).json(newTeam);
});

// --- Users ---
app.get('/api/users', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const currentDb = loadDb();

  let filtered = [];
  if (user.role === 'MEGA_SUPER') {
    filtered = currentDb.users;
  } else {
    filtered = currentDb.users.filter((u: User) => u.companyId === user.companyId);
  }
  res.json(filtered);
});

app.post('/api/users', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role === 'EQUIPE') {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const { name, email, role, teamId, companyId } = req.body;
  const finalCompanyId = user.role === 'MEGA_SUPER' ? companyId : user.companyId;

  const currentDb = loadDb();
  const newUsr: User = {
    id: `user-${Date.now()}`,
    name,
    email,
    role,
    companyId: finalCompanyId,
    teamId: teamId || null,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  currentDb.users.push(newUsr);
  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: user.companyId,
    action: 'USER_CREATED',
    details: `Criou o usuário: ${newUsr.name} (${newUsr.email})`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.status(201).json(newUsr);
});

// --- Usage & Audit Logs ---
app.get('/api/usage-logs', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const currentDb = loadDb();

  let filtered = [];
  if (user.role === 'MEGA_SUPER') {
    filtered = currentDb.usageLogs;
  } else {
    filtered = currentDb.usageLogs.filter((l: UsageLog) => l.companyId === user.companyId);
  }
  // Return reversed to get most recent first
  res.json([...filtered].reverse());
});

app.get('/api/audit-logs', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const currentDb = loadDb();

  let filtered = [];
  if (user.role === 'MEGA_SUPER') {
    filtered = currentDb.auditLogs;
  } else {
    filtered = currentDb.auditLogs.filter((l: AuditLog) => l.companyId === user.companyId);
  }
  res.json([...filtered].reverse());
});

// --- Prompts ---
app.get('/api/prompts', authenticateUser, (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.prompts || []);
});

app.post('/api/prompts', authenticateUser, (req, res) => {
  const { title, category, promptText, description } = req.body;
  const currentDb = loadDb();
  
  const newPrompt: PromptTemplate = {
    id: `pr-${Date.now()}`,
    title,
    category,
    promptText,
    description,
    createdAt: new Date().toISOString()
  };

  if (!currentDb.prompts) currentDb.prompts = [];
  currentDb.prompts.push(newPrompt);
  saveDb(currentDb);
  res.status(201).json(newPrompt);
});

app.delete('/api/prompts/:id', authenticateUser, (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();
  
  if (!currentDb.prompts) currentDb.prompts = [];
  const idx = currentDb.prompts.findIndex((p: PromptTemplate) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Prompt não encontrado.' });

  currentDb.prompts.splice(idx, 1);
  saveDb(currentDb);
  res.json({ success: true });
});

// --- Settings ---
app.get('/api/settings', authenticateUser, (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.systemSettings);
});

app.put('/api/settings', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  if (user.role !== 'MEGA_SUPER') {
    return res.status(403).json({ error: 'Apenas Mega Superadmin pode alterar configurações globais.' });
  }

  const currentDb = loadDb();
  currentDb.systemSettings = {
    ...currentDb.systemSettings,
    ...req.body
  };

  currentDb.auditLogs.push({
    id: `aud-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    companyId: null,
    action: 'SETTINGS_UPDATED',
    details: 'Atualizou as configurações globais do sistema.',
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  saveDb(currentDb);
  res.json(currentDb.systemSettings);
});

// --- Notifications ---
app.get('/api/notifications', authenticateUser, (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.notifications || []);
});

app.post('/api/notifications/read-all', authenticateUser, (req, res) => {
  const currentDb = loadDb();
  if (currentDb.notifications) {
    currentDb.notifications = currentDb.notifications.map((n: Notification) => ({ ...n, read: true }));
    saveDb(currentDb);
  }
  res.json({ success: true });
});

// --- Plans ---
app.get('/api/plans', (req, res) => {
  const currentDb = loadDb();
  res.json(currentDb.plans || []);
});

// --- Playground Conversations & Messaging inside Workspace ---
app.get('/api/conversations', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const currentDb = loadDb();
  if (!currentDb.conversations) currentDb.conversations = [];
  
  const userConvs = currentDb.conversations.filter((c: Conversation) => c.userId === user.id);
  res.json(userConvs);
});

app.post('/api/conversations', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const { title, modelId, temperature, maxTokens, systemPrompt } = req.body;
  const currentDb = loadDb();
  if (!currentDb.conversations) currentDb.conversations = [];

  const newConv: Conversation = {
    id: `conv-${Date.now()}`,
    title: title || 'Nova Conversa',
    modelId: modelId || 'mod-mistral-7b',
    userId: user.id,
    temperature: temperature !== undefined ? temperature : 0.7,
    maxTokens: maxTokens || 2048,
    systemPrompt: systemPrompt || 'Você é um assistente de IA prestativo.',
    createdAt: new Date().toISOString()
  };

  currentDb.conversations.push(newConv);
  saveDb(currentDb);
  res.status(201).json(newConv);
});

app.delete('/api/conversations/:id', authenticateUser, (req, res) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const currentDb = loadDb();
  
  if (!currentDb.conversations) currentDb.conversations = [];
  if (!currentDb.messages) currentDb.messages = [];

  const idx = currentDb.conversations.findIndex((c: Conversation) => c.id === id && c.userId === user.id);
  if (idx === -1) return res.status(404).json({ error: 'Conversa não encontrada.' });

  currentDb.conversations.splice(idx, 1);
  currentDb.messages = currentDb.messages.filter((m: Message) => m.conversationId !== id);
  
  saveDb(currentDb);
  res.json({ success: true });
});

app.get('/api/conversations/:id/messages', authenticateUser, (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();
  if (!currentDb.messages) currentDb.messages = [];

  const msgs = currentDb.messages.filter((m: Message) => m.conversationId === id);
  res.json(msgs);
});

// Send message & trigger AI generation (via Gateway mechanics!)
app.post('/api/conversations/:id/messages', authenticateUser, async (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const { id } = req.params;
  const { content } = req.body;

  const currentDb = loadDb();
  if (!currentDb.conversations) currentDb.conversations = [];
  if (!currentDb.messages) currentDb.messages = [];

  const conv = currentDb.conversations.find((c: Conversation) => c.id === id && c.userId === user.id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada.' });

  // Save User message
  const userMsg: Message = {
    id: `msg-${Date.now()}-user`,
    conversationId: id,
    role: 'user',
    content,
    createdAt: new Date().toISOString()
  };
  currentDb.messages.push(userMsg);
  saveDb(currentDb);

  // Retrieve full message history of this conversation to send as context
  const fullHistory = currentDb.messages
    .filter((m: Message) => m.conversationId === id)
    .map((m: Message) => ({ role: m.role, content: m.content }));

  // Add system prompt to history top if defined
  if (conv.systemPrompt) {
    fullHistory.unshift({ role: 'system', content: conv.systemPrompt });
  }

  // Find corresponding model
  const selectedModel = currentDb.models.find((m: Model) => m.id === conv.modelId);
  const selectedServer = currentDb.servers.find((s: Server) => s.id === (selectedModel?.serverId || 'srv-alpha'));

  const startTime = Date.now();

  // Call internal LLM translation logic
  let aiResponseText = '';
  const inputTokens = Math.round(content.length / 4);

  if (ai) {
    try {
      const geminiContents: any[] = [];
      let systemInstruction = conv.systemPrompt || '';

      for (const msg of fullHistory) {
        if (msg.role === 'system') {
          systemInstruction = msg.content;
        } else {
          geminiContents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: geminiContents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: conv.temperature,
          maxOutputTokens: conv.maxTokens
        }
      });
      aiResponseText = response.text || '';
    } catch (err: any) {
      console.error('Gemini playground failure:', err);
      aiResponseText = `[ERRO DE CONEXÃO] Erro ao comunicar com o modelo Gemini: ${err.message}`;
    }
  } else {
    // Simulated Playground chat delay & simulation
    await new Promise(r => setTimeout(r, 1000));
    aiResponseText = `[GATEWAY PLAYGROUND SIMULADO] Olá! Sou o modelo '${selectedModel?.displayName || 'Mistral 7B'}' hospedado em '${selectedServer?.hostname || 'gpu-cluster-alpha'}'. Recebi sua mensagem com sucesso. Como a chave GEMINI_API_KEY não foi configurada localmente no ambiente, esta é uma resposta simulada para ilustrar o fluxo de gateway em tempo real!`;
  }

  const outputTokens = Math.round(aiResponseText.length / 4);
  const duration = Date.now() - startTime;

  // Save Assistant message
  const assistantMsg: Message = {
    id: `msg-${Date.now()}-assistant`,
    conversationId: id,
    role: 'assistant',
    content: aiResponseText,
    createdAt: new Date().toISOString(),
    inputTokens,
    outputTokens
  };

  // Log in Usage Logs representing a direct call by this user
  const dbFresh = loadDb();
  if (!dbFresh.messages) dbFresh.messages = [];
  if (!dbFresh.usageLogs) dbFresh.usageLogs = [];

  dbFresh.messages.push(assistantMsg);

  // Add Usage Log entry representing user calling model via playground
  const usageLog: UsageLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId: user.companyId || 'comp-mega',
    teamId: user.teamId,
    userId: user.id,
    apiKeyId: null, // called directly via web UI
    modelId: conv.modelId,
    serverId: selectedModel?.serverId || 'srv-alpha',
    prompt: content.slice(0, 500),
    response: aiResponseText,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    durationMs: duration,
    latencyMs: duration,
    httpStatus: 200,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Playground Browser Client',
    createdAt: new Date().toISOString()
  };
  dbFresh.usageLogs.push(usageLog);

  // Increment requestsCount of model
  const mIdx = dbFresh.models.findIndex((m: Model) => m.id === conv.modelId);
  if (mIdx !== -1) {
    dbFresh.models[mIdx].requestsCount += 1;
  }

  saveDb(dbFresh);

  res.json({
    userMessage: userMsg,
    assistantMessage: assistantMsg
  });
});

// ==========================================
// STATIC FILES & VITE MIDDLEWARE SETUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
