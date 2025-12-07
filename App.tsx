
import React, { useState, useEffect } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { X, Lock, Smartphone, CheckCircle, AlertTriangle, CloudLightning, ShieldCheck, QrCode } from './components/Icons';
import { 
  initFirebase, 
  loginWithCredentials, 
  checkMfaStatus,
  initiateMfaSetup,
  verifyMfaToken,
  completeMfaSetup,
  logout, 
  subscribeToSettings, 
  subscribeToPosts, 
  saveSettings,
  savePost,
  deletePostById,
  bulkSavePosts,
  isAuthenticated,
  TikTokAuthData
} from './services/firebase';
import { exchangeTikTokCode } from './services/tiktokService';

// --- DADOS PADRÃO (FALLBACK) ---
const INITIAL_PROFILE: CreatorProfile = {
  name: "Mundo dos Dados BR",
  handle: "@mundodosdadosbr",
  avatarUrl: "images/logo.png", // Use the local logo as default avatar
  faviconUrl: "images/logo.png", 
  subscribers: "0",
  bio: "Aqui, mergulhamos no fascinante universo dos dados, abrindo portas para entusiastas, iniciantes e profissionais.",
};

const INITIAL_LANDING_CONTENT: LandingPageContent = {
  headline: "Mundo dos Dados BR",
  subheadline: "Nosso canal é o guia perfeito para quem busca compreender e aplicar o poder dos dados.",
  ctaButtonText: "Explorar Dados",
  logoUrl: "images/logo.png",
  feature1Title: "Análise de Negócios",
  feature1Desc: "Conteúdo essencial sobre Business Intelligence.",
  feature2Title: "Ciência de Dados",
  feature2Desc: "Explorações profundas em Data Science.",
  feature3Title: "Educação em Dados",
  feature3Desc: "O guia perfeito para entusiastas e iniciantes.",
};

