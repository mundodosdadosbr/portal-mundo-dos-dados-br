import React, { useState } from 'react';
import { 
  Platform, 
  SocialPost,
  LandingPageContent
} from '../types';
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
  Video
} from './Icons';

interface AdminDashboardProps {
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  onLogout: () => void;
  onViewPortal: () => void;
  landingContent: LandingPageContent;
  setLandingContent: React.Dispatch<React.SetStateAction<LandingPageContent>>;
}

type AdminView = 'content' | 'integrations' | 'pages' | 'analytics';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  posts, 
  setPosts, 
  onLogout, 
  onViewPortal,
  landingContent,
  setLandingContent
}) => {
  const [activeView, setActiveView] = useState<AdminView>('content');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // OAuth Simulation State
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthPlatform, setOauthPlatform] = useState<Platform | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({
    [Platform.YOUTUBE]: true,
    [Platform.INSTAGRAM]: false,
    [Platform.TIKTOK]: true,
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

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta postagem?')) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    // Simulate fetching ~20 items from various APIs
    setTimeout(() => {
      const platforms = [Platform.YOUTUBE, Platform.INSTAGRAM, Platform.TIKTOK, Platform.FACEBOOK];
      const titles = [
        "Vlog: Um dia na vida de Dev", "Tutorial React Avançado", "Como configurar o VS Code", "Setup Tour 2024",
        "React vs Vue", "Dicas de Carreira", "Review Teclado Mecânico", "Live Coding", "Q&A com Seguidores",
        "Aprendendo Docker", "Deploy na AWS", "Figma para Devs", "CSS Grid Tutorial", "Javascript Tips",
        "Home Office Upgrade", "Cafezinho e Código", "Podcast DevTalks", "Review Monitor 4k", "Mouse Gamer Review", "Tech News"
      ];
      
      const newPosts: SocialPost[] = Array.from({ length: 20 }).map((_, i) => {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const isVideo = platform === Platform.YOUTUBE || platform === Platform.TIKTOK;
        
        return {
          id: `sync-${Date.now()}-${i}`,
          platform,
          thumbnailUrl: `https://picsum.photos/seed/${Math.random()}/${isVideo ? '600/400' : '400/500'}`,
          title: isVideo ? titles[i] : undefined,
          caption: !isVideo ? `${titles[i]} - Confira o post completo! 🚀 #tech #dev` : undefined,
          likes: Math.floor(Math.random() * 50000),
          comments: Math.floor(Math.random() * 1000),
          views: Math.floor(Math.random() * 200000),
          date: `há ${Math.floor(Math.random() * 23) + 1} horas`,
          url: '#'
        };
      });
      
      setPosts(prev => [...newPosts, ...prev]);
      setIsSyncing(false);
      alert(`Sincronização concluída! 20 novos itens importados das redes conectadas.`);
    }, 2500);
  };

  const handleConnectPlatform = (platform: Platform) => {
    setOauthPlatform(platform);
    setOauthModalOpen(true);
    setOauthLoading(false);
  };

  const confirmOauth = () => {
    if (!oauthPlatform) return;
    setOauthLoading(true);
    
    // Simulate OAuth redirect and token exchange
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
    }
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `new-${Date.now()}`;
    const postToAdd = {
      ...newPost,
      id,
      date: 'Agora mesmo',
      url: '#'
    } as SocialPost;
    
    setPosts([postToAdd, ...posts]);
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
            onClick={() => setActiveView('pages')}
            className={`w-full px-4 py-2 flex items-center space-x-3 rounded-lg transition-colors ${activeView === 'pages' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
             <Video size={18} />
             <span>Páginas (CMS)</span>
          </button>

          <button 
            disabled
            className="w-full text-slate-400 hover:text-white px-4 py-2 flex items-center space-x-3 cursor-not-allowed opacity-50"
          >
             <BarChart3 size={18} />
             <span>Análises (Em breve)</span>
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
        
        {/* Header Content View */}
        {activeView === 'content' && (
          <>
            <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold">Gerenciar Postagens</h1>
              <div className="flex space-x-3">
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium border border-slate-700"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Buscando últimos 20 vídeos...' : 'Sincronizar Tudo'}</span>
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
                    {posts.map((post) => (
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
                               <div className="text-xs text-slate-500">{post.date}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border
                            ${post.platform === Platform.YOUTUBE ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                            ${post.platform === Platform.INSTAGRAM ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : ''}
                            ${post.platform === Platform.TIKTOK ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : ''}
                            ${post.platform === Platform.FACEBOOK ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                          `}>
                            {post.platform === Platform.YOUTUBE && <Youtube size={12} />}
                            {post.platform === Platform.INSTAGRAM && <Instagram size={12} />}
                            {post.platform === Platform.TIKTOK && <TikTokIcon className="w-3 h-3" />}
                            {post.platform === Platform.FACEBOOK && <Facebook size={12} />}
                            <span>{post.platform === Platform.TIKTOK ? 'TikTok' : post.platform}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          <div className="flex flex-col space-y-1">
                            <span>❤️ {post.likes.toLocaleString('pt-BR')}</span>
                            <span>💬 {post.comments.toLocaleString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => handleDelete(post.id)}
                             className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                             title="Excluir Post"
                           >
                             <Trash2 size={18} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                 <div className="flex items-center space-x-2 mb-6 text-indigo-400">
                   <LayoutDashboard size={24} />
                   <h2 className="text-lg font-bold text-white">Configurações da Landing Page</h2>
                 </div>

                 <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Título Principal (Headline)</label>
                      <input 
                        type="text" 
                        value={landingContent.headline}
                        onChange={(e) => setLandingContent({...landingContent, headline: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Subtítulo</label>
                      <textarea 
                        rows={3}
                        value={landingContent.subheadline}
                        onChange={(e) => setLandingContent({...landingContent, subheadline: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                     <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Texto do Botão CTA</label>
                      <input 
                        type="text" 
                        value={landingContent.ctaButtonText}
                        onChange={(e) => setLandingContent({...landingContent, ctaButtonText: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-6 border-t border-slate-800">
                      <h3 className="font-semibold text-white mb-4">Seções de Recursos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <input 
                              type="text" 
                              value={landingContent.feature1Title}
                              onChange={(e) => setLandingContent({...landingContent, feature1Title: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              placeholder="Título Feature 1"
                           />
                           <textarea 
                              rows={3}
                              value={landingContent.feature1Desc}
                              onChange={(e) => setLandingContent({...landingContent, feature1Desc: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              placeholder="Descrição Feature 1"
                           />
                        </div>
                        <div className="space-y-2">
                           <input 
                              type="text" 
                              value={landingContent.feature2Title}
                              onChange={(e) => setLandingContent({...landingContent, feature2Title: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              placeholder="Título Feature 2"
                           />
                           <textarea 
                              rows={3}
                              value={landingContent.feature2Desc}
                              onChange={(e) => setLandingContent({...landingContent, feature2Desc: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              placeholder="Descrição Feature 2"
                           />
                        </div>
                        <div className="space-y-2">
                           <input 
                              type="text" 
                              value={landingContent.feature3Title}
                              onChange={(e) => setLandingContent({...landingContent, feature3Title: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              placeholder="Título Feature 3"
                           />
                           <textarea 
                              rows={3}
                              value={landingContent.feature3Desc}
                              onChange={(e) => setLandingContent({...landingContent, feature3Desc: e.target.value})}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              placeholder="Descrição Feature 3"
                           />
                        </div>
                      </div>
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
                      A autenticação é feita diretamente com o provedor (Google/Meta/TikTok) via OAuth2.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* YouTube */}
                  <div className={`p-6 rounded-xl border transition-all ${connectedPlatforms[Platform.YOUTUBE] ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white">
                          <Youtube size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold">YouTube</h4>
                          <p className="text-xs text-slate-500">Vídeos Longos e Shorts</p>
                        </div>
                      </div>
                      {connectedPlatforms[Platform.YOUTUBE] && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Conectado
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => connectedPlatforms[Platform.YOUTUBE] ? handleDisconnect(Platform.YOUTUBE) : handleConnectPlatform(Platform.YOUTUBE)}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${connectedPlatforms[Platform.YOUTUBE] ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-white text-slate-900 hover:bg-slate-200 border-white'}`}
                    >
                      {connectedPlatforms[Platform.YOUTUBE] ? 'Desconectar' : 'Conectar Conta'}
                    </button>
                  </div>

                  {/* Instagram */}
                  <div className={`p-6 rounded-xl border transition-all ${connectedPlatforms[Platform.INSTAGRAM] ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                          <Instagram size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold">Instagram</h4>
                          <p className="text-xs text-slate-500">Reels e Posts do Feed</p>
                        </div>
                      </div>
                      {connectedPlatforms[Platform.INSTAGRAM] && (
                         <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Conectado
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => connectedPlatforms[Platform.INSTAGRAM] ? handleDisconnect(Platform.INSTAGRAM) : handleConnectPlatform(Platform.INSTAGRAM)}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${connectedPlatforms[Platform.INSTAGRAM] ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-white text-slate-900 hover:bg-slate-200 border-white'}`}
                    >
                      {connectedPlatforms[Platform.INSTAGRAM] ? 'Desconectar' : 'Conectar Conta'}
                    </button>
                  </div>

                  {/* TikTok */}
                  <div className={`p-6 rounded-xl border transition-all ${connectedPlatforms[Platform.TIKTOK] ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center text-slate-900">
                          <TikTokIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold">TikTok</h4>
                          <p className="text-xs text-slate-500">Vídeos virais</p>
                        </div>
                      </div>
                      {connectedPlatforms[Platform.TIKTOK] && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Conectado
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => connectedPlatforms[Platform.TIKTOK] ? handleDisconnect(Platform.TIKTOK) : handleConnectPlatform(Platform.TIKTOK)}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${connectedPlatforms[Platform.TIKTOK] ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-white text-slate-900 hover:bg-slate-200 border-white'}`}
                    >
                       {connectedPlatforms[Platform.TIKTOK] ? 'Desconectar' : 'Conectar Conta'}
                    </button>
                  </div>

                  {/* Facebook */}
                  <div className={`p-6 rounded-xl border transition-all ${connectedPlatforms[Platform.FACEBOOK] ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                          <Facebook size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold">Facebook</h4>
                          <p className="text-xs text-slate-500">Páginas Públicas</p>
                        </div>
                      </div>
                       {connectedPlatforms[Platform.FACEBOOK] && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Conectado
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => connectedPlatforms[Platform.FACEBOOK] ? handleDisconnect(Platform.FACEBOOK) : handleConnectPlatform(Platform.FACEBOOK)}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${connectedPlatforms[Platform.FACEBOOK] ? 'border-red-900/50 text-red-400 hover:bg-red-950/30' : 'bg-white text-slate-900 hover:bg-slate-200 border-white'}`}
                    >
                      {connectedPlatforms[Platform.FACEBOOK] ? 'Desconectar' : 'Conectar Conta'}
                    </button>
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
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddPost} className="p-6 space-y-4">
              {/* Form Content kept same as before */}
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
                 {/* Platform Logo */}
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

                 <div className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 text-left text-xs text-slate-600 mb-6 space-y-2">
                    <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Ver seus vídeos e playlists</p>
                    <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Ler comentários e métricas</p>
                    <p className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Gerenciar legendas</p>
                 </div>

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
              <div className="bg-slate-50 p-3 text-center border-t border-slate-200">
                <p className="text-[10px] text-slate-400">Esta é uma simulação segura de OAuth2.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};