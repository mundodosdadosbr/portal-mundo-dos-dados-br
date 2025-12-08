
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
export const getMetaAuthUrl = (appId: string) => {
  const redirectUri = getMetaRedirectUri();
  const scope = 'public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights';
  const state = 'meta_auth_state'; // CSRF protection in production

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'token'); // Returns access_token in URL hash
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  // FORCE RE-REQUEST: Ensures the user sees the page selection screen again
  url.searchParams.set('auth_type', 'rerequest'); 

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
    
    // Fallback: If list is empty, try to fetch specific page ID directly to check if it's a permission list issue vs scope issue
    if ((!data.data || data.data.length === 0)) {
        console.warn("Listagem vazia. Tentando buscar página específica...");
        const targetPageId = '61557248068717'; // Mundo dos Dados BR ID
        const directResp = await fetch(`${GRAPH_API_URL}/${targetPageId}?fields=${fields}&access_token=${accessToken}`);
        const directData = await directResp.json();
        if (directData.id) {
            console.log("Página encontrada via ID direto!");
            return [directData];
        }
    }
    
    console.log("Facebook Pages Found:", data.data?.length || 0);
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
    const igUsername = igPage.instagram_business_account.username;
    console.log(`Instagram Business ID: ${igUserId} (@${igUsername})`);

    // Step C: Fetch Media
    // Fields: caption, media_type, media_url, permalink, thumbnail_url, like_count, comments_count, timestamp
    const mediaUrl = `${GRAPH_API_URL}/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,like_count,comments_count,timestamp&limit=20&access_token=${accessToken}`;
    
    const response = await fetch(mediaUrl);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return (data.data || []).map((item: any) => {
      // Logic to determine the correct image URL based on media type
      let imageUrl = item.media_url;
      
      if (item.media_type === 'VIDEO') {
        imageUrl = item.thumbnail_url || item.media_url;
      } else if (item.media_type === 'CAROUSEL_ALBUM') {
        // Carousel usually has media_url for the first item, fallback to thumbnail if present
        imageUrl = item.media_url || item.thumbnail_url; 
      }

      return {
        id: item.id,
        platform: Platform.INSTAGRAM,
        title: '', // IG doesn't have titles usually
        caption: item.caption || '',
        thumbnailUrl: imageUrl,
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        views: 0, // Basic display API doesn't return view_count easily
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
  const TARGET_PAGE_ID = '61557248068717';

  try {
    // Step A: Get Pages
    const pages = await getConnectedAccounts(accessToken);
    
    // Find specific page by ID first (more reliable), then Name
    let fbPage = pages.find((p: any) => p.id === TARGET_PAGE_ID);

    if (!fbPage) {
        fbPage = pages.find((p: any) => p.name === TARGET_PAGE_NAME);
    }
    
    if (!fbPage) {
      console.warn(`Página '${TARGET_PAGE_NAME}' (ID: ${TARGET_PAGE_ID}) não encontrada na lista de permissões.`);
      // Last resort: use first available
      fbPage = pages[0];
    }
    
    if (!fbPage) {
      return [];
    }

    // Use the PAGE Access Token
    const pageToken = fbPage.access_token || accessToken;
    const pageId = fbPage.id;

    // Step B: Fetch Feed
    // Fields: message, full_picture, permalink_url, created_time, shares, likes.summary(true), comments.summary(true)
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
    // 1. Fetch Pages
    logs.push("Buscando Páginas do Facebook vinculadas ao usuário...");
    const pages = await getConnectedAccounts(accessToken);
    logs.push(`Encontradas: ${pages.length} páginas.`);

    if (pages.length === 0) {
      logs.push("ALERTA CRÍTICO: Nenhuma página encontrada.");
      logs.push("CAUSA PROVÁVEL: Permissão de acesso às páginas foi negada anteriormente ou o App está em modo DEV sem acesso.");
      logs.push("SOLUÇÃO RECOMENDADA:");
      logs.push("1. Acesse: https://www.facebook.com/settings?tab=business_tools");
      logs.push("2. Encontre o App 'CreatorNexus' (ou o nome do seu App) e clique em REMOVER.");
      logs.push("3. Volte aqui e clique em 'Conectar' novamente.");
      return logs;
    }

    // 2. Check each page for IG
    let igFound = false;
    for (const page of pages) {
      logs.push(`---`);
      logs.push(`Página FB: "${page.name}" (ID: ${page.id})`);
      
      if (page.instagram_business_account) {
        igFound = true;
        const igUser = page.instagram_business_account.username || 'Desconhecido';
        logs.push(`✅ VINCULADO: Instagram @${igUser} (ID: ${page.instagram_business_account.id})`);
        
        if (igUser.toLowerCase() === 'mundodosdadosbrasil') {
             logs.push("🌟 SUCESSO: CONTA ALVO ENCONTRADA!");
        }

      } else {
        logs.push("⚠️ SEM VÍNCULO: Esta página não tem conta Instagram Business associada na API.");
      }
    }
    
    if (!igFound) {
       logs.push("---");
       logs.push("RESUMO: Nenhuma conta Instagram foi encontrada nas páginas listadas.");
       logs.push("DICA: Verifique se sua conta Instagram é 'Business' e se está conectada à Página do Facebook nas 'Configurações da Página > Contas Vinculadas'.");
    }

  } catch (error: any) {
    logs.push(`ERRO GERAL: ${error.message}`);
  }

  return logs;
};
