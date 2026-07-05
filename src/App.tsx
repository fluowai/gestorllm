import React, { useState, useEffect } from 'react';
import { 
  Activity, Server as ServerIcon, Cpu, Key, Database, Play, 
  Settings, Users, Globe, Building2, CheckCircle2, AlertTriangle, 
  XCircle, Plus, Trash2, Search, ArrowRight, UserCheck, RefreshCw, 
  Copy, ExternalLink, Calendar, Shield, Clock, Send, Sparkles, BookOpen,
  Sliders, MessageSquare, Download, Check, HelpCircle, Paperclip
} from 'lucide-react';
import { 
  User, Company, Team, Plan, Server, Model, ApiKey, 
  UsageLog, AuditLog, PromptTemplate, Conversation, Message, SystemSettings, Notification 
} from './types';

// Avatars for demo roles
const USER_AVATARS: Record<string, string> = {
  'user-mega': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
  'user-super-1': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
  'user-admin-1': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
  'user-eq-1': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
  'user-eq-2': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
  'user-super-2': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
  'user-eq-3': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80',
};

export default function App() {
  // Authentication & Multi-Tenant Persona
  const [activeUserId, setActiveUserId] = useState<string>('user-mega');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'servers' | 'keys' | 'playground' | 'logs' | 'config'>('dashboard');
  
  // Data State
  const [servers, setServers] = useState<Server[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  // Model Catalog Search & Filtering states
  const [modelCatalogSearch, setModelCatalogSearch] = useState('');
  const [modelCatalogTypeFilter, setModelCatalogTypeFilter] = useState('');
  const [modelCatalogServerFilter, setModelCatalogServerFilter] = useState('');

  // Creation Modals & Form states
  const [showServerModal, setShowServerModal] = useState(false);
  const [newServerForm, setNewServerForm] = useState({
    hostname: '', ip: '', port: 8000, gpuModel: 'NVIDIA RTX 4090 24GB', vramTotalGB: 24, cpuModel: 'Intel Core i9', ramTotalGB: 64, os: 'Ubuntu 22.04 LTS'
  });

  const [showModelModal, setShowModelModal] = useState(false);
  const [newModelForm, setNewModelForm] = useState({
    name: '', displayName: '', description: '', endpoint: '', type: 'CHAT' as 'CHAT' | 'EMBEDDING' | 'IMAGE' | 'AUDIO', temperatureDefault: 0.7, maxTokens: 2048, contextWindow: 4096, gpuUtilized: '1x GPU', serverId: ''
  });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '', description: '', permissions: ['chat'], allowedModels: ['*'], dailyLimitTokens: 1000000, monthlyLimitTokens: 10000000, rateLimitRpm: 60, allowedIps: ''
  });
  const [createdKeyResponse, setCreatedKeyResponse] = useState<ApiKey | null>(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({ name: '', planId: 'plan-basic' });

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState({ name: '', companyId: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'EQUIPE' as any, teamId: '', companyId: '' });

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [newPromptForm, setNewPromptForm] = useState({ title: '', category: 'Geral', promptText: '', description: '' });

  // Playground state
  const [playgroundConversations, setPlaygroundConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([]);
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundSettings, setPlaygroundSettings] = useState({
    modelId: '', temperature: 0.7, maxTokens: 2048, systemPrompt: 'Você é o assistente inteligente do AI Control Center.'
  });
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: number; content: string; type: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Copied Key confirmation state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status Alerts
  const [alertMessage, setAlertMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Fetch all core resources
  const fetchAllData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${activeUserId}` };
      
      // Fetch users
      const usersRes = await fetch('/api/users', { headers });
      if (usersRes.ok) {
        const uList = await usersRes.json();
        setAllUsers(uList);
        const curr = uList.find((u: User) => u.id === activeUserId);
        if (curr) setCurrentUser(curr);
      }

      // Fetch servers
      const srvRes = await fetch('/api/servers', { headers });
      if (srvRes.ok) setServers(await srvRes.json());

      // Fetch models
      const modRes = await fetch('/api/models', { headers });
      if (modRes.ok) {
        const mList = await modRes.json();
        setModels(mList);
        // Set default model in playground if not set
        if (!playgroundSettings.modelId && mList.length > 0) {
          setPlaygroundSettings(prev => ({ ...prev, modelId: mList[0].id }));
        }
      }

      // Fetch api keys
      const keyRes = await fetch('/api/api-keys', { headers });
      if (keyRes.ok) setApiKeys(await keyRes.json());

      // Fetch usage logs
      const usageRes = await fetch('/api/usage-logs', { headers });
      if (usageRes.ok) setUsageLogs(await usageRes.json());

      // Fetch audit logs
      const auditRes = await fetch('/api/audit-logs', { headers });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

      // Fetch companies
      const compRes = await fetch('/api/companies', { headers });
      if (compRes.ok) setCompanies(await compRes.json());

      // Fetch teams
      const teamRes = await fetch('/api/teams', { headers });
      if (teamRes.ok) setTeams(await teamRes.json());

      // Fetch plans
      const planRes = await fetch('/api/plans', { headers });
      if (planRes.ok) setPlans(await planRes.json());

      // Fetch prompts
      const promptRes = await fetch('/api/prompts', { headers });
      if (promptRes.ok) setPrompts(await promptRes.json());

      // Fetch settings
      const settingsRes = await fetch('/api/settings', { headers });
      if (settingsRes.ok) setSettings(await settingsRes.json());

      // Fetch notifications
      const notifRes = await fetch('/api/notifications', { headers });
      if (notifRes.ok) setNotifications(await notifRes.json());

      // Fetch playground conversations
      const convRes = await fetch('/api/conversations', { headers });
      if (convRes.ok) {
        const convList = await convRes.json();
        setPlaygroundConversations(convList);
        if (convList.length > 0 && !activeConversationId) {
          setActiveConversationId(convList[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching data from backend', e);
    }
  };

  // Run on load and whenever active persona changes
  useEffect(() => {
    fetchAllData();
    
    // Auto polling every 5 seconds to keep dashboard real-time and telemetry dynamic
    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeUserId]);

  // Load playground messages when active conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversationId) {
        setPlaygroundMessages([]);
        return;
      }
      try {
        const headers = { 'Authorization': `Bearer ${activeUserId}` };
        const res = await fetch(`/api/conversations/${activeConversationId}/messages`, { headers });
        if (res.ok) {
          setPlaygroundMessages(await res.json());
        }
      } catch (e) {
        console.error('Error fetching conversation messages', e);
      }
    };
    fetchMessages();
  }, [activeConversationId, activeUserId]);

  // Helper to show brief toast notification
  const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  // Custom action handlers
  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers,
        body: JSON.stringify(newServerForm)
      });
      if (res.ok) {
        triggerAlert('Servidor registrado com sucesso no painel global.');
        setShowServerModal(false);
        setNewServerForm({
          hostname: '', ip: '', port: 8000, gpuModel: 'NVIDIA RTX 4090 24GB', vramTotalGB: 24, cpuModel: 'Intel Core i9', ramTotalGB: 64, os: 'Ubuntu 22.04 LTS'
        });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao criar servidor.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro de rede ao conectar com o backend.', 'error');
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Deseja realmente remover este servidor da infraestrutura? Todas as LLMs vinculadas serão desconectadas.')) return;
    try {
      const headers = { 'Authorization': `Bearer ${activeUserId}` };
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        triggerAlert('Servidor removido com sucesso.');
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao deletar servidor.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro de rede ao deletar servidor.', 'error');
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelForm.serverId) {
      triggerAlert('Selecione um servidor físico para hospedar esta LLM.', 'error');
      return;
    }
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/models', {
        method: 'POST',
        headers,
        body: JSON.stringify(newModelForm)
      });
      if (res.ok) {
        triggerAlert('Modelo de IA registrado com sucesso.');
        setShowModelModal(false);
        setNewModelForm({
          name: '', displayName: '', description: '', endpoint: '', type: 'CHAT', temperatureDefault: 0.7, maxTokens: 2048, contextWindow: 4096, gpuUtilized: '1x GPU', serverId: ''
        });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao criar modelo.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro ao cadastrar modelo.', 'error');
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Excluir este modelo do catálogo? Usuários não poderão mais fazer requisições de chat/embeddings para ele.')) return;
    try {
      const headers = { 'Authorization': `Bearer ${activeUserId}` };
      const res = await fetch(`/api/models/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        triggerAlert('Modelo removido com sucesso.');
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao remover modelo.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro de rede ao remover modelo.', 'error');
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newKeyForm,
          allowedModels: newKeyForm.allowedModels,
          allowedIps: newKeyForm.allowedIps ? newKeyForm.allowedIps.split(',').map(ip => ip.trim()) : []
        })
      });
      if (res.ok) {
        const created = await res.json();
        setCreatedKeyResponse(created);
        triggerAlert('Chave de API gerada com sucesso! Guarde-a em local seguro.');
        setNewKeyForm({
          name: '', description: '', permissions: ['chat'], allowedModels: ['*'], dailyLimitTokens: 1000000, monthlyLimitTokens: 10000000, rateLimitRpm: 60, allowedIps: ''
        });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao criar chave.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro ao gerar chave de API.', 'error');
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Deseja revogar esta chave de API? A ação é definitiva e quebrará integrações existentes imediatamente.')) return;
    try {
      const headers = { 'Authorization': `Bearer ${activeUserId}` };
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        triggerAlert('Chave de API revogada com sucesso.');
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao revogar chave.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro de rede ao revogar chave.', 'error');
    }
  };

  // Companies & Teams & Users
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers,
        body: JSON.stringify(newCompanyForm)
      });
      if (res.ok) {
        triggerAlert('Empresa (Tenant) registrada com sucesso.');
        setShowCompanyModal(false);
        setNewCompanyForm({ name: '', planId: 'plan-basic' });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao criar empresa.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro ao registrar empresa.', 'error');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify(newTeamForm)
      });
      if (res.ok) {
        triggerAlert('Nova equipe criada com sucesso.');
        setShowTeamModal(false);
        setNewTeamForm({ name: '', companyId: '' });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao criar equipe.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro ao criar equipe.', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(newUserForm)
      });
      if (res.ok) {
        triggerAlert('Usuário adicionado com sucesso.');
        setShowUserModal(false);
        setNewUserForm({ name: '', email: '', role: 'EQUIPE', teamId: '', companyId: '' });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Erro ao criar usuário.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro ao criar usuário.', 'error');
    }
  };

  // Prompts Library
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers,
        body: JSON.stringify(newPromptForm)
      });
      if (res.ok) {
        triggerAlert('Prompt adicionado à biblioteca corporativa.');
        setShowPromptModal(false);
        setNewPromptForm({ title: '', category: 'Geral', promptText: '', description: '' });
        fetchAllData();
      }
    } catch (e) {
      triggerAlert('Erro ao salvar prompt.', 'error');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${activeUserId}` };
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        triggerAlert('Prompt excluído.');
        fetchAllData();
      }
    } catch (e) {
      triggerAlert('Erro ao deletar prompt.', 'error');
    }
  };

  // Global Settings update
  const handleUpdateSettings = async (updates: Partial<SystemSettings>) => {
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setSettings(await res.json());
        triggerAlert('Configurações do API Gateway atualizadas.');
      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Apenas Mega Superadmin pode alterar.', 'error');
      }
    } catch (e) {
      triggerAlert('Erro ao salvar configurações.', 'error');
    }
  };

  // Playground mechanics
  const handleCreateConversation = async () => {
    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `Chat ${models.find(m => m.id === playgroundSettings.modelId)?.displayName || 'LLM'}`,
          modelId: playgroundSettings.modelId,
          temperature: playgroundSettings.temperature,
          maxTokens: playgroundSettings.maxTokens,
          systemPrompt: playgroundSettings.systemPrompt
        })
      });
      if (res.ok) {
        const newC = await res.json();
        setPlaygroundConversations(prev => [newC, ...prev]);
        setActiveConversationId(newC.id);
        triggerAlert('Nova sessão do Playground iniciada.');
      }
    } catch (e) {
      triggerAlert('Erro ao criar conversa.', 'error');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${activeUserId}` };
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setPlaygroundConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
        triggerAlert('Sessão apagada.');
      }
    } catch (e) {
      triggerAlert('Erro ao deletar conversa.', 'error');
    }
  };

  const handleExportConversation = () => {
    if (!activeConversationId) return;
    const activeConv = playgroundConversations.find(c => c.id === activeConversationId);
    if (!activeConv) return;
    
    let markdownText = `# AI Control Center - Histórico do Chat\n`;
    markdownText += `**Título:** ${activeConv.title}\n`;
    markdownText += `**Modelo:** ${models.find(m => m.id === activeConv.modelId)?.displayName || 'N/A'}\n`;
    markdownText += `**Data de Criação:** ${new Date(activeConv.createdAt).toLocaleString()}\n`;
    markdownText += `========================================================================\n\n`;
    
    playgroundMessages.forEach(msg => {
      const roleName = msg.role === 'user' ? 'USUÁRIO' : 'GATEWAY (ASSISTENTE)';
      markdownText += `### [${roleName}] - ${msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}\n\n`;
      markdownText += `${msg.content}\n\n`;
      if (msg.role === 'assistant' && msg.inputTokens !== undefined) {
        markdownText += `*Tokens Consumidos: Input: ${msg.inputTokens} | Output: ${msg.outputTokens}*\n`;
      }
      markdownText += `------------------------------------------------------------------------\n\n`;
    });
    
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeConv.title.replace(/\s+/g, '_')}_export.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerAlert('Sessão exportada em Markdown (.md) com sucesso!');
  };

  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        content: (evt.target?.result as string) || ''
      });
      triggerAlert(`Arquivo '${file.name}' anexado com sucesso!`);
    };
    if (
      file.type.startsWith('text/') || 
      file.name.endsWith('.json') || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.ts') || 
      file.name.endsWith('.js') || 
      file.name.endsWith('.py') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv')
    ) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file); // base64 representation for images/binary
    }
  };

  const renderInlineStyles = (text: string) => {
    const inlineParts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return inlineParts.map((sub, idx) => {
      if (sub.startsWith('**') && sub.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-800">{sub.slice(2, -2)}</strong>;
      }
      if (sub.startsWith('`') && sub.endsWith('`')) {
        return <code key={idx} className="bg-slate-100 text-rose-500 font-mono px-1.5 py-0.5 rounded text-[11px]">{sub.slice(1, -1)}</code>;
      }
      return sub;
    });
  };

  const renderMarkdownAndCode = (content: string, msgId: string) => {
    const parts = content.split(/(```[a-zA-Z0-9-]*\n[\s\S]*?\n```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```([a-zA-Z0-9-]*)\n([\s\S]*?)\n```/);
        const language = match ? match[1] : 'code';
        const code = match ? match[2] : part.slice(3, -3);
        const codeId = `${msgId}-code-${index}`;

        return (
          <div key={index} className="my-3 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden font-mono text-xs shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-850 border-b border-slate-800 text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">
              <span>{language || 'code'}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboard(code, codeId);
                }}
                className="hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedId === codeId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto whitespace-pre leading-relaxed select-text bg-slate-950">
              <code>
                {code.split('\n').map((line, lineIdx) => {
                  return (
                    <div key={lineIdx}>
                      {line.split(/(\b(?:const|let|var|function|return|if|else|for|while|import|from|export|class|default|interface|string|number|boolean|null|undefined|true|false)\b)/g).map((word, wordIdx) => {
                        const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from', 'export', 'class', 'default', 'interface'];
                        const types = ['string', 'number', 'boolean', 'null', 'undefined', 'true', 'false'];
                        if (keywords.includes(word)) {
                          return <span key={wordIdx} className="text-indigo-400 font-bold">{word}</span>;
                        } else if (types.includes(word)) {
                          return <span key={wordIdx} className="text-emerald-400">{word}</span>;
                        }
                        return <span key={wordIdx}>{word}</span>;
                      })}
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        );
      } else {
        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lineIdx) => {
              if (line.startsWith('### ')) {
                return <h4 key={lineIdx} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">{line.slice(4)}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lineIdx} className="text-base font-bold text-slate-800 mt-4 mb-2">{line.slice(3)}</h3>;
              }
              if (line.startsWith('# ')) {
                return <h2 key={lineIdx} className="text-lg font-bold text-slate-800 mt-4 mb-2">{line.slice(2)}</h2>;
              }
              if (line.startsWith('- ')) {
                return (
                  <ul key={lineIdx} className="list-disc pl-5 my-1 text-slate-600">
                    <li>{renderInlineStyles(line.slice(2))}</li>
                  </ul>
                );
              }
              return <p key={lineIdx} className="leading-relaxed text-slate-600 my-1">{renderInlineStyles(line)}</p>;
            })}
          </div>
        );
      }
    });
  };

  const handleSendPlaygroundMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playgroundInput.trim() || playgroundLoading) return;

    let convId = activeConversationId;
    // Auto-create conversation if none exists
    if (!convId) {
      try {
        const headers = { 
          'Authorization': `Bearer ${activeUserId}`,
          'Content-Type': 'application/json'
        };
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: `Chat ${models.find(m => m.id === playgroundSettings.modelId)?.displayName || 'LLM'}`,
            modelId: playgroundSettings.modelId,
            temperature: playgroundSettings.temperature,
            maxTokens: playgroundSettings.maxTokens,
            systemPrompt: playgroundSettings.systemPrompt
          })
        });
        if (res.ok) {
          const newC = await res.json();
          setPlaygroundConversations(prev => [newC, ...prev]);
          convId = newC.id;
          setActiveConversationId(newC.id);
        } else {
          triggerAlert('Falha ao inicializar conversa.', 'error');
          return;
        }
      } catch (e) {
        triggerAlert('Erro ao criar conversa.', 'error');
        return;
      }
    }

    const messageText = playgroundInput;
    setPlaygroundInput('');
    setPlaygroundLoading(true);

    // Prepare content with attached file details if any
    let payloadContent = messageText;
    let optDisplayContent = messageText;
    if (attachedFile) {
      const isText = attachedFile.type.startsWith('text/') || attachedFile.name.endsWith('.json') || attachedFile.name.endsWith('.md') || attachedFile.name.endsWith('.ts') || attachedFile.name.endsWith('.js') || attachedFile.name.endsWith('.py') || attachedFile.name.endsWith('.txt') || attachedFile.name.endsWith('.csv');
      
      const fileHeader = `[Arquivo Anexado: ${attachedFile.name} (${attachedFile.type || 'Desconhecido'}, ${(attachedFile.size / 1024).toFixed(1)} KB)]\n`;
      const fileSnippet = isText 
        ? `Conteúdo do Arquivo:\n"""\n${attachedFile.content.slice(0, 8000)}\n"""\n\n` 
        : `Anexo de Mídia (Codificado em Base64):\n"""\n${attachedFile.content.slice(0, 100)}\n... [Mídia Binária truncada] ...\n"""\n\n`;
      
      payloadContent = fileHeader + fileSnippet + messageText;
      optDisplayContent = `📎 ${attachedFile.name}\n\n` + messageText;
      setAttachedFile(null); // Clear attachment once we send
    }

    // Optimistically insert user message in state
    const optUserMsg: Message = {
      id: `opt-${Date.now()}`,
      conversationId: convId!,
      role: 'user',
      content: optDisplayContent,
      createdAt: new Date().toISOString()
    };
    setPlaygroundMessages(prev => [...prev, optUserMsg]);

    try {
      const headers = { 
        'Authorization': `Bearer ${activeUserId}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: payloadContent })
      });
      if (res.ok) {
        const result = await res.json();
        
        // Replace opt history with actual user message (using correct layout in frontend UI)
        setPlaygroundMessages(prev => {
          const filtered = prev.filter(m => m.id !== optUserMsg.id);
          const finalUserMsg = { ...result.userMessage, content: optDisplayContent };
          return [...filtered, finalUserMsg];
        });

        // Progressive streaming typewriter effect for Assistant Message
        const assistantMsg = result.assistantMessage;
        const fullContent = assistantMsg.content;
        const streamingMsgId = assistantMsg.id;
        
        // Insert assistant message with empty content initially
        const tempAssistantMsg = {
          ...assistantMsg,
          content: ''
        };
        setPlaygroundMessages(prev => [...prev, tempAssistantMsg]);

        let currentText = '';
        let charIndex = 0;
        
        // Dynamically compute speed/characters per tick
        const charsPerTick = Math.max(1, Math.round(fullContent.length / 80)); 
        const intervalTime = 12;

        const streamInterval = setInterval(() => {
          if (charIndex >= fullContent.length) {
            clearInterval(streamInterval);
            setPlaygroundLoading(false);
            // Replace with actual fully resolved message from backend
            setPlaygroundMessages(prev => {
              return prev.map(m => m.id === streamingMsgId ? assistantMsg : m);
            });
            fetchAllData(); // refresh stats and logs
          } else {
            currentText += fullContent.substring(charIndex, charIndex + charsPerTick);
            charIndex += charsPerTick;
            setPlaygroundMessages(prev => {
              return prev.map(m => m.id === streamingMsgId ? { ...m, content: currentText } : m);
            });
          }
        }, intervalTime);

      } else {
        const err = await res.json();
        triggerAlert(err.error || 'Falha ao receber resposta do Gateway.', 'error');
        setPlaygroundLoading(false);
      }
    } catch (e) {
      triggerAlert('Erro ao enviar mensagem para o API Gateway.', 'error');
      setPlaygroundLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Multi-tenant visible user list based on active user
  const visibleUsersForCurrentRole = allUsers.filter(u => {
    if (!currentUser) return false;
    if (currentUser.role === 'MEGA_SUPER') return true;
    return u.companyId === currentUser.companyId;
  });

  // Calculate stats for current visible scope
  const activeServersCount = servers.filter(s => s.status === 'ONLINE').length;
  const activeModelsCount = models.filter(m => m.status === 'ONLINE').length;
  
  // Calculate historical dynamic metrics for dashboard from logs
  const totalRequests = usageLogs.length;
  const totalTokens = usageLogs.reduce((acc, l) => acc + l.totalTokens, 0);
  const avgLatency = totalRequests > 0 
    ? Math.round(usageLogs.reduce((acc, l) => acc + l.latencyMs, 0) / totalRequests) 
    : 0;

  // Filter keys, logs
  const filteredKeys = apiKeys.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          k.id.includes(searchTerm) || 
                          k.keyPrefix.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredLogs = usageLogs.filter(l => {
    const matchesSearch = l.id.includes(searchTerm) || 
                          l.prompt.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.response.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = modelFilter ? l.modelId === modelFilter : true;
    const matchesCompany = companyFilter ? l.companyId === companyFilter : true;
    return matchesSearch && matchesModel && matchesCompany;
  });

  // Simple pure SVG representation of historical Token Production (TPM)
  // Maps usage logs over time
  const renderMiniChart = () => {
    if (usageLogs.length === 0) {
      return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados de consumo no momento</div>;
    }

    // Divide past 12 hours into 6 buckets
    const buckets = Array(8).fill(0);
    const now = Date.now();
    const intervalMs = 1.5 * 3600 * 1000; // 1.5 hours per bucket
    
    usageLogs.forEach(log => {
      const logTime = new Date(log.createdAt).getTime();
      const diff = now - logTime;
      const bucketIdx = Math.floor(diff / intervalMs);
      if (bucketIdx >= 0 && bucketIdx < 8) {
        buckets[7 - bucketIdx] += log.totalTokens;
      }
    });

    const maxVal = Math.max(...buckets, 1000);

    return (
      <div className="flex-1 flex items-end gap-3 h-full pt-4">
        {buckets.map((val, idx) => {
          const heightPercent = Math.max(10, Math.round((val / maxVal) * 85));
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute -top-8 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-10">
                {val.toLocaleString()} Tokens
              </div>
              <div 
                className="w-full bg-indigo-100 group-hover:bg-indigo-300 rounded-t transition-all duration-500 ease-out"
                style={{ height: `${heightPercent}%` }}
              />
              <div className="text-[10px] text-slate-400 mt-2 font-mono">
                {new Date(now - (7 - idx) * intervalMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Simulated latency chart per server
  const renderServerLatencyChart = () => {
    return (
      <div className="space-y-3">
        {servers.map(srv => {
          const percent = Math.min(100, Math.round((srv.latencyMs / 150) * 100));
          return (
            <div key={srv.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-600">{srv.hostname}</span>
                <span className="font-mono text-slate-500">{srv.latencyMs}ms</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-700 ${
                    srv.latencyMs > 50 ? 'bg-amber-400' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden antialiased">
      
      {/* Toast Alert */}
      {alertMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg max-w-md animate-in fade-in slide-in-from-top-4 duration-300 ${
          alertMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {alertMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="text-sm font-medium">{alertMessage.text}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-slate-800 block">AI Control</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block">Gateway Platform</span>
            </div>
          </div>
        </div>

        {/* Dynamic Tenant Context Switcher */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Ambientes & Tenancy (Roles)
          </label>
          <select 
            value={activeUserId} 
            onChange={(e) => {
              setActiveUserId(e.target.value);
              setCreatedKeyResponse(null);
              triggerAlert('Ambiente alternado. Dados filtrados pelo escopo do tenant.');
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="user-mega">🌐 [Global] Mega Super Admin</option>
            <option value="user-super-1">🏢 [Acme] Carlos (Super Admin)</option>
            <option value="user-admin-1">👥 [Acme] Juliana (Admin Equipe)</option>
            <option value="user-eq-1">💻 [Acme] Lucas (Equipe / Dev)</option>
            <option value="user-super-2">🏢 [Inovação] Roberto (Super Admin)</option>
            <option value="user-eq-3">💻 [Inovação] Mariana (Equipe / Dev)</option>
          </select>
          {currentUser && (
            <div className="mt-2 flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
              <img 
                src={USER_AVATARS[currentUser.id] || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80'} 
                alt="Avatar" 
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-700 truncate leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser.role}</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard & Infra</div>
          <button 
            onClick={() => { setActiveTab('dashboard'); setCreatedKeyResponse(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4.5 h-4.5" />
            <span>Dashboard Principal</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('servers'); setCreatedKeyResponse(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'servers' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ServerIcon className="w-4.5 h-4.5" />
            <span>Servidores & LLMs</span>
          </button>

          <div className="pt-4 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gateway Config</div>
          <button 
            onClick={() => { setActiveTab('keys'); setCreatedKeyResponse(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'keys' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Key className="w-4.5 h-4.5" />
            <span>Chaves de API</span>
          </button>

          <button 
            onClick={() => { setActiveTab('playground'); setCreatedKeyResponse(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'playground' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Play className="w-4.5 h-4.5" />
            <span>Playground ChatGPT</span>
          </button>

          <button 
            onClick={() => { setActiveTab('logs'); setCreatedKeyResponse(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'logs' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4.5 h-4.5" />
            <span>Logs de Consumo</span>
          </button>

          <button 
            onClick={() => { setActiveTab('config'); setCreatedKeyResponse(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'config' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            <span>Config & Auditoria</span>
          </button>
        </nav>

        {/* Footer info about node/express connection */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>API Gateway Status</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse"></span> ONLINE
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate leading-none">
            Port: 3000 | vLLM Proxy
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER SECTION */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">
              {activeTab === 'dashboard' && 'Dashboard de Telemetria Global'}
              {activeTab === 'servers' && 'Infraestrutura de Servidores & LLMs'}
              {activeTab === 'keys' && 'Gerenciamento de Chaves de API'}
              {activeTab === 'playground' && 'Playground Interativo de Modelos'}
              {activeTab === 'logs' && 'Logs de Auditoria e Chamadas do Gateway'}
              {activeTab === 'config' && 'Configurações de Failover & Segurança'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              Gateway Ativo (v1)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input shown in generic headers */}
            {['keys', 'logs'].includes(activeTab) && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-56 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>
            )}

            {/* Quick manual reload trigger */}
            <button 
              onClick={() => { fetchAllData(); triggerAlert('Dados atualizados.'); }}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
              title="Recarregar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <div className="text-xs text-slate-400 font-mono hidden md:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </header>

        {/* MAIN BODY SCROLLABLE SPACE */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8">

          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD PRINCIPAL */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Top Banner Alert inside dashboard when simulator is active */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Status de Simulação do API Gateway</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    A plataforma está operando em simulação local inteligente conectada ao seu arquivo de banco de dados <code className="font-mono bg-slate-100 px-1 rounded">db.json</code>. Telemetria de servidores (CPU, GPU, latência, VRAM) é flutuada dinamicamente para mimetizar um cluster de IA ativo em tempo real.
                  </p>
                </div>
              </div>

              {/* 4 Cards Grid Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Taxa de Requisições</span>
                    <div className="text-2xl font-bold text-slate-800">{totalRequests} <span className="text-xs font-normal text-slate-400">Total</span></div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-indigo-600 font-medium">
                    <Check className="w-4 h-4 mr-1" />
                    vLLM / Ollama Integrados
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Consumo Total de Tokens</span>
                    <div className="text-2xl font-bold text-slate-800">{(totalTokens / 1000).toFixed(1)}k <span className="text-xs font-normal text-slate-400">tokens</span></div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-emerald-600 font-medium">
                    <Activity className="w-3.5 h-3.5 mr-1" />
                    Auto-limite por API Key
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Latência Média do Cluster</span>
                    <div className="text-2xl font-bold text-slate-800">{avgLatency}ms</div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-slate-400 font-mono">
                    Média móvel de gateway
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nós Conectados</span>
                    <div className="text-2xl font-bold text-slate-800">{activeServersCount} <span className="text-xs font-normal text-slate-400">/ {servers.length}</span></div>
                  </div>
                  <div className="mt-3 w-full">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Carga GPU global</span>
                      <span>{servers.length > 0 ? Math.round(servers.reduce((acc, s) => acc + s.gpuUsagePercent, 0) / servers.length) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1">
                      <div 
                        className="bg-indigo-400 h-1 rounded-full transition-all duration-500" 
                        style={{ width: `${servers.length > 0 ? servers.reduce((acc, s) => acc + s.gpuUsagePercent, 0) / servers.length : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphical Layout Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Chart Card */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[340px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Histórico de Produção de Tokens (TPM)</h3>
                      <p className="text-[11px] text-slate-400">Tokens consumidos em chamadas agregadas do gateway por intervalo</p>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg font-bold">1.5h por balde</span>
                  </div>
                  
                  {renderMiniChart()}
                </div>

                {/* Server Telemetries Sidebar inside Dashboard */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[340px]">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">Latência da Infraestrutura</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Acompanhamento de resposta física dos endpoints cadastrados</p>
                    {renderServerLatencyChart()}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Algoritmo de Roteamento</div>
                    <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      {settings?.loadBalancingStrategy === 'LOWEST_LATENCY' ? 'Menor Latência (Lowest Latency)' : settings?.loadBalancingStrategy === 'LEAST_CONNECTIONS' ? 'Menos Conexões (Least Connections)' : 'Balanceamento Circular (Round-Robin)'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Top models & Live Servers summary row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Models list */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-800 text-sm mb-4">Catálogo de Modelos & Métricas de Execução</h3>
                  <div className="divide-y divide-slate-100">
                    {models.map(model => {
                      const server = servers.find(s => s.id === model.serverId);
                      return (
                        <div key={model.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-xs text-slate-800 flex items-center gap-2">
                              {model.displayName}
                              <span className="text-[10px] bg-slate-50 text-slate-400 font-mono px-1 rounded uppercase">{model.type}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Endpoint: {model.endpoint} • Hospedado em: {server?.hostname || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-600 block">{model.requestsCount.toLocaleString()} reqs</span>
                            {model.type === 'CHAT' && (
                              <span className="text-[10px] text-slate-400 font-mono block">{model.tokensPerSecond} t/s</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications & Health alarms */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-800 text-sm">Alertas do Sistema & Monitoramento</h3>
                      <button 
                        onClick={async () => {
                          const headers = { 'Authorization': `Bearer ${activeUserId}` };
                          await fetch('/api/notifications/read-all', { method: 'POST', headers });
                          fetchAllData();
                          triggerAlert('Notificações marcadas como lidas.');
                        }}
                        className="text-[10px] text-indigo-600 hover:underline font-semibold"
                      >
                        Limpar notificações
                      </button>
                    </div>

                    <div className="space-y-3">
                      {notifications.map(notif => (
                        <div key={notif.id} className={`p-3 rounded-lg text-xs border flex gap-3 ${
                          notif.type === 'ERROR' ? 'bg-rose-50/50 border-rose-100 text-rose-800' :
                          notif.type === 'WARNING' ? 'bg-amber-50/50 border-amber-100 text-amber-800' :
                          'bg-indigo-50/20 border-slate-150 text-slate-700'
                        }`}>
                          {notif.type === 'ERROR' && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                          {notif.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                          {notif.type !== 'ERROR' && notif.type !== 'WARNING' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                          <div>
                            <div className="font-bold flex justify-between items-center gap-2">
                              <span>{notif.title}</span>
                              <span className="font-mono text-[9px] text-slate-400">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-normal">{notif.message}</p>
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          Nenhum alerta pendente no momento. Tudo operando conforme esperado!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Verificação automática de Heartbeat</span>
                    <span className="font-semibold text-emerald-600">Ativo • a cada 10s</span>
                  </div>
                </div>

              </div>

            </div>
          )}


          {/* ======================================================== */}
          {/* TAB 2: SERVIDORES & MODELOS */}
          {/* ======================================================== */}
          {activeTab === 'servers' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              
              {/* Servers list section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">Servidores de GPUs Cadastrados</h2>
                    <p className="text-xs text-slate-400">Registre e monitore servidores físicos que provêm recursos para as LLMs auto-hospedadas</p>
                  </div>
                  {currentUser?.role === 'MEGA_SUPER' && (
                    <button 
                      onClick={() => setShowServerModal(true)}
                      className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-indigo-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Novo Servidor
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {servers.map(srv => (
                    <div key={srv.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="p-5 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                              {srv.hostname}
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                srv.status === 'ONLINE' ? 'bg-emerald-500 animate-soft-pulse' : 'bg-rose-400'
                              }`} />
                            </h3>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{srv.ip}:{srv.port}</span>
                          </div>
                          
                          {currentUser?.role === 'MEGA_SUPER' && (
                            <button 
                              onClick={() => handleDeleteServer(srv.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                              title="Remover Servidor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Telemetries bar layout */}
                        <div className="mt-5 space-y-3.5">
                          
                          {/* GPU Metric bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Uso da GPU ({srv.gpuModel})</span>
                              <span className="font-semibold text-slate-700">{srv.gpuUsagePercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${
                                  srv.gpuUsagePercent > 80 ? 'bg-amber-400' : 'bg-indigo-400'
                                }`}
                                style={{ width: `${srv.gpuUsagePercent}%` }}
                              />
                            </div>
                          </div>

                          {/* VRAM memory */}
                          <div className="flex justify-between text-xs py-1 border-y border-slate-50 font-mono">
                            <span className="text-slate-400">VRAM Alocada:</span>
                            <span className="text-slate-600">{srv.vramUsedGB} GB / {srv.vramTotalGB} GB</span>
                          </div>

                          {/* CPU & RAM */}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase">Uso de CPU</span>
                              <span className="font-bold text-slate-700 mt-0.5 block">{srv.cpuUsagePercent}%</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase">Memória RAM</span>
                              <span className="font-bold text-slate-700 mt-0.5 block">{srv.ramUsedGB} GB / {srv.ramTotalGB} GB</span>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Footer bar */}
                      <div className="px-5 py-3 bg-slate-50/50 flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-50 font-mono">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5 text-slate-400" /> Latency: {srv.latencyMs}ms
                        </span>
                        <span>Temp: {srv.temperatureCelsius}ºC</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Models Catalog Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">Catálogo de Modelos de IA & Métricas de Execução</h2>
                    <p className="text-xs text-slate-400">Pesquise, filtre e audite os parâmetros, endpoints e performance de vazão e latência das LLMs</p>
                  </div>
                  {currentUser?.role === 'MEGA_SUPER' && (
                    <button 
                      onClick={() => setShowModelModal(true)}
                      className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-indigo-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Registrar Modelo
                    </button>
                  )}
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, descrição, endpoint..."
                      value={modelCatalogSearch}
                      onChange={(e) => setModelCatalogSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={modelCatalogTypeFilter}
                      onChange={(e) => setModelCatalogTypeFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Todos os Tipos</option>
                      <option value="CHAT">CHAT</option>
                      <option value="EMBEDDING">EMBEDDING</option>
                      <option value="IMAGE">IMAGE</option>
                      <option value="AUDIO">AUDIO</option>
                    </select>
                    
                    <select
                      value={modelCatalogServerFilter}
                      onChange={(e) => setModelCatalogServerFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Todos os Servidores</option>
                      {servers.map(s => (
                        <option key={s.id} value={s.id}>{s.hostname}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                          <th className="px-6 py-3">Modelo / Nome Técnico & Endpoint</th>
                          <th className="px-6 py-3">Tipo</th>
                          <th className="px-6 py-3">Parâmetros Padrão</th>
                          <th className="px-6 py-3">Janela Contexto</th>
                          <th className="px-6 py-3">Desempenho Real-time</th>
                          <th className="px-6 py-3">Recurso / Servidor</th>
                          <th className="px-6 py-3">Total Requisições</th>
                          <th className="px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                        {models
                          .filter(m => {
                            const matchesSearch = 
                              m.displayName.toLowerCase().includes(modelCatalogSearch.toLowerCase()) ||
                              m.name.toLowerCase().includes(modelCatalogSearch.toLowerCase()) ||
                              (m.description && m.description.toLowerCase().includes(modelCatalogSearch.toLowerCase())) ||
                              (m.endpoint && m.endpoint.toLowerCase().includes(modelCatalogSearch.toLowerCase()));
                            const matchesType = !modelCatalogTypeFilter || m.type === modelCatalogTypeFilter;
                            const matchesServer = !modelCatalogServerFilter || m.serverId === modelCatalogServerFilter;
                            return matchesSearch && matchesType && matchesServer;
                          })
                          .map(model => {
                            const server = servers.find(s => s.id === model.serverId);
                            return (
                              <tr key={model.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 max-w-md">
                                  <div className="font-semibold text-slate-800">{model.displayName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{model.name}</div>
                                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{model.description}</p>
                                  <div className="text-[9px] text-slate-400 font-mono mt-1.5 flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-indigo-400 inline" /> Endpoint: <span className="bg-slate-100 px-1 rounded break-all">{model.endpoint}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                                    model.type === 'CHAT' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {model.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-mono text-[10px] space-y-0.5">
                                    <div>Temp: <span className="font-bold text-slate-700">{model.temperatureDefault}</span></div>
                                    <div>Max Out: <span className="font-bold text-slate-700">{model.maxTokens} t</span></div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-500">
                                  {model.contextWindow.toLocaleString()} tokens
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-mono text-[10px] space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Latência:</span>
                                      <span className="font-bold text-slate-700">{model.latencyMs || 150} ms</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Vazão:</span>
                                      <span className="font-bold text-slate-700">{model.tokensPerSecond || 0} t/s</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-medium text-slate-700">{server ? server.hostname : 'N/A'}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{model.gpuUtilized}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-indigo-600">{model.requestsCount.toLocaleString()} reqs</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Fila: {model.queueSize}</div>
                                </td>
                                <td className="px-6 py-4">
                                  {currentUser?.role === 'MEGA_SUPER' ? (
                                    <button 
                                      onClick={() => handleDeleteModel(model.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                      title="Excluir Modelo"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-[11px] italic">Sem permissão</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}


          {/* ======================================================== */}
          {/* TAB 3: CHAVES DE API */}
          {/* ======================================================== */}
          {activeTab === 'keys' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Chaves de API do Gateway</h2>
                  <p className="text-xs text-slate-400">Gere e revogue chaves para que sistemas clientes externos realizem chamadas de inferência</p>
                </div>
                {currentUser?.role !== 'EQUIPE' && (
                  <button 
                    onClick={() => {
                      setCreatedKeyResponse(null);
                      setShowKeyModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Criar Chave de API
                  </button>
                )}
              </div>

              {/* Display the newly created API key exactly once! */}
              {createdKeyResponse && (
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-inner space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Sua chave de API foi gerada com sucesso!</h4>
                      <p className="text-xs text-emerald-600 mt-1 leading-normal">
                        Copie a chave agora. Por motivos de segurança e integridade de dados, ela não será exibida novamente no painel.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-emerald-100">
                    <code className="text-xs text-slate-800 font-mono select-all flex-1 break-all">
                      {createdKeyResponse.fullKey}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(createdKeyResponse.fullKey || '', 'created-key')}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shrink-0"
                      title="Copiar chave"
                    >
                      {copiedId === 'created-key' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="text-[11px] text-slate-500 italic">
                    * Exemplo de uso de requisição HTTP: <code className="font-mono bg-white px-1 rounded border">Authorization: Bearer {createdKeyResponse.keyPrefix}...</code>
                  </div>
                </div>
              )}

              {/* API Keys Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <th className="px-6 py-3">Identificador / Prefixo</th>
                        <th className="px-6 py-3">Nome / Descrição</th>
                        <th className="px-6 py-3">Permissões</th>
                        <th className="px-6 py-3">Modelos Permitidos</th>
                        <th className="px-6 py-3">Limites de Consumo</th>
                        <th className="px-6 py-3">Último Uso / Expira</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                      {filteredKeys.map(key => (
                        <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-slate-800">{key.keyPrefix}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: ...{key.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-700">{key.name}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5 truncate max-w-xs">{key.description || 'Sem descrição cadastrada.'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {key.permissions.map(perm => (
                                <span key={perm} className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded text-[9px] font-mono uppercase">
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-600 truncate max-w-[120px] block">
                              {key.allowedModels.join(', ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-[10px]">Max Diário: {key.dailyLimitTokens.toLocaleString()} t</div>
                            <div className="text-[10px] text-slate-400 font-mono">RPM: {key.rateLimitRpm}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-500 text-[10px]">
                              {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Nunca utilizada'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Sem expiração'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              key.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {key.status === 'ACTIVE' ? 'ATIVA' : 'REVOCADA'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {key.status === 'ACTIVE' && currentUser?.role !== 'EQUIPE' ? (
                              <button 
                                onClick={() => handleRevokeApiKey(key.id)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors text-[11px] font-semibold"
                                title="Revogar Chave"
                              >
                                Revogar
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* ======================================================== */}
          {/* TAB 4: PLAYGROUND GPT */}
          {/* ======================================================== */}
          {activeTab === 'playground' && (
            <div className="max-w-7xl mx-auto h-[calc(100vh-12rem)] flex gap-6">
              
              {/* Left sidebar: Conversations selection & options */}
              <div className="w-72 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sessões de Chat</span>
                  <button 
                    onClick={handleCreateConversation}
                    className="text-indigo-600 hover:text-indigo-800 p-1 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="Novo Chat"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                  {playgroundConversations.map(conv => (
                    <div 
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        activeConversationId === conv.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate pr-2">{conv.title}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {playgroundConversations.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs px-4">
                      Nenhuma conversa criada. Digite no playground abaixo para iniciar uma nova automaticamente!
                    </div>
                  )}
                </div>

                {/* Parameters configuration widget */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    <Sliders className="w-3.5 h-3.5" /> Parâmetros de Inferência
                  </div>

                  {/* Model Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Modelo de IA</label>
                    <select 
                      value={playgroundSettings.modelId}
                      onChange={(e) => setPlaygroundSettings(prev => ({ ...prev, modelId: e.target.value }))}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg p-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {models.map(m => (
                        <option key={m.id} value={m.id}>{m.displayName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Slider Temperature */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Temperatura</span>
                      <span className="font-mono text-slate-700 font-bold">{playgroundSettings.temperature}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1.5" 
                      step="0.1"
                      value={playgroundSettings.temperature}
                      onChange={(e) => setPlaygroundSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">System Prompt</label>
                    <textarea 
                      value={playgroundSettings.systemPrompt}
                      onChange={(e) => setPlaygroundSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      rows={2}
                      className="w-full bg-white border border-slate-200 text-[11px] rounded-lg p-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Diretrizes do assistente..."
                    />
                  </div>
                </div>
              </div>

              {/* Chat Viewport Area */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden relative"
              >
                
                {/* Drag and Drop Backdrop */}
                {isDraggingFile && (
                  <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-xs border-2 border-dashed border-indigo-500 rounded-xl flex flex-col items-center justify-center text-indigo-700 font-bold text-xs gap-2 z-30 pointer-events-none">
                    <Download className="w-8 h-8 text-indigo-500 animate-bounce" />
                    <span>Solte o arquivo aqui para anexar ao prompt do Chat</span>
                  </div>
                )}

                {/* Active chat header metrics */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between text-xs text-slate-500 px-6">
                  {activeConversationId ? (
                    (() => {
                      const activeConv = playgroundConversations.find(c => c.id === activeConversationId);
                      const modelSelected = models.find(m => m.id === (activeConv?.modelId || playgroundSettings.modelId));
                      const serverSelected = servers.find(s => s.id === (modelSelected?.serverId || 'srv-alpha'));
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{activeConv?.title}</span>
                            <span className="font-mono bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded uppercase">
                              {modelSelected?.displayName || 'LLM'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                              Hospedagem: {serverSelected?.hostname || 'Cluster Alpha'}
                            </span>
                            <button
                              onClick={handleExportConversation}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50/50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Exportar conversa em Markdown"
                            >
                              <Download className="w-3.5 h-3.5" /> Exportar Chat
                            </button>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <span>Inicie uma nova conversa no playground para começar!</span>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {playgroundMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-3.5 max-w-3.5xl ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                        msg.role === 'user' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {msg.role === 'user' ? 'U' : <Sparkles className="w-4 h-4 text-indigo-500" />}
                      </div>

                      <div className={`rounded-xl p-3.5 text-xs max-w-2xl ${
                        msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200/50'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="space-y-1 select-text">
                            {renderMarkdownAndCode(msg.content, msg.id)}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</div>
                        )}
                        
                        {/* Token Consumption details underneath system replies */}
                        {msg.role === 'assistant' && (msg.inputTokens !== undefined) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[10px] text-slate-400 font-mono flex gap-3">
                            <span>Input: {msg.inputTokens} t</span>
                            <span>Output: {msg.outputTokens} t</span>
                            <span>Tempo: {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {playgroundLoading && (
                    <div className="flex gap-3.5 max-w-3xl">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 animate-pulse">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 text-xs text-slate-500 animate-pulse flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="ml-1 text-[11px] font-mono text-slate-400">Processando resposta pelo Gateway...</span>
                      </div>
                    </div>
                  )}

                  {playgroundMessages.length === 0 && !playgroundLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                      <Sparkles className="w-12 h-12 text-slate-200 mb-3" />
                      <h3 className="font-bold text-slate-700 text-sm">Playground do Gateway</h3>
                      <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                        Experimente seus modelos de IA locais em tempo real. Cada mensagem passa pelas mesmas regras de controle de cotas, rate limits e geração de telemetria das chaves de API corporativas.
                      </p>
                      <div className="mt-4 border border-slate-200 rounded-lg p-3 bg-slate-50 border-dashed text-[11px] text-slate-500 max-w-sm">
                        💡 Arrasta e solta arquivos (JSON, TXT, PY, PDF, PNG, etc) aqui dentro para enviá-los ao contexto de análise da LLM!
                      </div>
                    </div>
                  )}
                </div>

                {/* Input action footer bar */}
                <div className="border-t border-slate-100 bg-slate-50/50">
                  {attachedFile && (
                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 animate-in slide-in-from-bottom-2 duration-150">
                      <div className="flex items-center gap-2 font-medium">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Anexo pronto: <strong className="font-semibold">{attachedFile.name}</strong> ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setAttachedFile(null)}
                        className="text-indigo-400 hover:text-indigo-600 font-bold p-1 hover:bg-indigo-100 rounded transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendPlaygroundMessage} className="p-4 flex gap-2 items-center">
                    <input 
                      type="file" 
                      id="playground-file-upload" 
                      className="hidden" 
                      onChange={(e) => { 
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelected(e.target.files[0]);
                          e.target.value = '';
                        }
                      }} 
                    />
                    <label 
                      htmlFor="playground-file-upload"
                      className="p-2.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                      title="Anexar arquivo (Arrastar e soltar também funciona)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </label>

                    <input 
                      type="text" 
                      value={playgroundInput}
                      onChange={(e) => setPlaygroundInput(e.target.value)}
                      placeholder="Escreva sua pergunta ou requisição de prompt para a LLM..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl text-xs px-4 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                      disabled={playgroundLoading}
                    />
                    <button 
                      type="submit"
                      className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition-all shadow-sm shadow-indigo-100 flex items-center justify-center shrink-0"
                      disabled={playgroundLoading || (!playgroundInput.trim() && !attachedFile)}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}


          {/* ======================================================== */}
          {/* TAB 5: LOGS DE CONSUMO */}
          {/* ======================================================== */}
          {activeTab === 'logs' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Logs de Transações do Gateway</h2>
                  <p className="text-xs text-slate-400">Rastreamento e auditoria em tempo real de cada chamada HTTP efetuada para as LLMs auto-hospedadas</p>
                </div>

                {/* Filters layout */}
                <div className="flex flex-wrap items-center gap-3">
                  <select 
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-xs rounded-lg py-1.5 px-3 text-slate-700 outline-none"
                  >
                    <option value="">Todos os Modelos</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>

                  {currentUser?.role === 'MEGA_SUPER' && (
                    <select 
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="bg-white border border-slate-200 text-xs rounded-lg py-1.5 px-3 text-slate-700 outline-none"
                    >
                      <option value="">Todas as Empresas</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <th className="px-6 py-3">Código Log</th>
                        <th className="px-6 py-3">Empresa / Tenant</th>
                        <th className="px-6 py-3">Chave de API</th>
                        <th className="px-6 py-3">Modelo</th>
                        <th className="px-6 py-3">Prompt (Início)</th>
                        <th className="px-6 py-3">Consumo / Tokens</th>
                        <th className="px-6 py-3">Tempo / Latência</th>
                        <th className="px-6 py-3">Status HTTP</th>
                        <th className="px-6 py-3">Data / Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                      {filteredLogs.map(log => {
                        const model = models.find(m => m.id === log.modelId);
                        const company = companies.find(c => c.id === log.companyId);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-[10px] text-indigo-600 font-bold">
                              {log.id.slice(-8)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-700">{company ? company.name : 'Acme AI'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[10px]">
                                {log.apiKeyId ? `key-...${log.apiKeyId.slice(-4)}` : 'Playground'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-800">
                              {model ? model.displayName : 'Llama 3'}
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate" title={log.prompt}>
                              {log.prompt}
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px]">
                              <div>Tot: {log.totalTokens}</div>
                              <div className="text-slate-400">In:{log.inputTokens} • Out:{log.outputTokens}</div>
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px]">
                              {log.latencyMs} ms
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">
                                {log.httpStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[10px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-slate-400">
                            Nenhum registro de log de gateway atende aos filtros de busca especificados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* ======================================================== */}
          {/* TAB 6: CONFIGURAÇÕES E AUDITORIA */}
          {/* ======================================================== */}
          {activeTab === 'config' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Gateway Parameters */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">Opções de Roteamento & Gateway</h3>
                    <p className="text-xs text-slate-400">Ajuste os parâmetros globais de balanceamento e cache para o cluster de LLMs</p>
                  </div>

                  <div className="space-y-4">
                    {/* Auto failover toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">Failover Automático</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Muda o roteamento para outro servidor caso o heartbeat falhe</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.autoFailover || false}
                        onChange={(e) => handleUpdateSettings({ autoFailover: e.target.checked })}
                        className="w-8 h-4 bg-slate-200 rounded-full appearance-none cursor-pointer checked:bg-indigo-500 relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-all checked:before:translate-x-4 border border-slate-300"
                      />
                    </div>

                    {/* Load Balancing Strategy selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Algoritmo de Roteamento Ativo</label>
                      <select 
                        value={settings?.loadBalancingStrategy || 'ROUND_ROBIN'}
                        onChange={(e) => handleUpdateSettings({ loadBalancingStrategy: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="ROUND_ROBIN">Roteamento Circular (Round-Robin)</option>
                        <option value="LEAST_CONNECTIONS">Menos Conexões Ativas (Least Connections)</option>
                        <option value="LOWEST_LATENCY">Menor Latência Medida (Lowest Latency)</option>
                      </select>
                    </div>

                    {/* Cache Enabled toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">Armazenamento em Cache (Redis)</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Armazena respostas exatas com base em hash para reduzir custo de GPU</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.redisCacheEnabled || false}
                        onChange={(e) => handleUpdateSettings({ redisCacheEnabled: e.target.checked })}
                        className="w-8 h-4 bg-slate-200 rounded-full appearance-none cursor-pointer checked:bg-indigo-500 relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:transition-all checked:before:translate-x-4 border border-slate-300"
                      />
                    </div>

                    {/* Webhook Url setting */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Alertas por Webhook (URL)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="https://webhook.site/..."
                          value={settings?.alertWebhookUrl || ''}
                          onChange={(e) => handleUpdateSettings({ alertWebhookUrl: e.target.value })}
                          className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                          onClick={() => triggerAlert('Conexão de webhook testada com sucesso.')}
                          className="px-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Testar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corporate Prompts Library */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Biblioteca Corporativa de Prompts</h3>
                      <p className="text-xs text-slate-400">Armazene prompts homologados para que a equipe utilize diretamente no playground</p>
                    </div>
                    <button 
                      onClick={() => setShowPromptModal(true)}
                      className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1">
                    {prompts.map(p => (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-700 flex items-center gap-1.5">
                            {p.title}
                            <span className="text-[10px] font-normal bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded">{p.category}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 italic">"{p.promptText}"</p>
                          <p className="text-[10px] text-slate-400">{p.description}</p>
                        </div>
                        <button 
                          onClick={() => handleDeletePrompt(p.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Security Audit Log Timeline */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Trilha de Auditoria Administrativa (Security Audits)</h3>
                  <p className="text-xs text-slate-400">Histórico cronológico de ações sensíveis executadas pelos administradores da plataforma</p>
                </div>

                <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-5 py-2">
                  {auditLogs.map(audit => (
                    <div key={audit.id} className="relative text-xs">
                      {/* Node Bullet */}
                      <span className="absolute -left-[30px] top-1.5 flex h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                          {audit.action.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(audit.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 mt-1">{audit.details}</p>
                      
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-semibold">{audit.userName}</span>
                        <span>({audit.userEmail})</span>
                        <span className="font-mono text-[9px] bg-slate-100 px-1 rounded">IP: {audit.ip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL WINDOWS FOR PLATFORM ACTIONS */}
      {/* ======================================================== */}
      
      {/* 1. Modal Server */}
      {showServerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ServerIcon className="w-5 h-5 text-indigo-500" /> Cadastrar Novo Servidor
              </h3>
              <button onClick={() => setShowServerModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateServer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Hostname</label>
                  <input 
                    type="text" 
                    required
                    placeholder="gpu-cluster-04"
                    value={newServerForm.hostname}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, hostname: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Endereço IP</label>
                  <input 
                    type="text" 
                    required
                    placeholder="10.140.0.12"
                    value={newServerForm.ip}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, ip: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Porta de Comunicação</label>
                  <input 
                    type="number" 
                    required
                    value={newServerForm.port}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Sistema Operacional</label>
                  <input 
                    type="text" 
                    placeholder="Ubuntu 22.04 LTS"
                    value={newServerForm.os}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, os: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Modelo de GPU</label>
                <input 
                  type="text" 
                  placeholder="NVIDIA RTX 4090 24GB"
                  value={newServerForm.gpuModel}
                  onChange={(e) => setNewServerForm(prev => ({ ...prev, gpuModel: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">VRAM Total (GB)</label>
                  <input 
                    type="number" 
                    value={newServerForm.vramTotalGB}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, vramTotalGB: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">RAM Total (GB)</label>
                  <input 
                    type="number" 
                    value={newServerForm.ramTotalGB}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, ramTotalGB: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">CPU</label>
                  <input 
                    type="text" 
                    value={newServerForm.cpuModel}
                    onChange={(e) => setNewServerForm(prev => ({ ...prev, cpuModel: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowServerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Model */}
      {showModelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-500" /> Registrar Modelo de IA (vLLM / Ollama)
              </h3>
              <button onClick={() => setShowModelModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateModel} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Nome do Modelo (ID Técnico)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="meta-llama/Llama-3-8b"
                    value={newModelForm.name}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Nome de Exibição (Display)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Llama 3 8B Instruct"
                    value={newModelForm.displayName}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Endpoint de Inferência</label>
                <input 
                  type="text" 
                  required
                  placeholder="http://10.140.0.4:8000/v1"
                  value={newModelForm.endpoint}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, endpoint: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Descrição do Modelo</label>
                <input 
                  type="text" 
                  placeholder="Modelo extremamente rápido de 8B parâmetros."
                  value={newModelForm.description}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Hospedado no Servidor</label>
                  <select 
                    value={newModelForm.serverId}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, serverId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    {servers.map(s => (
                      <option key={s.id} value={s.id}>{s.hostname}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Tipo do Modelo</label>
                  <select 
                    value={newModelForm.type}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="CHAT">CHAT / COMPLETIONS</option>
                    <option value="EMBEDDING">EMBEDDINGS</option>
                    <option value="IMAGE">IMAGES</option>
                    <option value="AUDIO">AUDIO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Temp Padrão</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newModelForm.temperatureDefault}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, temperatureDefault: parseFloat(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Max Tokens</label>
                  <input 
                    type="number" 
                    value={newModelForm.maxTokens}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Contexto</label>
                  <input 
                    type="number" 
                    value={newModelForm.contextWindow}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, contextWindow: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-500" /> Criar Chave de API de Gateway
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Nome da Chave</label>
                <input 
                  type="text" 
                  required
                  placeholder="Chave de Produção - App Clientes"
                  value={newKeyForm.name}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Chave utilizada para realizar embeddings e chats no app principal."
                  value={newKeyForm.description}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Limite Diário (Tokens)</label>
                  <input 
                    type="number" 
                    value={newKeyForm.dailyLimitTokens}
                    onChange={(e) => setNewKeyForm(prev => ({ ...prev, dailyLimitTokens: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Rate Limit (RPM)</label>
                  <input 
                    type="number" 
                    value={newKeyForm.rateLimitRpm}
                    onChange={(e) => setNewKeyForm(prev => ({ ...prev, rateLimitRpm: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Restrição de IPs (Opcional, separado por vírgula)</label>
                <input 
                  type="text" 
                  placeholder="192.168.1.100, 10.0.4.12"
                  value={newKeyForm.allowedIps}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, allowedIps: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg"
                >
                  Criar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Prompt */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" /> Adicionar Prompt à Biblioteca
              </h3>
              <button onClick={() => setShowPromptModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreatePrompt} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Título do Prompt</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Resumidor Técnico"
                    value={newPromptForm.title}
                    onChange={(e) => setNewPromptForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Categoria</label>
                  <input 
                    type="text" 
                    placeholder="Desenvolvimento / Escrita"
                    value={newPromptForm.category}
                    onChange={(e) => setNewPromptForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Transforma textos em listas executáveis de 3 tópicos."
                  value={newPromptForm.description}
                  onChange={(e) => setNewPromptForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Instruções do Prompt (Texto Principal)</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Atue como formatador de código experiente..."
                  value={newPromptForm.promptText}
                  onChange={(e) => setNewPromptForm(prev => ({ ...prev, promptText: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg"
                >
                  Salvar Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
