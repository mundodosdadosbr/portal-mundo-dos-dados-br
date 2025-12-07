
import { SocialPost, Platform } from '../types';

// Default Credentials (from user input)
// WARNING: In production, Client Secret should NEVER be in frontend code.
// This is for local demonstration purposes only.
export const DEFAULT_CLIENT_KEY = 'aw4f52prfxu4yqzx';
export const DEFAULT_CLIENT_SECRET = 'ZoNVIyX4xracwFi08hwIwhMuFA3mwtPw';
const REDIRECT_URI = window.location.origin; // e.g. http://localhost:3000

// Proxy to bypass CORS on localhost
// Use corsproxy.io to route requests (Proxy -> TikTok -> Client)
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * 1. Generates the TikTok Login URL
 */
export const getTikTokAuthUrl = (clientKey: string) => {
  const csrfState = Math.random().toString(36).substring(7);
  // Scopes: user.info.basic (for name/avatar), video.list (for fetching videos)
  const scope = 'user.info.basic,video.list';
  
  let url = 'https://www.tiktok.com/v2/auth/authorize/';
  url += `?client_key=${clientKey}`;
  url += `&scope=${scope}`;
  url += `&response_type=code`;
  url += `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  url += `&state=${csrfState}`;
  
  return url;
};

/**
 * 2. Exchange Authorization Code for Access Token
 * Uses CORS Proxy to avoid browser blocking
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
    
    // Using CORS proxy and encoding the target URL
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
      throw new Error(`TikTok Auth Error: ${data.error_description || data.error}`);
    }

    // Return structured data to save
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in, // usually 86400 (24h)
      refreshExpiresIn: data.refresh_expires_in
    };

  } catch (error) {
    console.error("TikTok Token Exchange Failed:", error);
    throw error;
  }
};

/**
 * 3. Refresh Access Token (Auto-Renew logic)
 * Uses CORS Proxy to avoid browser blocking
 */
export const refreshTikTokToken = async (refreshToken: string, clientKey: string, clientSecret: string) => {
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
      throw new Error(`TikTok Refresh Error: ${data.error_description}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Sometimes it rotates
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error("TikTok Token Refresh Failed:", error);
    throw error;
  }
};

/**
 * 4. Fetch Posts (Main Logic)
 * Uses CORS Proxy to avoid browser blocking
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

  // AUTO-RENEWAL CHECK
  if (accessToken && refreshToken && clientKey && clientSecret && tokenExpiresAt) {
    const now = Date.now();
    // Refresh if expired or expiring in less than 5 minutes
    if (now >= (tokenExpiresAt - 5 * 60 * 1000)) {
       console.log("TikTok Token expired or expiring soon. Refreshing...");
       try {
         const refreshed = await refreshTikTokToken(refreshToken, clientKey, clientSecret);
         validAccessToken = refreshed.accessToken;
         const newExpiry = Date.now() + (refreshed.expiresIn * 1000);
         
         // Execute callback to save new keys to storage
         if (onTokenRefresh) {
           onTokenRefresh(refreshed.accessToken, refreshed.refreshToken, newExpiry);
         }
         console.log("TikTok Token Refreshed Successfully!");
       } catch (err) {
         console.error("Failed to auto-renew TikTok token:", err);
         // Fallback to try using old token or mock
       }
    }
  }

  // ATTEMPT REAL API CALL
  if (validAccessToken) {
    try {
      // API call to get video list
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
        throw new Error(`TikTok API status: ${response.status}`);
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

  // No mock fallback anymore
  return [];
};
