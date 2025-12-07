
import { SocialPost, Platform } from '../types';

/**
 * Fetches TikTok posts.
 * 
 * If an accessToken is provided, it attempts to fetch from the official TikTok Display API.
 * If no token is provided or the fetch fails (e.g. CORS), it returns realistic mock data.
 * 
 * API: https://developers.tiktok.com/doc/overview
 */
export const getTikTokPosts = async (
  username: string = 'mundodosdadosbr', 
  accessToken?: string
): Promise<SocialPost[]> => {
  
  // 1. Attempt Real API Call if Token exists
  if (accessToken) {
    try {
      // TikTok Display API v2 - Video List
      // Note: This endpoint often requires the user 'open_id' or 'access_token' with scopes 'user.info.basic, video.list'
      // We request specific fields to optimize the payload.
      const fields = "id,title,cover_image_url,like_count,comment_count,view_count,create_time,share_url";
      
      const response = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          max_count: 20
        })
      });

      if (!response.ok) {
        throw new Error(`TikTok API status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.videos) {
        return data.data.videos.map((video: any) => ({
          id: video.id,
          platform: Platform.TIKTOK,
          thumbnailUrl: video.cover_image_url,
          caption: video.title || 'Sem legenda', // TikTok "title" is often the caption
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          views: video.view_count || 0,
          date: new Date(video.create_time * 1000).toISOString(),
          url: video.share_url || '#'
        }));
      }

    } catch (error) {
      console.warn("TikTok API call failed (using mock fallback):", error);
      // Fallthrough to mock data below
    }
  }

  // 2. Mock Fallback (Simulating network latency)
  await new Promise(resolve => setTimeout(resolve, 1500));

  const cleanUser = username.replace('@', '');

  return [
    {
      id: `tt-video-1`,
      platform: Platform.TIKTOK,
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop', // Vertical tech vibe
      caption: "O poder do SQL em 15 segundos! 🚀 Nunca foi tão fácil aprender queries. #dados #sql #tech #programacao",
      likes: 15420,
      comments: 342,
      views: 85000,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      url: `https://www.tiktok.com/@${cleanUser}/video/1`
    },
    {
      id: `tt-video-2`,
      platform: Platform.TIKTOK,
      thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop', // Cyberpunk/Data vibe
      caption: "Python ou R? Qual você prefere para Data Science? 👇 Deixa nos comentários! #datascience #python #coding",
      likes: 8900,
      comments: 1250,
      views: 42100,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
      url: `https://www.tiktok.com/@${cleanUser}/video/2`
    },
    {
      id: `tt-video-3`,
      platform: Platform.TIKTOK,
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop', // Hardware/Chips
      caption: "POV: Você descobriu que o Excel não é banco de dados 🤡 #humor #dev #ti #analisededados",
      likes: 45200,
      comments: 890,
      views: 210500,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
      url: `https://www.tiktok.com/@${cleanUser}/video/3`
    },
    {
      id: `tt-video-4`,
      platform: Platform.TIKTOK,
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop', // Matrix code
      caption: "Dica rápida de Power BI para impressionar o chefe na segunda-feira! 📊 #businessintelligence #powerbi #dica",
      likes: 3200,
      comments: 45,
      views: 12300,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), 
      url: `https://www.tiktok.com/@${cleanUser}/video/4`
    }
  ];
};
