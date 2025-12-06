
import React, { useState, useEffect } from 'react';
import { SocialPost, Platform, CreatorProfile, LandingPageContent } from './types';
import { LandingPage } from './components/LandingPage';
import { PortalDashboard } from './components/PortalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { X, Lock, Smartphone, GoogleIcon, CheckCircle, AlertTriangle, CloudLightning, ShieldCheck } from './components/Icons';
import { 
  initFirebase, 
  isFirebaseConfigured, 
  saveFirebaseConfig, 
  resetFirebaseConfig,
  loginWithGoogle, 
  logout, 
  subscribeToSettings, 
  subscribeToPosts, 
  saveSettings,
  savePost,
  deletePostById,
  bulkSavePosts
} from './services/firebase';

// --- DADOS PADRÃO (FALLBACK) ---
const INITIAL_PROFILE: CreatorProfile = {
  name: "Mundo dos Dados BR",
  handle: "@mundodosdadosbr",
  avatarUrl: "https://ui-avatars.com/api/?name=Mundo+Dados&background=0f172a&color=38bdf8&size=256",
  faviconUrl: "https://cdn-icons-png.flaticon.com/512/2906/2906274.png", 
  subscribers: "0",
  bio: "Aqui, mergulhamos no fascinante universo dos dados, abrindo portas para entusiastas, iniciantes e profissionais.",
};

const INITIAL_LANDING_CONTENT: LandingPageContent = {
  headline: "Mundo dos Dados BR",
  subheadline: "Nosso canal é o guia perfeito para quem busca compreender e aplicar o poder dos dados.",
  ctaButtonText: "Explorar Dados",
  logoUrl: "",
  feature1Title: "Análise de Negócios",
  feature1Desc: "Conteúdo essencial sobre Business Intelligence.",
  feature2Title: "Ciência de Dados",
  feature2Desc: "Explorações profundas em Data Science.",
  feature3Title: "Educação em Dados",
  feature3Desc: "O guia perfeito para entusiastas e iniciantes.",
};

