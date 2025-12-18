
import { SocialPost, Platform } from '../types';

// Default Credentials (from user input)
export const DEFAULT_CLIENT_KEY = 'sbawz7vbk8wmhibbzd';
export const DEFAULT_CLIENT_SECRET = '1ZokZGoajYeWb7T2uzUK7hFVGIqSY906';

// Helper to get the consistent Redirect URI
export const getRedirectUri = () => {
  return window.location.origin.endsWith('/') 
    ? window.location.origin 
    : `${window.location.origin}/`;
};

const REDIRECT_URI = getRedirectUri();
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * 1. Generates the TikTok Login URL
 */
export const getTikTokAuthUrl = (clientKey: string) => {
  const csrfState = Math.random().toString(36).substring(7);
  const scope = 'user.info.basic,user.info.stats,video.list';
  
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
  url.searchParams.set('client_key', clientKey);
  url.searchParams.set('scope', scope);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('state', csrfState);
  
  return url.toString();
};

/**
 * 2. Exchange Authorization Code for Access Token
 */
export const exchangeTikTokCode = async (code: string, clientKey: string, clientSecret: string) => {
  const params = new URLSearchParams();
  params.append('client_key', clientKey);
  params.append('client_secret', clientSecret);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', REDIRECT_URI);

  try {
    const targetUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    
    const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: params
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`TikTok Auth Error: ${data.error_description || JSON.stringify(data.error)}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in, 
      refreshExpiresIn: data.refresh_expires_in
    };

  } catch (error) {
    console.error("TikTok Token Exchange Failed:", error);
    throw error;
  }
};

/**
 * 3. Refresh Access Token
 */
export const refreshTikTokToken = async (refreshToken: string, clientKey: string, clientSecret: string) => {
  if (!refreshToken || refreshToken === 'undefined') {
    throw new Error("Refresh token inválido ou ausente.");
  }

  const params = new URLSearchParams();
  params.append('client_key', clientKey);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  try {
    const targetUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    
    const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`TikTok Refresh Error: ${data.error_description || JSON.stringify(data.error)}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, 
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error("TikTok Token Refresh Failed:", error);
    throw error;
  }
};

/**
 * Helper: Get User Info (Follower Count)
 */
export const getTikTokUserStats = async (accessToken: string) => {
  // Verificação rigorosa para evitar 'access_token_invalid' devido a valores nulos
  if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
    console.warn("TikTok: Tentativa de busca de stats ignorada por falta de token válido.");
    return { followers: 0 };
  }

  try {
    const fields = "follower_count,display_name,avatar_url,video_count";
    const targetUrl = `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`;

    const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (data.error) {
       console.error("TikTok Stats API Error Detail:", typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);
       return { followers: 0 };
    }

    if (data.data && data.data.user) {
        return { 
            followers: data.data.user.follower_count || 0 
        };
    }
    return { followers: 0 };
  } catch (e) {
    console.error("TikTok User Info Error:", e);
    return { followers: 0 };
  }
};

/**
 * 4. Fetch Posts
 */
export const getTikTokPosts = async (
  username: string = 'mundo.dos.dados5', 
  accessToken?: string,
  refreshToken?: string,
  clientKey?: string,
  clientSecret?: string,
  tokenExpiresAt?: number,
  onTokenRefresh?: (newToken: string, newRefresh: string, newExpiry: number) => void
): Promise<SocialPost[]> => {
  
  let validAccessToken = accessToken;

  // Verificação de nulidade antes de processar
  if (!validAccessToken || validAccessToken === 'undefined' || validAccessToken === 'null') {
    return [];
  }

  // AUTO-RENEWAL CHECK
  if (validAccessToken && refreshToken && clientKey && clientSecret && tokenExpiresAt) {
    const now = Date.now();
    // Refresh if expiring in less than 5 minutes
    if (now >= (tokenExpiresAt - 5 * 60 * 1000)) {
       try {
         const refreshed = await refreshTikTokToken(refreshToken, clientKey, clientSecret);
         validAccessToken = refreshed.accessToken;
         const newExpiry = Date.now() + (refreshed.expiresIn * 1000);
         
         if (onTokenRefresh) {
           onTokenRefresh(refreshed.accessToken, refreshed.refreshToken, newExpiry);
         }
       } catch (err) {
         console.error("Failed to auto-renew TikTok token:", err);
       }
    }
  }

  if (validAccessToken) {
    try {
      const fields = "id,title,cover_image_url,like_count,comment_count,view_count,create_time,share_url";
      const targetUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`;

      const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          max_count: 20
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`TikTok API status: ${response.status} - ${JSON.stringify(errData)}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.videos) {
        return data.data.videos.map((video: any) => ({
          id: video.id,
          platform: Platform.TIKTOK,
          thumbnailUrl: video.cover_image_url,
          caption: video.title || 'Sem legenda', 
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          views: video.view_count || 0,
          date: new Date(video.create_time * 1000).toISOString(),
          url: video.share_url || '#'
        }));
      }

    } catch (error) {
      console.warn("TikTok API call failed:", error);
    }
  }

  return [];
};
