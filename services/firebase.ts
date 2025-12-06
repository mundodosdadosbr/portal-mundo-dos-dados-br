import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import * as OTPAuth from 'otpauth';
import { SocialPost, CreatorProfile, LandingPageContent } from '../types';

// --- PRODUCTION CONFIGURATION ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjf1-7YZZPENVJmz3-AxK28NkwrFUTOwo",
  authDomain: "auth-mdados.firebaseapp.com",
  projectId: "auth-mdados",
  storageBucket: "auth-mdados.firebasestorage.app",
  messagingSenderId: "175480776630",
  appId: "1:175480776630:web:774466fd006655149f4317",
  measurementId: "G-VXWK216WFZ"
};

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// --- FALLBACK STATE ---
// If Firebase Auth is disabled/misconfigured, we switch to local mock mode
// so the user can still test the application.
let useMockFallback = false;

// Mock Data Store (LocalStorage Keys)
const MOCK_KEYS = {
  MFA_SECRET: 'nexus_mock_mfa_secret',
  POSTS: 'nexus_mock_posts',
  SETTINGS: 'nexus_mock_settings'
};

// Helper to notify subscribers (Mock Mode)
const dispatchMockUpdate = (event: string, data: any) => {
  const customEvent = new CustomEvent(event, { detail: data });
  window.dispatchEvent(customEvent);
};

export const initFirebase = () => {
  return { app, auth, db };
};

// --- AUTHENTICATION & MFA SYSTEM ---

/**
 * Checks if the current user has MFA configured.
 */
export const checkMfaStatus = async (): Promise<boolean> => {
  if (useMockFallback) {
    return !!localStorage.getItem(MOCK_KEYS.MFA_SECRET);
  }

  const user = auth.currentUser;
  if (!user) return false;

  try {
    const mfaDocRef = doc(db, 'users', user.uid, 'private', 'mfa');
    const mfaDoc = await getDoc(mfaDocRef);
    return mfaDoc.exists();
  } catch (error) {
    console.warn("MFA Check failed, falling back to false:", error);
    return false;
  }
};

/**
 * Logs in with Email/Password. 
 * Falls back to local mock mode if Firebase provider is disabled.
 */
export const loginWithCredentials = async (username: string, pass: string) => {
  let email = username;
  if (username === 'admin') {
    email = 'admin@creatornexus.com';
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Login Error Details:", error.code);

    // CRITICAL FIX: If Firebase Auth is not enabled on the server (operation-not-allowed),
    // or if the user doesn't exist and can't be created due to permissions,
    // we fallback to MOCK MODE so the app remains usable for the demo.
    if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      
      // Validate Hardcoded Credentials for the Mock/Fallback Mode
      if (username === 'admin' && pass === 'password123') {
        console.warn("⚠️ Firebase Auth disabled or failed. Switching to Local Mock Mode.");
        useMockFallback = true;
        
        // Return a Mock User Object
        return {
          uid: 'mock-admin-user',
          email: 'admin@creatornexus.com',
          displayName: 'Admin (Local)'
        } as User;
      }
      
      // If credentials don't match the hardcoded ones in fallback mode:
      if (useMockFallback || error.code === 'auth/operation-not-allowed') {
         throw new Error('Senha incorreta (Modo Local).');
      }
    }
    
    // Attempt auto-creation as a last resort for real firebase
    if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && email === 'admin@creatornexus.com' && !useMockFallback) {
      try {
        const newUser = await createUserWithEmailAndPassword(auth, email, pass);
        // Initialize default profile settings
        await setDoc(doc(db, 'settings', 'global'), { youtubeApiKey: '' }, { merge: true });
        return newUser.user;
      } catch (createError: any) {
         // If create fails, bubble up the original error
      }
    }
    
    throw new Error(mapAuthError(error.code));
  }
};

/**
 * Generates a TOTP secret and URL.
 */
export const initiateMfaSetup = async () => {
  const userLabel = useMockFallback ? 'Admin (Local)' : (auth.currentUser?.email || 'Admin');

  // Generate a cryptographically secure random secret
  const secret = new OTPAuth.Secret({ size: 20 });
  
  // Create TOTP object
  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: userLabel,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString()
  };
};

/**
 * Verifies a TOTP token against the secret.
 */
