
import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Users, LayoutDashboard, CloudLightning, X, ShieldCheck, Lock, Smartphone, Mail, Github, AvailableIcons, Youtube, Instagram, Facebook, TikTokIcon, Video, BarChart3, CloudLightning as CloudIcon, FileText, Database, Code, Globe, Zap, ArrowRight, BookOpen, Linkedin } from './Icons';
import { LandingPageContent, FeatureItem } from '../types';

interface LandingPageProps {
  onPortalAccess: () => void;
  onAdminLogin: () => void;
  content: LandingPageContent;
}

// Tech Stack Logos Simulation - Row 1: Cloud & Big Data Infra
const TechLogosRow1 = [
  { name: 'AWS', icon: CloudLightning, color: 'text-orange-500' },
  { name: 'Azure', icon: CloudIcon, color: 'text-blue-500' },
  { name: 'Google Cloud', icon: Globe, color: 'text-blue-400' },
  { name: 'Databricks', icon: Database, color: 'text-red-500' },
  { name: 'Snowflake', icon: CloudIcon, color: 'text-cyan-400' },
  { name: 'BigQuery', icon: Database, color: 'text-teal-400' },
];

// Tech Stack Logos Simulation - Row 2: Analytics & Processing
const TechLogosRow2 = [
  { name: 'Python', icon: Code, color: 'text-blue-400' },
  { name: 'Power BI', icon: BarChart3, color: 'text-yellow-500' },
  { name: 'SQL Server', icon: Database, color: 'text-slate-300' },
  { name: 'Apache Spark', icon: Zap, color: 'text-orange-500' },
  { name: 'Hadoop', icon: Database, color: 'text-yellow-600' },
  { name: 'Excel', icon: FileText, color: 'text-emerald-500' },
];

interface LogoTickerItemProps {
  name: string;
  Icon: React.ElementType;
  color: string;
  bucketUrl?: string;
}

// Fallback logic item
const LogoTickerItem: React.FC<LogoTickerItemProps> = ({ name, Icon, color, bucketUrl }) => {
  const [imgError, setImgError] = useState(false);
  
  // Normalize name for filename: "Power BI" -> "power-bi.png", "AWS" -> "aws.png"
  const fileName = name.toLowerCase().replace(/\s+/g, '-') + '.png';
  const imageUrl = bucketUrl ? `${bucketUrl.replace(/\/$/, '')}/${fileName}` : null;

  if (imageUrl && !imgError) {
    return (
      <div className="flex items-center gap-3">
        <img 
          src={imageUrl} 
          alt={name} 
          className="h-12 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity" 
          onError={() => setImgError(true)}
        />
        {/* Optional: Hide text if image loads successfully to look more like a logo wall, 
            or keep it for clarity. Keeping text for now as requested style. */}
        <span className="text-4xl font-black uppercase tracking-tighter text-slate-300">{name}</span>
      </div>
    );
  }

  // Fallback to Icon
  return (
    <div className="flex items-center gap-3">
      <Icon size={48} className={color} />
      <span className="text-4xl font-black uppercase tracking-tighter text-slate-300">{name}</span>
    </div>
  );
};

