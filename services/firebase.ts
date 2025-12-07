
import { SocialPost, CreatorProfile, LandingPageContent } from '../types';
import * as OTPAuth from 'otpauth';

// --- LOCAL STORAGE KEYS ---
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

// --- AUTHENTICATION (LOCAL / MOCK) ---

const VALID_USER = 'diego.morais';
const VALID_PASS = 'Z@nbet4df2026';

const MOCK_USER = {
  uid: 'local-user-id',
  email: 'diego.morais@creatornexus.com',
  displayName: 'Diego Morais'
};

export const initFirebase = () => {
  // Setup default data if empty
  if (!localStorage.getItem(KEY_PROFILE)) {
    // defaults are handled in App.tsx initial state
  }
  
  // Reset MFA on init logic was removed to allow persistence, 
  // but clearing here if specifically requested by user in past steps.
  // localStorage.removeItem(KEY_MFA_SECRET); 
};

export const isAuthenticated = () => {
  return !!localStorage.getItem(KEY_AUTH_TOKEN);
};

export const loginWithCredentials = async (username: string, pass: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (username === VALID_USER && pass === VALID_PASS) {
    localStorage.setItem(KEY_AUTH_TOKEN, 'mock-jwt-token-active');
    return MOCK_USER;
  }
  
  throw new Error("Usuário ou senha incorretos.");
};

export const logout = async () => {
  localStorage.removeItem(KEY_AUTH_TOKEN);
  localStorage.removeItem(KEY_MFA_SECRET); // Clear MFA for demo purposes on logout
};

// --- MFA (LOCAL) ---

export const checkMfaStatus = async (): Promise<boolean> => {
  const secret = localStorage.getItem(KEY_MFA_SECRET);
  return !!secret;
};

export const initiateMfaSetup = async () => {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  return { secret: secret.base32, otpauthUrl: totp.toString() };
};

export const verifyMfaToken = async (token: string, pendingSecret?: string) => {
  const secretStr = pendingSecret || localStorage.getItem(KEY_MFA_SECRET);
  if (!secretStr) return false;

  const totp = new OTPAuth.TOTP({
    issuer: 'CreatorNexus',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretStr)
  });

  // Window 1 allows for slight clock drift
  return totp.validate({ token, window: 1 }) !== null;
};

export const completeMfaSetup = async (secret: string) => {
  localStorage.setItem(KEY_MFA_SECRET, secret);
};

// --- VIRTUAL FILE SYSTEM (Verification Files) ---

export interface VirtualFile {
  path: string; // e.g., 'ads.txt' or 'verification/google.html'
  content: string;
  type: string; // 'text/plain', 'text/html'
}

export const getVirtualFiles = (): VirtualFile[] => {
  const str = localStorage.getItem(KEY_VIRTUAL_FILES);
  return str ? JSON.parse(str) : [];
};

export const saveVirtualFile = (file: VirtualFile) => {
  const files = getVirtualFiles();
  // Clean path (remove leading slash)
  const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
  
  const existingIndex = files.findIndex(f => f.path === cleanPath);
  const newFile = { ...file, path: cleanPath };

  if (existingIndex >= 0) {
    files[existingIndex] = newFile;
  } else {
    files.push(newFile);
  }
  
  localStorage.setItem(KEY_VIRTUAL_FILES, JSON.stringify(files));
};

export const deleteVirtualFile = (path: string) => {
  const files = getVirtualFiles();
  const filtered = files.filter(f => f.path !== path);
  localStorage.setItem(KEY_VIRTUAL_FILES, JSON.stringify(filtered));
};

export const getVirtualFileContent = (path: string): string | null => {
  const files = getVirtualFiles();
  // Exact match logic
  const file = files.find(f => f.path === path);
  return file ? file.content : null;
};

// --- DATABASE (LOCAL STORAGE) ---