type ViewState = 'landing' | 'portal' | 'admin';
type LoginStep = 'config-db' | 'sso' | 'pin-setup' | 'pin-verify';
type BackendErrorType = 'permission' | 'auth_missing' | null;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  
  // Data State
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [landingContent, setLandingContent] = useState<LandingPageContent>(INITIAL_LANDING_CONTENT);
  const [profile, setProfile] = useState<CreatorProfile>(INITIAL_PROFILE);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [storedSecurityPin, setStoredSecurityPin] = useState<string | null>(null);

  // System State
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [backendError, setBackendError] = useState<BackendErrorType>(null);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('sso');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Firebase Config Form State
  const [firebaseConfigInput, setFirebaseConfigInput] = useState('');

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    const checkFirebase = () => {
      if (isFirebaseConfigured()) {
        const { app } = initFirebase();
        if (app) {
          setIsFirebaseReady(true);
        } else {
          setIsFirebaseReady(false);
        }
      } else {
        setIsFirebaseReady(false);
      }
    };
    checkFirebase();
  }, []);

  // --- DATA SYNC (FIRESTORE) ---
  useEffect(() => {
    if (!isFirebaseReady) return;

    // Callbacks de erro para detectar problemas de configuração
    const handleFirestoreError = (error: any) => {
      if (error.code === 'permission-denied') {
        setBackendError('permission');
      }
    };

    // 1. Ouvir Configurações
    const unsubSettings = subscribeToSettings((data) => {
      if (data.profile) setProfile(data.profile);
      if (data.landingContent) setLandingContent(data.landingContent);
      if (data.youtubeApiKey) setYoutubeApiKey(data.youtubeApiKey);
      if (data.securityPin) setStoredSecurityPin(data.securityPin);
      
      setIsLoadingData(false);
    }, handleFirestoreError);

    // 2. Ouvir Posts
    const unsubPosts = subscribeToPosts((newPosts) => {
      setPosts(newPosts);
    }, handleFirestoreError);

    return () => {
      unsubSettings();
      unsubPosts();
    };
  }, [isFirebaseReady]);

  // --- SAVE ACTIONS WRAPPERS ---
  const handleSaveProfile = (newProfile: CreatorProfile) => {
    setProfile(newProfile); // Optimistic update
    if(isFirebaseReady) saveSettings(newProfile, landingContent, youtubeApiKey);
  };

  const handleSaveLanding = (newContent: LandingPageContent) => {
    setLandingContent(newContent); // Optimistic
    if(isFirebaseReady) saveSettings(profile, newContent, youtubeApiKey);
  };

  const handleSaveApiKey = (key: string) => {
    setYoutubeApiKey(key); // Optimistic
    if(isFirebaseReady) saveSettings(profile, landingContent, key);
  };

  const handleUpdatePosts = (newPosts: SocialPost[]) => {
    setPosts(newPosts);
  };

  // Funções passadas para o AdminDashboard para manipular o banco
  const dbActions = {
    addPost: (post: SocialPost) => {
      if(isFirebaseReady) savePost(post);
    },
    deletePost: (id: string) => {
      if(isFirebaseReady) deletePostById(id);
    },
    syncPosts: (posts: SocialPost[]) => {
      if(isFirebaseReady) bulkSavePosts(posts);
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
    setPinInput('');

    if (!isFirebaseReady) {
      setLoginStep('config-db');
    } else {
      setLoginStep('sso');
    }
  };

  const handleGoogleLoginAction = async () => {
    setIsAuthenticating(true);
    setLoginError('');
    setBackendError(null);

    try {
      const result = await loginWithGoogle();
      setUser({
        name: result.user.displayName,
        email: result.user.email,
        avatar: result.user.photoURL
      });
      
      // Decidir próximo passo baseado se o PIN já existe no banco
      if (storedSecurityPin) {
        setLoginStep('pin-verify');
      } else {
        setLoginStep('pin-setup');
      }

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-supported-in-this-environment') {
        setBackendError('auth_missing');
        setLoginError('Configuração do Firebase incompleta.');
      } else {
        setLoginError("Erro ao logar com Google: " + error.message);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    // SETUP MODE
    if (loginStep === 'pin-setup') {
        if (pinInput.length < 4) {
            setLoginError('O PIN deve ter pelo menos 4 dígitos.');
            return;
        }
        // Salva o novo PIN no Firebase
        await saveSettings(profile, landingContent, youtubeApiKey, pinInput);
        setStoredSecurityPin(pinInput);
        
        setIsLoggedIn(true);
        setCurrentView('admin');
        setIsLoginModalOpen(false);
    } 
    // VERIFY MODE
    else {
        if (pinInput === storedSecurityPin) {
            setIsLoggedIn(true);
            setCurrentView('admin');
            setIsLoginModalOpen(false);
        } else {
            setLoginError('PIN incorreto.');
        }
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView('landing');
  };

  const handleSaveFirebaseConfig = () => {
    try {
      const config = JSON.parse(firebaseConfigInput);
      saveFirebaseConfig(config);
      // A página recarregará
    } catch (e) {
      setLoginError("JSON Inválido. Certifique-se de copiar todo o objeto do console do Firebase.");
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
          setYoutubeApiKey={handleSaveApiKey}
        />
      )}

      {/* Backend Error / Troubleshooting Modal */}
      {backendError && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-red-500/50 shadow-2xl overflow-hidden">
            <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="font-bold text-red-100 text-lg">Ação Necessária no Firebase</h3>
            </div>
            
            <div className="p-6 text-slate-300 space-y-4">
              {backendError === 'permission' && (
                <>
                  <p className="font-medium text-white">Erro: Permissão Negada (Firestore)</p>
                  <p className="text-sm">O banco de dados existe, mas as regras de segurança estão bloqueando o acesso.</p>
                  <ol className="list-decimal list-inside text-sm space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <li>Vá ao Console Firebase &gt; <strong>Firestore Database</strong> &gt; aba <strong>Regras</strong>.</li>
                    <li>Cole o código abaixo e clique em <strong>Publicar</strong>:</li>
                  </ol>
                  <pre className="bg-black p-3 rounded text-xs text-green-400 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                  </pre>
                </>
              )}

              {backendError === 'auth_missing' && (
                <>
                   <p className="font-medium text-white">Erro: Autenticação Google Desativada</p>
                   <p className="text-sm">O login falhou porque o provedor não está ativo no projeto.</p>
                   <ol className="list-decimal list-inside text-sm space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <li>Vá ao Console Firebase &gt; <strong>Authentication</strong>.</li>
                    <li>Clique na aba <strong>Sign-in method</strong>.</li>
                    <li>Adicione o provedor <strong>Google</strong> e marque a chave <strong>Ativar</strong>.</li>
                    <li>Certifique-se de salvar com um e-mail de suporte válido.</li>
                  </ol>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              <button 
                onClick={resetFirebaseConfig}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Resetar Configuração
              </button>
              <button 
                onClick={() => setBackendError(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Entendi, vou corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login / Config Modal */}
      {isLoginModalOpen && !backendError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {loginStep === 'config-db' ? (
                  <>
                    <CloudLightning size={20} className="text-amber-400" />
                    <span>Configurar Backend</span>
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

            {/* PASSO 1: CONFIGURAR FIREBASE */}
            {loginStep === 'config-db' && (
               <div className="space-y-4 animate-fade-in">
                 <div className="text-sm text-slate-400">
                   Para ativar o login real e salvar dados na nuvem, precisamos conectar ao Firebase.
                 </div>
                 <ol className="list-decimal list-inside text-xs text-slate-500 space-y-1 ml-1">
                   <li>Acesse <a href="https://console.firebase.google.com/" target="_blank" className="text-indigo-400 underline">console.firebase.google.com</a></li>
                   <li>Crie um projeto Web e copie o <code>firebaseConfig</code>.</li>
                   <li>Habilite <strong>Authentication</strong> (Google) e <strong>Firestore</strong>.</li>
                 </ol>
                 
                 <textarea 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono focus:border-indigo-500 focus:outline-none"
                    rows={8}
                    placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
                    value={firebaseConfigInput}
                    onChange={(e) => setFirebaseConfigInput(e.target.value)}
                 />

                 <button 
                  onClick={handleSaveFirebaseConfig}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 rounded-lg transition-all"
                >
                  Salvar e Conectar
                </button>
               </div>
            )}

            {/* PASSO 2: LOGIN GOOGLE */}
            {loginStep === 'sso' && (
              <div className="space-y-6 relative z-10 animate-fade-in">
                <div className="text-center text-slate-400 text-sm">
                  Utilize sua conta Google de administrador.
                </div>

                <button 
                  onClick={handleGoogleLoginAction}
                  disabled={isAuthenticating}
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isAuthenticating ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  <span>
                    {isAuthenticating ? 'Falando com Google...' : 'Entrar com Google'}
                  </span>
                </button>
              </div>
            )}

            {/* PASSO 3: PIN SETUP ou VERIFY */}
            {(loginStep === 'pin-setup' || loginStep === 'pin-verify') && user && (
              <form onSubmit={handlePinSubmit} className="space-y-4 relative z-10 animate-fade-in">
                
                <div className="bg-slate-800/50 rounded-lg p-3 flex items-center space-x-3 mb-4 border border-slate-700">
                  <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={10} /> Google OK
                    </p>
                  </div>
                </div>

                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mb-3">
                      <ShieldCheck size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-white">
                      {loginStep === 'pin-setup' ? 'Crie seu PIN de Admin' : 'PIN de Segurança'}
                  </h4>
                  <p className="text-slate-400 text-sm mt-1">
                     {loginStep === 'pin-setup' 
                        ? 'Defina uma senha numérica para proteger o painel.' 
                        : 'Digite seu PIN para acessar.'}
                  </p>
                </div>

                <div>
                  <input 
                    type="password" 
                    className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans"
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPinInput(val);
                    }}
                    placeholder="******"
                    autoFocus
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all mt-2 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  {loginStep === 'pin-setup' ? 'Salvar e Entrar' : 'Desbloquear'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default App;
