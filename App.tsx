
import React, { useState, useEffect } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent, ChatbotConfig } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatWidget } from './components/ChatWidget';
import { X, Lock, AlertTriangle, GoogleIcon, Smartphone, ShieldCheck } from './components/Icons';
import { 
  initFirebase, 
  loginWithGoogle,
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
  MetaAuthData, 
  checkVirtualFileContent,
  checkMfaStatus,
  initiateMfaSetup,
  verifyMfaToken,
  saveMfaSecret,
  setUiSession
} from './services/firebase';

// --- DADOS PADRÃO (FALLBACK VISUAL APENAS) ---
const INITIAL_PROFILE: CreatorProfile = {
  name: "Mundo dos Dados BR",
  handle: "@mundodosdadosbr",
  avatarUrl: "images/logo.png",
  faviconUrl: "images/logo.png", 
  subscribers: "-",
  bio: "Conectando ao banco de dados...",
};

const INITIAL_CHATBOT: ChatbotConfig = {
  enabled: true,
  welcomeMessage: "Olá! Sou a IA do Mundo dos Dados. Pergunte-me sobre nossos conteúdos, estatísticas ou sobre o criador!",
  knowledgeBase: "O Mundo dos Dados BR é um canal focado em Data Science, Business Intelligence e Tecnologia. Criado por Diego Morais, o canal visa democratizar o acesso ao conhecimento de dados no Brasil. Cobrimos ferramentas como Python, SQL, Power BI e muito mais. Nossas redes sociais incluem YouTube, Instagram e TikTok."
};

const INITIAL_LANDING_CONTENT: LandingPageContent = {
  headline: "Mundo dos Dados BR",
  subheadline: "Carregando configurações...",
  ctaButtonText: "Aguarde",
  logoUrl: "images/logo.png",
  features: [
    { id: '1', title: "...", description: "...", icon: "TrendingUp" },
    { id: '2', title: "...", description: "...", icon: "CloudLightning" },
    { id: '3', title: "...", description: "...", icon: "Users" }
  ],
  chatbotConfig: INITIAL_CHATBOT
};

