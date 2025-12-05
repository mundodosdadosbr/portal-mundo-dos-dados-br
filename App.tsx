import React, { useState, useEffect } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { X, Lock, Smartphone, GoogleIcon, CheckCircle } from './components/Icons';

// --- DADOS INICIAIS GENÉRICOS ---
const INITIAL_PROFILE: CreatorProfile = {
  name: "Seu Nome (Configure no Admin)",
  handle: "@seu_arroba",
  avatarUrl: "https://ui-avatars.com/api/?name=User&background=random",
  faviconUrl: "https://aistudiocdn.com/lucide-react@^0.556.0/icons/layout-dashboard.svg",
  subscribers: "0",
  bio: "Sua biografia aparecerá aqui. Vá até o painel administrativo para configurar seu perfil.",
};

const MOCK_GOOGLE_USER = {
  name: "Administrador Nexus",
  email: "admin@creatornexus.com",
  avatar: "https://ui-avatars.com/api/?name=Admin+Nexus&background=6366f1&color=fff"
};

const INITIAL_LANDING_CONTENT: LandingPageContent = {
  headline: "Um Hub para Todas as Plataformas",
  subheadline: "Experimente nosso feed social unificado. Acompanhe os vídeos mais recentes do YouTube, TikTok, Instagram e Facebook em um painel elegante.",
  ctaButtonText: "Acessar Portal",
  feature1Title: "Feed Unificado",
  feature1Desc: "Veja todas as suas postagens recentes do YouTube, TikTok, Instagram e Facebook em uma grade em tempo real.",
  feature2Title: "Assistente de IA",
  feature2Desc: "Gere legendas, remix conteúdo e receba sugestões de tags instantaneamente usando nossa integração com Gemini AI.",
  feature3Title: "Análise de Crescimento",
  feature3Desc: "Acompanhe seu desempenho entre plataformas com métricas agregadas de visualizações, curtidas e engajamento."
};

const INITIAL_POSTS: SocialPost[] = []; // Começa vazio para incentivar a sincronização