type ViewState = 'landing' | 'portal' | 'admin';
type LoginStep = 'credentials' | 'mfa-setup' | 'mfa-verify';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  
  // Data State
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [landingContent, setLandingContent] = useState<LandingPageContent>(INITIAL_LANDING_CONTENT);
  const [profile, setProfile] = useState<CreatorProfile>(INITIAL_PROFILE);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  
  // TikTok State
  const [tiktokAuth, setTiktokAuth] = useState<TikTokAuthData>({
    clientKey: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    expiresAt: 0
  });

  // System State
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // MFA Setup State
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrUrl, setMfaQrUrl] = useState('');

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- OAUTH CALLBACK HANDLER (TIKTOK) ---
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      // If we have a code, we are returning from TikTok
      if (code) {
        console.log("TikTok Authorization Code detected:", code);
        setIsLoadingData(true);
        
        // Ensure we are logged in or in a state to accept this
        // For simplicity, we process it. In production, check state for CSRF.
        
        try {
          // We need the keys to exchange. Since state might not be fully loaded, 
          // we assume the user just clicked connect and keys are in localStorage or state.
          // However, on a redirect, React state resets. We must pull from storage.
          // But since initFirebase handles storage, we wait for it? 
          // Actually, let's grab directly from local storage for the exchange to be safe.
          
          const storedKey = localStorage.getItem('nexus_tt_client_key') || 'aw4f52prfxu4yqzx'; // Fallback to provided default
          const storedSecret = localStorage.getItem('nexus_tt_client_secret') || 'ZoNVIyX4xracwFi08hwIwhMuFA3mwtPw';

          const tokens = await exchangeTikTokCode(code, storedKey, storedSecret);
          
          const newAuthData: Partial<TikTokAuthData> = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + (tokens.expiresIn * 1000)
          };

          // Save to storage
          saveSettings(profile, landingContent, { tiktokAuth: newAuthData });
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          alert("TikTok conectado com sucesso!");
          setCurrentView('admin'); // Go to admin to show success
          setIsLoggedIn(true); // Assuming admin context if they were doing this
          
        } catch (error) {
          console.error("Failed to exchange TikTok code:", error);
          alert("Falha na conexão com TikTok (Verifique Console).");
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    handleAuthCallback();
  }, []); // Run once on mount

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    initFirebase();
    // Check if we have a token (Auto-Login logic)
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setIsFirebaseReady(true);
    } else {
      setIsFirebaseReady(true);
    }
  }, []);

  // --- DATA SYNC (LOCAL STORAGE) ---
  useEffect(() => {
    if (!isFirebaseReady) return;

    // 1. Ouvir Configurações
    const unsubSettings = subscribeToSettings((data) => {
      if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
      if (data.landingContent) setLandingContent(data.landingContent);
      if (data.keys) {
        setYoutubeApiKey(data.keys.youtube || '');
        // Load TikTok Data
        if (data.keys.tiktokAuth) {
           setTiktokAuth(prev => ({ ...prev, ...data.keys.tiktokAuth }));
        }
      }
      setIsLoadingData(false);
    }, () => {});

    // 2. Ouvir Posts
    const unsubPosts = subscribeToPosts((newPosts) => {
      setPosts(newPosts);
    }, () => {});

    return () => {
      unsubSettings();
      unsubPosts();
    };
  }, [isFirebaseReady]);

  // --- SAVE ACTIONS WRAPPERS ---
  const handleSaveProfile = (newProfile: CreatorProfile) => {
    setProfile(newProfile); // Optimistic update
    saveSettings(newProfile, landingContent, { youtube: youtubeApiKey, tiktokAuth });
  };

  const handleSaveLanding = (newContent: LandingPageContent) => {
    setLandingContent(newContent); // Optimistic
    saveSettings(profile, newContent, { youtube: youtubeApiKey, tiktokAuth });
  };

  const handleSaveYoutubeKey = (key: string) => {
    setYoutubeApiKey(key); // Optimistic
    saveSettings(profile, landingContent, { youtube: key, tiktokAuth });
  };

  const handleSaveTiktokAuth = (newAuth: Partial<TikTokAuthData>) => {
    const updated = { ...tiktokAuth, ...newAuth };
    setTiktokAuth(updated);
    saveSettings(profile, landingContent, { youtube: youtubeApiKey, tiktokAuth: newAuth });
  };

  const handleUpdatePosts = (newPosts: SocialPost[]) => {
    setPosts(newPosts);
  };

  const dbActions = {
    addPost: (post: SocialPost) => {
      savePost(post);
      // Optimistic add for smoother UI
      setPosts(prev => [post, ...prev]);
    },
    deletePost: (id: string) => {
      deletePostById(id);
      // Optimistic delete
      setPosts(prev => prev.filter(p => p.id !== id));
    },
    syncPosts: (posts: SocialPost[]) => {
      bulkSavePosts(posts);
      setPosts(prev => [...posts, ...prev]);
    }
  };

  // --- FAVICON EFFECT ---
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
      document.title = profile.name;
    }
  }, [profile.faviconUrl, profile.name]);


  // --- AUTH HANDLERS ---
  const handlePortalAccess = () => {
    setCurrentView('portal');
  };

  const handleAdminLoginClick = () => {
    if (isLoggedIn) {
      setCurrentView('admin');
      return;
    }

    setIsLoginModalOpen(true);
    setLoginError('');
    setUsername('');
    setPassword('');
    setMfaCode('');
    setLoginStep('credentials');
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    try {
      // 1. Validate User/Pass
      await loginWithCredentials(username, password);
      
      // 2. Check MFA Status
      const hasMfa = await checkMfaStatus();
      
      if (hasMfa) {
        setLoginStep('mfa-verify');
      } else {
        // Start MFA Setup
        const { secret, otpauthUrl } = await initiateMfaSetup();
        setMfaSecret(secret);
        setMfaQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`);
        setLoginStep('mfa-setup');
      }
    } catch (error: any) {
      console.error(error);
      setLoginError(error.message || "Falha na autenticação.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    try {
      const isValid = await verifyMfaToken(mfaCode);
      if (isValid) {
        setIsLoggedIn(true);
        setCurrentView('admin');
        setIsLoginModalOpen(false);
      } else {
        setLoginError("Código inválido. Tente novamente.");
        setMfaCode('');
      }
    } catch (error) {
      setLoginError("Erro ao verificar código.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMfaSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    try {
      const isValid = await verifyMfaToken(mfaCode, mfaSecret);
      if (isValid) {
        await completeMfaSetup(mfaSecret);
        setIsLoggedIn(true);
        setCurrentView('admin');
        setIsLoginModalOpen(false);
      } else {
        setLoginError("Código incorreto. Verifique o Google Authenticator.");
      }
    } catch (error) {
       setLoginError("Erro ao configurar MFA.");
    } finally {
      setIsAuthenticating(false);
    }
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
          setPosts={(val: any) => {
            if (typeof val === 'function') {
              const newP = val(posts);
              handleUpdatePosts(newP);
            } else {
              handleUpdatePosts(val);
            }
          }}
          dbActions={dbActions}
          onLogout={handleLogout} 
          onViewPortal={() => setCurrentView('portal')}
          landingContent={landingContent}
          setLandingContent={handleSaveLanding}
          profile={profile}
          setProfile={handleSaveProfile}
          youtubeApiKey={youtubeApiKey}
          setYoutubeApiKey={handleSaveYoutubeKey}
          tiktokAuth={tiktokAuth}
          setTiktokAuth={handleSaveTiktokAuth}
        />
      )}

      {/* Login / Auth Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                 <Lock size={20} className="text-indigo-400" />
                 <span>Acesso Administrativo</span>
              </h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {loginError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}

            {/* STEP 1: USERNAME & PASSWORD */}
            {loginStep === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Usuário</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="seu.usuario"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha segura"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Próximo</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: MFA SETUP (FIRST TIME) */}
            {loginStep === 'mfa-setup' && (
              <div className="animate-fade-in">
                <div className="text-center mb-4">
                  <div className="bg-white p-2 rounded-xl inline-block mb-3">
                    {mfaQrUrl ? (
                      <img src={mfaQrUrl} alt="QR Code" className="w-40 h-40" />
                    ) : (
                      <div className="w-40 h-40 bg-slate-200 flex items-center justify-center text-slate-400">
                        <div className="w-8 h-8 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-white mb-1">Configurar Google Authenticator</h4>
                  <p className="text-sm text-slate-400 px-4">
                    Escaneie o QR Code com seu app autenticador e digite o código gerado abaixo.
                  </p>
                </div>

                <form onSubmit={handleMfaSetupComplete} className="space-y-4">
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    disabled={isAuthenticating || mfaCode.length !== 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAuthenticating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>Verificar e Ativar</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: MFA VERIFY (RETURNING) */}
            {loginStep === 'mfa-verify' && (
              <div className="animate-fade-in">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 ring-1 ring-indigo-500/30">
                      <Smartphone size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-white">Autenticação de Dois Fatores</h4>
                  <p className="text-slate-400 text-sm mt-2">
                     Digite o código de 6 dígitos do seu Google Authenticator.
                  </p>
                </div>

                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
                    value={mfaCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setMfaCode(val);
                    }}
                    placeholder="000000"
                    autoFocus
                  />
                  
                  <button 
                    type="submit"
                    disabled={isAuthenticating || mfaCode.length !== 6}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all mt-2 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isAuthenticating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Confirmar Acesso</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default App;
