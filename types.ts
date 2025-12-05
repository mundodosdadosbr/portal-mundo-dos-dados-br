export enum Platform {
  YOUTUBE = 'YouTube',
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  FACEBOOK = 'Facebook'
}

export interface SocialPost {
  id: string;
  platform: Platform;
  thumbnailUrl: string;
  title?: string; // YouTube
  caption?: string; // Socials
  likes: number;
  comments: number;
  views?: number;
  date: string;
  url: string;
}

export interface CreatorProfile {
  name: string;
  handle: string;
  avatarUrl: string;
  subscribers: string;
  bio: string;
}

export interface AiSuggestion {
  text: string;
  type: 'caption' | 'idea' | 'tags';
}