export interface TikTokAuthData {
  clientKey: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  keys: { youtube?: string, tiktokAuth?: Partial<TikTokAuthData> }
) => {
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  localStorage.setItem(KEY_LANDING, JSON.stringify(landingContent));
  
  if (keys.youtube !== undefined) localStorage.setItem(KEY_YT_API_KEY, keys.youtube);
  
  if (keys.tiktokAuth) {
    if (keys.tiktokAuth.clientKey !== undefined) localStorage.setItem(KEY_TT_CLIENT_KEY, keys.tiktokAuth.clientKey);
    if (keys.tiktokAuth.clientSecret !== undefined) localStorage.setItem(KEY_TT_CLIENT_SECRET, keys.tiktokAuth.clientSecret);
    if (keys.tiktokAuth.accessToken !== undefined) localStorage.setItem(KEY_TT_ACCESS_TOKEN, keys.tiktokAuth.accessToken);
    if (keys.tiktokAuth.refreshToken !== undefined) localStorage.setItem(KEY_TT_REFRESH_TOKEN, keys.tiktokAuth.refreshToken);
    if (keys.tiktokAuth.expiresAt !== undefined) localStorage.setItem(KEY_TT_EXPIRES_AT, keys.tiktokAuth.expiresAt.toString());
  }
  
  // Trigger local event to simulate subscription update
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
  
  const load = () => {
    const profileStr = localStorage.getItem(KEY_PROFILE);
    const landingStr = localStorage.getItem(KEY_LANDING);
    const ytKey = localStorage.getItem(KEY_YT_API_KEY) || '';
    
    // TikTok Data
    const ttKey = localStorage.getItem(KEY_TT_CLIENT_KEY) || '';
    const ttSecret = localStorage.getItem(KEY_TT_CLIENT_SECRET) || '';
    const ttToken = localStorage.getItem(KEY_TT_ACCESS_TOKEN) || '';
    const ttRefresh = localStorage.getItem(KEY_TT_REFRESH_TOKEN) || '';
    const ttExpires = parseInt(localStorage.getItem(KEY_TT_EXPIRES_AT) || '0');

    onUpdate({
      profile: profileStr ? JSON.parse(profileStr) : undefined,
      landingContent: landingStr ? JSON.parse(landingStr) : undefined,
      keys: { 
        youtube: ytKey, 
        tiktokAuth: {
          clientKey: ttKey,
          clientSecret: ttSecret,
          accessToken: ttToken,
          refreshToken: ttRefresh,
          expiresAt: ttExpires
        }
      }
    });
  };

  load(); // Initial load

  const handler = () => load();
  window.addEventListener('nexus-storage-update', handler);

  return () => {
    window.removeEventListener('nexus-storage-update', handler);
  };
};

// POSTS

export const savePost = async (post: SocialPost) => {
  const postsStr = localStorage.getItem(KEY_POSTS);
  let posts: SocialPost[] = postsStr ? JSON.parse(postsStr) : [];
  
  // Check if update or insert (simple logic)
  const existingIndex = posts.findIndex(p => p.id === post.id);
  if (existingIndex >= 0) {
    posts[existingIndex] = post;
  } else {
    posts.unshift(post);
  }

  localStorage.setItem(KEY_POSTS, JSON.stringify(posts));
  window.dispatchEvent(new Event('nexus-posts-update'));
};

export const deletePostById = async (postId: string) => {
  const postsStr = localStorage.getItem(KEY_POSTS);
  if (!postsStr) return;

  let posts: SocialPost[] = JSON.parse(postsStr);
  posts = posts.filter(p => p.id !== postId);

  localStorage.setItem(KEY_POSTS, JSON.stringify(posts));
  window.dispatchEvent(new Event('nexus-posts-update'));
};

export const clearAllPosts = async () => {
  localStorage.removeItem(KEY_POSTS);
  window.dispatchEvent(new Event('nexus-posts-update'));
};

export const bulkSavePosts = async (newPosts: SocialPost[]) => {
  const postsStr = localStorage.getItem(KEY_POSTS);
  let posts: SocialPost[] = postsStr ? JSON.parse(postsStr) : [];
  
  // Merge: Add if id doesn't exist
  newPosts.forEach(np => {
    if (!posts.find(p => p.id === np.id)) {
      posts.push(np);
    }
  });

  // Sort by date desc
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  localStorage.setItem(KEY_POSTS, JSON.stringify(posts));
  window.dispatchEvent(new Event('nexus-posts-update'));
};

export const subscribeToPosts = (
  onUpdate: (posts: SocialPost[]) => void,
  onError?: (error: any) => void
) => {
  const load = () => {
    const postsStr = localStorage.getItem(KEY_POSTS);
    onUpdate(postsStr ? JSON.parse(postsStr) : []);
  };

  load();

  const handler = () => load();
  window.addEventListener('nexus-posts-update', handler);

  return () => {
    window.removeEventListener('nexus-posts-update', handler);
  };
};
