import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ExternalLink, Search, Zap, Shield, Link2, LayoutGrid, List } from 'lucide-react';
import { PROXIES_DATA } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { TranslatedText } from './TranslatedText';

const ProxiesPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [proxyStatuses, setProxyStatuses] = useState<Record<string, { online: boolean; checking: boolean }>>({});

  const filteredProxies = PROXIES_DATA.filter(proxy => 
    (proxy.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    proxy.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  React.useEffect(() => {
    const checkProxies = async () => {
      // Initialize state
      const initial: any = {};
      PROXIES_DATA.forEach(p => initial[p.url] = { online: true, checking: true });
      setProxyStatuses(initial);

      // Check each proxy
      for (const proxy of PROXIES_DATA) {
        try {
          const res = await fetch(`/api/proxies/check?url=${encodeURIComponent(proxy.url)}`);
          const data = await res.json();
          setProxyStatuses(prev => ({
            ...prev,
            [proxy.url]: { online: data.online, checking: false }
          }));
        } catch (err) {
          setProxyStatuses(prev => ({
            ...prev,
            [proxy.url]: { online: false, checking: false }
          }));
        }
      }
    };

    checkProxies();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="py-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-accent mb-4"
          >
            <Shield size={20} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">{t('Network Safety')}</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none"
          >
            {t('Proxies')}
          </motion.h1>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text"
              placeholder={t('Search proxies...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white w-full md:w-80 focus:outline-none focus:border-accent/40 transition-all font-medium"
            />
          </div>
          
          <div className="flex bg-surface-hover p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow-[0_0_20px_var(--accent-glow)]' : 'text-text-muted hover:text-white'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-accent text-white shadow-[0_0_20px_var(--accent-glow)]' : 'text-text-muted hover:text-white'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {filteredProxies.length === 0 ? (
        <div className="py-20 text-center">
            <div className="w-20 h-20 bg-surface-hover rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Globe size={40} className="text-text-muted" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{t('No proxies found')}</h3>
            <p className="text-text-muted">{t('Try adjusting your search criteria')}</p>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "flex flex-col gap-3"
          }
        >
          {filteredProxies.map((proxy, idx) => (
            <motion.a 
              key={proxy.url}
              variants={item}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={proxy.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`group bg-surface-hover/50 backdrop-blur-sm border border-white/5 hover:border-accent/30 transition-all duration-300 relative overflow-hidden ${
                viewMode === 'grid' 
                  ? "p-8 rounded-[32px] flex flex-col items-center text-center" 
                  : "p-5 rounded-2xl flex items-center justify-between"
              }`}
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className={viewMode === 'grid' ? "flex flex-col items-center" : "flex items-center gap-6"}>
                <div className={`shrink-0 bg-surface rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-accent/10 border border-white/5 group-hover:border-accent/20 ${
                    viewMode === 'grid' ? "w-16 h-16 mb-6" : "w-12 h-12"
                }`}>
                  <Globe size={viewMode === 'grid' ? 28 : 20} className="text-text-muted group-hover:text-accent transition-colors" />
                </div>
                
                <div className={viewMode === 'grid' ? "" : "text-left"}>
                  <h3 className={`text-white font-black uppercase italic tracking-tight transition-colors group-hover:text-accent ${
                    viewMode === 'grid' ? "text-2xl mb-2" : "text-lg"
                  }`}>
                    <TranslatedText text={proxy.name || proxy.url.replace(/^https?:\/\//, '').split('/')[0]} />
                  </h3>
                  {viewMode === 'grid' && (
                    <p className="text-text-muted text-xs font-mono truncate max-w-full opacity-60 group-hover:opacity-100 transition-opacity">
                      {proxy.url.replace(/^https?:\/\//, '').split('/')[0]}
                    </p>
                  )}
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="mt-8 pt-6 border-t border-white/5 w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {proxyStatuses[proxy.url]?.checking ? (
                          <div className="w-2 h-2 rounded-full bg-accent animate-spin"></div>
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${proxyStatuses[proxy.url]?.online ? 'bg-[#00d632] animate-pulse shadow-[0_0_10px_#00d632]' : 'bg-red-500'}`}></div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                          {proxyStatuses[proxy.url]?.checking ? t('Checking...') : (proxyStatuses[proxy.url]?.online ? t('Online') : t('Offline'))}
                        </span>
                    </div>
                    <ExternalLink size={16} className="text-text-muted group-hover:text-white transition-colors" />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-white/5`}>
                    {proxyStatuses[proxy.url]?.checking ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-spin"></div>
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${proxyStatuses[proxy.url]?.online ? 'bg-[#00d632]' : 'bg-red-500'}`}></div>
                    )}
                    <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">
                      {proxyStatuses[proxy.url]?.checking ? t('Checking') : (proxyStatuses[proxy.url]?.online ? t('Online') : t('Offline'))}
                    </span>
                  </div>
                  <ExternalLink size={18} className="text-text-muted group-hover:text-white transition-colors" />
                </div>
              )}
            </motion.a>
          ))}
        </motion.div>
      )}

      {/* Warning/Info Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-20 p-10 rounded-[40px] bg-[#0a0a0a] border border-white/5 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] -z-10 group-hover:bg-accent/10 transition-colors duration-1000"></div>
        <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center shrink-0">
                <Shield size={32} className="text-accent" />
            </div>
            <div>
                <h4 className="text-3xl font-black text-white italic uppercase tracking-tight mb-4">{t('Why use Proxies?')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <p className="text-text-muted leading-relaxed mb-4">
                            {t('Proxies (or Cloaks) help bypass network restrictions at school or work. They route your traffic through intermediate servers to hide what site you are actually visiting.')}
                        </p>
                    </div>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                            <span className="text-text-muted text-sm font-medium">{t('Bypass firewalls and deep packet inspection.')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                            <span className="text-text-muted text-sm font-medium">{t('Keep your browsing history hidden from network admins.')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                            <span className="text-text-muted text-sm font-medium">{t('Access the Zone even when the main domain is blocked.')}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProxiesPage;
