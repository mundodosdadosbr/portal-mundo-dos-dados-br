
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { SocialPost, CreatorProfile, LandingPageContent } from '../types';
import * as OTPAuth from 'otpauth';

// --- CONFIGURAÇÃO DO FIREBASE (CRUCIAL PARA FUNCIONAR EM OUTRAS MÁQUINAS) ---
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um projeto e adicione um "Web App"
// 3. Copie as configurações e cole abaixo:
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_ID",
  appId: "SEU_APP_ID"
};

// --- VARIÁVEIS DE CONTROLE ---
let app: any;
let auth: any;
let db: any;
let shouldUseCloud = false;

// --- INICIALIZAÇÃO ---
// Tenta inicializar o Firebase se as chaves forem diferentes do padrão
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Garante que o login persista mesmo fechando o navegador
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Erro na persistência de auth:", error);
    });

    shouldUseCloud = true;
    console.log("✅ [CreatorNexus] Conectado à Nuvem (Firestore/Auth)");
  } catch (e) {
    console.error("❌ [CreatorNexus] Erro ao conectar Firebase:", e);
    shouldUseCloud = false;
  }
} else {
  console.warn("⚠️ [CreatorNexus] Rodando em MODO LOCAL. Configure o services/firebase.ts para sincronizar dados entre dispositivos.");
}

// --- LOCAL STORAGE KEYS (FALLBACK) ---
const KEY_AUTH_TOKEN = 'nexus_local_auth_token';
const KEY_MFA_SECRET = 'nexus_mfa_secret';
const KEY_PROFILE = 'nexus_profile';
const KEY_LANDING = 'nexus_landing_content';
const KEY_POSTS = 'nexus_posts';
const KEY_YT_API_KEY = 'nexus_yt_api_key';
const KEY_VIRTUAL_FILES = 'nexus_virtual_files';

// TikTok Keys
const KEY_TT_CLIENT_KEY = 'nexus_tt_client_key';
const KEY_TT_CLIENT_SECRET = 'nexus_tt_client_secret';
const KEY_TT_ACCESS_TOKEN = 'nexus_tt_access_token';
const KEY_TT_REFRESH_TOKEN = 'nexus_tt_refresh_token';
const KEY_TT_EXPIRES_AT = 'nexus_tt_expires_at';

// --- TYPES ---
export interface TikTokAuthData {
  clientKey: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface VirtualFile {
  path: string;
  content: string;
  type: string;
}

// --- AUTHENTICATION ---

const MOCK_USER = {
  uid: 'local-admin',
  email: 'admin@creatornexus.com',
  displayName: 'Admin Local'
};

export const initFirebase = () => {
  if (shouldUseCloud) {
    onAuthStateChanged(auth, (user: User | null) => {
       if (user) {
         // Opcional: Salvar token para verificações rápidas
         localStorage.setItem(KEY_AUTH_TOKEN, 'cloud-active');
       } else {
         localStorage.removeItem(KEY_AUTH_TOKEN);
       }
    });
  }
};

export const isAuthenticated = () => {
  if (shouldUseCloud) {
    // No modo cloud, a verificação real é assíncrona, mas usamos o localStorage
    // como um "cache" para evitar flicker na UI. A segurança real vem das regras do Firestore.
    return !!localStorage.getItem(KEY_AUTH_TOKEN) || !!auth?.currentUser;
  }
  return !!localStorage.getItem(KEY_AUTH_TOKEN);
};

export const loginWithCredentials = async (username: string, pass: string) => {
  if (shouldUseCloud) {
    // 1. Modo Nuvem: Login real
    let email = username;
    if (!email.includes('@')) email = `${username}@creatornexus.com`;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return userCredential.user;
    } catch (error: any) {
      console.error("Erro Firebase Auth:", error.code);
      throw new Error("Usuário ou senha incorretos (Firebase).");
    }
  } else {
    // 2. Modo Local: Login Hardcoded
    await new Promise(resolve => setTimeout(resolve, 800)); // Simula delay
    const VALID_USER = 'diego.morais';
    const VALID_PASS = 'Z@nbet4df2026'; // Sua senha definida anteriormente
    
    if (username === VALID_USER && pass === VALID_PASS) {
      localStorage.setItem(KEY_AUTH_TOKEN, 'mock-session-active');
      return MOCK_USER;
    }
    throw new Error("Usuário ou senha incorretos (Modo Local).");
  }
};

export const logout = async () => {
  localStorage.removeItem(KEY_AUTH_TOKEN);
  if (shouldUseCloud) {
    await signOut(auth);
  }
};