type ViewState = 'landing' | 'portal' | 'admin';
type LoginStep = 'sso' | 'mfa' | 'setup-sso' | 'setup-mfa';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [posts, setPosts] = useState<SocialPost[]>(INITIAL_POSTS);
  const [landingContent, setLandingContent] = useState<LandingPageContent>(INITIAL_LANDING_CONTENT);
  
  // Perfil Dinâmico
  const [profile, setProfile] = useState<CreatorProfile>(INITIAL_PROFILE);
  
  // Configuração de API
  const [youtubeApiKey, setYoutubeApiKey] = useState('');

  // System State
  const [hasConfiguredAdmin, setHasConfiguredAdmin] = useState(false);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('sso');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<typeof MOCK_GOOGLE_USER | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Efeito para Atualizar o Favicon Dinamicamente
  useEffect(() => {
    if (profile.faviconUrl) {
      const existingLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (existingLink) {
        existingLink.href = profile.faviconUrl;
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = profile.faviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [profile.faviconUrl]);

  // Public Access
  const handlePortalAccess = () => {
    setCurrentView('portal');
  };

  // Admin Access Handler
  const handleAdminLoginClick = () => {
    if (isLoggedIn) {
      setCurrentView('admin');
      return;
    }

    setIsLoginModalOpen(true);
    setLoginError('');
    setGoogleUser(null);
    setMfaCode('');

    if (!hasConfiguredAdmin) {
      setLoginStep('setup-sso');
    } else {
      setLoginStep('sso');
    }
  };

  const handleGoogleLogin = (mode: 'login' | 'setup') => {
    setIsAuthenticating(true);
    setLoginError('');

    setTimeout(() => {
      setIsAuthenticating(false);
      setGoogleUser(MOCK_GOOGLE_USER);
      
      if (mode === 'setup') {
        setLoginStep('setup-mfa');
      } else {
        setLoginStep('mfa');
      }
    }, 1500);
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Validação flexível para permitir códigos reais do Authenticator
    // Como não temos backend para validar o TOTP real, aceitamos qualquer input de 6 dígitos numéricos
    const isValidFormat = /^\d{6}$/.test(mfaCode);

    if (isValidFormat) {
      setIsLoggedIn(true); 
      
      if (loginStep === 'setup-mfa') {
        setHasConfiguredAdmin(true);
      }

      setCurrentView('admin');
      setIsLoginModalOpen(false);
    } else {
      setLoginError('Código inválido. Digite os 6 números do seu app.');
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
          content={landingContent}
        />
      )}
      
      {currentView === 'portal' && (
        <PortalDashboard 
          posts={posts} 
          profile={profile}
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
          landingContent={landingContent}
          setLandingContent={setLandingContent}
          profile={profile}
          setProfile={setProfile}
          youtubeApiKey={youtubeApiKey}
          setYoutubeApiKey={setYoutubeApiKey}
        />
      )}

      {/* Admin Login / Setup Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {loginStep.includes('setup') ? (
                  <>
                    <CheckCircle size={20} className="text-emerald-400" />
                    <span>Configuração Inicial</span>
                  </>
                ) : (
                  <>
                    <Lock size={20} className="text-indigo-400" />
                    <span>Login Administrativo</span>
                  </>
                )}
              </h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {loginError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg animate-pulse">
                {loginError}
              </div>
            )}

            {loginStep === 'setup-sso' && (
              <div className="space-y-6 relative z-10 animate-fade-in">
                <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg">
                  <p className="text-indigo-200 text-sm font-medium mb-1">Bem-vindo ao CreatorNexus!</p>
                  <p className="text-slate-400 text-xs">
                    Nenhum administrador foi detectado. Conecte sua conta Google para se tornar o superusuário do sistema.
                  </p>
                </div>

                <button 
                  onClick={() => handleGoogleLogin('setup')}
                  disabled={isAuthenticating}
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  <span>
                    {isAuthenticating ? 'Vinculando...' : 'Cadastrar com Google'}
                  </span>
                </button>
              </div>
            )}

            {loginStep === 'sso' && (
              <div className="space-y-6 relative z-10 animate-fade-in">
                <div className="text-center text-slate-400 text-sm">
                  Utilize sua conta vinculada para acessar o painel.
                </div>

                <button 
                  onClick={() => handleGoogleLogin('login')}
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
              </div>
            )}

            {(loginStep === 'mfa' || loginStep === 'setup-mfa') && googleUser && (
              <form onSubmit={handleMfaSubmit} className="space-y-4 relative z-10 animate-fade-in">
                
                <div className="bg-slate-800/50 rounded-lg p-3 flex items-center space-x-3 mb-4 border border-slate-700">
                  <img src={googleUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{googleUser.name}</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      {loginStep === 'setup-mfa' ? 'Vinculando conta...' : 'Conta verificada'}
                    </p>
                  </div>
                </div>

                {loginStep === 'setup-mfa' && (
                  <div className="bg-white p-4 rounded-lg flex flex-col items-center justify-center mb-4 border-4 border-white">
                     <img 
                       src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/CreatorNexus:Admin?secret=JBSWY3DPEHPK3PXP&issuer=CreatorNexus" 
                       alt="QR Code MFA"
                       className="w-36 h-36"
                     />
                     <p className="text-slate-900 text-xs mt-2 font-medium text-center">
                       Escaneie com Google Authenticator
                     </p>
                     <p className="text-slate-400 text-[10px] mt-1 font-mono bg-slate-100 px-2 py-0.5 rounded">
                       Chave: JBSW Y3DP EHPK 3PXP
                     </p>
                  </div>
                )}

                <div className="text-center mb-2">
                  <p className="text-slate-300 text-sm">
                    {loginStep === 'setup-mfa' 
                      ? 'Digite o código gerado pelo app para confirmar.' 
                      : 'Digite o código do seu autenticador.'}
                  </p>
                </div>

                <div>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
                    value={mfaCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setMfaCode(val);
                    }}
                    placeholder="000 000"
                    autoFocus
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all mt-2 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Smartphone size={18} />
                  {loginStep === 'setup-mfa' ? 'Confirmar Configuração' : 'Verificar Código'}
                </button>

                <p className="text-xs text-center text-slate-500 mt-4">
                  (Simulação de ambiente seguro com MFA)
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