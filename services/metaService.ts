
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

  return url.toString();
};

/**
 * 2. Fetch User's Pages and linked Instagram Accounts
 */
const getConnectedAccounts = async (accessToken: string) => {
  try {
    const response = await fetch(`${GRAPH_API_URL}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    console.log("Facebook Pages Found:", data.data?.length || 0);
    return data.data || [];
  } catch (error) {
    console.error("Meta: Error fetching accounts", error);
    return [];
  }
};

/**
 * 3. Fetch Instagram Media
 */
export const getInstagramPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];

  try {
    // Step A: Get Pages
    const pages = await getConnectedAccounts(accessToken);
    
    // Step B: Find first page with IG Business Account
    const igPage = pages.find((p: any) => p.instagram_business_account);
    
    if (!igPage) {
      console.warn("DIAGNÓSTICO: Páginas do Facebook encontradas, mas nenhuma tem 'instagram_business_account' vinculado. Verifique as configurações da Página no Facebook.");
      return [];
    }

    const igUserId = igPage.instagram_business_account.id;
    console.log(`Instagram Business ID encontrado: ${igUserId} (na página ${igPage.name})`);

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
 */
export const getFacebookPosts = async (accessToken: string): Promise<SocialPost[]> => {
  if (!accessToken) return [];

  try {
    // Step A: Get Pages
    const pages = await getConnectedAccounts(accessToken);
    
    // For demo, just pick the first page found
    // In production, user should select which page to sync
    const fbPage = pages[0];
    
    if (!fbPage) {
      console.warn("Nenhuma página do Facebook encontrada.");
      return [];
    }

    // Use the PAGE Access Token, not the User Token (usually required for clearer insights, but User token often works for reading)
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
      views: 0, // FB doesn't provide public view counts via Graph API easily
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
      logs.push("DICA: Quando o popup do Facebook abrir, certifique-se de selecionar TODAS as páginas, ou pelo menos a página que tem o Instagram vinculado.");
      return logs;
    }

    // 2. Check each page for IG
    let igFound = false;
    for (const page of pages) {
      logs.push(`Analizando Página: "${page.name}" (ID: ${page.id})`);
      if (page.instagram_business_account) {
        igFound = true;
        logs.push(`✅ SUCESSO: Instagram Business vinculado! ID: ${page.instagram_business_account.id}`);
        
        // Try simple fetch
        try {
           logs.push("Tentando buscar 1 post de teste...");
           const testUrl = `${GRAPH_API_URL}/${page.instagram_business_account.id}/media?limit=1&access_token=${accessToken}`;
           const resp = await fetch(testUrl);
           const json = await resp.json();
           if (json.data) {
             logs.push("✅ Teste de leitura OK. API retornou dados.");
           } else if (json.error) {
             logs.push(`❌ Erro na leitura: ${json.error.message}`);
           }
        } catch (e: any) {
           logs.push(`❌ Falha na requisição de teste: ${e.message}`);
        }

      } else {
        logs.push("⚠️ AVISO: Esta página NÃO tem conta do Instagram vinculada na API.");
        logs.push("DICA: Vá no Meta Business Suite > Configurações > Contas do Instagram e vincule.");
      }
    }

    if (!igFound) {
      logs.push("--- RESULTADO FINAL: FALHA ---");
      logs.push("Nenhuma das páginas que você autorizou tem um Instagram Business vinculado.");
    } else {
      logs.push("--- RESULTADO FINAL: OK ---");
      logs.push("Parece tudo correto. Tente clicar em 'Sincronizar Tudo' novamente.");
    }

  } catch (error: any) {
    logs.push(`ERRO GERAL: ${error.message}`);
  }

  return logs;
};
