
import { SocialPost, Platform } from '../types';

// API Version
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Helper to get Redirect URI (must match exactly in Meta App Dashboard)
export const getMetaRedirectUri = () => {
  // Facebook prefers the origin without trailing slash for App Domains matching
  return window.location.origin.endsWith('/') 
    ? window.location.origin.slice(0, -1) 
    : window.location.origin;
};

/**
 * 1. Generate Login URL for Meta (Facebook/Instagram)
 * We use the "Implicit Flow" (response_type=token) for client-side simplicity
 * Scopes required:
 * - pages_show_list, pages_read_engagement (For Facebook Pages)
 * - instagram_basic, instagram_manage_insights (For Instagram Business)
 * - public_profile (Default)
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
 * 2. Fetch User's Pages and linked Instagram Accounts
 */
const getConnectedAccounts = async (accessToken: string) => {
  try {
    // Request nested fields: instagram_business_account{id,username}
    const fields = 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}';
    const response = await fetch(`${GRAPH_API_URL}/me/accounts?fields=${fields}&access_token=${accessToken}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    // Fallback: If list is empty, try to fetch specific page ID directly
    if ((!data.data || data.data.length === 0)) {
        console.warn("Listagem vazia. Tentando buscar página específica...");
        // Updated ID based on user feedback
        const targetPageId = '262931593566452'; // Mundo dos Dados BR (Confirmed ID)
        
        const directResp = await fetch(`${GRAPH_API_URL}/${targetPageId}?fields=${fields}&access_token=${accessToken}`);
        const directData = await directResp.json();
        
        if (directData.error) {
            console.error("Erro no fallback direto:", directData.error);
            // Try the other potential ID just in case
            const altId = '61557248068717';
            const altResp = await fetch(`${GRAPH_API_URL}/${altId}?fields=${fields}&access_token=${accessToken}`);
            const altData = await altResp.json();
            if (altData.id) return [altData];
        }

        if (directData.id) {
            console.log("Página encontrada via ID direto!");
            return [directData];
        }
    }
    
    return data.data || [];
  } catch (error) {
    console.error("Meta: Error fetching accounts", error);
    return [];
  }
};

/**
 * 3. Fetch Instagram Media
 * Targeted for 'mundodosdadosbrasil'
 */
export const getInstagramPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];

  const TARGET_HANDLE = 'mundodosdadosbrasil';

  try {
    // Step A: Get Pages
    const pages = await getConnectedAccounts(accessToken);
    
    // Step B: Find specific IG Business Account
    let igPage = pages.find((p: any) => 
      p.instagram_business_account?.username?.toLowerCase() === TARGET_HANDLE
    );
    
    // Fallback: If not found, take the first one available that has ANY instagram
    if (!igPage) {
      console.warn(`Conta '${TARGET_HANDLE}' não encontrada explicitamente. Buscando qualquer conta vinculada...`);
      igPage = pages.find((p: any) => p.instagram_business_account);
    }
    
    if (!igPage) {
      console.warn("DIAGNÓSTICO: Páginas do Facebook encontradas, mas nenhuma tem 'instagram_business_account' vinculado.");
      return [];
    }

    const igUserId = igPage.instagram_business_account.id;

    // Step C: Fetch Media
    const mediaUrl = `${GRAPH_API_URL}/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,like_count,comments_count,timestamp&limit=20&access_token=${accessToken}`;
    
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return (data.data || []).map((item: any) => {
      let imageUrl = item.media_url;
      if (item.media_type === 'VIDEO') imageUrl = item.thumbnail_url || item.media_url;
      else if (item.media_type === 'CAROUSEL_ALBUM') imageUrl = item.media_url || item.thumbnail_url;

      return {
        id: item.id,
        platform: Platform.INSTAGRAM,
        title: '', 
        caption: item.caption || '',
        thumbnailUrl: imageUrl,
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        views: 0, 
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
 * Targeted for 'Mundo dos Dados BR'
 */
export const getFacebookPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];

  const TARGET_PAGE_NAME = 'Mundo dos Dados BR';
  const TARGET_PAGE_ID = '262931593566452'; // Confirmed ID

  try {
    const pages = await getConnectedAccounts(accessToken);
    let fbPage = pages.find((p: any) => p.id === TARGET_PAGE_ID) || pages.find((p: any) => p.name === TARGET_PAGE_NAME) || pages[0];
    
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
    logs.push("ERRO: Nenhum Access Token encontrado. Conecte-se primeiro.");
    return logs;
  }

  try {
    // 1. Check Permissions
    logs.push("Verificando escopos concedidos (/me/permissions)...");
    const permResp = await fetch(`${GRAPH_API_URL}/me/permissions?access_token=${accessToken}`);
    const permData = await permResp.json();
    let allGranted = true;
    if (permData.data) {
        permData.data.forEach((p: any) => {
            logs.push(` - ${p.permission}: ${p.status}`);
            if (p.status !== 'granted') allGranted = false;
        });
    }

    // 2. Fetch Pages
    logs.push("Buscando Páginas...");
    const pages = await getConnectedAccounts(accessToken);
    logs.push(`Encontradas: ${pages.length} páginas.`);

    if (pages.length === 0) {
      logs.push("ALERTA CRÍTICO: Nenhuma página retornada.");
      
      if (allGranted) {
          logs.push("--- ANÁLISE DE CAUSA RAIZ ---");
          logs.push("1. As permissões estão OK ('granted').");
          logs.push("2. Mas a API não retorna nenhuma página.");
          logs.push("CONCLUSÃO: O Facebook pode estar bloqueando listagem vazia. Tentamos buscar diretamente o ID 262931593566452.");
      }
      
      return logs;
    }

    // 3. Check each page for IG
    let igFound = false;
    for (const page of pages) {
      logs.push(`---`);
      logs.push(`Página FB: "${page.name}" (ID: ${page.id})`);
      
      if (page.instagram_business_account) {
        igFound = true;
        const igUser = page.instagram_business_account.username || 'Desconhecido';
        logs.push(`✅ VINCULADO: Instagram @${igUser} (ID: ${page.instagram_business_account.id})`);
      } else {
        logs.push("⚠️ SEM VÍNCULO: Esta página não tem conta Instagram Business associada.");
      }
    }
    
    if (!igFound) {
       logs.push("---");
       logs.push("RESUMO: O vínculo com o Instagram não foi detectado.");
    } else {
       logs.push("---");
       logs.push("STATUS: Configuração parece correta! Tente 'Sincronizar Tudo' agora.");
    }

  } catch (error: any) {
    logs.push(`ERRO GERAL: ${error.message}`);
  }

  return logs;
};
