
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import * as OTPAuth from 'otpauth';
import { CreatorProfile, LandingPageContent, SocialPost, TikTokAuthData, MetaAuthData } from '../types';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAjf1-7YZZPENVJmz3-AxK28NkwrFUTOwo",
  authDomain: "auth-mdados.firebaseapp.com",
  projectId: "auth-mdados",
  storageBucket: "auth-mdados.firebasestorage.app",
  messagingSenderId: "175480776630",
  appId: "1:175480776630:web:774466fd006655149f4317",
  measurementId: "G-VXWK216WFZ"
};

// --- INICIALIZAÇÃO (COMPAT/V8 SDK) ---
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

console.log("🚀 [CreatorNexus] Conectado ao Firebase (Compat SDK)");

// Tentar definir persistência
try {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => console.warn("Aviso de persistência:", e));
} catch (e) {
  console.warn("Falha ao configurar persistência:", e);
}

const KEY_UI_SESSION = 'nexus_ui_session_indicator';
const ALLOWED_EMAIL = 'diego.morais@mundodosdadosbr.com';

// LocalStorage Keys for Shadow Storage (Demo Mode)
const SHADOW_SETTINGS_KEY = 'nexus_shadow_settings';
const SHADOW_POSTS_KEY = 'nexus_shadow_posts';

export interface VirtualFile {
  path: string;
  content: string;
  type: string;
}

// --- AUTHENTICATION ---

export const initFirebase = () => {
  // Apenas monitora
};

export const isAuthenticated = () => {
  return !!localStorage.getItem(KEY_UI_SESSION);
};

export const isMockMode = () => {
  return localStorage.getItem('nexus_mock_mode') === 'true';
};

// Mock User for Fallback
const MOCK_ADMIN_USER: any = {
  uid: 'mock-admin-uid',
  displayName: 'Admin (Modo Demo)',
  email: ALLOWED_EMAIL,
  photoURL: 'https://storage.googleapis.com/mdados-images-publics/images-portais-link/logo-social-preview.png'
};

export const loginWithGoogle = async () => {
  const isLocalFile = window.location.protocol === 'file:' || window.location.protocol === 'about:';
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalFile || !isSecure) {
    console.warn("⚠️ Ambiente restrito detectado. Ativando Modo Demo.");
    localStorage.setItem('nexus_mock_mode', 'true');
    return MOCK_ADMIN_USER;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    if (!user) throw new Error("Nenhum usuário retornado.");

    if (user.email !== ALLOWED_EMAIL) {
      await auth.signOut();
      throw new Error(`Acesso negado. O e-mail ${user.email} não tem permissão de administrador.`);
    }
    
    localStorage.removeItem('nexus_mock_mode');
    return user;

  } catch (error: any) {
    console.error("Erro no Google Auth:", error);
    const isEnvError = 
      error.code === 'auth/operation-not-supported-in-this-environment' || 
      error.code === 'auth/unauthorized-domain' ||
      error.message?.toLowerCase().includes('protocol') ||
      error.message?.toLowerCase().includes('location.protocol') ||
      error.message?.toLowerCase().includes('web storage');

    if (isEnvError || error.code === 'auth/popup-closed-by-user') {
      localStorage.setItem('nexus_mock_mode', 'true');
      return MOCK_ADMIN_USER;
    }
    throw error;
  }
};

export const logout = async () => {
  localStorage.removeItem(KEY_UI_SESSION);
  localStorage.removeItem('nexus_mock_mode');
  try {
    await auth.signOut();
  } catch (e) {}
};

// --- MFA LOGIC ---

export const checkMfaStatus = async (uid: string): Promise<boolean> => {
  if (isMockMode()) return true;
  try {
    const docRef = db.collection('users').doc(uid).collection('private').doc('mfa');
    const docSnap = await docRef.get();
    return docSnap.exists;
  } catch (e) {
    return false;
  }
};

export const initiateMfaSetup = () => {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'MundoDosDadosBR',
    label: ALLOWED_EMAIL,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  return { secret: secret.base32, otpauthUrl: totp.toString() };
};

export const verifyMfaToken = async (token: string, uid: string, pendingSecret?: string) => {
  if (isMockMode()) return true;
  let secretStr = pendingSecret;
  if (!secretStr) {
    try {
      const docRef = db.collection('users').doc(uid).collection('private').doc('mfa');
      const docSnap = await docRef.get();
      if (docSnap.exists) secretStr = docSnap.data()?.secret;
    } catch (e) {}
  }
  if (!secretStr) return false;
  const totp = new OTPAuth.TOTP({
    issuer: 'MundoDosDadosBR',
    label: ALLOWED_EMAIL,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretStr)
  });
  return totp.validate({ token, window: 1 }) !== null;
};

export const saveMfaSecret = async (uid: string, secret: string) => {
  if (isMockMode()) return;
  try {
    await db.collection('users').doc(uid).collection('private').doc('mfa').set({ secret, createdAt: new Date().toISOString() });
  } catch (e) {}
};

export const setUiSession = () => {
  localStorage.setItem(KEY_UI_SESSION, 'true');
};

// --- SETTINGS & KEYS ---

export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  keys: { youtube?: string, tiktokAuth?: Partial<TikTokAuthData>, metaAuth?: Partial<MetaAuthData> }
) => {
  const data = { profile, landingContent, keys };
  if (isMockMode()) {
    localStorage.setItem(SHADOW_SETTINGS_KEY, JSON.stringify(data));
    console.log("💾 [ShadowStorage] Settings salvas localmente (Modo Demo)");
    return;
  }

  try {
    await db.collection('settings').doc('global_config').set(data, { merge: true });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.warn("⚠️ Sem permissão para salvar no Firestore. Usando Shadow Storage.");
      localStorage.setItem(SHADOW_SETTINGS_KEY, JSON.stringify(data));
    }
  }
};

