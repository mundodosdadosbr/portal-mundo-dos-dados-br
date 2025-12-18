
import React, { useState } from 'react';
import { SocialPost, Platform } from '../types';
import { Heart, MessageCircle, Eye, Sparkles } from './Icons';

interface PostCardProps {
  post: SocialPost;
  onAiAction: (post: SocialPost) => void;
  showAiAction: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onAiAction, showAiAction }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  // SEO: Create a meaningful description for the image alt tag
  const altText = post.title 
    ? `Vídeo sobre ${post.title} no ${post.platform} - Mundo dos Dados BR` 
    : `Post sobre ${post.caption?.substring(0, 50)}... no ${post.platform} - Mundo dos Dados BR`;

  return (
    <div className="group relative bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 shadow-lg hover:shadow-2xl flex flex-col h-full backdrop-blur-sm">
      {/* Image / Thumbnail - Clickable */}
      <a 
        href={post.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="aspect-[4/5] w-full relative overflow-hidden bg-slate-900 block cursor-pointer"
        title={post.title || post.caption}
      >
        {/* Skeleton Loader Background */}
        <div className={`absolute inset-0 bg-slate-800 animate-pulse z-0 ${isImageLoaded ? 'hidden' : 'block'}`} />
        
        <img 
          src={post.thumbnailUrl} 
          alt={altText}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 z-10 relative
            ${isImageLoaded ? 'opacity-90 group-hover:opacity-100 blur-0' : 'opacity-0 blur-sm'}
          `}
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-80 z-20 pointer-events-none" />
        
        {/* Platform Badge */}
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <span className={`
            px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg backdrop-blur-md border border-white/10
            ${post.platform === Platform.YOUTUBE ? 'bg-red-600/90 text-white' : ''}
            ${post.platform === Platform.INSTAGRAM ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white' : ''}
            ${post.platform === Platform.FACEBOOK ? 'bg-blue-600/90 text-white' : ''}
            ${post.platform === Platform.TIKTOK ? 'bg-slate-950 text-emerald-400' : ''}
          `}>
            {post.platform}
          </span>
        </div>
      </a>

      {/* Content */}
      <div className="flex flex-col flex-grow p-5">
        {post.title && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">
            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 leading-tight">
              {post.title}
            </h3>
          </a>
        )}
        
        {post.caption && (
          <p className="text-slate-300 text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">
            {post.caption}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between text-slate-300 text-xs mt-auto border-t border-slate-700/50 pt-4">
          <div className="flex items-center space-x-4 w-full">
            <span className="flex items-center space-x-1.5 group/stat" title="Curtidas">
              <Heart size={16} className="text-rose-500 fill-rose-500/10 group-hover/stat:fill-rose-500 transition-all" />
              <span className="font-bold">{typeof post.likes === 'number' && post.likes > 0 ? post.likes.toLocaleString('pt-BR') : '-'}</span>
            </span>
            <span className="flex items-center space-x-1.5 group/stat" title="Comentários">
              <MessageCircle size={16} className="text-sky-400 fill-sky-400/10 group-hover/stat:fill-sky-400 transition-all" />
              <span className="font-bold">{typeof post.comments === 'number' && post.comments > 0 ? post.comments.toLocaleString('pt-BR') : '-'}</span>
            </span>
            <span className="flex items-center space-x-1.5 ml-auto group/stat" title="Visualizações">
              <Eye size={16} className="text-emerald-400 fill-emerald-400/10 group-hover/stat:fill-emerald-400 transition-all" />
              <span className="font-bold">
                {typeof post.views === 'number' 
                    ? post.views.toLocaleString('pt-BR') 
                    : '-'}
              </span>
            </span>
          </div>
        </div>

        {/* AI Action Button - Only visible if logged in */}
        {showAiAction && (
          <div className="mt-4 overflow-hidden h-0 group-hover:h-10 transition-all duration-300">
            <button 
              onClick={() => onAiAction(post)}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
            >
              <Sparkles size={16} />
              <span>Remixar com IA</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
