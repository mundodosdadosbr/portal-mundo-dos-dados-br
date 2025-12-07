
import React, { useState, useEffect, useCallback } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Captcha } from './components/Captcha';
import { X, Lock, Smartphone, CheckCircle, AlertTriangle, CloudLightning, ShieldCheck, QrCode, FileText } from './components/Icons';
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
  checkVirtualFileContent 
} from './services/firebase';
import { exchangeTikTokCode } from './services/tiktokService';

// --- DADOS PADRÃO (FALLBACK VISUAL APENAS) ---
const INITIAL_PROFILE: CreatorProfile = {
  name: "Carregando...",
  handle: "@...",
  avatarUrl: "images/logo.png",
  faviconUrl: "images/logo.png", 
  subscribers: "-",
  bio: "Conectando ao banco de dados...",
};

const INITIAL_LANDING_CONTENT: LandingPageContent = {
  headline: "CreatorNexus",
  subheadline: "Carregando configurações...",
  ctaButtonText: "Aguarde",
  logoUrl: "images/logo.png",
  feature1Title: "...",
  feature1Desc: "...",
  feature2Title: "...",
  feature2Desc: "...",
  feature3Title: "...",
  feature3Desc: "...",
};

type ViewState = 'landing' | 'portal' | 'admin';
type LoginStep = 'credentials' | 'mfa-setup' | 'mfa-verify';

// --- VIRTUAL FILE RENDERER (RAW TEXT) ---
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

