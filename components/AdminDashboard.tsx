
import React, { useState, useEffect } from 'react';
import { 
  Platform, 
  SocialPost,
  LandingPageContent,
  CreatorProfile,
  FeatureItem
} from '../types';
import { getYouTubePosts, getYouTubeChannelStatistics } from '../services/youtubeService';
import { 
  getTikTokPosts, 
  getTikTokAuthUrl, 
  exchangeTikTokCode, 
  DEFAULT_CLIENT_KEY, 
  DEFAULT_CLIENT_SECRET, 
  getRedirectUri 
} from '../services/tiktokService';
import { getMetaAuthUrl, getInstagramPosts, getFacebookPosts, getMetaRedirectUri } from '../services/metaService';
import { TikTokAuthData, MetaAuthData, getVirtualFilesCloud, saveVirtualFile, deleteVirtualFile, VirtualFile } from '../services/firebase';
import { 
  Trash2, 
  Plus, 
  LogOut, 
  BarChart3, 
  LayoutDashboard,
  Youtube,
  Instagram,
  Facebook,
  TikTokIcon,
  X,
  CheckCircle,
  Eye,
  Link2,
  RefreshCw,
  CloudLightning,
  Video,
  Users,
  AlertTriangle,
  Lock,
  FileText,
  UploadCloud,
  Save,
  AvailableIcons,
  Bot,
  MessageSquare
} from './Icons';

interface AdminDashboardProps {
  posts: SocialPost[];
  setPosts: any; 
  dbActions?: {
    addPost: (p: SocialPost) => void;
    deletePost: (id: string) => void;
    syncPosts: (p: SocialPost[]) => void;
    clearPosts: () => void;
  };
  onLogout: () => void;
  onViewPortal: () => void;
  landingContent: LandingPageContent;
  setLandingContent: (c: LandingPageContent) => void;
  profile: CreatorProfile;
  setProfile: (p: CreatorProfile) => void;
  youtubeApiKey: string;
  setYoutubeApiKey: (k: string) => void;
  tiktokAuth: TikTokAuthData;
  setTiktokAuth: (data: Partial<TikTokAuthData>) => void;
  metaAuth: MetaAuthData;
  setMetaAuth: (data: Partial<MetaAuthData>) => void;
}

