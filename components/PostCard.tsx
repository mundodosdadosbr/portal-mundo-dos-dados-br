
import React from 'react';
import { SocialPost, Platform } from '../types';
import { Heart, MessageCircle, Eye, Sparkles } from './Icons';

interface PostCardProps {
  post: SocialPost;
  onAiAction: (post: SocialPost) => void;
  showAiAction: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onAiAction, showAiAction }) => {
  const isVideo = post.platform === Platform.YOUTUBE || post.platform === Platform.TIKTOK;

  return (
    <div className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all duration-300 shadow-lg hover:shadow-2xl flex flex-col h-full">
      {/* Image / Thumbnail - Clickable */}
      <a 
        href={post.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="aspect-[4/5] w-full relative overflow-hidden bg-slate-900 block cursor-pointer"
      >
        <img 
          src={post.thumbnailUrl} 
          alt="Thumbnail do post" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
        
        {/* Platform Badge */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className={`
            px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-md
            ${post.platform === Platform.YOUTUBE ? 'bg-red-600/90 text-white' : ''}
            ${post.platform === Platform.INSTAGRAM ? 'bg-fuchsia-600/90 text-white' : ''}
            ${post.platform === Platform.FACEBOOK ? 'bg-blue-600/90 text-white' : ''}
            ${post.platform === Platform.TIKTOK ? 'bg-teal-500/90 text-slate-900' : ''}
          `}>
            {post.platform}
          </span>
        </div>
      </a>

      {/* Content */}
      <div className="flex flex-col flex-grow p-4">
        {post.title && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">
            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 leading-tight">
              {post.title}
            </h3>
          </a>
        )}
        
        {post.caption && (
          <p className="text-slate-300 text-sm mb-3 line-clamp-2 flex-grow">
            {post.caption}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between text-slate-400 text-xs mt-2 border-t border-slate-700/50 pt-3">
          <div className="flex items-center space-x-4 w-full">
            <span className="flex items-center space-x-1" title="Curtidas">
              <Heart size={14} className="text-rose-500" />
              <span>{post.likes > 0 ? post.likes.toLocaleString('pt-BR') : '-'}</span>
            </span>
            <span className="flex items-center space-x-1" title="Comentários">
              <MessageCircle size={14} className="text-sky-400" />
              <span>{post.comments > 0 ? post.comments.toLocaleString('pt-BR') : '-'}</span>
            </span>
            <span className="flex items-center space-x-1 ml-auto" title="Visualizações">
              <Eye size={14} className="text-emerald-400" />
              <span>{post.views && post.views > 0 ? post.views.toLocaleString('pt-BR') : '0'}</span>
            </span>
          </div>
        </div>

        {/* AI Action Button - Only visible if logged in */}
        {showAiAction && (
          <div className="mt-4 overflow-hidden h-0 group-hover:h-10 transition-all duration-300">
            <button 
              onClick={() => onAiAction(post)}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
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
