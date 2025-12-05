import React, { useState } from 'react';
import { 
  Platform, 
  SocialPost 
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
  CloudLightning
} from './Icons';

interface AdminDashboardProps {
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  onLogout: () => void;
  onViewPortal: () => void;
}

type AdminView = 'content' | 'integrations' | 'analytics';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ posts, setPosts, onLogout, onViewPortal }) => {
  const [activeView, setActiveView] = useState<AdminView>('content');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
    // Simulate API call delay
    setTimeout(() => {
      const syncedPosts: SocialPost[] = [
        {
          id: `sync-yt-${Date.now()}`,
          platform: Platform.YOUTUBE,
          thumbnailUrl: 'https://picsum.photos/seed/sync1/600/400',
          title: 'Review: Novo Smartphone Dobrável (Sincronizado)',
          likes: 15420,
          comments: 890,
          views: 120000,
          date: 'há 10 minutos',
          url: '#'
        },
        {
          id: `sync-tt-${Date.now()}`,
          platform: Platform.TIKTOK,
          thumbnailUrl: 'https://picsum.photos/seed/sync2/400/700',
          caption: 'Dica rápida de CSS que ninguém te conta! 🎨 #coding #webdev',
          likes: 45000,
          comments: 230,
          views: 89000,
          date: 'há 30 minutos',
          url: '#'
        }
      ];
      
      setPosts([...syncedPosts, ...posts]);
      setIsSyncing(false);
      alert(`${syncedPosts.length} novos posts encontrados e sincronizados com sucesso!`);
    }, 2000);
  };

  const togglePlatform = (platform: string) => {
    setConnectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
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
    // Reset form
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
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
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
                      Ao conectar suas contas abaixo, o CreatorNexus importará automaticamente seus novos vídeos e postagens a cada 60 minutos. 
                      Você não precisa cadastrar nada manualmente.
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
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
                      Sincroniza títulos, thumbnails, views e comentários do seu canal oficial.
                    </p>
                    <button 
                      onClick={() => togglePlatform(Platform.YOUTUBE)}
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
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
                      Importa fotos, carrosséis e Reels com legendas e métricas de engajamento.
                    </p>
                    <button 
                      onClick={() => togglePlatform(Platform.INSTAGRAM)}
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
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
                      Puxa seus últimos vídeos, contagem de visualizações e likes automaticamente.
                    </p>
                    <button 
                      onClick={() => togglePlatform(Platform.TIKTOK)}
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
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
                      Sincroniza postagens de texto, vídeo e imagem da sua Página de Criador.
                    </p>
                    <button 
                      onClick={() => togglePlatform(Platform.FACEBOOK)}
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
    </div>
  );
};