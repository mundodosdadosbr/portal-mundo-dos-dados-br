
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
 * Exchange Short-Lived Token for Long-Lived Token (60 days)
 */
export const exchangeForLongLivedToken = async (
  shortLivedToken: string,
  appId: string,
  appSecret: string
) => {
  if (!appId || !appSecret || !shortLivedToken) {
    throw new Error("App ID e App Secret são obrigatórios para gerar token de longa duração.");
  }

  const url = `${GRAPH_API_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Meta Token Exchange Error: ${data.error.message}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error("Failed to exchange Meta token:", error);
    throw error;
  }
};

/**
 * Helper: Fetch User's Pages and linked Instagram Accounts
 */
const getConnectedAccounts = async (accessToken: string) => {
  try {
    const fields = 'id,name,followers_count,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}';
    const response = await fetch(`${GRAPH_API_URL}/me/accounts?fields=${fields}&access_token=${accessToken}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    if ((!data.data || data.data.length === 0)) {
        const targetPageId = '262931593566452'; 
        const directResp = await fetch(`${GRAPH_API_URL}/${targetPageId}?fields=${fields}&access_token=${accessToken}`);
        const directData = await directResp.json();
        if (directData.id) return [directData];
    }
    
    return data.data || [];
  } catch (error) {
    console.error("Meta: Error fetching accounts", error);
    return [];
  }
};

/**
 * Get Platform Stats (Followers)
 */
export const getMetaPlatformStats = async (accessToken: string) => {
  if (!accessToken) return { instagram: 0, facebook: 0 };
  
  try {
    const pages = await getConnectedAccounts(accessToken);
    let igFollowers = 0;
    let fbFollowers = 0;

    pages.forEach((p: any) => {
       if (p.instagram_business_account && p.instagram_business_account.followers_count) {
         igFollowers += p.instagram_business_account.followers_count;
       }
       if (p.followers_count) {
         fbFollowers += p.followers_count;
       }
    });

    return { instagram: igFollowers, facebook: fbFollowers };
  } catch (e) {
    console.error("Error fetching Meta stats", e);
    return { instagram: 0, facebook: 0 };
  }
};

/**
 * 3. Fetch Instagram Media
 */
export const getInstagramPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];

  const TARGET_HANDLE = 'mundodosdadosbrasil';

  try {
    const pages = await getConnectedAccounts(accessToken);
    let igPage = pages.find((p: any) => 
      p.instagram_business_account?.username?.toLowerCase() === TARGET_HANDLE
    );
    
    if (!igPage) {
      igPage = pages.find((p: any) => p.instagram_business_account);
    }
    
    if (!igPage) return [];

    const igUserId = igPage.instagram_business_account.id;

    // Campos essenciais para Reels e Posts de Imagem
    const fields = [
        'id',
        'caption',
        'media_type',
        'media_product_type',
        'media_url',
        'permalink',
        'thumbnail_url',
        'timestamp',
        'like_count',
        'comments_count',
        'video_views',
        'play_count',
        'insights.metric(plays,reach,impressions)'
    ].join(',');

    const mediaUrl = `${GRAPH_API_URL}/${igUserId}/media?fields=${fields}&limit=30&access_token=${accessToken}`;
    
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return (data.data || []).map((item: any) => {
      let thumbnailUrl = item.media_url;
      if (item.media_type === 'VIDEO') {
          thumbnailUrl = item.thumbnail_url || item.media_url;
      } else if (item.media_type === 'CAROUSEL_ALBUM') {
          thumbnailUrl = item.media_url || item.thumbnail_url;
      }

      // 1. EXTRAÇÃO DE VIEWS (ORDEM DE PREFERÊNCIA PARA REELS)
      // O campo play_count é o valor público do Reels.
      let views = Number(item.play_count) || Number(item.video_views) || 0;
      
      // Se play_count for 0 ou nulo, tentamos o insight de 'plays' (lifetime)
      if (item.insights && item.insights.data) {
          const playsMetric = item.insights.data.find((m: any) => m.name === 'plays');
          const reachMetric = item.insights.data.find((m: any) => m.name === 'reach');

          if (playsMetric?.values?.[0]) {
              // Plays do insight costuma ser o mais preciso para Reels
              views = Math.max(views, Number(playsMetric.values[0].value));
          } else if (views === 0 && reachMetric?.values?.[0]) {
              // Para imagens, o Reach é o nosso substituto de visualizações
              views = Number(reachMetric.values[0].value);
          }
      }

      // 2. EXTRAÇÃO DE LIKES
      // like_count é o campo padrão. Em contas business, ele retorna o total.
      const likes = Number(item.like_count) || 0;
      const comments = Number(item.comments_count) || 0;

      return {
        id: item.id,
        platform: Platform.INSTAGRAM,
        title: '', 
        caption: item.caption || '',
        thumbnailUrl: thumbnailUrl,
        likes: likes,
        comments: comments,
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
    const pageId = fbPage.id;

    const feedUrl = `${GRAPH_API_URL}/${pageId}/feed?fields=id,message,full_picture,permalink_url,created_time,shares,likes.summary(true),comments.summary(true)&limit=20&access_token=${pageToken}`;
    const response = await fetch(feedUrl);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return (data.data || []).filter((item: any) => item.full_picture).map((item: any) => ({
      id: item.id,
      platform: Platform.FACEBOOK,
      title: '',
      caption: item.message || '',
      thumbnailUrl: item.full_picture,
      likes: item.likes?.summary?.total_count || 0,
      comments: item.comments?.summary?.total_count || 0,
      views: 0, 
      date: item.created_time,
      url: item.permalink_url
    }));

  } catch (error) {
    console.error("Facebook Service Error:", error);
    return [];
  }
};

/**
 * 5. Diagnostic Tool
 */
export const debugMetaConnection = async (accessToken: string) => {
  const logs: string[] = [];
  logs.push("--- INICIANDO DIAGNÓSTICO META ---");
  
  if (!accessToken) {
    logs.push("ERRO: Nenhum Access Token encontrado.");
    return logs;
  }

  try {
    logs.push("Verificando permissões...");
    const permResp = await fetch(`${GRAPH_API_URL}/me/permissions?access_token=${accessToken}`);
    const permData = await permResp.json();
    if (permData.data) {
        permData.data.forEach((p: any) => {
            logs.push(` - ${p.permission}: ${p.status}`);
        });
    }

    const pages = await getConnectedAccounts(accessToken);
    logs.push(`Páginas vinculadas: ${pages.length}`);

    pages.forEach((page: any) => {
      logs.push(`- ${page.name} (ID: ${page.id})`);
      if (page.instagram_business_account) {
        logs.push(`  ✅ Instagram associado: @${page.instagram_business_account.username}`);
        logs.push(`  📊 Seguidores IG: ${page.instagram_business_account.followers_count || 0}`);
      } else {
        logs.push(`  ❌ Sem conta Instagram Business vinculada.`);
      }
    });

  } catch (error: any) {
    logs.push(`ERRO: ${error.message}`);
  }

  return logs;
};