const BackgroundLogoMarquee = ({ bucketUrl }: { bucketUrl?: string }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07] select-none z-0 flex flex-col justify-center gap-16 md:gap-24 -rotate-6 scale-110">
      
      {/* Row 1: Left Scroll */}
      <div className="relative flex overflow-hidden">
        <div className="animate-scroll-left flex gap-12 md:gap-24 whitespace-nowrap min-w-max px-12">
          {[...TechLogosRow1, ...TechLogosRow1, ...TechLogosRow1, ...TechLogosRow1].map((tech, idx) => (
            <LogoTickerItem 
              key={`r1-${idx}`} 
              name={tech.name} 
              Icon={tech.icon} 
              color={tech.color} 
              bucketUrl={bucketUrl}
            />
          ))}
        </div>
      </div>

      {/* Row 2: Right Scroll */}
      <div className="relative flex overflow-hidden">
        <div className="animate-scroll-right flex gap-12 md:gap-24 whitespace-nowrap min-w-max px-12">
          {[...TechLogosRow2, ...TechLogosRow2, ...TechLogosRow2, ...TechLogosRow2].map((tech, idx) => (
             <LogoTickerItem 
              key={`r2-${idx}`} 
              name={tech.name} 
              Icon={tech.icon} 
              color={tech.color}
              bucketUrl={bucketUrl} 
            />
          ))}
        </div>
      </div>
       
       {/* Row 3: Left Scroll (Repeat Row 1 for density) */}
       <div className="relative flex overflow-hidden">
        <div className="animate-scroll-left flex gap-12 md:gap-24 whitespace-nowrap min-w-max px-12">
          {[...TechLogosRow1, ...TechLogosRow1, ...TechLogosRow1, ...TechLogosRow1].map((tech, idx) => (
            <LogoTickerItem 
              key={`r3-${idx}`} 
              name={tech.name} 
              Icon={tech.icon} 
              color={tech.color} 
              bucketUrl={bucketUrl}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

// --- SIMPLE MARKDOWN PARSER ---
// Converts basic Markdown to React Elements: Headers (#), Bold (**), Lists (-), and Links
const SimpleMarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null;
  const lines = content.split('\n');

  const processInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      // Link: [text](url)
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
         return (
           <a 
             key={index} 
             href={linkMatch[2]} 
             target="_blank" 
             rel="noopener noreferrer" 
             className="text-indigo-400 hover:text-indigo-300 underline"
           >
             {linkMatch[1]}
           </a>
         );
      }
      return part;
    });
  };

  return (
    <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        // H3: ### Title
        if (trimmed.startsWith('### ')) return <h5 key={i} className="text-base font-bold text-white mt-4 mb-2">{trimmed.replace('### ', '')}</h5>;
        // H2: ## Title
        if (trimmed.startsWith('## ')) return <h4 key={i} className="text-lg font-bold text-white mt-5 mb-2 border-b border-slate-700 pb-1">{trimmed.replace('## ', '')}</h4>;
        // H1: # Title
        if (trimmed.startsWith('# ')) return <h3 key={i} className="text-xl font-bold text-indigo-400 mt-6 mb-3">{trimmed.replace('# ', '')}</h3>;
        
        // List Item: - Item
        if (trimmed.startsWith('- ')) {
           return (
             <div key={i} className="flex gap-2 ml-2">
               <span className="text-indigo-500 font-bold">•</span>
               <span>{processInline(trimmed.replace('- ', ''))}</span>
             </div>
           );
        }
        
        // Empty line (Paragraph break)
        if (trimmed === '') return <div key={i} className="h-2" />;

        // Paragraph
        return <p key={i}>{processInline(line)}</p>;
      })}
    </div>
  );
};


