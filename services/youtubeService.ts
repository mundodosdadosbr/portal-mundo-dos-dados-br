
import { SocialPost, Platform } from '../types';

export const getYouTubePosts = async (
  channelIdentifier: string = '@MundodosDadosBR', 
  maxResults: number = 20,
  customApiKey?: string
): Promise<SocialPost[]> => {
  // Use custom key if provided, otherwise try env, otherwise fail graceful
  const apiKey = customApiKey || process.env.YOUTUBE_API_KEY || '';
  
  if (!apiKey) {
    console.warn("YouTube API Key missing.");
    return []; 
  }

  try {
    let channelId = channelIdentifier;

    // 1. Se não for um ID de canal (que começa com UC), busca o ID pelo Handle/Nome
    if (!channelIdentifier.startsWith('UC')) {
      const channelSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelIdentifier)}&maxResults=1&key=${apiKey}`;
      
      const channelResp = await fetch(channelSearchUrl);
      if (!channelResp.ok) throw new Error(`Erro ao buscar canal: ${channelResp.statusText}`);
      
      const channelData = await channelResp.json();
      
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error(`Canal '${channelIdentifier}' não encontrado.`);
      }
      
      channelId = channelData.items[0].id.channelId;
    }

    // 2. Busca vídeos deste Channel ID
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
       throw new Error(`YouTube API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }

    // 3. Extrair IDs dos vídeos para buscar estatísticas (Views, Likes, Comentários)
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
    
    const statsResp = await fetch(statsUrl);
    const statsData = await statsResp.json();

    // Criar um mapa de ID -> Estatísticas para acesso rápido
    const statsMap: Record<string, any> = {};
    if (statsData.items) {
      statsData.items.forEach((item: any) => {
        statsMap[item.id] = item.statistics;
      });
    }

    // 4. Mapear para o objeto SocialPost combinando Snippet + Statistics
    return data.items.map((item: any) => {
      const videoId = item.id.videoId;
      const stats = statsMap[videoId] || {};

      return {
        id: videoId,
        platform: Platform.YOUTUBE,
        title: item.snippet.title,
        caption: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        date: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        likes: parseInt(stats.likeCount) || 0,
        comments: parseInt(stats.commentCount) || 0,
        views: parseInt(stats.viewCount) || 0
      };
    });

  } catch (error) {
    console.error("YouTube Service Error:", error);
    return [];
  }
};
