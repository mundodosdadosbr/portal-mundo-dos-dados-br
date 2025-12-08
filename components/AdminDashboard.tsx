
import React, { useState, useEffect } from 'react';
import { 
  Platform, 
  SocialPost,
  LandingPageContent,
  CreatorProfile,
  FeatureItem
} from '../types';
import { getYouTubePosts, getYouTubeChannelStatistics } from '../services/youtubeService';
import { getTikTokPosts, getTikTokAuthUrl, DEFAULT_CLIENT_KEY, DEFAULT_CLIENT_SECRET, getRedirectUri } from '../services/tiktokService';
import { TikTokAuthData, getVirtualFilesCloud, saveVirtualFile, deleteVirtualFile, VirtualFile } from '../services/firebase';
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
  AvailableIcons
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
}

type AdminView = 'content' | 'integrations' | 'pages' | 'profile' | 'files';

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
  setTiktokAuth
}) => {
  const [activeView, setActiveView] = useState<AdminView>('content');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Local State for Forms (Drafts)
  const [localProfile, setLocalProfile] = useState<CreatorProfile>(profile);
  const [localLanding, setLocalLanding] = useState<LandingPageContent>(landingContent);
  const [localYoutubeKey, setLocalYoutubeKey] = useState<string>(youtubeApiKey);
  
  // Sync props to local state when they change externally (e.g. initial load)
  useEffect(() => { setLocalProfile(profile); }, [profile]);
  useEffect(() => { setLocalLanding(landingContent); }, [landingContent]);
  useEffect(() => { setLocalYoutubeKey(youtubeApiKey); }, [youtubeApiKey]);

  // File System State
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [newFile, setNewFile] = useState({ path: '', content: '' });
  
  // OAuth Simulation State
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthPlatform, setOauthPlatform] = useState<Platform | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({
    [Platform.YOUTUBE]: true,
    [Platform.INSTAGRAM]: false,
    [Platform.TIKTOK]: false, // Dynamic check based on token
    [Platform.FACEBOOK]: false,
  });

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
      // 1. Fetch Posts
      const realYoutubePosts = await getYouTubePosts('@MundodosDadosBR', 10, youtubeApiKey);
      
      // 2. Fetch Channel Statistics (Subscribers)
      const channelStats = await getYouTubeChannelStatistics('@MundodosDadosBR', youtubeApiKey);
      if (channelStats && channelStats.subscriberCount) {
        // Update profile in DB with new subscriber count
        setProfile({
          ...profile,
          subscribers: channelStats.subscriberCount
        });
      }

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

      const combinedPosts = [...realYoutubePosts, ...tiktokPosts];
      
      if (dbActions) {
        dbActions.syncPosts(combinedPosts);
        alert(`Sincronização concluída!\n\nYouTube: ${realYoutubePosts.length}\nTikTok: ${tiktokPosts.length}\nSeguidores atualizados.`);
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

     window.location.href = getTikTokAuthUrl(key);
  };

  const handleConnectPlatform = (platform: Platform) => {
    setOauthPlatform(platform);
    setOauthModalOpen(true);
    setOauthLoading(false);
  };

  const confirmOauth = () => {
    if (!oauthPlatform) return;
    setOauthLoading(true);
    
    setTimeout(() => {
      setConnectedPlatforms(prev => ({ ...prev, [oauthPlatform]: true }));
      setOauthLoading(false);
      setOauthModalOpen(false);
      setOauthPlatform(null);
    }, 2000);
  };

  const handleDisconnect = (platform: Platform) => {
    if (confirm(`Desconectar conta do ${platform}?`)) {
      setConnectedPlatforms(prev => ({ ...prev, [platform]: false }));
      if (platform === Platform.TIKTOK) {
        setTiktokAuth({ accessToken: '', refreshToken: '', expiresAt: 0 });
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
  
  // --- DYNAMIC FEATURES HANDLERS ---
  const handleAddFeature = () => {
    const newFeature: FeatureItem = {
      id: Date.now().toString(),
      title: 'Nova Seção',
      description: 'Descrição do recurso',
      icon: 'Star'
    };
    setLocalLanding({
      ...localLanding,
      features: [...(localLanding.features || []), newFeature]
    });
  };

  const handleRemoveFeature = (id: string) => {
    setLocalLanding({
      ...localLanding,
      features: localLanding.features.filter(f => f.id !== id)
    });
  };

  const handleUpdateFeature = (id: string, field: keyof FeatureItem, value: string) => {
    setLocalLanding({
      ...localLanding,
      features: localLanding.features.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const isTikTokConnected = !!tiktokAuth.accessToken;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
           <span className="font-bold text-lg text-indigo-400">Portal Admin</span>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          <button 
            onClick={() => setActiveView('content')}
            className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors ${activeView === 'content' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
             <LayoutDashboard size={18} />
             <span>Conteúdo</span>
          </button>
          
          <button 
            onClick={() => setActiveView('integrations')}
            className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors ${activeView === 'integrations' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
             <Link2 size={18} />
             <span>Integrações</span>
          </button>

          <button 
            onClick={() => setActiveView('files')}
            className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors ${activeView === 'files' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
             <FileText size={18} />
             <span>Arquivos & DNS</span>
          </button>

          <button 
            onClick={() => setActiveView('pages')}
            className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors ${activeView === 'pages' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
             <Video size={18} />
             <span>Páginas (CMS)</span>
          </button>

          <button 
            onClick={() => setActiveView('profile')}
            className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors ${activeView === 'profile' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
             <Users size={18} />
             <span>Seu Perfil</span>
          </button>

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
                                src={post.thumbnailUrl} 
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
                              {post.views && <span>👁️ {post.views.toLocaleString('pt-BR')}</span>}
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
        
        {/* FILE MANAGER VIEW */}
        {activeView === 'files' && (
          <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Arquivos de Verificação e DNS</h1>
              <p className="text-xs text-slate-400">
                Use esta área para hospedar arquivos como ads.txt, robots.txt ou verificações do Google.
              </p>
            </header>
            <div className="flex-grow overflow-y-auto p-6">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Create New File */}
                  <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
                     <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                       <UploadCloud size={20} className="text-indigo-400" />
                       Adicionar Arquivo
                     </h3>
                     <form onSubmit={handleSaveFile} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Arquivo (Caminho)</label>
                          <input 
                            type="text" 
                            value={newFile.path}
                            onChange={(e) => setNewFile({...newFile, path: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="ex: ads.txt ou google123.html"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Conteúdo (Texto Puro)</label>
                          <textarea 
                            rows={8}
                            value={newFile.content}
                            onChange={(e) => setNewFile({...newFile, content: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-xs"
                            placeholder="Cole o conteúdo do arquivo aqui..."
                            required
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center space-x-2"
                        >
                          <Plus size={18} />
                          <span>Salvar Arquivo Virtual</span>
                        </button>
                     </form>
                  </div>

                  {/* List Files */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-fit">
                    <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                       <h3 className="font-bold text-white">Arquivos Hospedados</h3>
                    </div>
                    {virtualFiles.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                         <FileText size={32} className="mx-auto mb-2 opacity-50" />
                         <p>Nenhum arquivo virtual criado.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                         {virtualFiles.map((file, idx) => (
                           <div key={idx} className="p-4 flex items-start justify-between hover:bg-slate-800/30 transition-colors">
                              <div className="overflow-hidden mr-4">
                                 <div className="flex items-center gap-2 mb-1">
                                    <FileText size={16} className="text-indigo-400 shrink-0" />
                                    <span className="font-mono font-bold text-white truncate">/{file.path}</span>
                                 </div>
                                 <p className="text-xs text-slate-500 truncate font-mono bg-slate-950 p-1 rounded">
                                   {file.content.substring(0, 60)}...
                                 </p>
                                 <a 
                                   href={`/${file.path}`} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-xs text-emerald-400 hover:underline mt-2 inline-block"
                                 >
                                   Abrir Link: {window.location.origin}/{file.path}
                                 </a>
                              </div>
                              <button 
                                onClick={() => handleDeleteFile(file.path)}
                                className="text-slate-500 hover:text-red-400 p-2"
                              >
                                <Trash2 size={18} />
                              </button>
                           </div>
                         ))}
                      </div>
                    )}
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
                 <div className="flex items-center space-x-4 mb-8">
                   <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500 relative bg-slate-800">
                      <img src={localProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-white">{localProfile.name}</h2>
                     <p className="text-indigo-400">{localProfile.handle}</p>
                   </div>
                 </div>

                 <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Nome de Exibição</label>
                      <input 
                        type="text" 
                        value={localProfile.name}
                        onChange={(e) => setLocalProfile({...localProfile, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Handle (@usuario)</label>
                      <input 
                        type="text" 
                        value={localProfile.handle}
                        onChange={(e) => setLocalProfile({...localProfile, handle: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">URL do Avatar (Foto)</label>
                        <input 
                          type="text" 
                          value={localProfile.avatarUrl}
                          onChange={(e) => setLocalProfile({...localProfile, avatarUrl: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>
                      
                      <div>
                         <label className="block text-sm font-medium text-slate-400 mb-2">Ícone da Aba (Favicon)</label>
                         <div className="flex space-x-3">
                           <input 
                              type="text" 
                              value={localProfile.faviconUrl || ''}
                              onChange={(e) => setLocalProfile({...localProfile, faviconUrl: e.target.value})}
                              className="flex-grow bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              placeholder="https://..."
                            />
                            <div className="w-12 h-12 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                                {localProfile.faviconUrl ? <img src={localProfile.faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" /> : <span className="text-xs text-slate-600">?</span>}
                            </div>
                         </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Biografia</label>
                      <textarea 
                        rows={6}
                        value={localProfile.bio}
                        onChange={(e) => setLocalProfile({...localProfile, bio: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                      <button 
                        onClick={handleSaveProfileClick}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center gap-2"
                      >
                        <Save size={18} />
                        <span>Salvar Perfil</span>
                      </button>
                    </div>
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
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Título Principal (Headline)</label>
                      <input 
                        type="text" 
                        value={localLanding.headline}
                        onChange={(e) => setLocalLanding({...localLanding, headline: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Logo do Site (URL)</label>
                      <div className="flex space-x-3">
                         <input 
                            type="text" 
                            value={localLanding.logoUrl || ''}
                            onChange={(e) => setLocalLanding({...localLanding, logoUrl: e.target.value})}
                            className="flex-grow bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="https://... (Deixe em branco para usar ícone padrão)"
                         />
                          <div className="w-12 h-12 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                                {localLanding.logoUrl ? <img src={localLanding.logoUrl} alt="Logo" className="w-8 h-8 object-contain" /> : <LayoutDashboard className="text-slate-600" />}
                           </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Subtítulo</label>
                      <textarea 
                        rows={3}
                        value={localLanding.subheadline}
                        onChange={(e) => setLocalLanding({...localLanding, subheadline: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                     <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Texto do Botão CTA</label>
                      <input 
                        type="text" 
                        value={localLanding.ctaButtonText}
                        onChange={(e) => setLocalLanding({...localLanding, ctaButtonText: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-6 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Seções de Recursos (Dinâmico)</h3>
                        <button 
                          onClick={handleAddFeature}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                        >
                          <Plus size={14} /> Adicionar Recurso
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {localLanding.features && localLanding.features.map((feature) => (
                          <div key={feature.id} className="bg-slate-950 border border-slate-700 rounded-lg p-4 relative group">
                             <div className="flex justify-between items-start mb-3">
                               <div className="flex items-center gap-2">
                                 <span className="text-xs text-slate-500 font-mono">ID: {feature.id}</span>
                               </div>
                               <button 
                                 onClick={() => handleRemoveFeature(feature.id)}
                                 className="text-slate-600 hover:text-red-400 transition-colors"
                                 title="Remover"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                               <div className="md:col-span-8 space-y-3">
                                  <input 
                                    type="text" 
                                    value={feature.title}
                                    onChange={(e) => handleUpdateFeature(feature.id, 'title', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
                                    placeholder="Título do Recurso"
                                  />
                                  <textarea 
                                    rows={2}
                                    value={feature.description}
                                    onChange={(e) => handleUpdateFeature(feature.id, 'description', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
                                    placeholder="Descrição detalhada"
                                  />
                               </div>
                               <div className="md:col-span-4">
                                  <label className="block text-xs text-slate-500 mb-1">Ícone</label>
                                  <select 
                                    value={feature.icon}
                                    onChange={(e) => handleUpdateFeature(feature.id, 'icon', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none"
                                  >
                                    {Object.keys(AvailableIcons).map(iconName => (
                                      <option key={iconName} value={iconName}>{iconName}</option>
                                    ))}
                                  </select>
                                  <div className="mt-2 flex justify-center p-2 bg-slate-900 rounded border border-slate-700">
                                     {React.createElement(AvailableIcons[feature.icon] || AvailableIcons['TrendingUp'], { size: 24, className: 'text-indigo-400' })}
                                  </div>
                               </div>
                             </div>
                          </div>
                        ))}
                        
                        {(!localLanding.features || localLanding.features.length === 0) && (
                          <p className="text-center text-slate-500 text-sm py-4">Nenhum recurso adicionado.</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex justify-end">
                      <button 
                        onClick={handleSaveLandingClick}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center gap-2"
                      >
                        <Save size={18} />
                        <span>Salvar Página CMS</span>
                      </button>
                    </div>
                 </div>
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
                       <p className="text-[10px] text-slate-500">
                         Necessário para sincronização em tempo real do YouTube.
                       </p>
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
                          <p className="text-xs text-slate-500">OAuth 2.0 (Video List)</p>
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
                           placeholder="Client Key"
                           className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none mb-2"
                         />
                       </div>
                       <div>
                          <label className="text-xs text-slate-400 flex items-center gap-1">Client Secret <Lock size={10} /></label>
                          <input 
                            type="password" 
                            value={tiktokAuth.clientSecret || DEFAULT_CLIENT_SECRET}
                            onChange={(e) => setTiktokAuth({ ...tiktokAuth, clientSecret: e.target.value })}
                            placeholder="Client Secret"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
                          />
                       </div>

                       {/* HELPER FOR REDIRECT URI */}
                       <div className="bg-slate-950 p-3 rounded border border-slate-800">
                          <p className="text-[10px] text-slate-500 mb-1 font-bold">⚠️ Configuração Obrigatória (TikTok Portal):</p>
                          <p className="text-[10px] text-slate-400">
                             Copie esta URL exata para o campo <strong>Redirect domains</strong> e <strong>Callback URL</strong> no seu App TikTok:
                          </p>
                          <div className="mt-1 bg-slate-900 p-1.5 rounded text-indigo-400 text-xs font-mono break-all select-all cursor-text border border-slate-800/50">
                             {getRedirectUri()}
                          </div>
                       </div>
                       
                       <button 
                        onClick={() => isTikTokConnected ? handleDisconnect(Platform.TIKTOK) : handleConnectTikTok()}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border mt-2 ${isTikTokConnected ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-teal-500 hover:bg-teal-400 text-slate-900 border-teal-500'}`}
                      >
                        {isTikTokConnected ? 'Desconectar TikTok' : 'Autorizar e Conectar'}
                      </button>
                    </div>
                  </div>

                  {/* Other Platforms (Simulated) */}
                  {[
                    { id: Platform.INSTAGRAM, icon: Instagram, color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500', name: 'Instagram' },
                    { id: Platform.FACEBOOK, icon: Facebook, color: 'bg-blue-600', name: 'Facebook' }
                  ].map((p) => (
                    <div key={p.id} className={`p-6 rounded-xl border transition-all ${connectedPlatforms[p.id] ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${p.color} rounded-full flex items-center justify-center text-white`}>
                            <p.icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold">{p.name}</h4>
                            <p className="text-xs text-slate-500">OAuth 2.0</p>
                          </div>
                        </div>
                        {connectedPlatforms[p.id] && (
                           <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle size={12} /> Conectado
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => connectedPlatforms[p.id] ? handleDisconnect(p.id as Platform) : handleConnectPlatform(p.id as Platform)}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${connectedPlatforms[p.id] ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-white text-slate-900 hover:bg-slate-200 border-white'}`}
                      >
                        {connectedPlatforms[p.id] ? 'Desconectar' : 'Conectar Conta'}
                      </button>
                    </div>
                  ))}
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
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddPost} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Plataforma</label>
                <div className="grid grid-cols-4 gap-2">
                  {[Platform.YOUTUBE, Platform.INSTAGRAM, Platform.TIKTOK, Platform.FACEBOOK].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPost({...newPost, platform: p})}
                      className={`
                        p-2 rounded-lg border text-center text-xs font-medium transition-all
                        ${newPost.platform === p 
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }
                      `}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {newPost.platform === Platform.YOUTUBE ? 'Título do Vídeo' : 'Legenda'}
                </label>
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={newPost.title || newPost.caption || ''}
                  onChange={(e) => {
                     if (newPost.platform === Platform.YOUTUBE) {
                        setNewPost({...newPost, title: e.target.value});
                     } else {
                        setNewPost({...newPost, caption: e.target.value});
                     }
                  }}
                  placeholder="Digite o conteúdo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Curtidas (Demo)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                      value={newPost.likes}
                      onChange={(e) => setNewPost({...newPost, likes: parseInt(e.target.value) || 0})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Comentários (Demo)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                      value={newPost.comments}
                      onChange={(e) => setNewPost({...newPost, comments: parseInt(e.target.value) || 0})}
                    />
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center space-x-2 mt-2"
              >
                <CheckCircle size={18} />
                <span>Salvar Manualmente</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OAuth Simulation Modal */}
      {oauthModalOpen && oauthPlatform && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-white text-slate-900 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden transform scale-100 transition-all">
              <div className="p-6 flex flex-col items-center text-center">
                 <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    {oauthPlatform === Platform.YOUTUBE && <Youtube size={32} className="text-red-600" />}
                    {oauthPlatform === Platform.INSTAGRAM && <Instagram size={32} className="text-fuchsia-600" />}
                    {oauthPlatform === Platform.TIKTOK && <TikTokIcon className="w-8 h-8 text-black" />}
                    {oauthPlatform === Platform.FACEBOOK && <Facebook size={32} className="text-blue-600" />}
                 </div>
                 
                 <h3 className="text-xl font-bold mb-1">Conectar {oauthPlatform}</h3>
                 <p className="text-slate-500 text-sm mb-6">
                   O CreatorNexus está solicitando permissão para acessar sua conta.
                 </p>

                 {oauthLoading ? (
                   <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <span>Autenticando...</span>
                   </div>
                 ) : (
                   <div className="w-full space-y-3">
                      <button 
                        onClick={confirmOauth}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
                      >
                        Autorizar
                      </button>
                      <button 
                        onClick={() => setOauthModalOpen(false)}
                        className="w-full bg-transparent hover:bg-slate-100 text-slate-600 font-medium py-3 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
