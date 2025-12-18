
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Settings, RefreshCw, LogOut, Save, Youtube, 
  Instagram, Facebook, Trash2, Plus, Eye, Link2, TikTokIcon,
  TrendingUp, CloudLightning, Users, Bot, FileText, UploadCloud,
  X, CheckCircle, Lock, Zap, MessageSquare, BookOpen, Video, Clock,
  AvailableIcons, AlertTriangle, Globe, ExternalLink, Database, Activity
} from './Icons';
import { 
  SocialPost, CreatorProfile, LandingPageContent, Platform, 
  TikTokAuthData, MetaAuthData, FeatureItem 
} from '../types';
import { getYouTubePosts, getYouTubeChannelStatistics } from '../services/youtubeService';
import { 
  getTikTokPosts, 
  getTikTokAuthUrl, 
  getTikTokUserStats,
  exchangeTikTokCode,
  DEFAULT_CLIENT_KEY, 
  DEFAULT_CLIENT_SECRET,
  getRedirectUri
} from '../services/tiktokService';
import { 
  getMetaAuthUrl, 
  getInstagramPosts, 
  getFacebookPosts, 
  getMetaPlatformStats,
  debugMetaConnection,
  exchangeForLongLivedToken
} from '../services/metaService';
import { 
  getVirtualFilesCloud, 
  saveVirtualFile, 
  deleteVirtualFile, 
  VirtualFile,
  getSiteStats
} from '../services/firebase';

interface AdminDashboardProps {
  posts: SocialPost[];
  setPosts: (posts: SocialPost[] | ((prev: SocialPost[]) => SocialPost[])) => void;
  dbActions: {
    addPost: (post: SocialPost) => void;
    deletePost: (id: string) => void;
    syncPosts: (posts: SocialPost[]) => void;
    clearPosts: () => void;
  };
  onLogout: () => void;
  onViewPortal: () => void;
  landingContent: LandingPageContent;
  setLandingContent: (content: LandingPageContent) => void;
  profile: CreatorProfile;
  setProfile: (profile: CreatorProfile) => void;
  youtubeApiKey: string;
  setYoutubeApiKey: (key: string) => void;
  tiktokAuth: TikTokAuthData;
  setTiktokAuth: (auth: Partial<TikTokAuthData>) => void;
  metaAuth: MetaAuthData;
  setMetaAuth: (auth: Partial<MetaAuthData>) => void;
}

