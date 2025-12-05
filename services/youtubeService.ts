import { SocialPost, Platform } from '../types';

const getApiKey = () => process.env.API_KEY || '';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export const getYouTubePosts = async (query: string = 'tecnologia e programação', maxResults: number = 20): Promise<SocialPost[]> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API Key não encontrada');
  }

  try {
    // 1. Buscar IDs de vídeos (Busca)
    // Documentação: https://developers.google.com/youtube/v3/docs/search/list
    const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
    
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      const errorData = await searchRes.json();
      throw new Error(errorData.error?.message || 'Falha ao buscar vídeos na API do YouTube');
    }
    
    const searchData = await searchRes.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    // 2. Buscar detalhes dos vídeos (Estatísticas: views, likes, comments)
    // Documentação: https://developers.google.com/youtube/v3/docs/videos/list
    const videosUrl = `${YOUTUBE_API_URL}/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
    const videosRes = await fetch(videosUrl);
    
    if (!videosRes.ok) {
       throw new Error('Falha ao buscar estatísticas dos vídeos');
    }

    const videosData = await videosRes.json();

    // 3. Mapear para o formato SocialPost
    return videosData.items.map((item: any) => ({
      id: item.id,
      platform: Platform.YOUTUBE,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      title: item.snippet.title,
      caption: item.snippet.description, // YouTube usa description como caption
      likes: parseInt(item.statistics.likeCount || '0'),
      comments: parseInt(item.statistics.commentCount || '0'),
      views: parseInt(item.statistics.viewCount || '0'),
      date: new Date(item.snippet.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      url: `https://www.youtube.com/watch?v=${item.id}`
    }));

  } catch (error) {
    console.error("Erro no YouTube Service:", error);
    throw error;
  }
};