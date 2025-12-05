import React, { useState } from 'react';
import { SocialPost, Platform, CreatorProfile } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { X, Lock, ShieldCheck, Smartphone, GoogleIcon } from './components/Icons';

// --- DADOS FICTÍCIOS (MOCK DATA) ---
const MOCK_PROFILE: CreatorProfile = {
  name: "Alex O Criador",
  handle: "@alexcriador",
  avatarUrl: "https://picsum.photos/200/200",
  subscribers: "1.2M",
  bio: "Reviewer de tecnologia, programador e entusiasta de café. Trazendo o melhor em ferramentas dev e lifestyle.",
};

// Dados simulados do usuário Google
const MOCK_GOOGLE_USER = {
  name: "Administrador Nexus",
  email: "admin@creatornexus.com",
  avatar: "https://ui-avatars.com/api/?name=Admin+Nexus&background=6366f1&color=fff"
};

const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'yt-1',
    platform: Platform.YOUTUBE,
    thumbnailUrl: 'https://picsum.photos/seed/yt1/600/400',
    title: 'Criando um App React em 10 Minutos com IA',
    likes: 12500,
    comments: 430,
    views: 85000,
    date: 'há 2 horas',
    url: '#',
  },
  {
    id: 'ig-1',
    platform: Platform.INSTAGRAM,
    thumbnailUrl: 'https://picsum.photos/seed/ig1/400/500',
    caption: 'Bastidores do novo setup! 🎬 #setup #tech #homeoffice',
    likes: 4200,
    comments: 85,
    date: 'há 5 horas',
    url: '#',
  },
  {
    id: 'tt-1',
    platform: Platform.TIKTOK,
    thumbnailUrl: 'https://picsum.photos/seed/tt1/400/700',
    caption: 'Top 3 extensões do VS Code que você precisa! 💻',
    likes: 89000,
    comments: 1200,
    views: 450000,
    date: 'há 1 dia',
    url: '#',
  },
  {
    id: 'yt-2',
    platform: Platform.YOUTUBE,
    thumbnailUrl: 'https://picsum.photos/seed/yt2/600/400',
    title: 'Por que mudei para o Linux para programar',
    likes: 24000,
    comments: 1500,
    views: 210000,
    date: 'há 3 dias',
    url: '#',
  },
  {
    id: 'fb-1',
    platform: Platform.FACEBOOK,
    thumbnailUrl: 'https://picsum.photos/seed/fb1/600/400',
    caption: 'Novo desafio da comunidade começando na próxima semana! Entre no Discord.',
    likes: 560,
    comments: 45,
    date: 'há 4 dias',
    url: '#',
  },
  {
    id: 'ig-2',
    platform: Platform.INSTAGRAM,
    thumbnailUrl: 'https://picsum.photos/seed/ig2/400/500',
    caption: 'Pausa para o café ☕️ No que você está trabalhando hoje?',
    likes: 3100,
    comments: 120,
    date: 'há 1 semana',
    url: '#',
  },
];

type ViewState = 'landing' | 'portal' | 'admin';
type LoginStep = 'sso' | 'mfa';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [posts, setPosts] = useState<SocialPost[]>(INITIAL_POSTS);
  
  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('sso');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<typeof MOCK_GOOGLE_USER | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Public Access
  const handlePortalAccess = () => {
    setCurrentView('portal');
  };

  // Admin Access
  const handleAdminLoginClick = () => {
    // If already logged in, go straight to admin
    if (isLoggedIn) {
      setCurrentView('admin');
    } else {
      setIsLoginModalOpen(true);
      setLoginStep('sso');
      setLoginError('');
      setGoogleUser(null);
      setMfaCode('');
    }
  };

  const handleGoogleLogin = () => {
    setIsAuthenticating(true);
    setLoginError('');

    // Simular delay de rede do Google Auth
    setTimeout(() => {
      setIsAuthenticating(false);
      setGoogleUser(MOCK_GOOGLE_USER);
      setLoginStep('mfa');
    }, 1500);
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Validar Código MFA (Mock: 123456)
    if (mfaCode === '123456') {
      setIsLoggedIn(true); // Set authenticated session
      setCurrentView('admin');
      setIsLoginModalOpen(false);
    } else {
      setLoginError('Código MFA inválido.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setGoogleUser(null);
    setCurrentView('landing');
  };

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage 
          onPortalAccess={handlePortalAccess}
          onAdminLogin={handleAdminLoginClick} 
        />
      )}
      
      {currentView === 'portal' && (
        <PortalDashboard 
          posts={posts} 
          profile={MOCK_PROFILE}
          onHome={() => setCurrentView('landing')}
          isAuthenticated={isLoggedIn}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard 
          posts={posts} 
          setPosts={setPosts}
          onLogout={handleLogout} 
          onViewPortal={() => setCurrentView('portal')}
        />
      )}

      {/* Admin Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {loginStep === 'sso' ? (
                  <Lock size={20} className="text-indigo-400" />
                ) : (
                  <ShieldCheck size={20} className="text-emerald-400" />
                )}
                <span>
                  {loginStep === 'sso' ? 'Acesso Administrativo' : 'Verificação MFA'}
                </span>
              </h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg animate-pulse">
                {loginError}
              </div>
            )}

            {/* STEP 1: Google SSO */}
            {loginStep === 'sso' && (
              <div className="space-y-6 relative z-10">
                <div className="text-center text-slate-400 text-sm">
                  Utilize sua conta corporativa Google para acessar o painel de administração.
                </div>

                <button 
                  onClick={handleGoogleLogin}
                  disabled={isAuthenticating}
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  <span>
                    {isAuthenticating ? 'Autenticando...' : 'Entrar com Google'}
                  </span>
                </button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-slate-900 px-2 text-slate-600">Área restrita</span>
                  </div>
                </div>

                <p className="text-xs text-center text-slate-600">
                  Ao continuar, você concorda com nossas políticas de segurança e acesso de dados.
                </p>
              </div>
            )}

            {/* STEP 2: MFA */}
            {loginStep === 'mfa' && googleUser && (
              <form onSubmit={handleMfaSubmit} className="space-y-4 relative z-10 animate-fade-in">
                {/* User Info Card */}
                <div className="bg-slate-800/50 rounded-lg p-3 flex items-center space-x-3 mb-6 border border-slate-700">
                  <img src={googleUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{googleUser.name}</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={10} /> Conta verificada
                    </p>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-slate-300 text-sm">
                    Digite o código de 6 dígitos enviado para seu aplicativo autenticador.
                  </p>
                </div>

                <div>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-4 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
                    value={mfaCode}
                    onChange={(e) => {
                      // Allow only numbers and max 6 chars
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setMfaCode(val);
                    }}
                    placeholder="000 000"
                    autoFocus
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all mt-4 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Smartphone size={18} />
                  Verificar Código
                </button>

                <button 
                  type="button"
                  onClick={() => setLoginStep('sso')}
                  className="w-full text-slate-500 text-xs hover:text-white mt-2"
                >
                  Cancelar / Trocar conta
                </button>
                
                <p className="text-xs text-center text-slate-600 mt-4">
                  (Demo: Use o código 123456)
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default App;