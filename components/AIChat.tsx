import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Sparkles, Trash2, Maximize2, Minimize2, MessageSquare, Globe, Search as SearchIcon } from 'lucide-react';
import { streamChat } from '../services/gemini';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  onClose: () => void;
  isOpen: boolean;
  isEmbedded?: boolean;
}

type AIModel = 'gemini' | 'gpt4' | 'claude' | 'deepseek';

const AIChat: React.FC<AIChatProps> = ({ onClose, isOpen, isEmbedded = false }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini');
  const [showModelSelector, setShowModelSelector] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const models = [
    { id: 'gemini', name: 'Gemini 2.0 Flash', provider: 'Google', color: 'text-accent', active: true, premium: false },
    { id: 'gpt4', name: 'GPT-4o', provider: 'OpenAI', color: 'text-blue-400', active: false, premium: true },
    { id: 'claude', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: 'text-orange-400', active: false, premium: true },
    { id: 'deepseek', name: 'DeepSeek-V3', provider: 'DeepSeek', color: 'text-purple-400', active: false, premium: true },
  ];

  const currentModel = models.find(m => m.id === selectedModel);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setShowModelSelector(true);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (currentModel?.premium) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: t('This AI model is locked. Payment is required to use this intelligence. Join our Discord to pay for Premium access: https://discord.gg/cuHARsXESW') 
        }]);
        setIsTyping(false);
      }, 800);
      return;
    }

    try {
      // Mocking other models for UI purposes, but using Gemini for all
      const systemPrompt = `You are a helpful and intelligent AI assistant. 
      Current Model Identity: ${models.find(m => m.id === selectedModel)?.name} (${models.find(m => m.id === selectedModel)?.provider})
      You provide neutral, factual, and helpful assistance.
      Avoid marketing language or trying to "sell" the site.
      Keep your tone professional and concise. 
      You have access to Google Search to provide real-time information if needed.
      Keep responses stylized with markdown.`;

      let fullResponse = '';
      const responseStream = streamChat([...messages, userMessage], systemPrompt);

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of responseStream) {
        fullResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = fullResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('Deepest apologies, but my neural link is flickering. Please try again.') }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (window.confirm(t('Wipe our conversation history?'))) {
      setMessages([]);
    }
  };

  return (
    <AnimatePresence>
      {(isOpen || isEmbedded) && (
        <motion.div
          initial={isEmbedded ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            height: isEmbedded ? '100%' : (isMinimized ? '60px' : '600px'),
            width: isEmbedded ? '100%' : (isMinimized ? '200px' : '450px')
          }}
          exit={isEmbedded ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          className={`${isEmbedded ? 'relative h-full w-full' : 'fixed bottom-24 right-5 z-[100] shadow-2xl border border-white/10 rounded-2xl'} bg-[#0a0a0a] overflow-hidden flex flex-col transition-all duration-300`}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
              <div className="cursor-pointer group" onClick={() => setShowModelSelector(!showModelSelector)}>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black italic tracking-tight text-white uppercase leading-none">Universal AI</h3>
                  <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase text-neutral-500 group-hover:text-accent transition-colors">
                    {models.find(m => m.id === selectedModel)?.name}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    {selectedModel === 'gemini' ? t('Public / Free') : t('Premium Link')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isEmbedded && (
                <>
                  <button 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-white transition-colors"
                    title={isMinimized ? t('Expand') : t('Minimize')}
                  >
                    {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                  </button>
                  <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 left-4 right-4 z-50 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl p-4 space-y-2"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 mb-2 px-2">{t('Select Intelligence')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {models.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id as AIModel);
                        setShowModelSelector(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        selectedModel === model.id 
                          ? 'bg-accent/10 border-accent/30' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                      } ${model.premium ? 'opacity-70 group/item' : ''}`}
                    >
                      <div className="text-left flex items-center gap-2">
                        <div>
                          <div className={`text-[10px] font-black uppercase italic ${model.color}`}>{model.provider}</div>
                          <div className="text-xs font-bold text-white flex items-center gap-1">
                            {model.name}
                            {model.premium && <Sparkles size={10} className="text-yellow-500" />}
                          </div>
                        </div>
                      </div>
                      {selectedModel === model.id ? (
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      ) : model.premium ? (
                        <div className="text-[8px] font-black uppercase bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">
                          {t('Locked')}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/5 mt-2">
                   <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest text-center">
                     {t('Gemini 2.0 is FREE. Other models require Premium Status.')}
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(!isMinimized || isEmbedded) && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-accent" />
                    </div>
                    <h4 className="text-sm font-black uppercase italic mb-2 text-white">{t('System Ready')}</h4>
                    <p className="text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-[200px] text-neutral-500">
                      {t('Ask me anything. I have broad knowledge and real-time search capabilities.')}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center mt-1 border ${
                          msg.role === 'user' 
                            ? 'bg-neutral-800 border-white/5' 
                            : 'bg-accent/20 border-accent/20'
                        }`}>
                          {msg.role === 'user' ? <User size={12} className="text-neutral-400" /> : <Bot size={12} className="text-accent" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-xs font-bold leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-accent text-white rounded-tr-none shadow-xl shadow-accent/10'
                            : 'bg-white/5 border border-white/10 text-neutral-200 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center mt-1 border bg-accent/20 border-accent/20">
                        <Bot size={12} className="text-accent animate-pulse" />
                      </div>
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('Thinking...')}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white/[0.02] border-t border-white/5 space-y-3 shrink-0">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                  {messages.length > 0 && (
                    <button 
                      type="button"
                      onClick={clearChat}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0 group border border-red-500/20"
                    >
                      <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={currentModel?.premium ? t('Premium required to use this model...') : t('Type a message...')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs font-bold focus:border-accent outline-none transition-all placeholder:text-neutral-600"
                      disabled={isTyping}
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-accent text-white disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
                <div className="flex items-center gap-4 px-1">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-neutral-600" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-600">{t('Global Grounding')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SearchIcon className="w-3 h-3 text-neutral-600" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-600">{t('Real-time Context')}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIChat;
