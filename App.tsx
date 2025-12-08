
import React, { useState, useEffect } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { X, Lock, AlertTriangle, GoogleIcon } from './components/Icons';
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
  checkVirtualFileContent 
} from './services/firebase';
import { exchangeTikTokCode } from './services/tiktokService';

// --- DADOS PADRÃO (FALLBACK VISUAL APENAS) ---
const INITIAL_PROFILE: CreatorProfile = {
  name: "Mundo dos Dados BR",
  handle: "@mundodosdadosbr",
  avatarUrl: "images/logo.png",
  faviconUrl: "images/logo.png", 
  subscribers: "-",
  bio: "Conectando ao banco de dados...",
};

const INITIAL_LANDING_CONTENT: LandingPageContent = {
  headline: "Mundo dos Dados BR",
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState('');
  
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
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setLoginError('');
    try {
      await loginWithGoogle();
      setIsLoggedIn(true);
      setCurrentView('admin');
      setIsLoginModalOpen(false);
    } catch (error: any) {
      console.error(error);
      setLoginError(error.message || "Falha ao conectar com Google.");
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

            <div className="space-y-4">
              <p className="text-slate-400 text-sm text-center mb-6">
                Faça login com sua conta Google para gerenciar o conteúdo do portal.
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
