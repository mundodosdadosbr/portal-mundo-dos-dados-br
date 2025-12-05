import React from 'react';
import { Sparkles, TrendingUp, Users, LayoutDashboard } from './Icons';
import { LandingPageContent } from '../types';

interface LandingPageProps {
  onPortalAccess: () => void;
  onAdminLogin: () => void;
  content: LandingPageContent;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onPortalAccess, onAdminLogin, content }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-lg">
              <LayoutDashboard size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              CreatorNexus
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onAdminLogin}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Login Admin
            </button>
            <button 
              onClick={onPortalAccess}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/25"
            >
              Ir para Feeds
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-grow flex items-center justify-center py-20 px-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 mb-8">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-sm text-slate-300">Agora com Integração Gemini AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            {content.headline}
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {content.subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={onPortalAccess}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors"
            >
              {content.ctaButtonText}
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white border border-slate-800 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors">
              Saiba Mais
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-900/50 py-24 border-y border-slate-900">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 text-indigo-400">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{content.feature1Title}</h3>
              <p className="text-slate-400">
                {content.feature1Desc}
              </p>
            </div>
            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 text-purple-400">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{content.feature2Title}</h3>
              <p className="text-slate-400">
                {content.feature2Desc}
              </p>
            </div>
            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{content.feature3Title}</h3>
              <p className="text-slate-400">
                {content.feature3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-500">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
             <LayoutDashboard size={20} />
             <span className="font-semibold text-slate-400">CreatorNexus</span>
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
            <button onClick={onAdminLogin} className="hover:text-white transition-colors">Admin</button>
          </div>
        </div>
      </footer>
    </div>
  );
};