
import React, { useState, useEffect, useCallback } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Captcha } from './components/Captcha';
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
  clearAllPosts, 
  isAuthenticated, 
  TikTokAuthData, 
  getVirtualFileContent 
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

// --- VIRTUAL FILE RENDERER (RAW TEXT) ---
// This component is used to hijack the render and show plain text for verification files
const RawTextRenderer = ({ content }: { content: string }) => {
  return (
    <pre style={{ 
      wordWrap: 'break-word', 
      whiteSpace: 'pre-wrap', 
      fontFamily: 'monospace',
      padding: '20px',
      margin: 0,
      backgroundColor: 'white',
      color: 'black',
      height: '100vh',
      overflow: 'auto'
    }}>
      {content}
    </pre>
  );
};

const App: React.FC = () => {
  // 1. URL INTERCEPTION FOR VIRTUAL FILES
  // Check if current URL matches a saved virtual file (e.g. /ads.txt)
  const [virtualFileContent, setVirtualFileContent] = useState<string | null>(null);
  
  useEffect(() => {
    // Get path without leading slash
    const path = window.location.pathname.substring(1);
    if (path) {
      const content = getVirtualFileContent(path);
      if (content) {
        setVirtualFileContent(content);
        // Important: Stop react from messing with the title/meta for this view
        document.title = path; 
      }
    }
  }, []);

  // If we found a virtual file, render IT ONLY and exit normal app flow
  if (virtualFileContent !== null) {
    return <RawTextRenderer content={virtualFileContent} />;
  }

  // --- NORMAL APP FLOW ---
  
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
  
  // Captcha State
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0); // Used to force refresh
  
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
      // If code exists, it's NOT a virtual file request, it's OAuth
      if (code) {
        console.log("TikTok Authorization Code detected:", code);
        setIsLoadingData(true);
        try {
          const storedKey = localStorage.getItem('nexus_tt_client_key') || 'aw4f52prfxu4yqzx'; 
          const storedSecret = localStorage.getItem('nexus_tt_client_secret') || 'ZoNVIyX4xracwFi08hwIwhMuFA3mwtPw';

          const tokens = await exchangeTikTokCode(code, storedKey, storedSecret);
          
          const newAuthData: Partial<TikTokAuthData> = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + (tokens.expiresIn * 1000)
          };

          saveSettings(profile, landingContent, { tiktokAuth: newAuthData });
          
          window.history.replaceState({}, document.title, window.location.pathname);
          
          alert("TikTok conectado com sucesso!");
          setCurrentView('admin'); 
          setIsLoggedIn(true); 
          
        } catch (error) {
          console.error("Failed to exchange TikTok code:", error);
          alert("Falha na conexão com TikTok (Verifique Console).");
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    handleAuthCallback();
  }, []); 

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    initFirebase();
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setIsFirebaseReady(true);
    } else {
      setIsFirebaseReady(true);
    }
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!isFirebaseReady) return;

    const unsubSettings = subscribeToSettings((data) => {
      if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
      if (data.landingContent) setLandingContent(data.landingContent);
      if (data.keys) {
        setYoutubeApiKey(data.keys.youtube || '');
        if (data.keys.tiktokAuth) {
           setTiktokAuth(prev => ({ ...prev, ...data.keys.tiktokAuth }));
        }
      }
      setIsLoadingData(false);
    }, () => {});

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
    setProfile(newProfile);
    saveSettings(newProfile, landingContent, { youtube: youtubeApiKey, tiktokAuth });
  };

  const handleSaveLanding = (newContent: LandingPageContent) => {
    setLandingContent(newContent);
    saveSettings(profile, newContent, { youtube: youtubeApiKey, tiktokAuth });
  };

  const handleSaveYoutubeKey = (key: string) => {
    setYoutubeApiKey(key);
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
      setPosts(prev => [post, ...prev]);
    },
    deletePost: (id: string) => {
      deletePostById(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    },
    syncPosts: (posts: SocialPost[]) => {
      bulkSavePosts(posts);
      setPosts(prev => [...posts, ...prev]);
    },
    clearPosts: () => {
      clearAllPosts();
      setPosts([]);
    }
  };

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
    setCaptchaInput('');
    setLoginStep('credentials');
    // Force refresh captcha
    setCaptchaKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  // --- CAPTCHA HANDLER (MEMOIZED) ---
  const handleCaptchaGenerate = useCallback((code: string) => {
    setGeneratedCaptcha(code);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    // 1. Validate Captcha
    if (captchaInput.toUpperCase() !== generatedCaptcha) {
      setLoginError('Código Captcha incorreto.');
      setIsAuthenticating(false);
      setCaptchaKey(prev => prev + 1); // Refresh image
      setCaptchaInput('');
      return;
    }

    try {
      await loginWithCredentials(username, password);
      
      const hasMfa = await checkMfaStatus();
      
      if (hasMfa) {
        setLoginStep('mfa-verify');
      } else {
        const { secret, otpauthUrl } = await initiateMfaSetup();
        setMfaSecret(secret);
        setMfaQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`);
        setLoginStep('mfa-setup');
      }
    } catch (error: any) {
      console.error(error);
      setLoginError(error.message || "Falha na autenticação.");
      setCaptchaKey(prev => prev + 1); // Refresh Captcha on failed password too
      setCaptchaInput('');
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

            {/* STEP 1: USERNAME, PASSWORD & CAPTCHA */}
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
                
                {/* CAPTCHA SECTION */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Verificação de Segurança</label>
                  <div className="flex flex-col gap-3">
                    <Captcha 
                      key={captchaKey} 
                      onGenerate={handleCaptchaGenerate} 
                    />
                    <input 
                      type="text"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none uppercase tracking-widest font-mono"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="DIGITE O CÓDIGO"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
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

            {/* STEP 2: MFA SETUP */}
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

            {/* STEP 3: MFA VERIFY */}
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
