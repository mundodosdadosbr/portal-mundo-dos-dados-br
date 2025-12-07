
import React, { useState } from 'react';
import { 
  Youtube, 
  Instagram, 
  Facebook, 
  TikTokIcon, 
  Sparkles,
  Users,
  TrendingUp,
  Menu,
  X,
  Heart,
  Home,
  LayoutDashboard
} from './Icons';
import { PostCard } from './PostCard';
import { SocialPost, Platform, CreatorProfile } from '../types';
import { generateSocialCaption } from '../services/geminiService';

interface PortalDashboardProps {
  posts: SocialPost[];
  profile: CreatorProfile;
  onHome: () => void;
  isAuthenticated: boolean;
}

export const PortalDashboard: React.FC<PortalDashboardProps> = ({ posts, profile, onHome, isAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<Platform | 'All'>('All');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredPosts = activeTab === 'All' 
    ? posts 
    : posts.filter(post => post.platform === activeTab);

  const handleAiAction = async (post: SocialPost) => {
    if (!isAuthenticated) return;
    
    setSelectedPost(post);
    setAiResponse('');
    setAiModalOpen(true);
    
    setIsGenerating(true);
    try {
      const targetPlatform = post.platform === Platform.YOUTUBE ? 'Instagram' : 'Twitter';
      const promptText = post.title || post.caption || "Confira este conteúdo incrível!";
      const result = await generateSocialCaption(promptText, targetPlatform);
      setAiResponse(result);
    } catch (e) {
      setAiResponse("Desculpe, não consegui conectar ao serviço de IA no momento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const NavButton = ({ label, icon: Icon, tab }: { label: string, icon: any, tab: Platform | 'All' }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 w-full md:w-auto
        ${activeTab === tab 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }
      `}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 transition-all">
        <div className="container mx-auto px-4 h-20 md:h-28 flex items-center justify-between">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="w-14 h-14 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20">
              <img src={profile.avatarUrl} alt="Perfil" className="w-full h-full rounded-full border-2 border-slate-900 object-cover" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-xl md:text-3xl font-bold leading-tight">{profile.name}</h1>
              <p className="text-sm md:text-base text-slate-400">{profile.handle}</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <NavButton label="Todos" icon={TrendingUp} tab="All" />
            <NavButton label="YouTube" icon={Youtube} tab={Platform.YOUTUBE} />
            <NavButton label="Instagram" icon={Instagram} tab={Platform.INSTAGRAM} />
            <NavButton label="TikTok" icon={TikTokIcon} tab={Platform.TIKTOK} />
            <NavButton label="Facebook" icon={Facebook} tab={Platform.FACEBOOK} />
          </nav>

          <div className="flex items-center space-x-2">
            <button 
                onClick={onHome}
                className="hidden md:flex items-center space-x-2 px-3 py-2 text-slate-400 hover:text-white transition-colors"
                title="Voltar ao Início"
            >
                <Home size={18} />
                <span className="text-sm font-medium">Início</span>
            </button>
            {/* Mobile Menu Button */}
            <button 
                className="md:hidden p-2 text-slate-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 space-y-2 animate-fade-in shadow-xl z-50">
            <NavButton label="Todos" icon={TrendingUp} tab="All" />
            <NavButton label="YouTube" icon={Youtube} tab={Platform.YOUTUBE} />
            <NavButton label="Instagram" icon={Instagram} tab={Platform.INSTAGRAM} />
            <NavButton label="TikTok" icon={TikTokIcon} tab={Platform.TIKTOK} />
            <NavButton label="Facebook" icon={Facebook} tab={Platform.FACEBOOK} />
            <div className="pt-2 border-t border-slate-800 mt-2">
                 <button 
                    onClick={onHome}
                    className="flex items-center space-x-2 px-4 py-2 text-slate-400 hover:text-white w-full"
                >
                    <Home size={18} />
                    <span>Voltar ao Início</span>
                </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow container mx-auto px-4 py-8">
        
        {/* Stats Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Seguidores', value: '1.5M', icon: Users, color: 'text-indigo-400' },
            { label: 'Vis. Mensais', value: '3.2M', icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Engajamento', value: '8.4%', icon: Heart, color: 'text-rose-400' },
            { label: 'Remixes IA', value: '124', icon: Sparkles, color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs uppercase font-semibold">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
          ))}
        </section>

        {/* Feed Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            {activeTab === 'All' ? 'Últimas Atualizações' : `Feed do ${activeTab}`}
          </h2>
          {activeTab === Platform.YOUTUBE && (
             <a 
               href="https://youtube.com" 
               target="_blank" 
               rel="noreferrer"
               className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
             >
               Visitar Canal <Youtube size={14} />
             </a>
          )}
        </div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onAiAction={handleAiAction} 
              showAiAction={isAuthenticated}
            />
          ))}
        </div>
        
        {filteredPosts.length === 0 && (
          <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <LayoutDashboard size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma postagem encontrada para esta plataforma.</p>
            <p className="text-sm mt-1">Verifique mais tarde para novos conteúdos.</p>
          </div>
        )}
      </main>

      {/* AI MODAL */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Sparkles size={20} />
                <span className="font-bold">Assistente de Conteúdo IA</span>
              </div>
              <button 
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-2">Conteúdo Original</h3>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-sm text-slate-300 italic">
                  "{selectedPost?.title || selectedPost?.caption}"
                </div>
              </div>

              <div>
                <h3 className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-2">Sugestão do Gemini</h3>
                {isGenerating ? (
                  <div className="flex items-center space-x-3 text-slate-400 animate-pulse py-4">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce" />
                    <div className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce delay-75" />
                    <div className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce delay-150" />
                    <span className="text-xs">Criando mágica criativa...</span>
                  </div>
                ) : (
                  <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30 text-indigo-100 whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end space-x-3">
               <button 
                onClick={() => setAiModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                   if (selectedPost) handleAiAction(selectedPost);
                }}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Regerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
