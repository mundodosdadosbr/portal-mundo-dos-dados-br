
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
    
    // Na v2, o erro pode vir no objeto 'error' com código diferente de 'ok'
    if (data.error && data.error !== 'ok' && data.error.code !== 'ok') {
      throw new Error(`TikTok Auth Error: ${data.error_description || data.error.message || JSON.stringify(data.error)}`);
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
  if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
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

    if (data.error && data.error !== 'ok' && data.error.code !== 'ok') {
      throw new Error(`TikTok Refresh Error: ${data.error_description || data.error.message || JSON.stringify(data.error)}`);
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
 * Shared Helper: Ensure Token is Valid
 */
const getOrRefreshAccessToken = async (
    accessToken: string,
    refreshToken?: string,
    clientKey?: string,
    clientSecret?: string,
    expiresAt?: number,
    onTokenRefresh?: (newToken: string, newRefresh: string, newExpiry: number) => void
): Promise<string | null> => {
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') return null;

    if (refreshToken && clientKey && clientSecret && expiresAt) {
        const now = Date.now();
        const buffer = 5 * 60 * 1000; 
        if (now >= (expiresAt - buffer)) {
            console.log("🔄 TikTok: Token expirando. Renovando...");
            try {
                const refreshed = await refreshTikTokToken(refreshToken, clientKey, clientSecret);
                const newExpiry = Date.now() + (refreshed.expiresIn * 1000);
                if (onTokenRefresh) {
                    onTokenRefresh(refreshed.accessToken, refreshed.refreshToken, newExpiry);
                }
                return refreshed.accessToken;
            } catch (err) {
                console.error("TikTok: Erro ao renovar token automaticamente.", err);
                return accessToken; 
            }
        }
    }
    return accessToken;
};

/**
 * Helper: Get User Info (Follower Count)
 */
export const getTikTokUserStats = async (
    accessToken: string,
    refreshToken?: string,
    clientKey?: string,
    clientSecret?: string,
    expiresAt?: number,
    onTokenRefresh?: (newToken: string, newRefresh: string, newExpiry: number) => void
) => {
  const validToken = await getOrRefreshAccessToken(accessToken, refreshToken, clientKey, clientSecret, expiresAt, onTokenRefresh);
  if (!validToken) return { followers: 0, error: "Token ausente ou inválido" };

  try {
    const fields = "follower_count,display_name,avatar_url,video_count";
    const targetUrl = `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`;

    const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();

    // CRÍTICO: TikTok retorna o objeto de erro mesmo quando o sucesso é 'ok'
    if (data.error && data.error.code !== 'ok') {
       const errStr = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
       console.error("TikTok API Error:", errStr);
       return { followers: 0, error: errStr };
    }

    // Tentar extrair de data.data.user ou data.user
    const user = data.data?.user || data.user;
    if (user) {
        const followerCount = user.follower_count !== undefined 
            ? user.follower_count 
            : (user.stats?.follower_count || 0);
            
        return { 
            followers: Number(followerCount) || 0,
            displayName: user.display_name || ''
        };
    }
    
    console.warn("TikTok: Resposta sem dados de usuário", JSON.stringify(data));
    return { followers: 0, error: "Usuário não retornado pela API" };
  } catch (e: any) {
    return { followers: 0, error: e.message };
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
  
  if (!accessToken) return [];
  const validToken = await getOrRefreshAccessToken(accessToken, refreshToken, clientKey, clientSecret, tokenExpiresAt, onTokenRefresh);
  if (!validToken) return [];

  try {
    const fields = "id,title,cover_image_url,like_count,comment_count,view_count,create_time,share_url";
    const targetUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`;

    const response = await fetch(CORS_PROXY + encodeURIComponent(targetUrl), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ max_count: 20 })
    });

    const data = await response.json();
    
    if (data.error && data.error.code !== 'ok') {
        console.error("TikTok Posts Error:", JSON.stringify(data.error));
        return [];
    }

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

  return [];
};
