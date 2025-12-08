

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
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => console.warn("Aviso de persistência:", e));

const KEY_UI_SESSION = 'nexus_ui_session_indicator';
const ALLOWED_EMAIL = 'diego.morais@mundodosdadosbr.com';

// --- TYPES ---
// Removed locally defined interfaces in favor of shared types in types.ts

export interface VirtualFile {
  path: string;
  content: string;
  type: string;
}

// --- AUTHENTICATION ---

export const initFirebase = () => {
  // Apenas monitora, mas a decisão de "estar logado na UI" depende do MFA no App.tsx
};

export const isAuthenticated = () => {
  return !!localStorage.getItem(KEY_UI_SESSION);
};

// Mock User for Fallback
const MOCK_ADMIN_USER: any = {
  uid: 'mock-admin-uid',
  displayName: 'Admin (Modo Demo)',
  email: ALLOWED_EMAIL,
  photoURL: 'images/logo.png'
};

export const loginWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    if (!user) throw new Error("Nenhum usuário retornado.");

    // 1. EMAIL RESTRICTION CHECK
    if (user.email !== ALLOWED_EMAIL) {
      await auth.signOut();
      throw new Error(`Acesso negado. O e-mail ${user.email} não tem permissão de administrador.`);
    }
    
    // Check/Create initial config for new user
    const userRef = db.collection('settings').doc('global_config');
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        profile: {
            name: user.displayName || "Mundo dos Dados",
            handle: "@mundodosdadosbr",
            avatarUrl: user.photoURL || "images/logo.png",
            subscribers: "0",
            bio: "Admin do Sistema"
        }
      }, { merge: true });
    }

    localStorage.removeItem('nexus_mock_mode');
    return user;

  } catch (error: any) {
    console.error("Erro no Google Auth:", error);
    
    if (error.code === 'auth/operation-not-supported-in-this-environment' || 
        error.message?.includes('protocol') ||
        error.code === 'auth/popup-closed-by-user') {
          
      console.warn("⚠️ Ambiente restrito. Ativando Modo Demo.");
      localStorage.setItem('nexus_mock_mode', 'true');
      return MOCK_ADMIN_USER;
    }

    if (error.code === 'auth/operation-not-allowed') {
       throw new Error("Login com Google não habilitado no console do Firebase.");
    }
    throw error;
  }
};

export const logout = async () => {
  localStorage.removeItem(KEY_UI_SESSION);
  localStorage.removeItem('nexus_mock_mode');
  await auth.signOut();
};

// --- MFA LOGIC (TOTP) ---

export const checkMfaStatus = async (uid: string): Promise<boolean> => {
  if (localStorage.getItem('nexus_mock_mode')) return true;

  try {
    const docRef = db.collection('users').doc(uid).collection('private').doc('mfa');
    const docSnap = await docRef.get();
    return docSnap.exists;
  } catch (e) {
    console.error("Erro ao checar MFA:", e);
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
  if (localStorage.getItem('nexus_mock_mode')) return true;

  let secretStr = pendingSecret;

  if (!secretStr) {
    const docRef = db.collection('users').doc(uid).collection('private').doc('mfa');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      secretStr = docSnap.data()?.secret;
    }
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
  if (localStorage.getItem('nexus_mock_mode')) return;

  await db.collection('users').doc(uid).collection('private').doc('mfa').set({
    secret,
    createdAt: new Date().toISOString()
  });
};

export const setUiSession = () => {
  localStorage.setItem(KEY_UI_SESSION, 'true');
};

// --- SETTINGS & KEYS ---

export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  keys: { 
    youtube?: string, 
    tiktokAuth?: Partial<TikTokAuthData>,
    metaAuth?: Partial<MetaAuthData> 
  }
) => {
  try {
    await db.collection('settings').doc('global_config').set({
      profile,
      landingContent,
      keys
    }, { merge: true });
  } catch (e) {
    console.warn("Erro ao salvar settings (pode ser permissão):", e);
  }
};

export const subscribeToSettings = (
  onUpdate: (data: { 
    profile?: CreatorProfile, 
    landingContent?: LandingPageContent, 
    keys: { 
      youtube: string, 
      tiktokAuth: TikTokAuthData,
      metaAuth: MetaAuthData 
    }
  }) => void,
  onError?: (error: any) => void
) => {
  return db.collection('settings').doc('global_config').onSnapshot((docSnap) => {
    if (docSnap.exists) {
      const data = docSnap.data();
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
  }, onError);
};

// --- POSTS ---

export const savePost = async (post: SocialPost) => {
  await db.collection('posts').doc(post.id).set(post);
};

export const deletePostById = async (postId: string) => {
  await db.collection('posts').doc(postId).delete();
};

export const clearAllPosts = async () => {
  const querySnapshot = await db.collection('posts').get();
  const batch = db.batch();
  querySnapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
};

export const bulkSavePosts = async (newPosts: SocialPost[]) => {
  const batch = db.batch();
  newPosts.forEach(post => {
    const ref = db.collection('posts').doc(post.id);
    batch.set(ref, post);
  });
  await batch.commit();
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  return db.collection('posts').onSnapshot((snapshot) => {
    const posts = snapshot.docs.map(d => d.data() as SocialPost);
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(posts);
  }, onError);
};

// --- VIRTUAL FILES ---

export const getVirtualFilesCloud = async (): Promise<VirtualFile[]> => {
  try {
    const snapshot = await db.collection('virtual_files').get();
    return snapshot.docs.map(d => d.data() as VirtualFile);
  } catch (e) {
    console.error("Erro ao buscar arquivos virtuais:", e);
    return [];
  }
};

export const checkVirtualFileContent = async (path: string): Promise<string | null> => {
  try {
    const safeId = path.replace(/[^a-zA-Z0-9.-]/g, '_');
    const docSnap = await db.collection('virtual_files').doc(safeId).get();
    
    if (docSnap.exists) {
      return docSnap.data()?.content;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const saveVirtualFile = async (file: VirtualFile) => {
  const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
  const safeId = cleanPath.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  await db.collection('virtual_files').doc(safeId).set({
    ...file,
    path: cleanPath
  });
};

export const deleteVirtualFile = async (path: string) => {
  const safeId = path.replace(/[^a-zA-Z0-9.-]/g, '_');
  await db.collection('virtual_files').doc(safeId).delete();
};
