
import { SocialPost, Platform } from '../types';

// API Version
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Helper to get Redirect URI
export const getMetaRedirectUri = () => {
  return window.location.origin.endsWith('/') 
    ? window.location.origin.slice(0, -1) 
    : window.location.origin;
};

/**
 * 1. Generate Login URL for Meta (Facebook/Instagram)
 */
export const getMetaAuthUrl = (appId: string, forceRerequest: boolean = false) => {
  const redirectUri = getMetaRedirectUri();
  // Escopo original estável
  const scope = 'public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights';
  const state = 'meta_auth_state'; 

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'token'); 
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  
  if (forceRerequest) {
    url.searchParams.set('auth_type', 'rerequest'); 
  }

  return url.toString();
};

/**
 * Exchange Short-Lived Token for Long-Lived Token
 */
export const exchangeForLongLivedToken = async (
  shortLivedToken: string,
  appId: string,
  appSecret: string
) => {
  if (!appId || !appSecret || !shortLivedToken) {
    throw new Error("App ID e App Secret são obrigatórios.");
  }

  const url = `${GRAPH_API_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  } catch (error) {
    console.error("Meta Token Exchange Error:", error);
    throw error;
  }
};

const getConnectedAccounts = async (accessToken: string) => {
  try {
    const fields = 'id,name,followers_count,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}';
    const response = await fetch(`${GRAPH_API_URL}/me/accounts?fields=${fields}&access_token=${accessToken}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.data || [];
  } catch (error) {
    console.error("Meta: Error fetching accounts", error);
    return [];
  }
};

export const getMetaPlatformStats = async (accessToken: string) => {
  if (!accessToken) return { instagram: 0, facebook: 0 };
  try {
    const pages = await getConnectedAccounts(accessToken);
    let igFollowers = 0;
    let fbFollowers = 0;
    pages.forEach((p: any) => {
       if (p.instagram_business_account?.followers_count) igFollowers += p.instagram_business_account.followers_count;
       if (p.followers_count) fbFollowers += p.followers_count;
    });
    return { instagram: igFollowers, facebook: fbFollowers };
  } catch (e) {
    return { instagram: 0, facebook: 0 };
  }
};

/**
 * 3. Fetch Instagram Media (RESTORED TO ORIGINAL STABLE LOGIC)
 */
export const getInstagramPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];
  const TARGET_HANDLE = 'mundodosdadosbrasil';

  try {
    const pages = await getConnectedAccounts(accessToken);
    let igPage = pages.find((p: any) => p.instagram_business_account?.username?.toLowerCase() === TARGET_HANDLE) || pages.find((p: any) => p.instagram_business_account);
    if (!igPage) return [];

    const igUserId = igPage.instagram_business_account.id;
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,video_views';

    const mediaUrl = `${GRAPH_API_URL}/${igUserId}/media?fields=${fields}&limit=50&access_token=${accessToken}`;
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return (data.data || []).map((item: any) => ({
      id: item.id,
      platform: Platform.INSTAGRAM,
      thumbnailUrl: item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url,
      caption: item.caption || '',
      likes: Number(item.like_count) || 0,
      comments: Number(item.comments_count) || 0,
      views: Number(item.video_views) || 0,
      date: item.timestamp,
      url: item.permalink
    }));
  } catch (error) {
    console.error("Instagram Service Error:", error);
    return [];
  }
};

/**
 * 4. Fetch Facebook Page Posts
 */
export const getFacebookPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];
  const TARGET_PAGE_ID = '262931593566452'; 

  try {
    const pages = await getConnectedAccounts(accessToken);
    let fbPage = pages.find((p: any) => p.id === TARGET_PAGE_ID) || pages[0];
    if (!fbPage) return [];

    const pageToken = fbPage.access_token || accessToken;
    const feedUrl = `${GRAPH_API_URL}/${fbPage.id}/feed?fields=id,message,full_picture,permalink_url,created_time,shares,likes.summary(true),comments.summary(true)&limit=30&access_token=${pageToken}`;
    const response = await fetch(feedUrl);
    const data = await response.json();

    return (data.data || []).filter((item: any) => item.full_picture).map((item: any) => ({
      id: item.id,
      platform: Platform.FACEBOOK,
      caption: item.message || '',
      thumbnailUrl: item.full_picture,
      likes: item.likes?.summary?.total_count || 0,
      comments: item.comments?.summary?.total_count || 0,
      views: 0, 
      date: item.created_time,
      url: item.permalink_url
    }));
  } catch (error) {
    return [];
  }
};

export const debugMetaConnection = async (accessToken: string) => {
  const logs: string[] = ["--- DIAGNÓSTICO ---"];
  try {
    const pages = await getConnectedAccounts(accessToken);
    pages.forEach((p: any) => {
      logs.push(`Página: ${p.name} (ID: ${p.id})`);
      if (p.instagram_business_account) logs.push(` IG: @${p.instagram_business_account.username}`);
    });
  } catch (e: any) { logs.push(`Erro: ${e.message}`); }
  return logs;
};
