
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from './Icons';
import { chatWithNotebook } from '../services/geminiService';
import { ChatbotConfig } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  config: ChatbotConfig;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.welcomeMessage && messages.length === 0) {
      setMessages([{ role: 'assistant', content: config.welcomeMessage }]);
    }
  }, [config.welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !config.knowledgeBase) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await chatWithNotebook(userMsg, config.knowledgeBase);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erro ao conectar com a IA." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!config.enabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="pointer-events-auto bg-slate-900 border border-slate-700 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-fade-in transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
              <Bot size={20} />
              <span className="font-bold">Assistente Virtual</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-900/50">
             {messages.map((msg, idx) => (
               <div 
                 key={idx} 
                 className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
               >
                 <div className={`
                    max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}
                 `}>
                    {msg.content}
                 </div>
               </div>
             ))}
             {isTyping && (
               <div className="flex justify-start">
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none flex gap-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                  </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte sobre os dados..."
              className="flex-grow bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* TOGGLE BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105 group relative"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        
        {/* Notification Badge if closed */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>
    </div>
  );
};
