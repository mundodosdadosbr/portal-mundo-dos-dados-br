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

// Helper to notify subscribers (kept for compatibility with UI hooks, though Firestore handles real-time)
const dispatchUpdate = (event: string) => {
  window.dispatchEvent(new Event(event));
};

export const initFirebase = () => {
  return { app, auth, db };
};

// --- AUTHENTICATION & MFA SYSTEM (PRODUCTION) ---

/**
 * Checks if the current user has MFA configured in Firestore.
 */
export const checkMfaStatus = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    // We store MFA secrets in a sub-collection or protected document
    const mfaDocRef = doc(db, 'users', user.uid, 'private', 'mfa');
    const mfaDoc = await getDoc(mfaDocRef);
    return mfaDoc.exists();
  } catch (error) {
    console.error("Error checking MFA status:", error);
    return false;
  }
};

/**
 * Logs in with Email/Password. 
 * Falls back to creating the user if it's the specific admin demo account and doesn't exist yet.
 */
export const loginWithCredentials = async (username: string, pass: string) => {
  let email = username;
  
  // Helper for the demo: map 'admin' to an email
  if (username === 'admin') {
    email = 'admin@creatornexus.com';
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    // AUTO-CREATE ADMIN USER FOR FIRST TIME SETUP
    if (error.code === 'auth/user-not-found' && email === 'admin@creatornexus.com') {
      try {
        const newUser = await createUserWithEmailAndPassword(auth, email, pass);
        // Initialize default profile settings for new admin
        const defaultProfileRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(defaultProfileRef);
        if (!docSnap.exists()) {
           // Create initial structure if DB is empty
           await setDoc(defaultProfileRef, {
             youtubeApiKey: ''
           }, { merge: true });
        }
        return newUser.user;
      } catch (createError: any) {
        throw new Error(mapAuthError(createError.code));
      }
    }
    throw new Error(mapAuthError(error.code));
  }
};

/**
 * Generates a real TOTP secret and URL using otpauth library.
 */
export const initiateMfaSetup = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");

  // Generate a cryptographically secure random secret
  const secret = new OTPAuth.Secret({ size: 20 });
  
  // Create TOTP object
  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: user.email || 'Admin',
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
 * If validating during setup, 'pendingSecret' is passed.
 * If validating login, retrieves secret from Firestore.
 */
export const verifyMfaToken = async (token: string, pendingSecret?: string) => {
  const user = auth.currentUser;
  if (!user) return false;

  let secretStr = pendingSecret;

  // If no pending secret provided, fetch the stored one
  if (!secretStr) {
    const mfaDocRef = doc(db, 'users', user.uid, 'private', 'mfa');
    const mfaDoc = await getDoc(mfaDocRef);
    if (!mfaDoc.exists()) return false; // MFA not set up
    secretStr = mfaDoc.data().secret;
  }

  if (!secretStr) return false;

  // Validate using OTPAuth library
  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: user.email || 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretStr)
  });

  // validate() returns the delta (or null if invalid)
  // window: 1 allows for 30 seconds clock drift
  const delta = totp.validate({ token, window: 1 });
  
  return delta !== null;
};

/**
 * Saves the verified MFA secret to Firestore.
 */
export const completeMfaSetup = async (secret: string) => {
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
  await signOut(auth);
};

// --- FIRESTORE DATABASE (REAL-TIME) ---

// Settings
export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  youtubeApiKey: string
) => {
  try {
    await setDoc(doc(db, 'settings', 'global'), {
      profile,
      landingContent,
      youtubeApiKey
    }, { merge: true });
  } catch (e) {
    console.error("Error saving settings:", e);
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
  return onSnapshot(doc(db, 'settings', 'global'), (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data() as any);
    }
  }, onError);
};

// Posts
export const savePost = async (post: SocialPost) => {
  try {
    await setDoc(doc(db, 'posts', post.id), post);
  } catch (e) {
    console.error("Error saving post:", e);
  }
};

export const deletePostById = async (postId: string) => {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (e) {
    console.error("Error deleting post:", e);
  }
};

export const bulkSavePosts = async (posts: SocialPost[]) => {
  // Firestore batch write
  // Note: Batch limit is 500 operations. For simplicity, we loop here, 
  // but in high volume production, utilize writeBatch()
  posts.forEach(post => {
    savePost(post);
  });
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  // Query posts ordered by date descending
  const q = query(collection(db, 'posts'), orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const posts: SocialPost[] = [];
    snapshot.forEach((doc) => {
      posts.push(doc.data() as SocialPost);
    });
    onUpdate(posts);
  }, onError);
};


// Helper
function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'E-mail inválido.';
    case 'auth/user-disabled': return 'Usuário desativado.';
    case 'auth/user-not-found': return 'Usuário não encontrado.';
    case 'auth/wrong-password': return 'Senha incorreta.';
    case 'auth/invalid-credential': return 'Credenciais inválidas.';
    default: return 'Erro na autenticação. Tente novamente.';
  }
}