type AdminView = 'dashboard' | 'posts' | 'content' | 'integrations' | 'pages' | 'files' | 'chatbot';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  posts, setPosts, dbActions, onLogout, onViewPortal,
  landingContent, setLandingContent, profile, setProfile,
  youtubeApiKey, setYoutubeApiKey, tiktokAuth, setTiktokAuth, metaAuth, setMetaAuth
}) => {
  const [activeTab, setActiveTab] = useState<AdminView>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [visitStats, setVisitStats] = useState(0);

  // File System State
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [newFile, setNewFile] = useState({ path: '', content: '' });

  // Load files when tab changes
  useEffect(() => {
    if (activeTab === 'files') {
      getVirtualFilesCloud().then(setVirtualFiles);
    }
    if (activeTab === 'dashboard') {
      getSiteStats().then(stats => setVisitStats(stats.totalVisits));
    }
  }, [activeTab]);

  // --- POPUP LISTENER FOR AUTH ---
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'TIKTOK_CODE') {
         setIsConnecting(true);
         const code = event.data.code;
         const key = tiktokAuth.clientKey || DEFAULT_CLIENT_KEY;
         const secret = tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET;
         
         try {
            const tokens = await exchangeTikTokCode(code, key, secret);
            setTiktokAuth({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: Date.now() + (tokens.expiresIn * 1000)
            });
            alert("TikTok conectado com sucesso via Pop-up!");
         } catch (e: any) {
            console.error(e);
            alert(`Erro ao conectar TikTok: ${e.message}`);
         } finally {
            setIsConnecting(false);
         }
      }

      if (event.data.type === 'META_TOKEN') {
         try {
            const hash = event.data.hash.substring(1);
            const params = new URLSearchParams(hash);
            const shortLivedToken = params.get('access_token');
            const expiresIn = params.get('expires_in');
            
            if (shortLivedToken) {
               let finalToken = shortLivedToken;
               let finalExpiry = expiresIn ? Date.now() + (parseInt(expiresIn) * 1000) : Date.now() + (3600 * 1000);

               if (metaAuth.appId && metaAuth.appSecret) {
                  try {
                      setIsConnecting(true);
                      const longData = await exchangeForLongLivedToken(shortLivedToken, metaAuth.appId, metaAuth.appSecret);
                      finalToken = longData.accessToken;
                      finalExpiry = Date.now() + (longData.expiresIn * 1000);
                      alert("Meta: Token de longa duração (60 dias) gerado com sucesso!");
                  } catch (upgradeErr: any) {
                      console.error("Erro ao gerar token longa duração:", upgradeErr);
                      alert("Aviso: Conectado com token de curta duração.");
                  } finally {
                      setIsConnecting(false);
                  }
               }

               setMetaAuth({
                 accessToken: finalToken,
                 expiresAt: finalExpiry
               });
            }
         } catch (e) {
            console.error(e);
         }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tiktokAuth, setTiktokAuth, metaAuth, setMetaAuth]);

  // --- HELPERS ---
  const handleProfileChange = (field: keyof CreatorProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleLandingChange = (field: keyof LandingPageContent, value: any) => {
    setLandingContent({ ...landingContent, [field]: value });
  };

  // --- CMS FEATURES LOGIC ---
  const handleAddFeature = () => {
    const newFeature: FeatureItem = { 
        id: Date.now().toString(), 
        title: 'Nova Seção', 
        description: 'Descrição do recurso...', 
        icon: 'Star',
        markdownContent: ''
    };
    const currentFeatures = landingContent.features || [];
    setLandingContent({ ...landingContent, features: [...currentFeatures, newFeature] });
  };

  const handleRemoveFeature = (id: string) => {
    const currentFeatures = landingContent.features || [];
    setLandingContent({ ...landingContent, features: currentFeatures.filter(f => f.id !== id) });
  };

  const handleUpdateFeature = (id: string, field: keyof FeatureItem, value: string) => {
    const currentFeatures = landingContent.features || [];
    setLandingContent({ 
        ...landingContent, 
        features: currentFeatures.map(f => f.id === id ? { ...f, [field]: value } : f) 
    });
  };

  // --- SYNC LOGIC ---
  const handleSync = async (isAuto = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    const newStats = {
      youtubeFollowers: profile.platformStats?.youtubeFollowers || 0,
      instagramFollowers: profile.platformStats?.instagramFollowers || 0,
      tiktokFollowers: profile.platformStats?.tiktokFollowers || 0,
      facebookFollowers: profile.platformStats?.facebookFollowers || 0
    };

    const updateTokenCallback = (newAccess: string, newRefresh: string, newExpiry: number) => {
        setTiktokAuth({
            accessToken: newAccess,
            refreshToken: newRefresh,
            expiresAt: newExpiry
        });
    };

    try {
      // 1. YouTube
      let realYoutubePosts: SocialPost[] = [];
      if (youtubeApiKey) {
         try {
            realYoutubePosts = await getYouTubePosts('@MundodosDadosBR', 10, youtubeApiKey);
            const channelStats = await getYouTubeChannelStatistics('@MundodosDadosBR', youtubeApiKey);
            if (channelStats && channelStats.subscriberCount) {
                const rawStr = channelStats.subscriberCount;
                let num = parseFloat(rawStr.replace(/[^0-9.]/g, ''));
                if (rawStr.toUpperCase().includes('K')) num *= 1000;
                else if (rawStr.toUpperCase().includes('M')) num *= 1000000;
                newStats.youtubeFollowers = num;
            }
         } catch (e) {}
      }

      // 2. TikTok
      let tiktokPosts: SocialPost[] = [];
      if (tiktokAuth.accessToken) {
         try {
             const ttStats = await getTikTokUserStats(
                 tiktokAuth.accessToken,
                 tiktokAuth.refreshToken,
                 tiktokAuth.clientKey || DEFAULT_CLIENT_KEY,
                 tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET,
                 tiktokAuth.expiresAt,
                 updateTokenCallback
             );
             if (ttStats.followers !== undefined) {
                 newStats.tiktokFollowers = ttStats.followers;
             }
             
             tiktokPosts = await getTikTokPosts(
                '@mundo.dos.dados5', 
                tiktokAuth.accessToken,
                tiktokAuth.refreshToken,
                tiktokAuth.clientKey || DEFAULT_CLIENT_KEY,
                tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET,
                tiktokAuth.expiresAt,
                updateTokenCallback
             );
         } catch (ttErr) {}
      }

      // 3. Meta
      let igPosts: SocialPost[] = [];
      let fbPosts: SocialPost[] = [];
      if (metaAuth.accessToken) {
        try {
          const metaStats = await getMetaPlatformStats(metaAuth.accessToken);
          if (metaStats.instagram > 0) newStats.instagramFollowers = metaStats.instagram;
          if (metaStats.facebook > 0) newStats.facebookFollowers = metaStats.facebook;

          igPosts = await getInstagramPosts(metaAuth.accessToken);
          fbPosts = await getFacebookPosts(metaAuth.accessToken);
        } catch (metaError) {}
      }

      // 4. Update Profile
      const totalFollowers = 
        (Number(newStats.youtubeFollowers) || 0) + 
        (Number(newStats.instagramFollowers) || 0) + 
        (Number(newStats.tiktokFollowers) || 0) + 
        (Number(newStats.facebookFollowers) || 0);

      const formatCount = (n: number) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(n);
      };

      const now = new Date();
      const updatedProfile: CreatorProfile = {
        ...profile,
        subscribers: formatCount(totalFollowers),
        platformStats: newStats,
        lastSyncTime: now.toISOString(),
        lastSyncType: isAuto ? 'Auto' : 'Manual'
      };
      
      setProfile(updatedProfile);

      const combinedPosts = [...realYoutubePosts, ...tiktokPosts, ...igPosts, ...fbPosts];
      
      if (dbActions) {
        dbActions.syncPosts(combinedPosts);
        if (!isAuto) {
            alert(`Sincronização concluída!\nYouTube: ${realYoutubePosts.length}\nTikTok: ${tiktokPosts.length}\nInstagram: ${igPosts.length}\nFacebook: ${fbPosts.length}\n\nTotal de Seguidores: ${totalFollowers}`);
        }
      } else {
        setPosts(combinedPosts);
      }

    } catch (error: any) {
      console.error(error);
      if (!isAuto) alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- AUTO SYNC (1 HOUR) ---
  const handleSyncRef = useRef(handleSync);
  useEffect(() => {
    handleSyncRef.current = handleSync;
  }, [handleSync]);

  useEffect(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const intervalId = setInterval(() => {
        if (handleSyncRef.current) handleSyncRef.current(true);
    }, ONE_HOUR_MS);
    return () => clearInterval(intervalId);
  }, []);

  const lastSyncDate = profile.lastSyncTime ? new Date(profile.lastSyncTime) : null;
  const nextSyncDate = lastSyncDate 
    ? new Date(lastSyncDate.getTime() + 60 * 60 * 1000) 
    : new Date(Date.now() + 60 * 60 * 1000);

  // --- POPUP TRIGGERS ---
  const startTikTokAuth = () => {
     const key = tiktokAuth.clientKey || DEFAULT_CLIENT_KEY;
     if (!key.trim()) { alert("O campo Client Key está vazio."); return; }
     const url = getTikTokAuthUrl(key.trim());
     window.open(url, 'TikTok Auth', 'width=600,height=700,status=yes,scrollbars=yes');
  };

  const startMetaAuth = (forceRerequest = false) => {
     const url = getMetaAuthUrl(metaAuth.appId || '1146266013233342', forceRerequest); 
     window.open(url, 'Meta Auth', 'width=600,height=700,status=yes,scrollbars=yes');
  };

  const handleTestTikTok = async () => {
      if (!tiktokAuth.accessToken) {
          alert("TikTok não conectado. Conecte primeiro.");
          return;
      }
      setIsConnecting(true);
      try {
          const stats = await getTikTokUserStats(
              tiktokAuth.accessToken,
              tiktokAuth.refreshToken,
              tiktokAuth.clientKey || DEFAULT_CLIENT_KEY,
              tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET,
              tiktokAuth.expiresAt,
              (newAccess, newRefresh, newExpiry) => {
                setTiktokAuth({
                    accessToken: newAccess,
                    refreshToken: newRefresh,
                    expiresAt: newExpiry
                });
              }
          );
          if (stats.error) {
              alert(`Falha no Diagnóstico TikTok:\nErro: ${stats.error}\n\nVerifique se o token é válido ou tente Reconectar.`);
          } else {
              alert(`Diagnóstico TikTok OK!\nUsuário: ${stats.displayName}\nSeguidores: ${stats.followers}\n\nConexão está funcionando corretamente.`);
          }
      } catch (e: any) {
          alert(`Erro inesperado no teste: ${e.message}`);
      } finally {
          setIsConnecting(false);
      }
  };

  const handleResetMeta = () => {
    if (confirm("Deseja abrir o guia de reset manual no Facebook?")) {
        window.open('https://www.facebook.com/settings?tab=business_tools', '_blank');
    }
  };

  const handleDebugMeta = async () => {
    if (!metaAuth.accessToken) return;
    const logs = await debugMetaConnection(metaAuth.accessToken);
    const logString = logs.join('\n');
    if (logString.includes("ALERTA CRÍTICO") || logString.includes("0 páginas")) {
        if(confirm(`DIAGNÓSTICO:\n${logString}\n\nDetectado problema de permissão. Resetar?`)) handleResetMeta();
    } else {
        alert(`Relatório Meta\n\n${logString}`);
    }
  };

  // --- FILE HANDLERS ---
  const handleSaveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile.path || !newFile.content) return;
    await saveVirtualFile({ ...newFile, type: 'text/plain' });
    const files = await getVirtualFilesCloud();
    setVirtualFiles(files);
    setNewFile({ path: '', content: '' });
  };
  const handleDeleteFile = async (path: string) => {
    await deleteVirtualFile(path);
    const files = await getVirtualFilesCloud();
    setVirtualFiles(files);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="text-indigo-500" /> Admin
                </h2>
            </div>
            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <LayoutDashboard size={20} /> Dashboard
                </button>
                <button onClick={() => setActiveTab('integrations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <RefreshCw size={20} /> Integrações
                </button>
                <button onClick={() => setActiveTab('content')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'content' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Users size={20} /> Perfil
                </button>
                <button onClick={() => setActiveTab('pages')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pages' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Video size={20} /> Páginas (CMS)
                </button>
                <button onClick={() => setActiveTab('posts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'posts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Eye size={20} /> Posts ({posts.length})
                </button>
                <button onClick={() => setActiveTab('chatbot')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'chatbot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Bot size={20} /> Chatbot IA
                </button>
                <button onClick={() => setActiveTab('files')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <FileText size={20} /> Arquivos
                </button>
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900">
                <button onClick={onViewPortal} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors">
                    <Eye size={18} /> Ver Portal
                </button>
                <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors">
                    <LogOut size={18} /> Sair
                </button>
            </div>
        </aside>

        <main className="ml-64 flex-1 p-8 overflow-y-auto">
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Visão Geral</h1>
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                             <div className="flex items-center gap-3 text-xs bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 shadow-sm">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold border-r border-slate-700 pr-3">
                                    <Clock size={14} className="animate-pulse" />
                                    <span>Auto-Sync (1h)</span>
                                </div>
                                <div className="flex flex-col md:flex-row md:gap-4 text-slate-400">
                                    {lastSyncDate ? (
                                        <span>Última: <span className="text-white font-mono">{lastSyncDate.toLocaleTimeString()}</span> ({profile.lastSyncType})</span>
                                    ) : (
                                        <span>Aguardando...</span>
                                    )}
                                    <span className="md:border-l md:border-slate-700 md:pl-4">Próxima: <span className="text-white font-mono">{nextSyncDate.toLocaleTimeString()}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Acessos Portal</h3>
                            <p className="text-3xl font-bold">{visitStats.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">YouTube Subs</h3>
                            <p className="text-3xl font-bold">{profile.platformStats?.youtubeFollowers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                             <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Instagram</h3>
                             <p className="text-3xl font-bold">{profile.platformStats?.instagramFollowers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                             <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">TikTok</h3>
                             <p className="text-3xl font-bold">{profile.platformStats?.tiktokFollowers !== undefined ? profile.platformStats.tiktokFollowers.toLocaleString() : '-'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                         <h3 className="text-xl font-bold mb-4">Sincronização Manual</h3>
                         <button 
                            onClick={() => handleSync(false)}
                            disabled={isSyncing}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                         >
                            <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                            {isSyncing ? "Sincronizando..." : "Atualizar Todos os Dados Agora"}
                         </button>
                    </div>
                </div>
            )}
            
            {activeTab === 'integrations' && (
                <div className="max-w-4xl space-y-8">
                     <h1 className="text-3xl font-bold">Integrações</h1>
                     
                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <Youtube size={24} />
                            <h2 className="text-xl font-bold text-white">YouTube API</h2>
                        </div>
                        <input 
                            type="password" 
                            value={youtubeApiKey}
                            onChange={(e) => setYoutubeApiKey(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-red-500 focus:outline-none"
                            placeholder="Chave da API do Google Cloud"
                        />
                     </div>

                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-teal-400">
                            <TikTokIcon className="w-6 h-6" />
                            <h2 className="text-xl font-bold text-white">TikTok for Developers</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                <label className="block text-sm text-slate-400 mb-1">Client Key</label>
                                <input 
                                    type="text" 
                                    value={tiktokAuth.clientKey || ''}
                                    onChange={(e) => setTiktokAuth({ clientKey: e.target.value.trim() })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                             <div>
                                <label className="block text-sm text-slate-400 mb-1">Client Secret</label>
                                <input 
                                    type="password" 
                                    value={tiktokAuth.clientSecret || ''}
                                    onChange={(e) => setTiktokAuth({ clientSecret: e.target.value.trim() })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg">
                             <div className="flex items-center gap-4">
                                <div className="text-sm">
                                    <span className="text-slate-400">Status: </span>
                                    {tiktokAuth.accessToken ? <span className="text-emerald-400 font-bold">Conectado</span> : <span className="text-slate-500">Desconectado</span>}
                                </div>
                                {tiktokAuth.accessToken && (
                                    <button 
                                        onClick={handleTestTikTok}
                                        disabled={isConnecting}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-900/50 px-3 py-1.5 rounded-md flex items-center gap-1"
                                    >
                                        <Zap size={14} /> Testar Conexão
                                    </button>
                                )}
                             </div>
                             <button onClick={startTikTokAuth} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-bold">
                                {tiktokAuth.accessToken ? "Reconectar TikTok" : "Conectar TikTok"}
                             </button>
                        </div>
                     </div>

                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-blue-500">
                            <Facebook size={24} />
                            <Instagram size={24} className="text-fuchsia-500" />
                            <h2 className="text-xl font-bold text-white">Meta (Facebook & Instagram)</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                 <label className="block text-sm text-slate-400 mb-1">App ID</label>
                                 <input type="text" value={metaAuth.appId || ''} onChange={(e) => setMetaAuth({ appId: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                 <label className="block text-sm text-slate-400 mb-1">App Secret</label>
                                 <input type="password" value={metaAuth.appSecret || ''} onChange={(e) => setMetaAuth({ appSecret: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg">
                             <div className="flex items-center gap-4 text-sm">
                                <div><span className="text-slate-400">Status: </span>{metaAuth.accessToken ? <span className="text-emerald-400 font-bold">Conectado</span> : <span className="text-slate-500">Desconectado</span>}</div>
                                {metaAuth.accessToken && <button onClick={handleDebugMeta} className="text-xs text-blue-400 hover:underline">Diagnosticar</button>}
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={handleResetMeta} className="bg-amber-900/30 hover:bg-amber-900/50 text-amber-500 border border-amber-900/50 px-3 py-2 rounded-lg text-xs font-bold">Reset FB</button>
                                 <button onClick={() => startMetaAuth(false)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                    {isConnecting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                    {metaAuth.accessToken ? "Reconectar" : "Conectar"}
                                 </button>
                             </div>
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'content' && (
                <div className="max-w-4xl space-y-8">
                    <h1 className="text-3xl font-bold">Perfil do Criador</h1>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-400">Nome de Exibição</label>
                                <input type="text" value={profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" />
                            </div>
                             <div>
                                <label className="text-sm text-slate-400">Handle (@usuario)</label>
                                <input type="text" value={profile.handle} onChange={(e) => handleProfileChange('handle', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" />
                            </div>
                             <div className="md:col-span-2">
                                <label className="text-sm text-slate-400">Avatar URL</label>
                                <input type="text" value={profile.avatarUrl} onChange={(e) => handleProfileChange('avatarUrl', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-400">Bio</label>
                                <textarea value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1 h-20" />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                             <button onClick={() => setProfile(profile)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><Save size={18} /> <span>Salvar Perfil</span></button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'pages' && (
                <div className="max-w-4xl space-y-8">
                    <h1 className="text-3xl font-bold">Páginas (CMS)</h1>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                             <Globe size={20} className="text-emerald-400" /> SEO & Indexação
                        </h2>
                        <div className="space-y-4 mb-8">
                             <div>
                                <label className="text-sm font-bold text-white mb-1 block">Google Search Console Tag</label>
                                <input type="text" value={landingContent.googleVerificationId || ''} onChange={(e) => handleLandingChange('googleVerificationId', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-indigo-300 font-mono text-sm" />
                            </div>
                             <div>
                                <label className="text-sm text-slate-400">Meta Title</label>
                                <input type="text" value={landingContent.seoTitle || ''} onChange={(e) => handleLandingChange('seoTitle', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                             <button onClick={() => setLandingContent(landingContent)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><Save size={18} /> <span>Salvar Página</span></button>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'posts' && (
                <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Posts ({posts.length})</h1>
                        <button onClick={() => dbActions.clearPosts()} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2"><Trash2 size={16} /> Limpar Tudo</button>
                     </div>
                     <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-400 text-sm border-b border-slate-800">
                                    <th className="p-4">Plataforma</th>
                                    <th className="p-4">Conteúdo</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posts.map(post => (
                                    <tr key={post.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                        <td className="p-4"><span className="text-xs font-bold uppercase">{post.platform}</span></td>
                                        <td className="p-4 truncate max-w-xs">{post.title || post.caption}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => dbActions.deletePost(post.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}

            {activeTab === 'chatbot' && (
                <div className="max-w-3xl mx-auto space-y-8">
                     <h1 className="text-3xl font-bold">Chatbot IA</h1>
                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                         <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400">Base de Conhecimento</label>
                                <textarea 
                                    value={landingContent.chatbotConfig?.knowledgeBase || ''} 
                                    onChange={(e) => {
                                        const cfg = landingContent.chatbotConfig || { enabled: true, welcomeMessage: '', knowledgeBase: '' };
                                        setLandingContent({ ...landingContent, chatbotConfig: { ...cfg, knowledgeBase: e.target.value } });
                                    }} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1 h-64 font-mono text-sm" 
                                />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={() => setLandingContent(landingContent)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><Save size={18} /> <span>Salvar IA</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'files' && (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Arquivos Virtuais</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
                            <form onSubmit={handleSaveFile} className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400">Path</label>
                                    <input type="text" value={newFile.path} onChange={(e) => setNewFile({...newFile, path: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="ex: tiktok_verify.txt" required />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Conteúdo</label>
                                    <textarea rows={8} value={newFile.content} onChange={(e) => setNewFile({...newFile, content: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs" required />
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center space-x-2"><Plus size={18} /> <span>Salvar</span></button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-fit">
                            <div className="divide-y divide-slate-800">
                                {virtualFiles.map((file, idx) => (
                                <div key={idx} className="p-4 flex items-start justify-between">
                                    <div><span className="font-mono text-white">/{file.path}</span></div>
                                    <button onClick={() => handleDeleteFile(file.path)} className="text-slate-500 hover:text-red-400"><Trash2 size={18} /></button>
                                </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
};
