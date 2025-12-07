
import { SocialPost, CreatorProfile, LandingPageContent } from '../types';
import * as OTPAuth from 'otpauth';

// --- LOCAL STORAGE KEYS ---
const KEY_AUTH_TOKEN = 'nexus_local_auth_token';
const KEY_MFA_SECRET = 'nexus_mfa_secret';
const KEY_PROFILE = 'nexus_profile';
const KEY_LANDING = 'nexus_landing_content';
const KEY_POSTS = 'nexus_posts';
const KEY_API_KEY = 'nexus_yt_api_key';

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
    // defaults are handled in App.tsx initial state, but we can seed here if needed
  }
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

// --- DATABASE (LOCAL STORAGE) ---

export const saveSettings = async (
  profile: CreatorProfile, 
  landingContent: LandingPageContent, 
  youtubeApiKey: string
) => {
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  localStorage.setItem(KEY_LANDING, JSON.stringify(landingContent));
  localStorage.setItem(KEY_API_KEY, youtubeApiKey);
  
  // Trigger local event to simulate subscription update
  window.dispatchEvent(new Event('nexus-storage-update'));
};

export const subscribeToSettings = (
  onUpdate: (data: { 
    profile?: CreatorProfile, 
    landingContent?: LandingPageContent, 
    youtubeApiKey?: string
  }) => void,
  onError?: (error: any) => void
) => {
  
  const load = () => {
    const profileStr = localStorage.getItem(KEY_PROFILE);
    const landingStr = localStorage.getItem(KEY_LANDING);
    const apiKey = localStorage.getItem(KEY_API_KEY) || '';

    onUpdate({
      profile: profileStr ? JSON.parse(profileStr) : undefined,
      landingContent: landingStr ? JSON.parse(landingStr) : undefined,
      youtubeApiKey: apiKey
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