export const LandingPage: React.FC<LandingPageProps> = ({ onPortalAccess, onAdminLogin, content }) => {
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureItem | null>(null);

  // --- SEO INJECTION: FEATURES SCHEMA ---
  // Injeta o conteúdo detalhado (Markdown) no JSON-LD para o Google ler, 
  // mesmo que esteja "escondido" no modal.
  useEffect(() => {
    if (!content.features || content.features.length === 0) return;

    // Helper to strip markdown for cleaner SEO text
    const stripMarkdown = (text: string) => {
      if (!text) return '';
      return text
        .replace(/[#*]/g, '') // remove simple markdown chars like # and *
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // replace links [text](url) with just text
        .replace(/\n/g, ' '); // linearize
    };

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Recursos e Conteúdos do Mundo dos Dados BR",
      "itemListElement": content.features.map((feature, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Service",
          "name": feature.title,
          "description": feature.description,
          // Propriedade customizada (disambiguatingDescription ou text) para o conteúdo longo
          "disambiguatingDescription": stripMarkdown(feature.markdownContent || feature.description),
          "image": `https://portal.mundodosdadosbr.com/images/${feature.icon}.png` // Simulated URL
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    script.id = 'features-dynamic-schema';

    // Cleanup old script if exists
    const old = document.getElementById('features-dynamic-schema');
    if (old) old.remove();

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [content.features]);

  const LEGAL_CONTENT = {
    privacy: {
      title: "Política de Privacidade",
      updated: "Atualizado em: 25 de Maio de 2024",
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            O <strong>Mundo dos Dados BR</strong> valoriza a sua privacidade. Esta política descreve como coletamos, usamos e protegemos as suas informações ao utilizar nossa plataforma de agregação de conteúdo.
          </p>
          
          <h4 className="text-white font-bold mt-4">1. Coleta e Armazenamento de Dados</h4>
          <p>
            O Mundo dos Dados BR opera primariamente como uma aplicação "Client-Side" conectada ao Firebase. Isso significa que:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Credenciais (API Keys/Tokens):</strong> Suas chaves de API do YouTube e Tokens do TikTok são armazenados de forma segura no banco de dados da sua própria instância ou localmente no navegador, dependendo da configuração.</li>
            <li><strong>Dados de Perfil:</strong> Informações como biografia, links e preferências visuais são salvas para personalizar sua experiência.</li>
          </ul>

          <h4 className="text-white font-bold mt-4">2. Uso de APIs de Terceiros</h4>
          <p>
            Para fornecer o painel unificado, utilizamos serviços oficiais de terceiros. Ao utilizar o Mundo dos Dados BR, você reconhece e concorda com as práticas de privacidade destes serviços:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>YouTube API Services:</strong> Utilizamos a API do YouTube para exibir vídeos e estatísticas. Dados acessados via API do YouTube são processados de acordo com a <a href="https://policies.google.com/privacy" target="_blank" className="text-indigo-400 underline">Política de Privacidade do Google</a>.</li>
            <li><strong>TikTok API:</strong> Utilizamos a API do TikTok para exibir seus vídeos verticais. Dados são tratados conforme a Política de Privacidade do TikTok.</li>
            <li><strong>Google Gemini (IA):</strong> Se utilizar os recursos de IA, o texto do seu post é enviado para a API do Google Gemini para processamento. Nenhuma informação pessoal identificável é armazenada por nós nesse processo.</li>
          </ul>

          <h4 className="text-white font-bold mt-4">3. Compartilhamento de Dados</h4>
          <p>
            Nós <strong>não vendemos, alugamos ou compartilhamos</strong> seus dados pessoais com terceiros. Você tem controle total sobre o acesso à sua conta.
          </p>

          <h4 className="text-white font-bold mt-4">4. Seus Direitos</h4>
          <p>
            Você pode revogar o acesso do Mundo dos Dados BR aos seus dados a qualquer momento:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Limpando o cache/dados do seu navegador.</li>
            <li>Revogando o acesso do app nas configurações de segurança da sua conta Google ou TikTok (Página de Permissões de Apps de Terceiros).</li>
          </ul>
        </div>
      )
    },
    terms: {
      title: "Termos de Uso",
      updated: "Atualizado em: 25 de Maio de 2024",
      content: (
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            Ao acessar e usar o <strong>Mundo dos Dados BR</strong>, você concorda em cumprir estes Termos de Uso. Se você não concordar com algum destes termos, você está proibido de usar este site.
          </p>

          <h4 className="text-white font-bold mt-4">1. Licença de Uso</h4>
          <p>
            O Mundo dos Dados BR concede a você uma licença limitada, não exclusiva e intransferível para usar a plataforma para fins pessoais ou comerciais de gerenciamento de conteúdo, sujeito a estes termos.
          </p>

          <h4 className="text-white font-bold mt-4">2. Conformidade com Plataformas</h4>
          <p>
            Nossa ferramenta agrega dados de múltiplas redes sociais. Ao usá-la, você concorda explicitamente em seguir os Termos de Serviço das respectivas plataformas:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Ao conectar o YouTube, você concorda em estar vinculado aos <a href="https://www.youtube.com/t/terms" target="_blank" className="text-indigo-400 underline">Termos de Serviço do YouTube</a>.
            </li>
            <li>
              Ao conectar o TikTok, você concorda com os Termos de Serviço do Desenvolvedor do TikTok.
            </li>
          </ul>

          <h4 className="text-white font-bold mt-4">3. Propriedade Intelectual</h4>
          <p>
            O código-fonte, design e funcionalidades do Mundo dos Dados BR são propriedade exclusiva dos desenvolvedores. O <strong>conteúdo</strong> (vídeos, textos, imagens) exibido no painel permanece sendo propriedade dos seus respectivos criadores.
          </p>

          <h4 className="text-white font-bold mt-4">4. Isenção de Garantias</h4>
          <p>
            O serviço é fornecido "como está". Não garantimos que a plataforma estará livre de erros ou que as APIs de terceiros (YouTube/TikTok) funcionarão ininterruptamente, pois dependemos de suas disponibilidades e regras.
          </p>

          <h4 className="text-white font-bold mt-4">5. Limitação de Responsabilidade</h4>
          <p>
            Em nenhum caso o Mundo dos Dados BR ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro) decorrentes do uso ou da incapacidade de usar a plataforma.
          </p>
        </div>
      )
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {content.logoUrl ? (
              <img src={content.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-lg">
                <LayoutDashboard size={24} className="text-white" />
              </div>
            )}
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
              {content.headline}
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
              {content.ctaButtonText}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-grow flex items-center justify-center py-20 px-6 relative overflow-hidden">
        {/* Animated Background Logos */}
        <BackgroundLogoMarquee bucketUrl={content.logoBucketUrl} />

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-sm text-slate-300">Inteligência de Dados Aplicada</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 drop-shadow-sm">
            {content.headline}
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            {content.subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={onPortalAccess}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20"
            >
              <LayoutDashboard size={20} />
              {content.ctaButtonText}
            </button>
            <button 
              onClick={onPortalAccess}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 text-white border border-slate-800 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors backdrop-blur-sm"
            >
              Ver Últimos Vídeos
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-900/50 py-24 border-y border-slate-900 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {content.features && content.features.map((feature) => {
               // Dynamic Icon Rendering
               const IconComponent = AvailableIcons[feature.icon] || TrendingUp;
               return (
                 <div key={feature.id} className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-colors group flex flex-col items-start h-full relative">
                    <div className="w-14 h-14 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                      <IconComponent size={28} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed mb-6 flex-grow">
                      {feature.description}
                    </p>
                    {feature.markdownContent && (
                        <button 
                            onClick={() => setActiveFeature(feature)}
                            className="mt-auto text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                            Saiba mais <ArrowRight size={14} />
                        </button>
                    )}
                  </div>
               );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900 relative z-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-500">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
             <span className="font-semibold text-slate-400">&copy; {new Date().getFullYear()} {content.headline}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <button 
              onClick={() => setActiveLegalModal('privacy')} 
              className="hover:text-white transition-colors"
            >
              Privacidade
            </button>
            <button 
              onClick={() => setActiveLegalModal('terms')} 
              className="hover:text-white transition-colors"
            >
              Termos
            </button>
            
            <div className="w-px h-4 bg-slate-800 my-auto hidden sm:block"></div>
            
            <a 
              href="https://wa.me/5561998763933" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-emerald-400 transition-colors flex items-center gap-2 font-medium"
            >
              <Smartphone size={16} />
              <span>WhatsApp</span>
            </a>
            
            <a 
              href="mailto:diego.morais@mundodosdadosbr.com" 
              className="hover:text-indigo-400 transition-colors flex items-center gap-2 font-medium"
            >
              <Mail size={16} />
              <span>Email</span>
            </a>

            <a 
              href="https://github.com/mundodosdadosbr" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-purple-400 transition-colors flex items-center gap-2 font-medium"
            >
              <Github size={16} />
              <span>GitHub</span>
            </a>

            <a 
              href="https://www.linkedin.com/in/diego-nunes-de-morais-a74383a1/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-blue-400 transition-colors flex items-center gap-2 font-medium"
            >
              <Linkedin size={16} />
              <span>LinkedIn</span>
            </a>

            <div className="w-px h-4 bg-slate-800 my-auto hidden sm:block"></div>

            <button onClick={onAdminLogin} className="hover:text-white transition-colors">Área Restrita</button>
          </div>
        </div>
      </footer>

      {/* Feature Details Modal (Markdown Supported) */}
      {activeFeature && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl relative flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    {(() => {
                        const IconComponent = AvailableIcons[activeFeature.icon] || AvailableIcons['TrendingUp'];
                        return <IconComponent size={20} />;
                    })()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {activeFeature.title}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setActiveFeature(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
               <SimpleMarkdownRenderer content={activeFeature.markdownContent || activeFeature.description} />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setActiveFeature(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Legal Modal */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl relative flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  {activeLegalModal === 'privacy' ? <ShieldCheck size={20} /> : <Lock size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {LEGAL_CONTENT[activeLegalModal].title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {LEGAL_CONTENT[activeLegalModal].updated}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveLegalModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto">
              {LEGAL_CONTENT[activeLegalModal].content}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setActiveLegalModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