export const subscribeToSettings = (
  onUpdate: (data: any) => void,
  onError?: (error: any) => void
) => {
  // If we have shadow data, notify immediately
  const shadowData = localStorage.getItem(SHADOW_SETTINGS_KEY);
  if (shadowData) {
    try {
      onUpdate(JSON.parse(shadowData));
    } catch (e) {}
  }

  return db.collection('settings').doc('global_config').onSnapshot((docSnap) => {
    if (docSnap.exists) {
      const data = docSnap.data();
      // Only override if not in mock mode or if shadow data doesn't exist
      if (!isMockMode() || !shadowData) {
        onUpdate({
          profile: data?.profile,
          landingContent: data?.landingContent,
          keys: {
              youtube: data?.keys?.youtube || '',
              tiktokAuth: data?.keys?.tiktokAuth || {},
              metaAuth: data?.keys?.metaAuth || {}
          }
        });
      }
    }
  }, (err) => {
    if (onError) onError(err);
  });
};

// --- POSTS ---

export const savePost = async (post: SocialPost) => {
  if (isMockMode()) {
    const shadowPosts = JSON.parse(localStorage.getItem(SHADOW_POSTS_KEY) || '[]');
    const newPosts = [post, ...shadowPosts.filter((p: any) => p.id !== post.id)];
    localStorage.setItem(SHADOW_POSTS_KEY, JSON.stringify(newPosts));
    return;
  }
  try { await db.collection('posts').doc(post.id).set(post); } catch (e) {}
};

export const deletePostById = async (postId: string) => {
  if (isMockMode()) {
    const shadowPosts = JSON.parse(localStorage.getItem(SHADOW_POSTS_KEY) || '[]');
    localStorage.setItem(SHADOW_POSTS_KEY, JSON.stringify(shadowPosts.filter((p: any) => p.id !== postId)));
    return;
  }
  try { await db.collection('posts').doc(postId).delete(); } catch (e) {}
};

export const clearAllPosts = async () => {
  if (isMockMode()) {
    localStorage.removeItem(SHADOW_POSTS_KEY);
    return;
  }
  try {
    const snapshot = await db.collection('posts').get();
    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } catch (e) {}
};

export const bulkSavePosts = async (newPosts: SocialPost[]) => {
  if (isMockMode()) {
    localStorage.setItem(SHADOW_POSTS_KEY, JSON.stringify(newPosts));
    return;
  }

  try {
    const batch = db.batch();
    // 1. Limpa os posts existentes no banco para evitar dados "presos"
    const snapshot = await db.collection('posts').get();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));

    // 2. Insere os novos posts atualizados
    newPosts.forEach(post => {
      const ref = db.collection('posts').doc(post.id);
      batch.set(ref, post); 
    });
    
    await batch.commit();
  } catch (e: any) {
    if (e.code === 'permission-denied') {
       console.warn("⚠️ Sem permissão para Bulk Save. Usando Shadow Storage.");
       localStorage.setItem(SHADOW_POSTS_KEY, JSON.stringify(newPosts));
    }
  }
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  const shadowPosts = JSON.parse(localStorage.getItem(SHADOW_POSTS_KEY) || '[]');
  if (shadowPosts.length > 0) onUpdate(shadowPosts);

  return db.collection('posts').onSnapshot((snapshot) => {
    const firestorePosts = snapshot.docs.map(d => d.data() as SocialPost);
    if (!isMockMode() || firestorePosts.length > 0) {
      const sorted = firestorePosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(sorted);
    }
  }, (err) => {
    if (onError) onError(err);
  });
};

// --- VISITS / ANALYTICS ---

export const logVisit = async () => {
  const sessionKey = 'nexus_visit_logged';
  if (sessionStorage.getItem(sessionKey)) return;
  try {
    await db.collection('stats').doc('global').set({
      totalVisits: firebase.firestore.FieldValue.increment(1),
      lastVisit: new Date().toISOString()
    }, { merge: true });
    sessionStorage.setItem(sessionKey, 'true');
  } catch (e) {}
};

export const getSiteStats = async () => {
  try {
    const doc = await db.collection('stats').doc('global').get();
    return { totalVisits: doc.exists ? doc.data()?.totalVisits || 0 : 0 };
  } catch (e) {
    return { totalVisits: 0 };
  }
};

// --- VIRTUAL FILES ---

export const getVirtualFilesCloud = async (): Promise<VirtualFile[]> => {
  try {
    const snapshot = await db.collection('virtual_files').get();
    return snapshot.docs.map(d => d.data() as VirtualFile);
  } catch (e) { return []; }
};

export const checkVirtualFileContent = async (path: string): Promise<string | null> => {
  try {
    const safeId = path.replace(/[^a-zA-Z0-9.-]/g, '_');
    const docSnap = await db.collection('virtual_files').doc(safeId).get();
    return docSnap.exists ? docSnap.data()?.content : null;
  } catch (e) { return null; }
};

export const saveVirtualFile = async (file: VirtualFile) => {
  if (isMockMode()) return;
  try {
    const safeId = file.path.replace(/[^a-zA-Z0-9.-]/g, '_');
    await db.collection('virtual_files').doc(safeId).set(file);
  } catch (e) {}
};

export const deleteVirtualFile = async (path: string) => {
  if (isMockMode()) return;
  try {
    const safeId = path.replace(/[^a-zA-Z0-9.-]/g, '_');
    await db.collection('virtual_files').doc(safeId).delete();
  } catch (e) {}
};
