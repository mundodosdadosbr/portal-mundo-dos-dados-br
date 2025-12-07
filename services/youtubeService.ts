
import { SocialPost, Platform } from '../types';

export const getYouTubePosts = async (
  channelName: string = 'Mundo dos Dados BR', 
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
    // 1. Search for channel ID or videos directly
    // Ideally we search channels first, but for 'search' endpoint we can just query string
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelName)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
    
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
      likes: 0, // Search API doesn't return stats, need 2nd call to videos endpoint for that (skipping for simplicity in this revert)
      comments: 0,
      views: 0
    }));

  } catch (error) {
    console.error("YouTube Service Error:", error);
    return mockYouTubeData();
  }
};

// Fallback Mock Data if API fails or no key
const mockYouTubeData = (): SocialPost[] => {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: `mock-yt-${i}`,
    platform: Platform.YOUTUBE,
    title: `Vídeo Tutorial de Dados #${i + 1} - Análise Completa`,
    caption: "Neste vídeo exploramos as tendências de Big Data para o próximo ano...",
    thumbnailUrl: `https://picsum.photos/seed/yt${i}/400/225`,
    date: new Date().toISOString(),
    url: '#',
    likes: 120 + i * 10,
    comments: 5 + i,
    views: 1000 + i * 50
  }));
};
