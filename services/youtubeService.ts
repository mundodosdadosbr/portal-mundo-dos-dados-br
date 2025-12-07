
import { SocialPost, Platform } from '../types';

export const getYouTubePosts = async (
  channelIdentifier: string = '@MundodosDadosBR', 
  maxResults: number = 20,
  customApiKey?: string
): Promise<SocialPost[]> => {
  // Use custom key if provided, otherwise try env, otherwise fail graceful
  const apiKey = customApiKey || process.env.YOUTUBE_API_KEY || '';
  
  if (!apiKey) {
    console.warn("YouTube API Key missing. Returning mock data.");
    return mockYouTubeData(); 
  }

  try {
    let channelId = channelIdentifier;

    // Se não for um ID de canal (que começa com UC), busca o ID pelo Handle/Nome
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

    // 2. Busca vídeos especificamente deste Channel ID
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
       throw new Error(`YouTube API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map to SocialPost
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      platform: Platform.YOUTUBE,
      title: item.snippet.title,
      caption: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      date: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      likes: 0, // A API de busca não retorna stats, precisaria de uma chamada extra (videos?id=...)
      comments: 0,
      views: 0
    }));

  } catch (error) {
    console.error("YouTube Service Error:", error);
    // Em caso de erro, retorna mock para não quebrar a UI
    return mockYouTubeData();
  }
};

// Fallback Mock Data ajustado para o contexto
const mockYouTubeData = (): SocialPost[] => {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: `mock-yt-${i}`,
    platform: Platform.YOUTUBE,
    title: `Mundo dos Dados - Análise #${i + 1}`,
    caption: "Vídeo exclusivo do canal Mundo dos Dados BR sobre tendências de tecnologia.",
    thumbnailUrl: `https://picsum.photos/seed/mdbr${i}/400/225`,
    date: new Date().toISOString(),
    url: '#',
    likes: 120 + i * 10,
    comments: 5 + i,
    views: 1000 + i * 50
  }));
};