type AdminView = 'content' | 'integrations' | 'pages' | 'profile' | 'files' | 'chatbot';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  posts, 
  setPosts, 
  dbActions,
  onLogout, 
  onViewPortal,
  landingContent,
  setLandingContent,
  profile,
  setProfile,
  youtubeApiKey,
  setYoutubeApiKey,
  tiktokAuth,
  setTiktokAuth,
  metaAuth,
  setMetaAuth
}) => {
  const [activeView, setActiveView] = useState<AdminView>('content');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Local State for Forms (Drafts)
  const [localProfile, setLocalProfile] = useState<CreatorProfile>(profile);
  const [localLanding, setLocalLanding] = useState<LandingPageContent>(landingContent);
  const [localYoutubeKey, setLocalYoutubeKey] = useState<string>(youtubeApiKey);
  
  useEffect(() => { setLocalProfile(profile); }, [profile]);
  useEffect(() => { setLocalLanding(landingContent); }, [landingContent]);
  useEffect(() => { setLocalYoutubeKey(youtubeApiKey); }, [youtubeApiKey]);

  // File System State
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [newFile, setNewFile] = useState({ path: '', content: '' });
  
  // POPUP LISTENER
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Security check: ensure message comes from same origin
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
         // Parse the hash sent from popup
         // format: #access_token=...&expires_in=...
         try {
            const hash = event.data.hash.substring(1); // remove #
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const expiresIn = params.get('expires_in');
            
            if (accessToken) {
               const expiry = expiresIn ? Date.now() + (parseInt(expiresIn) * 1000) : Date.now() + (3600 * 1000);
               setMetaAuth({
                 accessToken,
                 expiresAt: expiry
               });
               alert("Meta (Facebook/Instagram) conectado com sucesso via Pop-up!");
            }
         } catch (e) {
            console.error(e);
         }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tiktokAuth, setTiktokAuth, setMetaAuth]);

  const [newPost, setNewPost] = useState<Partial<SocialPost>>({
    platform: Platform.YOUTUBE,
    title: '',
    caption: '',
    thumbnailUrl: 'https://picsum.photos/seed/new/600/400',
    likes: 0,
    comments: 0,
    views: 0
  });

  useEffect(() => {
    if (activeView === 'files') {
      getVirtualFilesCloud().then(setVirtualFiles);
    }
  }, [activeView]);

  // SAVE HANDLERS
  const handleSaveProfileClick = () => {
    setProfile(localProfile);
    alert('Perfil salvo com sucesso!');
  };

  const handleSaveLandingClick = () => {
    setLandingContent(localLanding);
    alert('Página CMS salva com sucesso!');
  };

  const handleSaveYoutubeClick = () => {
    setYoutubeApiKey(localYoutubeKey);
    alert('Integração YouTube salva com sucesso!');
  };

  const handleSaveChatbotClick = () => {
    setLandingContent(localLanding);
    alert('Configurações do Chatbot salvas com sucesso!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta postagem?')) {
      if (dbActions) {
        dbActions.deletePost(id);
      } else {
        setPosts(posts.filter(p => p.id !== id));
      }
    }
  };

  const handleClearAll = () => {
    if (confirm('Tem certeza que deseja apagar TODAS as postagens? Esta ação não pode ser desfeita.')) {
      if (dbActions && dbActions.clearPosts) {
        dbActions.clearPosts();
      } else {
        setPosts([]);
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      // 1. YouTube
      const realYoutubePosts = await getYouTubePosts('@MundodosDadosBR', 10, youtubeApiKey);
      const channelStats = await getYouTubeChannelStatistics('@MundodosDadosBR', youtubeApiKey);
      if (channelStats && channelStats.subscriberCount) {
        setProfile({
          ...profile,
          subscribers: channelStats.subscriberCount
        });
      }

      // 2. TikTok
      const tiktokPosts = await getTikTokPosts(
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

      // 3. Instagram & Facebook (Meta)
      let igPosts: SocialPost[] = [];
      let fbPosts: SocialPost[] = [];
      
      if (metaAuth.accessToken) {
        try {
          igPosts = await getInstagramPosts(metaAuth.accessToken);
          fbPosts = await getFacebookPosts(metaAuth.accessToken);
        } catch (metaError) {
          console.error("Meta Sync Failed:", metaError);
        }
      }

      const combinedPosts = [...realYoutubePosts, ...tiktokPosts, ...igPosts, ...fbPosts];
      
      if (dbActions) {
        dbActions.syncPosts(combinedPosts);
        
        // Custom Alert message based on results
        let msg = `Sincronização concluída!\n\nYouTube: ${realYoutubePosts.length}\nTikTok: ${tiktokPosts.length}\nInstagram: ${igPosts.length}\nFacebook: ${fbPosts.length}`;
        
        if (metaAuth.accessToken && igPosts.length === 0 && fbPosts.length > 0) {
           msg += `\n\n⚠️ AVISO: Facebook conectado, mas nenhum post do Instagram encontrado. Verifique se sua conta do Instagram é "Business" e se está vinculada à Página do Facebook.`;
        }

        alert(msg);
      } else {
        setPosts((prev: any) => {
          const newItems = [...combinedPosts];
          return [...newItems, ...prev];
        });
      }

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || 'Erro desconhecido';
      alert(`Erro parcial na sincronização: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- CONNECT HANDLERS (POP-UP) ---
  const handleConnectTikTok = () => {
     const key = tiktokAuth.clientKey || DEFAULT_CLIENT_KEY;
     if (!key) {
       alert("Por favor, insira o Client Key.");
       return;
     }
     
     setTiktokAuth({ 
       clientKey: key, 
       clientSecret: tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET 
     });

     const url = getTikTokAuthUrl(key);
     window.open(url, 'TikTok Auth', 'width=600,height=700,status=yes,scrollbars=yes');
  };

  const handleConnectMeta = () => {
    if (!metaAuth.appId) {
      alert("Por favor, insira o App ID do Facebook.");
      return;
    }
    const url = getMetaAuthUrl(metaAuth.appId);
    window.open(url, 'Meta Auth', 'width=600,height=700,status=yes,scrollbars=yes');
  };

  const handleDisconnect = (platform: Platform) => {
    if (confirm(`Desconectar conta do ${platform}?`)) {
      if (platform === Platform.TIKTOK) {
        setTiktokAuth({ accessToken: '', refreshToken: '', expiresAt: 0 });
      } else if (platform === Platform.INSTAGRAM || platform === Platform.FACEBOOK) {
        setMetaAuth({ accessToken: '', expiresAt: 0 });
      }
    }
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `manual-${Date.now()}`;
    const postToAdd = {
      ...newPost,
      id,
      date: new Date().toISOString(),
      url: '#'
    } as SocialPost;
    
    if (dbActions) {
      dbActions.addPost(postToAdd);
    } else {
      setPosts([postToAdd, ...posts]);
    }

    setIsAddModalOpen(false);
    setNewPost({
      platform: Platform.YOUTUBE,
      title: '',
      caption: '',
      thumbnailUrl: 'https://picsum.photos/seed/new/600/400',
      likes: 0,
      comments: 0,
      views: 0
    });
  };

  // ... (Other handlers unchanged)
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
  const handleAddFeature = () => {
    const newFeature: FeatureItem = { id: Date.now().toString(), title: 'Nova Seção', description: 'Descrição', icon: 'Star' };
    setLocalLanding({ ...localLanding, features: [...(localLanding.features || []), newFeature] });
  };
  const handleRemoveFeature = (id: string) => {
    setLocalLanding({ ...localLanding, features: localLanding.features.filter(f => f.id !== id) });
  };
  const handleUpdateFeature = (id: string, field: keyof FeatureItem, value: string) => {
    setLocalLanding({ ...localLanding, features: localLanding.features.map(f => f.id === id ? { ...f, [field]: value } : f) });
  };

  const isTikTokConnected = !!tiktokAuth.accessToken;
  const isMetaConnected = !!metaAuth.accessToken;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
           <span className="font-bold text-lg text-indigo-400">Portal Admin</span>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          {['content', 'integrations', 'chatbot', 'files', 'pages', 'profile'].map((view) => (
             <button 
                key={view}
                onClick={() => setActiveView(view as AdminView)}
                className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors capitalize ${activeView === view ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                {view === 'content' && <LayoutDashboard size={18} />}
                {view === 'integrations' && <Link2 size={18} />}
                {view === 'chatbot' && <Bot size={18} />}
                {view === 'files' && <FileText size={18} />}
                {view === 'pages' && <Video size={18} />}
                {view === 'profile' && <Users size={18} />}
                <span>{view === 'content' ? 'Conteúdo' : view === 'pages' ? 'Páginas (CMS)' : view === 'profile' ? 'Seu Perfil' : view === 'chatbot' ? 'Chatbot (IA)' : view === 'files' ? 'Arquivos & DNS' : 'Integrações'}</span>
             </button>
          ))}
           <div className="pt-4 mt-4 border-t border-slate-800">
             <button 
              onClick={onViewPortal}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 px-4 py-2 flex items-center space-x-3 w-full rounded-lg transition-colors"
            >
               <Eye size={18} />
               <span>Ver Portal Público</span>
            </button>
           </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-slate-400 hover:text-red-400 transition-colors w-full px-4 py-2"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        
        {/* HEADER VIEWS */}
        {activeView === 'content' && (
          <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Gerenciar Postagens</h1>
              <div className="flex space-x-3">
                <button 
                  onClick={handleClearAll}
                  className="bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium border border-red-900/50"
                  title="Apagar todos os posts"
                >
                  <Trash2 size={16} />
                  <span>Limpar Tudo</span>
                </button>
                <div className="w-px h-8 bg-slate-800 mx-2"></div>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium border border-slate-700"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Conectando APIs...' : 'Sincronizar Tudo'}</span>
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  <span>Manual</span>
                </button>
              </div>
            </header>

            <div className="flex-grow overflow-y-auto p-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-800">
                      <th className="px-6 py-4 font-medium">Conteúdo</th>
                      <th className="px-6 py-4 font-medium">Origem</th>
                      <th className="px-6 py-4 font-medium">Estatísticas</th>
                      <th className="px-6 py-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {posts.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                           <CloudLightning className="mx-auto mb-2 opacity-50" size={32} />
                           <p>Nenhuma postagem no Banco de Dados.</p>
                           <p className="text-sm">Clique em "Sincronizar Tudo" para buscar dados reais.</p>
                         </td>
                       </tr>
                    ) : (
                      posts.map((post) => (
                        <tr key={post.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-4">
                              <img 
                                src={post.thumbnailUrl || 'https://via.placeholder.com/150'} 
                                alt="" 
                                className="w-16 h-12 object-cover rounded bg-slate-800"
                              />
                              <div className="max-w-xs">
                                <div className="font-medium truncate text-white">{post.title || post.caption || 'Sem título'}</div>
                                <div className="text-xs text-slate-500">
                                  {new Date(post.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-700 bg-slate-800">
                              {post.platform === Platform.YOUTUBE && <Youtube size={12} className="text-red-500" />}
                              {post.platform === Platform.TIKTOK && <TikTokIcon className="w-3 h-3 text-white" />}
                              {post.platform === Platform.INSTAGRAM && <Instagram size={12} className="text-fuchsia-500" />}
                              {post.platform === Platform.FACEBOOK && <Facebook size={12} className="text-blue-500" />}
                              <span>{post.platform}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            <div className="flex flex-col space-y-1">
                              <span>❤️ {post.likes.toLocaleString('pt-BR')}</span>
                              <span>💬 {post.comments.toLocaleString('pt-BR')}</span>
                              {post.views > 0 && <span>👁️ {post.views.toLocaleString('pt-BR')}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDelete(post.id)}
                              className="text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {/* Integrations View */}
        {activeView === 'integrations' && (
          <>
             <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Conexões de Plataforma</h1>
            </header>
            <div className="p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 mb-8 flex items-start space-x-4">
                  <div className="bg-indigo-500/20 p-2 rounded-lg">
                    <CloudLightning className="text-indigo-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-indigo-100 font-bold text-lg mb-1">Sincronização Automática</h3>
                    <p className="text-indigo-200/70 text-sm">
                      Ao conectar suas contas abaixo, o CreatorNexus importará automaticamente seus novos vídeos e postagens.
                    </p>
                  </div>
                </div>

                {isConnecting && (
                  <div className="bg-teal-500/10 border border-teal-500/30 text-teal-300 p-4 rounded-xl mb-6 flex items-center justify-center gap-2 animate-pulse">
                     <RefreshCw className="animate-spin" />
                     <span>Aguardando autenticação na janela Pop-up...</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* YouTube */}
                  <div className={`p-6 rounded-xl border transition-all bg-slate-900 border-emerald-500/30`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white">
                          <Youtube size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold">YouTube</h4>
                          <p className="text-xs text-slate-500">Integração API v3</p>
                        </div>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} /> Ativo
                      </span>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                       <label className="text-xs text-slate-400">Chave de API do YouTube</label>
                       <div className="flex gap-2">
                         <input 
                           type="password" 
                           value={localYoutubeKey}
                           onChange={(e) => setLocalYoutubeKey(e.target.value)}
                           placeholder="Cole sua API Key aqui"
                           className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                         />
                         <button
                           onClick={handleSaveYoutubeClick}
                           className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded border border-slate-700"
                           title="Salvar Chave"
                         >
                           <Save size={16} />
                         </button>
                       </div>
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className={`p-6 rounded-xl border transition-all ${isTikTokConnected ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center text-black">
                          <TikTokIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold">TikTok</h4>
                          <p className="text-xs text-slate-500">OAuth 2.0</p>
                        </div>
                      </div>
                      {isTikTokConnected ? (
                         <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                           <CheckCircle size={12} /> Conectado
                         </span>
                      ) : (
                        <span className="bg-slate-700 text-slate-400 text-xs px-2 py-1 rounded-full">
                           Não Conectado
                         </span>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-3">
                       <div>
                         <label className="text-xs text-slate-400">Client Key</label>
                         <input 
                           type="text" 
                           value={tiktokAuth.clientKey || DEFAULT_CLIENT_KEY}
                           onChange={(e) => setTiktokAuth({ ...tiktokAuth, clientKey: e.target.value })}
                           className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2"
                         />
                       </div>
                       <div>
                          <label className="text-xs text-slate-400 flex items-center gap-1">Client Secret <Lock size={10} /></label>
                          <input 
                            type="password" 
                            value={tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET}
                            onChange={(e) => setTiktokAuth({ ...tiktokAuth, clientSecret: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                          />
                       </div>
                       
                       <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-500">
                          Redirect URI: {getRedirectUri()}
                       </div>

                       <button 
                        onClick={() => isTikTokConnected ? handleDisconnect(Platform.TIKTOK) : handleConnectTikTok()}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border mt-2 ${isTikTokConnected ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-teal-500 hover:bg-teal-400 text-slate-900 border-teal-500'}`}
                      >
                        {isTikTokConnected ? 'Desconectar TikTok' : 'Autorizar e Conectar (Pop-up)'}
                      </button>
                    </div>
                  </div>

                  {/* META (FACEBOOK / INSTAGRAM) */}
                  <div className={`col-span-1 md:col-span-2 p-6 rounded-xl border transition-all ${isMetaConnected ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                           <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full flex items-center justify-center text-white ring-2 ring-slate-900 z-10">
                              <Instagram size={20} />
                           </div>
                           <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white ring-2 ring-slate-900">
                              <Facebook size={20} />
                           </div>
                        </div>
                        <div>
                          <h4 className="font-bold">Meta (Instagram & Facebook)</h4>
                          <p className="text-xs text-slate-500">Graph API v19.0</p>
                        </div>
                      </div>
                      {isMetaConnected ? (
                         <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                           <CheckCircle size={12} /> Conectado
                         </span>
                      ) : (
                        <span className="bg-slate-700 text-slate-400 text-xs px-2 py-1 rounded-full">
                           Não Conectado
                         </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                       <div>
                          <label className="block text-xs text-slate-400 mb-1">Facebook App ID</label>
                          <input 
                            type="text" 
                            value={metaAuth.appId || ''}
                            onChange={(e) => setMetaAuth({ ...metaAuth, appId: e.target.value })}
                            placeholder="Ex: 1234567890"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                             Use o App ID do painel <a href="https://developers.facebook.com/apps" target="_blank" className="underline hover:text-blue-400">Meta Developers</a>.
                          </p>
                       </div>
                       
                       <div>
                          <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-2 space-y-2">
                             <div>
                               <p className="text-[10px] text-slate-500 font-bold">1. Adicione este Domínio em 'App Domains':</p>
                               <div className="text-[10px] text-indigo-300 font-mono select-all cursor-text bg-slate-900 p-1 rounded">
                                  {window.location.hostname}
                               </div>
                             </div>
                             <div>
                               <p className="text-[10px] text-slate-500 font-bold">2. Adicione esta URL em 'Valid OAuth Redirect URIs':</p>
                               <div className="text-[10px] text-indigo-300 font-mono select-all cursor-text bg-slate-900 p-1 rounded break-all">
                                  {getMetaRedirectUri()}
                               </div>
                             </div>
                          </div>
                          <button 
                            onClick={() => isMetaConnected ? handleDisconnect(Platform.FACEBOOK) : handleConnectMeta()}
                            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${isMetaConnected ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600'}`}
                          >
                            {isMetaConnected ? 'Desconectar Meta' : 'Conectar com Facebook (Pop-up)'}
                          </button>
                       </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </>
        )}
        
        {/* CHATBOT VIEW */}
        {activeView === 'chatbot' && (
           <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                 <Bot size={20} className="text-indigo-400" />
                 <span>Configurar Chatbot IA (Notebook)</span>
              </h1>
            </header>
            <div className="flex-grow overflow-y-auto p-8">
               <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
                 <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-2">Base de Conhecimento (Contexto)</h3>
                    <textarea 
                       rows={12}
                       className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white text-sm font-mono"
                       value={localLanding.chatbotConfig?.knowledgeBase || ''}
                       onChange={(e) => setLocalLanding({
                          ...localLanding,
                          chatbotConfig: { 
                             ...(localLanding.chatbotConfig || { enabled: true, welcomeMessage: '', knowledgeBase: '' }),
                             knowledgeBase: e.target.value 
                          }
                       })}
                    />
                 </div>
                 <div className="pt-6 border-t border-slate-800 flex justify-end">
                      <button onClick={handleSaveChatbotClick} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center gap-2">
                        <Save size={18} /> <span>Salvar Chatbot</span>
                      </button>
                 </div>
               </div>
            </div>
           </>
        )}

        {/* FILE MANAGER VIEW */}
        {activeView === 'files' && (
          <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Arquivos de Verificação e DNS</h1>
            </header>
            <div className="flex-grow overflow-y-auto p-6">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
                     <h3 className="font-bold text-white mb-4 flex items-center gap-2"><UploadCloud size={20} /> Adicionar Arquivo</h3>
                     <form onSubmit={handleSaveFile} className="space-y-4">
                        <input type="text" value={newFile.path} onChange={(e) => setNewFile({...newFile, path: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="ex: ads.txt" required />
                        <textarea rows={8} value={newFile.content} onChange={(e) => setNewFile({...newFile, content: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs" required />
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center space-x-2"><Plus size={18} /> <span>Salvar</span></button>
                     </form>
                  </div>
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-fit">
                    <div className="p-4 border-b border-slate-800 bg-slate-800/30"><h3 className="font-bold text-white">Arquivos Hospedados</h3></div>
                    <div className="divide-y divide-slate-800">
                         {virtualFiles.map((file, idx) => (
                           <div key={idx} className="p-4 flex items-start justify-between hover:bg-slate-800/30 transition-colors">
                              <div className="overflow-hidden mr-4">
                                 <div className="flex items-center gap-2 mb-1"><FileText size={16} /><span className="font-mono font-bold text-white truncate">/{file.path}</span></div>
                              </div>
                              <button onClick={() => handleDeleteFile(file.path)} className="text-slate-500 hover:text-red-400 p-2"><Trash2 size={18} /></button>
                           </div>
                         ))}
                    </div>
                  </div>
               </div>
            </div>
          </>
        )}

        {/* PROFILE VIEW */}
        {activeView === 'profile' && (
          <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Editar Perfil do Portal</h1>
            </header>
            <div className="flex-grow overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
                 <div className="space-y-6">
                    <input type="text" value={localProfile.name} onChange={(e) => setLocalProfile({...localProfile, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
                    <button onClick={handleSaveProfileClick} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center gap-2"><Save size={18} /> <span>Salvar Perfil</span></button>
                 </div>
              </div>
            </div>
          </>
        )}

        {/* CMS View (Pages) */}
        {activeView === 'pages' && (
           <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Editar Página Institucional (CMS)</h1>
            </header>
            <div className="flex-grow overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
                 <div className="space-y-6">
                    <input type="text" value={localLanding.headline} onChange={(e) => setLocalLanding({...localLanding, headline: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
                    
                    <div className="pt-6 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Seções de Recursos</h3>
                        <button onClick={handleAddFeature} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded flex items-center gap-1"><Plus size={14} /> Adicionar</button>
                      </div>
                      <div className="space-y-4">
                        {localLanding.features && localLanding.features.map((feature) => (
                          <div key={feature.id} className="bg-slate-950 border border-slate-700 rounded-lg p-4 relative group">
                             <div className="flex justify-between items-start mb-3">
                               <input type="text" value={feature.title} onChange={(e) => handleUpdateFeature(feature.id, 'title', e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                               <button onClick={() => handleRemoveFeature(feature.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                             </div>
                             <textarea value={feature.description} onChange={(e) => handleUpdateFeature(feature.id, 'description', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex justify-end">
                      <button onClick={handleSaveLandingClick} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center gap-2"><Save size={18} /> <span>Salvar Página CMS</span></button>
                    </div>
                 </div>
              </div>
            </div>
           </>
        )}

      </main>

      {/* Add Post Modal (Manual Override) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg">Adicionar Novo Post (Manual)</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPost} className="p-6 space-y-4">
               {/* Simplified manual form for brevity */}
               <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg">Salvar Manualmente</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
