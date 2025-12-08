import React, { useState } from 'react';
import { 
  LayoutDashboard, Settings, RefreshCw, LogOut, Save, Youtube, 
  Instagram, Facebook, Trash2, Plus, Eye, Link2, TikTokIcon,
  TrendingUp, CloudLightning, Users, Bot
} from './Icons';
import { SocialPost, CreatorProfile, LandingPageContent, Platform, TikTokAuthData, MetaAuthData } from '../types';
import { getYouTubePosts, getYouTubeChannelStatistics } from '../services/youtubeService';
import { 
  getTikTokPosts, 
  getTikTokAuthUrl, 
  getTikTokUserStats,
  DEFAULT_CLIENT_KEY, 
  DEFAULT_CLIENT_SECRET 
} from '../services/tiktokService';
import { 
  getMetaAuthUrl, 
  getInstagramPosts, 
  getFacebookPosts, 
  getMetaPlatformStats,
  debugMetaConnection 
} from '../services/metaService';

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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  posts, setPosts, dbActions, onLogout, onViewPortal,
  landingContent, setLandingContent, profile, setProfile,
  youtubeApiKey, setYoutubeApiKey, tiktokAuth, setTiktokAuth, metaAuth, setMetaAuth
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'posts' | 'content' | 'integrations'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper for inputs
  const handleProfileChange = (field: keyof CreatorProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleLandingChange = (field: keyof LandingPageContent, value: any) => {
    setLandingContent({ ...landingContent, [field]: value });
  };

  // Sync Logic
  const handleSync = async () => {
    setIsSyncing(true);
    
    const newStats = {
      youtubeFollowers: 0,
      instagramFollowers: 0,
      tiktokFollowers: 0,
      facebookFollowers: 0
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
         } catch (e) {
             console.error("YouTube Sync Error", e);
         }
      }

      // 2. TikTok
      let tiktokPosts: SocialPost[] = [];
      if (tiktokAuth.accessToken) {
        try {
            const ttStats = await getTikTokUserStats(tiktokAuth.accessToken);
            newStats.tiktokFollowers = ttStats.followers;

            tiktokPosts = await getTikTokPosts(
            '@mundo.dos.dados5', 
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
        } catch (ttErr) {
            console.error("TikTok Sync Error", ttErr);
        }
      }

      // 3. Meta
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
          console.error("Meta Sync Failed:", metaError);
        }
      }

      // 4. Update Profile
      const totalFollowers = 
        newStats.youtubeFollowers + 
        newStats.instagramFollowers + 
        newStats.tiktokFollowers + 
        newStats.facebookFollowers;

      const formatCount = (n: number) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(n);
      };

      const updatedProfile = {
        ...profile,
        subscribers: formatCount(totalFollowers),
        platformStats: newStats
      };
      
      setProfile(updatedProfile);

      const combinedPosts = [...realYoutubePosts, ...tiktokPosts, ...igPosts, ...fbPosts];
      
      if (dbActions) {
        dbActions.syncPosts(combinedPosts);
        let msg = `Sincronização concluída!\nYouTube: ${realYoutubePosts.length}\nTikTok: ${tiktokPosts.length}\nInstagram: ${igPosts.length}\nFacebook: ${fbPosts.length}`;
        alert(msg);
      } else {
        setPosts(combinedPosts);
      }

    } catch (error: any) {
      console.error(error);
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const startTikTokAuth = () => {
     window.location.href = getTikTokAuthUrl(tiktokAuth.clientKey || DEFAULT_CLIENT_KEY);
  };

  const startMetaAuth = () => {
     window.location.href = getMetaAuthUrl(metaAuth.appId || '1146266013233342'); // ID fallback
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="text-indigo-500" />
                    Admin
                </h2>
            </div>
            <nav className="flex-grow p-4 space-y-2">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <LayoutDashboard size={20} /> Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('integrations')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <RefreshCw size={20} /> Integrações
                </button>
                <button 
                    onClick={() => setActiveTab('content')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'content' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Settings size={20} /> Conteúdo & Perfil
                </button>
                <button 
                    onClick={() => setActiveTab('posts')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'posts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Eye size={20} /> Posts ({posts.length})
                </button>
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-2">
                <button 
                    onClick={onViewPortal}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                    <Eye size={18} /> Ver Portal
                </button>
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                    <LogOut size={18} /> Sair
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8 overflow-y-auto">
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Visão Geral</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">Total Posts</h3>
                            <p className="text-3xl font-bold">{posts.length}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">YouTube Subs</h3>
                            <p className="text-3xl font-bold">{profile.platformStats?.youtubeFollowers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                             <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">Instagram Followers</h3>
                             <p className="text-3xl font-bold">{profile.platformStats?.instagramFollowers?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                             <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">TikTok Followers</h3>
                             <p className="text-3xl font-bold">{profile.platformStats?.tiktokFollowers?.toLocaleString() || '-'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                         <h3 className="text-xl font-bold mb-4">Ações Rápidas</h3>
                         <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                         >
                            <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                            {isSyncing ? "Sincronizando..." : "Sincronizar Todas as Redes"}
                         </button>
                    </div>
                </div>
            )}

            {activeTab === 'integrations' && (
                <div className="max-w-4xl space-y-8">
                     <h1 className="text-3xl font-bold">Integrações</h1>
                     
                     {/* YouTube */}
                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <Youtube size={24} />
                            <h2 className="text-xl font-bold text-white">YouTube Data API</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">API Key</label>
                                <input 
                                    type="password" 
                                    value={youtubeApiKey}
                                    onChange={(e) => setYoutubeApiKey(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-red-500 focus:outline-none"
                                    placeholder="AIza..."
                                />
                            </div>
                        </div>
                     </div>

                     {/* TikTok */}
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
                                    onChange={(e) => setTiktokAuth({ clientKey: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                             <div>
                                <label className="block text-sm text-slate-400 mb-1">Client Secret</label>
                                <input 
                                    type="password" 
                                    value={tiktokAuth.clientSecret || ''}
                                    onChange={(e) => setTiktokAuth({ clientSecret: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg">
                             <div className="text-sm">
                                <span className="text-slate-400">Status: </span>
                                {tiktokAuth.accessToken ? (
                                    <span className="text-emerald-400 font-bold">Conectado</span>
                                ) : (
                                    <span className="text-slate-500">Desconectado</span>
                                )}
                             </div>
                             <button 
                                onClick={startTikTokAuth}
                                className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                             >
                                {tiktokAuth.accessToken ? "Reconectar TikTok" : "Conectar TikTok"}
                             </button>
                        </div>
                     </div>

                     {/* Meta */}
                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-4 text-blue-500">
                            <Facebook size={24} />
                            <Instagram size={24} className="text-fuchsia-500" />
                            <h2 className="text-xl font-bold text-white">Meta (Facebook & Instagram)</h2>
                        </div>
                         <div className="mb-4">
                             <label className="block text-sm text-slate-400 mb-1">App ID</label>
                             <input 
                                type="text" 
                                value={metaAuth.appId || ''}
                                onChange={(e) => setMetaAuth({ appId: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg">
                             <div className="text-sm">
                                <span className="text-slate-400">Status: </span>
                                {metaAuth.accessToken ? (
                                    <span className="text-emerald-400 font-bold">Conectado</span>
                                ) : (
                                    <span className="text-slate-500">Desconectado</span>
                                )}
                             </div>
                             <button 
                                onClick={startMetaAuth}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                             >
                                {metaAuth.accessToken ? "Reconectar Meta" : "Conectar Meta"}
                             </button>
                        </div>
                        {metaAuth.accessToken && (
                            <button 
                                onClick={async () => {
                                    const logs = await debugMetaConnection(metaAuth.accessToken);
                                    alert(logs.join('\n'));
                                }}
                                className="mt-2 text-xs text-slate-500 hover:text-white underline"
                            >
                                Diagnóstico de Conexão
                            </button>
                        )}
                     </div>
                </div>
            )}

            {activeTab === 'content' && (
                <div className="max-w-4xl space-y-8">
                    <h1 className="text-3xl font-bold">Perfil & Conteúdo</h1>
                    
                    {/* Profile */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                             <Users size={20} className="text-indigo-400" /> Perfil do Criador
                        </h2>
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
                    </div>

                    {/* Landing Page */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                             <LayoutDashboard size={20} className="text-indigo-400" /> Landing Page
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400">Título Principal (Headline)</label>
                                <input type="text" value={landingContent.headline} onChange={(e) => handleLandingChange('headline', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" />
                            </div>
                             <div>
                                <label className="text-sm text-slate-400">Subtítulo</label>
                                <textarea value={landingContent.subheadline} onChange={(e) => handleLandingChange('subheadline', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1 h-20" />
                            </div>
                             <div>
                                <label className="text-sm text-slate-400">Texto do Botão CTA</label>
                                <input type="text" value={landingContent.ctaButtonText} onChange={(e) => handleLandingChange('ctaButtonText', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" />
                            </div>
                        </div>
                    </div>

                     {/* Chatbot Config */}
                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                             <Bot size={20} className="text-indigo-400" /> Configuração do Chatbot (Gemini)
                        </h2>
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={landingContent.chatbotConfig?.enabled ?? true} 
                                    onChange={(e) => {
                                        const cfg = landingContent.chatbotConfig || { enabled: true, welcomeMessage: '', knowledgeBase: '' };
                                        setLandingContent({ 
                                            ...landingContent, 
                                            chatbotConfig: { ...cfg, enabled: e.target.checked }
                                        });
                                    }}
                                    className="w-5 h-5 rounded border-slate-700 bg-slate-950"
                                />
                                <span className="text-white">Ativar Chatbot</span>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400">Mensagem de Boas-vindas</label>
                                <input 
                                    type="text" 
                                    value={landingContent.chatbotConfig?.welcomeMessage || ''} 
                                    onChange={(e) => {
                                        const cfg = landingContent.chatbotConfig || { enabled: true, welcomeMessage: '', knowledgeBase: '' };
                                        setLandingContent({ 
                                            ...landingContent, 
                                            chatbotConfig: { ...cfg, welcomeMessage: e.target.value }
                                        });
                                    }} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1" 
                                />
                            </div>
                             <div>
                                <label className="text-sm text-slate-400">Base de Conhecimento (Contexto para IA)</label>
                                <textarea 
                                    value={landingContent.chatbotConfig?.knowledgeBase || ''} 
                                    onChange={(e) => {
                                        const cfg = landingContent.chatbotConfig || { enabled: true, welcomeMessage: '', knowledgeBase: '' };
                                        setLandingContent({ 
                                            ...landingContent, 
                                            chatbotConfig: { ...cfg, knowledgeBase: e.target.value }
                                        });
                                    }} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 mt-1 h-32" 
                                    placeholder="Cole aqui informações sobre seu canal, links importantes, biografia, etc."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'posts' && (
                <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Gerenciar Posts</h1>
                        <button 
                            onClick={() => dbActions.clearPosts()}
                            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Limpar Tudo
                        </button>
                     </div>

                     <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-400 text-sm border-b border-slate-800">
                                    <th className="p-4">Plataforma</th>
                                    <th className="p-4">Conteúdo</th>
                                    <th className="p-4">Stats</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posts.map(post => (
                                    <tr key={post.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                post.platform === Platform.YOUTUBE ? 'bg-red-500/20 text-red-400' :
                                                post.platform === Platform.TIKTOK ? 'bg-teal-500/20 text-teal-400' :
                                                post.platform === Platform.INSTAGRAM ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {post.platform}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img src={post.thumbnailUrl} className="w-10 h-10 rounded object-cover" alt="" />
                                                <div className="max-w-md truncate text-sm">
                                                    <div className="font-medium text-white truncate">{post.title || 'Sem título'}</div>
                                                    <div className="text-slate-500 truncate">{post.caption}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            <div>Likes: {post.likes}</div>
                                            <div>Views: {post.views}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => dbActions.deletePost(post.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {posts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500">
                                            Nenhum post encontrado. Sincronize suas redes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}
        </main>
    </div>
  );
};