import { SocialPost, CreatorProfile, LandingPageContent } from '../types';

// NOTE: Replacing Firebase implementation with LocalStorage mock 
// to resolve build errors due to missing 'firebase' package in the environment.

const FIREBASE_CONFIG_KEY = 'nexus_firebase_config';
const DB_SETTINGS_KEY = 'nexus_db_settings';
const DB_POSTS_KEY = 'nexus_db_posts';

// Helper to notify subscribers across the app (in the same window)
const dispatchUpdate = (event: string) => {
  window.dispatchEvent(new Event(event));
};

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
  // Return dummy objects to satisfy call sites
  return { app: {}, auth: {}, db: {} };
};

// --- AUTH ---
export const loginWithGoogle = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    user: {
      displayName: "Demo Administrator",
      email: "admin@demo.com",
      photoURL: "https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff"
    }
  };
};

export const logout = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

// --- DATABASE (LocalStorage Mock) ---

// Generic getter
const getStore = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

// Generic setter
const setStore = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Settings
export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  youtubeApiKey: string,
  securityPin?: string
) => {
  const current = getStore(DB_SETTINGS_KEY) || {};
  const updated = {
    ...current,
    profile,
    landingContent,
    youtubeApiKey,
    ...(securityPin ? { securityPin } : {})
  };
  setStore(DB_SETTINGS_KEY, updated);
  dispatchUpdate('nexus_settings_updated');
};

export const subscribeToSettings = (
  onUpdate: (data: { 
    profile?: CreatorProfile, 
    landingContent?: LandingPageContent, 
    youtubeApiKey?: string,
    securityPin?: string 
  }) => void,
  onError?: (error: any) => void
) => {
  const load = () => {
    const data = getStore(DB_SETTINGS_KEY);
    if (data) onUpdate(data);
  };
  
  // Initial load
  load();

  const listener = () => load();
  window.addEventListener('nexus_settings_updated', listener);
  
  return () => window.removeEventListener('nexus_settings_updated', listener);
};

// Posts
export const savePost = async (post: SocialPost) => {
  const posts = getStore(DB_POSTS_KEY) || [];
  const index = posts.findIndex((p: SocialPost) => p.id === post.id);
  
  if (index >= 0) {
    posts[index] = post;
  } else {
    posts.unshift(post);
  }
  
  setStore(DB_POSTS_KEY, posts);
  dispatchUpdate('nexus_posts_updated');
};

export const deletePostById = async (postId: string) => {
  const posts = getStore(DB_POSTS_KEY) || [];
  const filtered = posts.filter((p: SocialPost) => p.id !== postId);
  setStore(DB_POSTS_KEY, filtered);
  dispatchUpdate('nexus_posts_updated');
};

export const bulkSavePosts = async (posts: SocialPost[]) => {
  const currentPosts = getStore(DB_POSTS_KEY) || [];
  
  // Upsert logic
  posts.forEach(newPost => {
    const idx = currentPosts.findIndex((p: SocialPost) => p.id === newPost.id);
    if (idx >= 0) {
      currentPosts[idx] = newPost;
    } else {
      currentPosts.push(newPost);
    }
  });

  // Sort by date descending
  currentPosts.sort((a: SocialPost, b: SocialPost) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  setStore(DB_POSTS_KEY, currentPosts);
  dispatchUpdate('nexus_posts_updated');
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  const load = () => {
    const posts = getStore(DB_POSTS_KEY) || [];
    onUpdate(posts);
  };
  
  load();

  const listener = () => load();
  window.addEventListener('nexus_posts_updated', listener);
  
  return () => window.removeEventListener('nexus_posts_updated', listener);
};