
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Settings, RefreshCw, LogOut, Save, Youtube, 
  Instagram, Facebook, Trash2, Plus, Eye, Link2, TikTokIcon,
  TrendingUp, CloudLightning, Users, Bot, FileText, UploadCloud,
  X, CheckCircle, Lock, Zap, MessageSquare, BookOpen, Video, Clock,
  AvailableIcons, AlertTriangle, Globe, ExternalLink, Database, Activity, Heart
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
            alert("TikTok conectado com sucesso!");
         } catch (e: any) {
            console.error(e);
            alert(`Erro TikTok: ${e.message}`);
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
                      alert("Meta: Token de longa duração gerado!");
                  } catch (upgradeErr: any) {
                      console.warn("Aviso: Token de curta duração ativo.");
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

  // --- AUTH HELPERS ---
  
  const handleTestTikTok = async () => {
    if (!tiktokAuth.accessToken) return;
    try {
      const stats = await getTikTokUserStats(
        tiktokAuth.accessToken, 
        tiktokAuth.refreshToken, 
        tiktokAuth.clientKey || DEFAULT_CLIENT_KEY, 
        tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET, 
        tiktokAuth.expiresAt,
        (acc, ref, exp) => setTiktokAuth({ accessToken: acc, refreshToken: ref, expiresAt: exp })
      );
      alert(`TikTok Diagnóstico: @${stats.displayName || 'n/a'} - ${stats.followers} seguidores.`);
    } catch (e: any) {
      alert(`Erro no diagnóstico: ${e.message}`);
    }
  };

  const startTikTokAuth = () => {
    const key = tiktokAuth.clientKey || DEFAULT_CLIENT_KEY;
    const url = getTikTokAuthUrl(key);
    window.open(url, 'tiktok_auth', 'width=600,height=800');
  };

  const startMetaAuth = (force: boolean) => {
    if (!metaAuth.appId) {
      alert("Informe o App ID primeiro.");
      return;
    }
    const url = getMetaAuthUrl(metaAuth.appId, force);
    window.open(url, 'meta_auth', 'width=600,height=800');
  };

  const handleDebugMeta = async () => {
    if (!metaAuth.accessToken) return;
    const logs = await debugMetaConnection(metaAuth.accessToken);
    alert(logs.join('\n'));
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
        setTiktokAuth({ accessToken: newAccess, refreshToken: newRefresh, expiresAt: newExpiry });
    };

    try {
      let realYoutubePosts: SocialPost[] = [];
      if (youtubeApiKey) {
         try {
            realYoutubePosts = await getYouTubePosts('@MundodosDadosBR', 15, youtubeApiKey);
            const channelStats = await getYouTubeChannelStatistics('@MundodosDadosBR', youtubeApiKey);
            if (channelStats) {
                const numStr = channelStats.subscriberCount.replace(/[^0-9.]/g, '');
                const num = parseFloat(numStr) * (channelStats.subscriberCount.includes('K') ? 1000 : channelStats.subscriberCount.includes('M') ? 1000000 : 1);
                newStats.youtubeFollowers = num;
            }
         } catch (e) {}
      }

      let tiktokPosts: SocialPost[] = [];
      if (tiktokAuth.accessToken) {
         try {
             const ttStats = await getTikTokUserStats(tiktokAuth.accessToken, tiktokAuth.refreshToken, tiktokAuth.clientKey || DEFAULT_CLIENT_KEY, tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET, tiktokAuth.expiresAt, updateTokenCallback);
             if (ttStats.followers) newStats.tiktokFollowers = ttStats.followers;
             tiktokPosts = await getTikTokPosts('@mundo.dos.dados5', tiktokAuth.accessToken, tiktokAuth.refreshToken, tiktokAuth.clientKey || DEFAULT_CLIENT_KEY, tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET, tiktokAuth.expiresAt, updateTokenCallback);
         } catch (ttErr) {}
      }

      let igPosts: SocialPost[] = [];
      let fbPosts: SocialPost[] = [];
      if (metaAuth.accessToken) {
        try {
          const metaStats = await getMetaPlatformStats(metaAuth.accessToken);
          newStats.instagramFollowers = metaStats.instagram;
          newStats.facebookFollowers = metaStats.facebook;
          igPosts = await getInstagramPosts(metaAuth.accessToken);
          fbPosts = await getFacebookPosts(metaAuth.accessToken);
        } catch (metaError) {
          console.error("Erro Meta Sync:", metaError);
        }
      }

      const combinedPosts = [...realYoutubePosts, ...tiktokPosts, ...igPosts, ...fbPosts];
      dbActions.syncPosts(combinedPosts);
      
      const total = Object.values(newStats).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
      setProfile({ 
          ...profile, 
          subscribers: total > 1000 ? (total/1000).toFixed(1) + 'K' : total.toString(), 
          platformStats: newStats, 
          lastSyncTime: new Date().toISOString(), 
          lastSyncType: isAuto ? 'Auto' : 'Manual' 
      });

      if (!isAuto) alert("Sincronização concluída com sucesso!");

    } catch (error: any) {
      console.error(error);
      if (!isAuto) alert(`Erro durante a sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncRef = useRef(handleSync);
  useEffect(() => { handleSyncRef.current = handleSync; }, [handleSync]);
  useEffect(() => {
    const intervalId = setInterval(() => { if (handleSyncRef.current) handleSyncRef.current(true); }, 3600000);
    return () => clearInterval(intervalId);
  }, []);

  const lastSyncDate = profile.lastSyncTime ? new Date(profile.lastSyncTime) : null;
  const nextSyncDate = lastSyncDate ? new Date(lastSyncDate.getTime() + 3600000) : new Date(Date.now() + 3600000);

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
                        <div className="flex items-center gap-3 text-xs bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                            <Clock size={14} className="animate-pulse" />
                            <span>Auto-Sync Ativo: Próximo em {nextSyncDate.toLocaleTimeString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-slate-400 text-sm font-bold mb-2">Visitas</h3>
                            <p className="text-3xl font-bold">{visitStats.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-slate-400 text-sm font-bold mb-2 text-red-500">YouTube</h3>
                            <p className="text-3xl font-bold">{profile.platformStats?.youtubeFollowers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                             <h3 className="text-slate-400 text-sm font-bold mb-2 text-fuchsia-500">Instagram</h3>
                             <p className="text-3xl font-bold">{profile.platformStats?.instagramFollowers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                             <h3 className="text-slate-400 text-sm font-bold mb-2 text-teal-500">TikTok</h3>
                             <p className="text-3xl font-bold">{profile.platformStats?.tiktokFollowers?.toLocaleString() || '-'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                         <h3 className="text-xl font-bold mb-4">Sincronização de Dados</h3>
                         <div className="flex flex-col gap-4">
                            <p className="text-sm text-slate-400">Clique para atualizar manualmente as postagens e estatísticas de todas as redes sociais conectadas.</p>
                             <button onClick={() => handleSync(false)} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 w-fit">
                                <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                                {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
                             </button>
                         </div>
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
                        <input type="password" value={youtubeApiKey} onChange={(e) => setYoutubeApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Chave da API do Google Cloud" />
                     </div>

                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-teal-400">
                            <TikTokIcon className="w-6 h-6" />
                            <h2 className="text-xl font-bold text-white">TikTok for Developers</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <div><label className="text-xs text-slate-400">Client Key</label><input type="text" value={tiktokAuth.clientKey || ''} onChange={(e) => setTiktokAuth({ clientKey: e.target.value.trim() })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
                             <div><label className="text-xs text-slate-400">Client Secret</label><input type="password" value={tiktokAuth.clientSecret || ''} onChange={(e) => setTiktokAuth({ clientSecret: e.target.value.trim() })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg">
                             <div className="flex items-center gap-4 text-sm">
                                <div><span className="text-slate-400">Status: </span>{tiktokAuth.accessToken ? <span className="text-emerald-400 font-bold">Conectado</span> : <span className="text-slate-500">Desconectado</span>}</div>
                                {tiktokAuth.accessToken && <button onClick={handleTestTikTok} className="text-xs text-teal-400 hover:underline">Testar Conexão</button>}
                             </div>
                             <button onClick={startTikTokAuth} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Conectar TikTok</button>
                        </div>
                     </div>

                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-blue-500">
                            <Facebook size={24} /> <Instagram size={24} className="text-fuchsia-500" />
                            <h2 className="text-xl font-bold text-white">Meta (Facebook & Instagram)</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <div><label className="text-xs text-slate-400">App ID</label><input type="text" value={metaAuth.appId || ''} onChange={(e) => setMetaAuth({ appId: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
                             <div><label className="text-xs text-slate-400">App Secret</label><input type="password" value={metaAuth.appSecret || ''} onChange={(e) => setMetaAuth({ appSecret: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg">
                             <div className="flex items-center gap-4 text-sm">
                                <div><span className="text-slate-400">Status: </span>{metaAuth.accessToken ? <span className="text-emerald-400 font-bold">Conectado</span> : <span className="text-slate-500">Desconectado</span>}</div>
                                {metaAuth.accessToken && <button onClick={handleDebugMeta} className="text-xs text-blue-400 hover:underline">Diagnosticar</button>}
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => startMetaAuth(true)} className="bg-amber-900/30 text-amber-500 border border-amber-900/50 px-3 py-2 rounded-lg text-xs font-bold">Resetar Permissões</button>
                                 <button onClick={() => startMetaAuth(false)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Conectar Meta</button>
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
                            <div><label className="text-sm text-slate-400">Nome</label><input type="text" value={profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" /></div>
                            <div><label className="text-sm text-slate-400">Handle</label><input type="text" value={profile.handle} onChange={(e) => handleProfileChange('handle', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" /></div>
                            <div className="md:col-span-2"><label className="text-sm text-slate-400">Avatar URL</label><input type="text" value={profile.avatarUrl} onChange={(e) => handleProfileChange('avatarUrl', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" /></div>
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={() => setProfile(profile)} className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-6 rounded-lg flex items-center gap-2"><Save size={18} /> Salvar</button></div>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
};