type ViewState = 'landing' | 'portal' | 'admin';
type LoginStep = 'google' | 'mfa-setup' | 'mfa-verify';

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
      // OAUTH POPUP RELAY CHECK
      // If we are inside a popup and have a parent opener
      if (window.opener && window.opener !== window) {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const hash = window.location.hash;
        
        if (code) {
           window.opener.postMessage({ type: 'TIKTOK_CODE', code }, window.location.origin);
           window.close();
           return; 
        }
        
        if (hash && hash.includes('access_token')) {
           window.opener.postMessage({ type: 'META_TOKEN', hash }, window.location.origin);
           window.close();
           return;
        }
      }

      const path = window.location.pathname.substring(1);
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
  
  // Auth Integration State
  const [tiktokAuth, setTiktokAuth] = useState<TikTokAuthData>({
    clientKey: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    expiresAt: 0
  });

  const [metaAuth, setMetaAuth] = useState<MetaAuthData>({
    appId: '',
    accessToken: '',
    expiresAt: 0
  });

  // System State
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('google');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // MFA State
  const [tempUser, setTempUser] = useState<any>(null); 
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrUrl, setMfaQrUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      
      if (data.landingContent) {
         let content: any = data.landingContent;
         if (!content.features && content.feature1Title) {
            content.features = [
              { id: '1', title: content.feature1Title, description: content.feature1Desc, icon: 'TrendingUp' },
              { id: '2', title: content.feature2Title, description: content.feature2Desc, icon: 'CloudLightning' },
              { id: '3', title: content.feature3Title, description: content.feature3Desc, icon: 'Users' }
            ];
         }
         if (!content.features) {
           content.features = INITIAL_LANDING_CONTENT.features;
         }
         
         if (!content.chatbotConfig) {
            content.chatbotConfig = INITIAL_CHATBOT;
         }

         setLandingContent(content);
      }

      if (data.keys) {
        setYoutubeApiKey(data.keys.youtube || '');
        if (data.keys.tiktokAuth) {
           setTiktokAuth(prev => ({ ...prev, ...data.keys.tiktokAuth }));
        }
        if (data.keys.metaAuth) {
           setMetaAuth(prev => ({ ...prev, ...data.keys.metaAuth }));
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
    saveSettings(newProfile, landingContent, { youtube: youtubeApiKey, tiktokAuth, metaAuth });
  };

  const handleSaveLanding = (newContent: LandingPageContent) => {
    setLandingContent(newContent); // Optimistic
    saveSettings(profile, newContent, { youtube: youtubeApiKey, tiktokAuth, metaAuth });
  };

  const handleSaveYoutubeKey = (key: string) => {
    setYoutubeApiKey(key);
    saveSettings(profile, landingContent, { youtube: key, tiktokAuth, metaAuth });
  };

  const handleSaveTiktokAuth = (newAuth: Partial<TikTokAuthData>) => {
    const updated = { ...tiktokAuth, ...newAuth };
    setTiktokAuth(updated);
    saveSettings(profile, landingContent, { youtube: youtubeApiKey, tiktokAuth: updated, metaAuth });
  };

  const handleSaveMetaAuth = (newAuth: Partial<MetaAuthData>) => {
    const updated = { ...metaAuth, ...newAuth };
    setMetaAuth(updated);
    saveSettings(profile, landingContent, { youtube: youtubeApiKey, tiktokAuth, metaAuth: updated });
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
    setLoginStep('google');
    setLoginError('');
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  // --- AUTH FLOW HANDLERS ---

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setLoginError('');
    try {
      const user = await loginWithGoogle();
      setTempUser(user);

      // Check if user has MFA setup
      const hasMfa = await checkMfaStatus(user.uid);
      
      if (hasMfa) {
        setLoginStep('mfa-verify');
      } else {
        // First access: Setup MFA
        const setup = initiateMfaSetup();
        setMfaSecret(setup.secret);
        setMfaQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup.otpauthUrl)}`);
        setLoginStep('mfa-setup');
      }
    } catch (error: any) {
      console.error(error);
      setLoginError(error.message || "Falha ao conectar com Google.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMfaSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');
    try {
      const isValid = await verifyMfaToken(mfaCode, tempUser.uid, mfaSecret);
      if (isValid) {
        await saveMfaSecret(tempUser.uid, mfaSecret);
        setUiSession(); // Grant UI access
        setIsLoggedIn(true);
        setCurrentView('admin');
        setIsLoginModalOpen(false);
      } else {
        setLoginError("Código incorreto. Tente novamente.");
      }
    } catch (err: any) {
      setLoginError("Erro ao validar MFA.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');
    try {
      const isValid = await verifyMfaToken(mfaCode, tempUser.uid);
      if (isValid) {
        setUiSession(); // Grant UI access
        setIsLoggedIn(true);
        setCurrentView('admin');
        setIsLoginModalOpen(false);
      } else {
        setLoginError("Código inválido.");
      }
    } catch (err) {
      setLoginError("Erro na verificação.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // --- RENDER ---

  if (dbPermissionError) {
    return <ConfigHelpScreen />;
  }
  
  if (virtualFileContent !== null) {
    return <RawTextRenderer content={virtualFileContent} />;
  }

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

      {currentView !== 'admin' && landingContent.chatbotConfig && (
        <ChatWidget config={landingContent.chatbotConfig} />
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
          metaAuth={metaAuth}
          setMetaAuth={handleSaveMetaAuth}
        />
      )}

      {/* Login / Auth Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-8 relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                 <Lock size={20} className="text-indigo-400" />
                 <span>Acesso Admin</span>
              </h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {loginError && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}

            {/* STEP 1: GOOGLE LOGIN */}
            {loginStep === 'google' && (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm text-center mb-6">
                  Faça login com sua conta Google autorizada (@mundodosdadosbr.com).
                </p>
                
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isAuthenticating}
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Entrar com Google</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: MFA SETUP */}
            {loginStep === 'mfa-setup' && (
              <div className="animate-fade-in text-center">
                 <div className="bg-white p-2 rounded-xl inline-block mb-3">
                    {mfaQrUrl ? (
                      <img src={mfaQrUrl} alt="QR Code" className="w-40 h-40" />
                    ) : (
                      <div className="w-40 h-40 bg-slate-200 flex items-center justify-center text-slate-400">
                        <div className="w-8 h-8 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-white mb-1">Primeiro Acesso: Segurança</h4>
                  <p className="text-xs text-slate-400 mb-4 px-2">
                    Escaneie este QR Code com o <strong>Google Authenticator</strong> para proteger sua conta administrativa.
                  </p>
                  
                  <form onSubmit={handleMfaSetupComplete} className="space-y-3">
                    <input 
                      type="text" 
                      className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-indigo-400 focus:outline-none"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={isAuthenticating || mfaCode.length !== 6}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       <ShieldCheck size={18} />
                       <span>Ativar Proteção</span>
                    </button>
                  </form>
              </div>
            )}

            {/* STEP 3: MFA VERIFY */}
            {loginStep === 'mfa-verify' && (
              <div className="animate-fade-in text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 ring-1 ring-indigo-500/30">
                    <Smartphone size={32} />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Verificação em Duas Etapas</h4>
                <p className="text-slate-400 text-sm mb-6">
                   Digite o código do seu Google Authenticator para continuar.
                </p>

                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-indigo-400 focus:outline-none"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    disabled={isAuthenticating || mfaCode.length !== 6}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                  >
                     Confirmar
                  </button>
                </form>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
               <p className="text-xs text-slate-600">
                 Acesso protegido e monitorado.
               </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default App;