// --- CONFIG HELP SCREEN ---
const ConfigHelpScreen = () => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center gap-3 text-red-400 mb-6">
        <AlertTriangle size={32} />
        <h1 className="text-2xl font-bold">Configuração Necessária: Firestore Rules</h1>
      </div>
      
      <p className="text-slate-300 mb-4">
        O aplicativo não tem permissão para ler os dados do Firebase. Isso é normal em projetos novos configurados em "Modo Produção".
      </p>

      <div className="space-y-4">
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <h3 className="font-bold text-indigo-400 mb-2">Como Corrigir:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
            <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" className="underline text-white">Console do Firebase</a>.</li>
            <li>Vá em <strong>Firestore Database</strong> &gt; aba <strong>Rules</strong>.</li>
            <li>Substitua as regras atuais pelo código abaixo e clique em <strong>Publish</strong>.</li>
          </ol>
        </div>

        <div className="relative">
          <pre className="bg-slate-800 p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-700">
{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // PERMITIR LEITURA PÚBLICA (Para o site funcionar)
    // PERMITIR ESCRITA APENAS PARA ADMINS
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`}
          </pre>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors mt-4"
        >
          Já atualizei as regras, Recarregar Página
        </button>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // 1. URL INTERCEPTION FOR VIRTUAL FILES (ASYNC CLOUD CHECK)
  const [virtualFileContent, setVirtualFileContent] = useState<string | null>(null);
  const [isCheckingFile, setIsCheckingFile] = useState(true);

  // Error State for Firestore Rules
  const [dbPermissionError, setDbPermissionError] = useState(false);

  useEffect(() => {
    const checkPath = async () => {
      // Get path without leading slash
      const path = window.location.pathname.substring(1);
      // Ignore empty path (home) or specific app routes if using router (we aren't yet)
      if (path && path !== '') {
        const content = await checkVirtualFileContent(path);
        if (content) {
          setVirtualFileContent(content);
          document.title = path; 
        }
      }
      setIsCheckingFile(false);
    };
    checkPath();
  }, []);

  // --- APP STATE ---
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
  const [captchaKey, setCaptchaKey] = useState(0); 
  
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
      if (code) {
        setIsLoadingData(true);
        try {
          // Note: In Cloud mode, we should fetch these keys from DB first if not in state
          // For now relying on state/defaults
          const storedKey = tiktokAuth.clientKey || 'aw4f52prfxu4yqzx'; 
          const storedSecret = tiktokAuth.clientSecret || 'ZoNVIyX4xracwFi08hwIwhMuFA3mwtPw';

          const tokens = await exchangeTikTokCode(code, storedKey, storedSecret);
          
          const newAuthData: Partial<TikTokAuthData> = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + (tokens.expiresIn * 1000)
          };

          saveSettings(profile, landingContent, { youtube: youtubeApiKey, tiktokAuth: { ...tiktokAuth, ...newAuthData } });
          
          window.history.replaceState({}, document.title, window.location.pathname);
          
          alert("TikTok conectado com sucesso!");
          setCurrentView('admin'); 
          setIsLoggedIn(true); 
          
        } catch (error) {
          console.error("Failed to exchange TikTok code:", error);
          alert("Falha na conexão com TikTok.");
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    
    // Only run if not blocking for virtual file
    if (!isCheckingFile) handleAuthCallback();
  }, [isCheckingFile, tiktokAuth, profile, landingContent, youtubeApiKey]); 

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    initFirebase();
    if (isAuthenticated()) {
      setIsLoggedIn(true);
    }
  }, []);

  // --- DATA SYNC (CLOUD) ---
  useEffect(() => {
    // Subscribe immediately to Cloud data
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
    }, (error: any) => {
      console.error("Erro ao sincronizar configurações:", error);
      if (error && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setDbPermissionError(true);
        setIsLoadingData(false);
      }
    });

    const unsubPosts = subscribeToPosts((newPosts) => {
      setPosts(newPosts);
    }, (error: any) => {
      console.error("Erro ao sincronizar posts:", error);
      // Only set error if not already set by settings (avoid double toggle)
      if (error && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setDbPermissionError(true);
      }
    });

    return () => {
      unsubSettings();
      unsubPosts();
    };
  }, []);

  // --- FAVICON SYNC ---
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


  // --- SAVE WRAPPERS ---
  const handleSaveProfile = (newProfile: CreatorProfile) => {
    setProfile(newProfile); // Optimistic
    saveSettings(newProfile, landingContent, { youtube: youtubeApiKey, tiktokAuth });
  };

  const handleSaveLanding = (newContent: LandingPageContent) => {
    setLandingContent(newContent); // Optimistic
    saveSettings(profile, newContent, { youtube: youtubeApiKey, tiktokAuth });
  };

  const handleSaveYoutubeKey = (key: string) => {
    setYoutubeApiKey(key);
    saveSettings(profile, landingContent, { youtube: key, tiktokAuth });
  };

  const handleSaveTiktokAuth = (newAuth: Partial<TikTokAuthData>) => {
    const updated = { ...tiktokAuth, ...newAuth };
    setTiktokAuth(updated);
    saveSettings(profile, landingContent, { youtube: youtubeApiKey, tiktokAuth: updated });
  };

  const handleUpdatePosts = (newPosts: SocialPost[]) => {
    setPosts(newPosts);
  };

  const dbActions = {
    addPost: (post: SocialPost) => {
      savePost(post);
    },
    deletePost: (id: string) => {
      deletePostById(id);
    },
    syncPosts: (posts: SocialPost[]) => {
      bulkSavePosts(posts);
    },
    clearPosts: () => {
      clearAllPosts();
    }
  };

  const handlePortalAccess = () => setCurrentView('portal');

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
    setCaptchaKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  const handleCaptchaGenerate = useCallback((code: string) => {
    setGeneratedCaptcha(code);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    if (captchaInput.toUpperCase() !== generatedCaptcha) {
      setLoginError('Código Captcha incorreto.');
      setIsAuthenticating(false);
      setCaptchaKey(prev => prev + 1);
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
      setCaptchaKey(prev => prev + 1);
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

  // --- RENDER ---

  // 1. Show Permissions Help if Rules are wrong
  if (dbPermissionError) {
    return <ConfigHelpScreen />;
  }
  
  // 2. Show raw text if virtual file match found
  if (virtualFileContent !== null) {
    return <RawTextRenderer content={virtualFileContent} />;
  }

  // 3. Global loading state while connecting to DB
  if (isCheckingFile) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>;
  }

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
