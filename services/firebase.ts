import { SocialPost, CreatorProfile, LandingPageContent } from '../types';

// Mock types to replace missing Firebase types
type FirestoreError = Error;

// Chave para armazenar a config no localStorage (para persistir entre reloads sem env vars)
const FIREBASE_CONFIG_KEY = 'nexus_firebase_config';

let isInitialized = false;

export const isFirebaseConfigured = (): boolean => {
  return !!localStorage.getItem(FIREBASE_CONFIG_KEY);
};

export const resetFirebaseConfig = () => {
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
  window.location.reload();
};

export const saveFirebaseConfig = (config: any) => {
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  window.location.reload();
};

export const initFirebase = () => {
  if (isInitialized) return { app: {}, auth: {}, db: {} };

  const configStr = localStorage.getItem(FIREBASE_CONFIG_KEY);
  // Simulating successful initialization if config exists, using Mocks
  if (configStr) {
    console.warn("Firebase module not found. Running in Mock Mode.");
    isInitialized = true;
    return { app: {}, auth: {}, db: {} };
  }

  return { app: undefined, auth: undefined, db: undefined };
};

// --- AUTH ---
export const loginWithGoogle = async () => {
  console.log("Mocking Google Login...");
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    user: {
      displayName: "Admin Mock",
      email: "admin@mock.com",
      photoURL: "https://ui-avatars.com/api/?name=Admin+Mock&background=6366f1&color=fff"
    }
  };
};

export const logout = async () => {
  console.log("Mock Logout");
};

// --- DATABASE (FIRESTORE) ---

// Configurações Gerais (Perfil, Landing Page)
export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  youtubeApiKey: string
) => {
  console.log("Mock Save Settings:", { profile, landingContent, youtubeApiKey });
};

export const subscribeToSettings = (
  onUpdate: (data: { profile?: CreatorProfile, landingContent?: LandingPageContent, youtubeApiKey?: string }) => void,
  onError?: (error: FirestoreError) => void
) => {
  // Mock subscription - does nothing
  return () => {};
};

// Posts
export const savePost = async (post: SocialPost) => {
  console.log("Mock Save Post:", post);
};

export const deletePostById = async (postId: string) => {
  console.log("Mock Delete Post:", postId);
};

export const bulkSavePosts = async (posts: SocialPost[]) => {
  console.log("Mock Bulk Save:", posts.length);
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  // Mock subscription - does nothing
  return () => {};
};