// --- MFA (MULTI-FACTOR AUTHENTICATION) ---

export const checkMfaStatus = async (): Promise<boolean> => {
  // Se estiver na nuvem, o MFA fica salvo na conta do usuário
  if (shouldUseCloud && auth?.currentUser) {
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'mfa');
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (e) {
      console.error("Erro ao verificar MFA na nuvem:", e);
      return false;
    }
  }
  
  // Fallback local
  const secret = localStorage.getItem(KEY_MFA_SECRET);
  return !!secret;
};

export const initiateMfaSetup = async () => {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: shouldUseCloud ? (auth?.currentUser?.email || 'Admin') : 'Admin Local',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  return { secret: secret.base32, otpauthUrl: totp.toString() };
};

export const verifyMfaToken = async (token: string, pendingSecret?: string) => {
  let secretStr = pendingSecret;

  // Se não foi passado um segredo pendente (setup), tenta buscar do banco
  if (!secretStr) {
    if (shouldUseCloud && auth?.currentUser) {
       const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'mfa');
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
         secretStr = docSnap.data().secret;
       }
    } else {
      secretStr = localStorage.getItem(KEY_MFA_SECRET) || undefined;
    }
  }

  if (!secretStr) return false;

  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretStr)
  });

  // window: 1 permite uma margem de erro de 30s
  return totp.validate({ token, window: 1 }) !== null;
};

export const completeMfaSetup = async (secret: string) => {
  if (shouldUseCloud && auth?.currentUser) {
    // Salva na nuvem para não pedir de novo em outro PC
    await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'mfa'), {
      secret,
      updatedAt: new Date().toISOString()
    });
  }
  // Mantém local também por garantia
  localStorage.setItem(KEY_MFA_SECRET, secret);
};

// --- SETTINGS & KEYS (DB vs LOCAL) ---

export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  keys: { youtube?: string, tiktokAuth?: Partial<TikTokAuthData> }
) => {
  if (shouldUseCloud) {
    // Salva em uma coleção global de configurações
    await setDoc(doc(db, 'settings', 'global_config'), {
      profile,
      landingContent,
      keys
    }, { merge: true });
  }

  // Backup Local
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  localStorage.setItem(KEY_LANDING, JSON.stringify(landingContent));
  if (keys.youtube) localStorage.setItem(KEY_YT_API_KEY, keys.youtube);
  if (keys.tiktokAuth) localStorage.setItem(KEY_TT_CLIENT_KEY, JSON.stringify(keys.tiktokAuth)); // Simplificado
  
  window.dispatchEvent(new Event('nexus-storage-update'));
};

export const subscribeToSettings = (
  onUpdate: (data: { 
    profile?: CreatorProfile, 
    landingContent?: LandingPageContent, 
    keys: { youtube: string, tiktokAuth: TikTokAuthData }
  }) => void,
  onError?: (error: any) => void
) => {
  
  if (shouldUseCloud) {
    // Escuta em tempo real do Firestore
    return onSnapshot(doc(db, 'settings', 'global_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          profile: data.profile,
          landingContent: data.landingContent,
          keys: {
             youtube: data.keys?.youtube || '',
             tiktokAuth: data.keys?.tiktokAuth || {}
          }
        });
      }
    }, onError);
  }

  // Fallback Local
  const load = () => {
    const profileStr = localStorage.getItem(KEY_PROFILE);
    const landingStr = localStorage.getItem(KEY_LANDING);
    const ytKey = localStorage.getItem(KEY_YT_API_KEY) || '';
    
    // TikTok Logic (Legacy support)
    const ttAuthStr = localStorage.getItem(KEY_TT_CLIENT_KEY); // Reusing key for object storage in fallback
    let tiktokAuth: any = {};
    
    // Tenta parsear, se falhar assume que é chave legada
    try {
        tiktokAuth = ttAuthStr ? JSON.parse(ttAuthStr) : {};
    } catch {
        tiktokAuth = { clientKey: ttAuthStr || '' };
    }

    // Se estiver vazio, tenta carregar chaves antigas individuais
    if (!tiktokAuth.accessToken) {
        tiktokAuth.accessToken = localStorage.getItem(KEY_TT_ACCESS_TOKEN) || '';
        tiktokAuth.refreshToken = localStorage.getItem(KEY_TT_REFRESH_TOKEN) || '';
        tiktokAuth.clientKey = localStorage.getItem('nexus_tt_client_key_raw') || '';
        tiktokAuth.clientSecret = localStorage.getItem(KEY_TT_CLIENT_SECRET) || '';
    }

    onUpdate({
      profile: profileStr ? JSON.parse(profileStr) : undefined,
      landingContent: landingStr ? JSON.parse(landingStr) : undefined,
      keys: { 
        youtube: ytKey, 
        tiktokAuth
      }
    });
  };

  load();
  window.addEventListener('nexus-storage-update', load);
  return () => window.removeEventListener('nexus-storage-update', load);
};

