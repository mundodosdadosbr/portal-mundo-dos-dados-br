
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
  // Escopo expandido para garantir acesso a métricas de Reels e Insights
  const scope = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_insights',
    'ads_read' // Opcional, mas ajuda em algumas métricas de alcance total
  ].join(',');
  
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
 * 3. Fetch Instagram Media (IMPROVED FOR CORRECT REELS STATS)
 */
export const getInstagramPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];
  const TARGET_HANDLE = 'mundodosdadosbrasil';

  try {
    const pages = await getConnectedAccounts(accessToken);
    let igPage = pages.find((p: any) => p.instagram_business_account?.username?.toLowerCase() === TARGET_HANDLE) || pages.find((p: any) => p.instagram_business_account);
    if (!igPage) return [];

    const igUserId = igPage.instagram_business_account.id;
    // Campos específicos para cobrir todos os tipos de visualização
    const fields = [
        'id', 'caption', 'media_type', 'media_product_type', 'media_url', 'permalink', 'thumbnail_url', 'timestamp',
        'like_count', 'comments_count', 'video_views', 'play_count',
        'insights.metric(plays,reach,impressions,total_interactions)'
    ].join(',');

    const mediaUrl = `${GRAPH_API_URL}/${igUserId}/media?fields=${fields}&limit=50&access_token=${accessToken}`;
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (data.error) {
       console.error("Meta API Error:", data.error);
       throw new Error(data.error.message);
    }

    return (data.data || []).map((item: any) => {
      // LÓGICA DE VISUALIZAÇÕES: Pega o MAIOR valor entre as métricas disponíveis
      // Play_count costuma ser o valor público do Reels
      let views = Number(item.play_count) || Number(item.video_views) || 0;
      
      if (item.insights?.data) {
          const playsMetric = item.insights.data.find((m: any) => m.name === 'plays');
          const reachMetric = item.insights.data.find((m: any) => m.name === 'reach');
          const impressionsMetric = item.insights.data.find((m: any) => m.name === 'impressions');

          const vPlays = Number(playsMetric?.values?.[0]?.value) || 0;
          const vReach = Number(reachMetric?.values?.[0]?.value) || 0;
          const vImpr = Number(impressionsMetric?.values?.[0]?.value) || 0;

          // Resolve a discrepância (ex: se play_count for 12 mas plays for 4707)
          views = Math.max(views, vPlays, vReach, vImpr);
      }

      // LÓGICA DE CURTIDAS
      let likes = Number(item.like_count) || 0;
      if (item.insights?.data) {
          const intMetric = item.insights.data.find((m: any) => m.name === 'total_interactions');
          if (intMetric?.values?.[0]?.value) {
              const totalInt = Number(intMetric.values[0].value);
              const comments = Number(item.comments_count) || 0;
              // Likes = Total de Interações - Comentários (ajuda quando like_count vem zerado/parcial)
              likes = Math.max(likes, totalInt - comments);
          }
      }

      return {
        id: item.id,
        platform: Platform.INSTAGRAM,
        thumbnailUrl: item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url,
        caption: item.caption || '',
        likes: likes,
        comments: Number(item.comments_count) || 0,
        views: views,
        date: item.timestamp,
        url: item.permalink
      };
    });
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
  const logs: string[] = ["--- DIAGNÓSTICO DE CONEXÃO ---"];
  try {
    const permResp = await fetch(`${GRAPH_API_URL}/me/permissions?access_token=${accessToken}`);
    const perms = await permResp.json();
    logs.push("Permissões Ativas:");
    perms.data?.forEach((p: any) => logs.push(`- ${p.permission}: ${p.status}`));

    const pages = await getConnectedAccounts(accessToken);
    pages.forEach((p: any) => {
      logs.push(`Página: ${p.name} (ID: ${p.id})`);
      if (p.instagram_business_account) logs.push(` IG: @${p.instagram_business_account.username}`);
    });
  } catch (e: any) { logs.push(`Erro: ${e.message}`); }
  return logs;
};
