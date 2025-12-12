
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
  faviconUrl?: string;
  subscribers: string; // Display string (Total)
  bio: string;
  // New field for detailed stats
  platformStats?: {
    youtubeFollowers?: number;
    instagramFollowers?: number;
    tiktokFollowers?: number;
    facebookFollowers?: number;
  };
  // Sync Controls
  lastSyncTime?: string;
  lastSyncType?: 'Manual' | 'Auto';
}

export interface AiSuggestion {
  text: string;
  type: 'caption' | 'idea' | 'tags';
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  markdownContent?: string; // Conteúdo detalhado em Markdown para o modal "Saiba Mais"
}

export interface ChatbotConfig {
  enabled: boolean;
  welcomeMessage: string;
  knowledgeBase: string; // The "NotebookLM" source text
}

export interface LandingPageContent {
  headline: string;
  subheadline: string;
  ctaButtonText: string;
  logoUrl?: string;
  logoBucketUrl?: string; // URL pública do bucket para imagens do carrossel
  features: FeatureItem[];
  chatbotConfig?: ChatbotConfig;
}

export interface TikTokAuthData {
  clientKey: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface MetaAuthData {
  appId: string;
  appSecret?: string; // Novo campo para Long-Lived Tokens
  accessToken: string;
  expiresAt: number;
}
