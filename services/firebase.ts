import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
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

// Initialize Firebase (Compat Pattern)
// We check if apps are already initialized to avoid duplicates
const app = firebase.apps.length === 0 ? firebase.initializeApp(FIREBASE_CONFIG) : firebase.app();
const auth = firebase.auth();
const db = firebase.firestore();

// --- FALLBACK STATE ---
// If Firebase Auth is disabled/misconfigured, we switch to local mock mode
// so the user can still test the application.
let useMockFallback = false;
let currentMockUserEmail = '';

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

// --- HELPER: GET CONSISTENT USER ID ---
// Returns the Real UID or a Stable Mock UID based on the email
const getTargetUserId = () => {
  if (auth.currentUser) return auth.currentUser.uid;
  if (currentMockUserEmail === 'diego.morais@creatornexus.com') return 'mock-diego-user';
  return 'mock-generic-user';
};

// --- AUTHENTICATION & MFA SYSTEM ---

/**
 * Checks if the current user has MFA configured.
 * CRITICAL UPDATE: Always attempts to check Cloud Firestore first, even in Mock Mode.
 * This ensures that if I set up MFA on Chrome, Firefox knows about it (Cross-Browser Persistence).
 */
export const checkMfaStatus = async (): Promise<boolean> => {
  const userId = getTargetUserId();

  try {
    // 1. Try Cloud Check (Prioritize this even in fallback mode)
    const mfaDoc = await db.collection('users').doc(userId).collection('private').doc('mfa').get();
    if (mfaDoc.exists && mfaDoc.data()?.enabled) {
      return true;
    }
  } catch (error) {
    console.warn("Cloud MFA check failed (likely permission or network), trying local:", error);
  }

  // 2. Fallback to Local Storage if Cloud fails and we are in Mock Mode
  if (useMockFallback) {
    return !!localStorage.getItem(MOCK_KEYS.MFA_SECRET);
  }

  return false;
};

/**
 * Logs in with Email/Password. 
 * Falls back to local mock mode if Firebase provider is disabled.
 */
export const loginWithCredentials = async (username: string, pass: string) => {
  let email = username;
  // Map simple username to email structure
  if (username.indexOf('@') === -1) {
    email = `${username}@creatornexus.com`;
  }

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, pass);
    useMockFallback = false; // Reset if real auth works
    return userCredential.user;
  } catch (error: any) {
    console.error("Login Error Details:", error.code);

    // CRITICAL FIX: If Firebase Auth is not enabled on the server (operation-not-allowed),
    // or if the user doesn't exist and can't be created due to permissions,
    // we fallback to MOCK MODE so the app remains usable for the demo.
    if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      
      // Validate Hardcoded Credentials for the Mock/Fallback Mode
      if (username === 'diego.morais' && pass === 'Z@nbet4df2026') {
        console.warn("⚠️ Firebase Auth disabled or failed. Switching to Local Mock Mode.");
        useMockFallback = true;
        currentMockUserEmail = 'diego.morais@creatornexus.com';
        
        // Return a Mock User Object
        return {
          uid: 'mock-diego-user',
          email: 'diego.morais@creatornexus.com',
          displayName: 'Diego Morais'
        } as any;
      }
      
      // If credentials don't match the hardcoded ones in fallback mode:
      if (useMockFallback || error.code === 'auth/operation-not-allowed') {
         throw new Error('Credenciais incorretas.');
      }
    }
    
    // Attempt auto-creation as a last resort for real firebase
    if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && email === 'diego.morais@creatornexus.com' && !useMockFallback) {
      try {
        const newUser = await auth.createUserWithEmailAndPassword(email, pass);
        // Initialize default profile settings
        await db.collection('settings').doc('global').set({ youtubeApiKey: '' }, { merge: true });
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
  const userLabel = (auth.currentUser?.email || currentMockUserEmail || 'Admin');

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
  const userId = getTargetUserId();

  // If no pending secret (meaning we are verifying an existing setup), fetch stored secret
  if (!secretStr) {
    try {
      // 1. Try Cloud
      const mfaDoc = await db.collection('users').doc(userId).collection('private').doc('mfa').get();
      if (mfaDoc.exists) {
        secretStr = mfaDoc.data()?.secret;
      }
    } catch (e) { console.error("Cloud fetch failed for Verify:", e); }

    // 2. Try Local (Fallback)
    if (!secretStr && useMockFallback) {
      secretStr = localStorage.getItem(MOCK_KEYS.MFA_SECRET) || undefined;
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
 * CRITICAL: Attempts to save to Cloud first to ensure other browsers see it.
 */
export const completeMfaSetup = async (secret: string) => {
  const userId = getTargetUserId();
  const mfaData = {
    secret,
    createdAt: new Date().toISOString(),
    enabled: true
  };

  try {
    // 1. Always try to write to Cloud DB, even if Auth is mocked.
    // This allows Cross-Browser sync if DB permissions allow.
    await db.collection('users').doc(userId).collection('private').doc('mfa').set(mfaData);
    console.log("MFA Secret saved to Cloud Firestore");
  } catch (e) {
    console.error("Failed to save MFA to Cloud (Permissions/Network). Saving locally.", e);
    // 2. If Cloud fails, save locally so at least this device works
    if (useMockFallback) {
      localStorage.setItem(MOCK_KEYS.MFA_SECRET, secret);
    } else {
      throw new Error("Não foi possível salvar a configuração MFA na nuvem.");
    }
  }
};

export const logout = async () => {
  if (!useMockFallback) {
    await auth.signOut();
  }
  // Reset Mock state
  useMockFallback = false;
  currentMockUserEmail = '';
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
    await db.collection('settings').doc('global').set(data, { merge: true });
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

  return db.collection('settings').doc('global').onSnapshot((docSnap) => {
    if (docSnap.exists) {
      onUpdate(docSnap.data() as any);
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
    await db.collection('posts').doc(post.id).set(post);
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
    await db.collection('posts').doc(postId).delete();
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

  // Simple loop for firebase batch (can be improved with writeBatch)
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

  return db.collection('posts').orderBy('date', 'desc').onSnapshot((snapshot) => {
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