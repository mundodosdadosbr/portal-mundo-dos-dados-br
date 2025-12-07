
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
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { SocialPost, CreatorProfile, LandingPageContent } from '../types';
import * as OTPAuth from 'otpauth';

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

// --- INICIALIZAÇÃO ESTRITA ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistência de autenticação
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Erro na persistência de auth:", error);
});

console.log("🚀 [CreatorNexus] Rodando em modo CLOUD-ONLY (Firestore Ativo)");

// Mantemos apenas este token local para evitar "flicker" de UI no refresh,
// mas a validação real acontece via onAuthStateChanged
const KEY_UI_SESSION = 'nexus_ui_session_indicator';

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

export const initFirebase = () => {
  onAuthStateChanged(auth, (user: User | null) => {
     if (user) {
       localStorage.setItem(KEY_UI_SESSION, 'true');
     } else {
       localStorage.removeItem(KEY_UI_SESSION);
     }
  });
};

export const isAuthenticated = () => {
  // Verificação otimista para UI baseada na sessão anterior
  return !!localStorage.getItem(KEY_UI_SESSION) || !!auth.currentUser;
};

export const loginWithCredentials = async (username: string, pass: string) => {
  let email = username;
  if (!email.includes('@')) email = `${username}@creatornexus.com`;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Erro Firebase Auth:", error.code);

    if (error.code === 'auth/operation-not-allowed') {
      // Como removemos o modo local, precisamos alertar o usuário
      throw new Error("CRÍTICO: O login por Email/Senha não está ativado no Firebase Console. Ative-o em Authentication > Sign-in method.");
    }

    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
       throw new Error("Usuário ou senha incorretos.");
    }
    
    throw new Error(`Erro no login: ${error.message}`);
  }
};

export const logout = async () => {
  localStorage.removeItem(KEY_UI_SESSION);
  await signOut(auth);
};

// --- MFA (CLOUD ONLY) ---

export const checkMfaStatus = async (): Promise<boolean> => {
  if (!auth.currentUser) return false;
  
  try {
    const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'mfa');
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (e) {
    console.error("Erro MFA Cloud:", e);
    return false;
  }
};

export const initiateMfaSetup = async () => {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: auth.currentUser?.email || 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  return { secret: secret.base32, otpauthUrl: totp.toString() };
};

export const verifyMfaToken = async (token: string, pendingSecret?: string) => {
  let secretStr = pendingSecret;

  if (!secretStr && auth.currentUser) {
     try {
       const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'mfa');
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
         secretStr = docSnap.data().secret;
       }
     } catch (e) {
       console.error("Erro ao verificar token MFA:", e);
       return false;
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

  return totp.validate({ token, window: 1 }) !== null;
};

export const completeMfaSetup = async (secret: string) => {
  if (!auth.currentUser) throw new Error("Usuário não autenticado.");
  
  await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'mfa'), {
    secret,
    updatedAt: new Date().toISOString()
  });
};

// --- SETTINGS & KEYS (CLOUD ONLY) ---

export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  keys: { youtube?: string, tiktokAuth?: Partial<TikTokAuthData> }
) => {
  // Salva no documento global para que todos vejam as mesmas configs
  await setDoc(doc(db, 'settings', 'global_config'), {
    profile,
    landingContent,
    keys
  }, { merge: true });
};

export const subscribeToSettings = (
  onUpdate: (data: { 
    profile?: CreatorProfile, 
    landingContent?: LandingPageContent, 
    keys: { youtube: string, tiktokAuth: TikTokAuthData }
  }) => void,
  onError?: (error: any) => void
) => {
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
};

// --- POSTS (CLOUD ONLY) ---

export const savePost = async (post: SocialPost) => {
  await setDoc(doc(db, 'posts', post.id), post);
};

export const deletePostById = async (postId: string) => {
  await deleteDoc(doc(db, 'posts', postId));
};

export const clearAllPosts = async () => {
  // Como deletar coleções inteiras é pesado no cliente,
  // vamos listar e deletar em batch (limitado a operações pequenas de demo)
  const snapshot = await getDocs(collection(db, 'posts'));
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};

export const bulkSavePosts = async (newPosts: SocialPost[]) => {
  const batch = writeBatch(db);
  newPosts.forEach(post => {
    const ref = doc(db, 'posts', post.id);
    batch.set(ref, post);
  });
  await batch.commit();
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  return onSnapshot(collection(db, 'posts'), (snapshot) => {
    const posts = snapshot.docs.map(d => d.data() as SocialPost);
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(posts);
  }, onError);
};

// --- VIRTUAL FILES (CLOUD ONLY) ---

// Agora os arquivos virtuais (ads.txt, etc) também ficam no Firestore
// Collection: virtual_files

export const getVirtualFilesCloud = async (): Promise<VirtualFile[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'virtual_files'));
    return snapshot.docs.map(d => d.data() as VirtualFile);
  } catch (e) {
    console.error("Erro ao buscar arquivos virtuais:", e);
    return [];
  }
};

export const checkVirtualFileContent = async (path: string): Promise<string | null> => {
  // Helper para o App.tsx checar rota
  try {
    // Busca exata pelo ID (usando path como ID para facilitar)
    // path vem sem a barra inicial, ex: "ads.txt"
    const safeId = path.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizar para ID de doc
    const docRef = doc(db, 'virtual_files', safeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().content;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const saveVirtualFile = async (file: VirtualFile) => {
  const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
  const safeId = cleanPath.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  await setDoc(doc(db, 'virtual_files', safeId), {
    ...file,
    path: cleanPath
  });
};

export const deleteVirtualFile = async (path: string) => {
  const safeId = path.replace(/[^a-zA-Z0-9.-]/g, '_');
  await deleteDoc(doc(db, 'virtual_files', safeId));
};