// --- POSTS (DB vs LOCAL) ---

export const savePost = async (post: SocialPost) => {
  if (shouldUseCloud) {
    await setDoc(doc(db, 'posts', post.id), post);
  } else {
    const postsStr = localStorage.getItem(KEY_POSTS);
    let posts: SocialPost[] = postsStr ? JSON.parse(postsStr) : [];
    const idx = posts.findIndex(p => p.id === post.id);
    if (idx >= 0) posts[idx] = post;
    else posts.unshift(post);
    localStorage.setItem(KEY_POSTS, JSON.stringify(posts));
    window.dispatchEvent(new Event('nexus-posts-update'));
  }
};

export const deletePostById = async (postId: string) => {
  if (shouldUseCloud) {
    await deleteDoc(doc(db, 'posts', postId));
  } else {
    const postsStr = localStorage.getItem(KEY_POSTS);
    if (!postsStr) return;
    let posts = JSON.parse(postsStr).filter((p: SocialPost) => p.id !== postId);
    localStorage.setItem(KEY_POSTS, JSON.stringify(posts));
    window.dispatchEvent(new Event('nexus-posts-update'));
  }
};

export const clearAllPosts = async () => {
  if (shouldUseCloud) {
    // Firestore não tem "delete collection", precisa deletar um por um ou via Admin SDK.
    // Para simplificar no cliente:
    const q = collection(db, 'posts');
    // CUIDADO: Em produção isso pode ser caro.
    alert("Para limpar todos os posts na Nuvem, utilize o Console do Firebase para evitar custos excessivos de leitura/escrita.");
  } else {
    localStorage.removeItem(KEY_POSTS);
    window.dispatchEvent(new Event('nexus-posts-update'));
  }
};

export const bulkSavePosts = async (newPosts: SocialPost[]) => {
  if (shouldUseCloud) {
    const batch = writeBatch(db);
    newPosts.forEach(post => {
      const ref = doc(db, 'posts', post.id);
      batch.set(ref, post);
    });
    await batch.commit();
  } else {
    const postsStr = localStorage.getItem(KEY_POSTS);
    let posts: SocialPost[] = postsStr ? JSON.parse(postsStr) : [];
    newPosts.forEach(np => {
      if (!posts.find(p => p.id === np.id)) posts.push(np);
    });
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(KEY_POSTS, JSON.stringify(posts));
    window.dispatchEvent(new Event('nexus-posts-update'));
  }
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  if (shouldUseCloud) {
    // Real-time Cloud Sync
    return onSnapshot(collection(db, 'posts'), (snapshot) => {
      const posts = snapshot.docs.map(d => d.data() as SocialPost);
      posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(posts);
    }, onError);
  }

  // Local Sync
  const load = () => {
    const postsStr = localStorage.getItem(KEY_POSTS);
    onUpdate(postsStr ? JSON.parse(postsStr) : []);
  };
  load();
  window.addEventListener('nexus-posts-update', load);
  return () => window.removeEventListener('nexus-posts-update', load);
};

// --- VIRTUAL FILES (Mantidos Localmente por simplicidade de roteamento) ---

export const getVirtualFiles = (): VirtualFile[] => {
  const str = localStorage.getItem(KEY_VIRTUAL_FILES);
  return str ? JSON.parse(str) : [];
};

export const saveVirtualFile = (file: VirtualFile) => {
  const files = getVirtualFiles();
  const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
  const existingIndex = files.findIndex(f => f.path === cleanPath);
  const newFile = { ...file, path: cleanPath };

  if (existingIndex >= 0) files[existingIndex] = newFile;
  else files.push(newFile);
  
  localStorage.setItem(KEY_VIRTUAL_FILES, JSON.stringify(files));
};

export const deleteVirtualFile = (path: string) => {
  const files = getVirtualFiles().filter(f => f.path !== path);
  localStorage.setItem(KEY_VIRTUAL_FILES, JSON.stringify(files));
};

export const getVirtualFileContent = (path: string): string | null => {
  const files = getVirtualFiles();
  const file = files.find(f => f.path === path);
  return file ? file.content : null;
};