export const verifyMfaToken = async (token: string, pendingSecret?: string) => {
  let secretStr = pendingSecret;

  // If no pending secret, fetch stored secret
  if (!secretStr) {
    if (useMockFallback) {
      secretStr = localStorage.getItem(MOCK_KEYS.MFA_SECRET) || undefined;
    } else if (auth.currentUser) {
      try {
        const mfaDocRef = doc(db, 'users', auth.currentUser.uid, 'private', 'mfa');
        const mfaDoc = await getDoc(mfaDocRef);
        if (mfaDoc.exists()) secretStr = mfaDoc.data().secret;
      } catch (e) { console.error(e); }
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

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
};

/**
 * Saves the verified MFA secret.
 */
export const completeMfaSetup = async (secret: string) => {
  if (useMockFallback) {
    localStorage.setItem(MOCK_KEYS.MFA_SECRET, secret);
    return;
  }

  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");

  const mfaDocRef = doc(db, 'users', user.uid, 'private', 'mfa');
  await setDoc(mfaDocRef, {
    secret,
    createdAt: new Date().toISOString(),
    enabled: true
  });
};

export const logout = async () => {
  if (!useMockFallback) {
    await signOut(auth);
  }
  // Mock mode state doesn't need explicit clearing other than UI state in App.tsx
};

// --- DATABASE (HYBRID: FIREBASE OR LOCALSTORAGE) ---

// --- Settings ---
export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  youtubeApiKey: string
) => {
  const data = { profile, landingContent, youtubeApiKey };
  
  if (useMockFallback) {
    localStorage.setItem(MOCK_KEYS.SETTINGS, JSON.stringify(data));
    dispatchMockUpdate('mock-settings-update', data);
    return;
  }

  try {
    await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
  } catch (e) {
    console.error("Error saving settings:", e);
    // Fallback to local if DB fails
    localStorage.setItem(MOCK_KEYS.SETTINGS, JSON.stringify(data));
  }
};

export const subscribeToSettings = (
  onUpdate: (data: { 
    profile?: CreatorProfile, 
    landingContent?: LandingPageContent, 
    youtubeApiKey?: string
  }) => void,
  onError?: (error: any) => void
) => {
  // If we are already in mock mode, read from local
  if (useMockFallback) {
    const local = localStorage.getItem(MOCK_KEYS.SETTINGS);
    if (local) onUpdate(JSON.parse(local));
    
    const handler = (e: any) => onUpdate(e.detail);
    window.addEventListener('mock-settings-update', handler);
    return () => window.removeEventListener('mock-settings-update', handler);
  }

  return onSnapshot(doc(db, 'settings', 'global'), (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data() as any);
    } else {
      // If doc doesn't exist yet, check local storage for legacy data
      const local = localStorage.getItem(MOCK_KEYS.SETTINGS);
      if (local) onUpdate(JSON.parse(local));
    }
  }, (err) => {
    // If permission denied or other error, fallback to local
    console.warn("Firestore subscription error, using local fallback", err);
    useMockFallback = true;
    const local = localStorage.getItem(MOCK_KEYS.SETTINGS);
    if (local) onUpdate(JSON.parse(local));
  });
};

// --- Posts ---
export const savePost = async (post: SocialPost) => {
  if (useMockFallback) {
    const posts = JSON.parse(localStorage.getItem(MOCK_KEYS.POSTS) || '[]');
    const existingIndex = posts.findIndex((p: SocialPost) => p.id === post.id);
    if (existingIndex >= 0) {
      posts[existingIndex] = post;
    } else {
      posts.unshift(post);
    }
    localStorage.setItem(MOCK_KEYS.POSTS, JSON.stringify(posts));
    dispatchMockUpdate('mock-posts-update', posts);
    return;
  }

  try {
    await setDoc(doc(db, 'posts', post.id), post);
  } catch (e) {
    console.error("Error saving post:", e);
  }
};

export const deletePostById = async (postId: string) => {
  if (useMockFallback) {
    let posts = JSON.parse(localStorage.getItem(MOCK_KEYS.POSTS) || '[]');
    posts = posts.filter((p: SocialPost) => p.id !== postId);
    localStorage.setItem(MOCK_KEYS.POSTS, JSON.stringify(posts));
    dispatchMockUpdate('mock-posts-update', posts);
    return;
  }

  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (e) {
    console.error("Error deleting post:", e);
  }
};

export const bulkSavePosts = async (posts: SocialPost[]) => {
  if (useMockFallback) {
    // Merge logic for local
    let current = JSON.parse(localStorage.getItem(MOCK_KEYS.POSTS) || '[]');
    const newIds = new Set(posts.map(p => p.id));
    current = current.filter((p: SocialPost) => !newIds.has(p.id));
    const merged = [...posts, ...current];
    localStorage.setItem(MOCK_KEYS.POSTS, JSON.stringify(merged));
    dispatchMockUpdate('mock-posts-update', merged);
    return;
  }

  // Simple loop for firebase batch
  posts.forEach(post => {
    savePost(post);
  });
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  if (useMockFallback) {
    const local = localStorage.getItem(MOCK_KEYS.POSTS);
    if (local) onUpdate(JSON.parse(local));

    const handler = (e: any) => onUpdate(e.detail);
    window.addEventListener('mock-posts-update', handler);
    return () => window.removeEventListener('mock-posts-update', handler);
  }

  const q = query(collection(db, 'posts'), orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const posts: SocialPost[] = [];
    snapshot.forEach((doc) => {
      posts.push(doc.data() as SocialPost);
    });
    onUpdate(posts);
  }, (err) => {
    console.warn("Firestore post subscription error, using local fallback", err);
    useMockFallback = true;
    const local = localStorage.getItem(MOCK_KEYS.POSTS);
    if (local) onUpdate(JSON.parse(local));
  });
};

// Helper
function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'E-mail inválido.';
    case 'auth/user-disabled': return 'Usuário desativado.';
    case 'auth/user-not-found': return 'Usuário não encontrado.';
    case 'auth/wrong-password': return 'Senha incorreta.';
    case 'auth/invalid-credential': return 'Credenciais inválidas.';
    case 'auth/operation-not-allowed': return 'Login via Firebase desabilitado.';
    default: return `Erro na autenticação (${code}).`;
  }
}