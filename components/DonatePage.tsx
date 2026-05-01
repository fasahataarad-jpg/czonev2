import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Coffee, Rocket, Server, Shield, Zap, ExternalLink, Activity, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TranslatedText } from './TranslatedText';

const DonatePage: React.FC = () => {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: <Server className="text-accent" size={24} />,
      title: "Server Infrastructure",
      desc: "Keeping the high-speed servers running 24/7 for a lag-free experience."
    },
    {
      icon: <Rocket className="text-accent" size={24} />,
      title: "Faster Updates",
      desc: "More resources mean we can pull and upload your favorite content faster."
    },
    {
      icon: <Shield className="text-accent" size={24} />,
      title: "Security & Stability",
      desc: "Protecting the site from attacks and ensuring a safe browsing zone."
    },
    {
      icon: <Zap className="text-accent" size={24} />,
      title: "New Features",
      desc: "Funding for custom tools, better proxies, and advanced media players."
    }
  ];

  return (
    <div className="py-12 animate-fade-in relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px] -z-10"></div>

      <section className="bg-surface/50 backdrop-blur-xl rounded-[48px] p-8 md:p-20 border border-border/50 text-center relative overflow-hidden shadow-2xl">
        {/* Massive Backdrop Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.03] whitespace-nowrap overflow-hidden w-full h-full flex items-center justify-center">
            <span className="text-[20vw] font-black italic uppercase tracking-tighter">SUPPORT THE ZONE</span>
        </div>

        <div className="relative z-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mx-auto mb-8 border border-accent/30 shadow-[0_0_50px_var(--accent-glow)] rotate-12"
          >
            <Heart size={40} className="text-accent fill-accent" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-[7rem] font-black uppercase italic tracking-tighter text-white mb-6 leading-none"
          >
            {t('Keep it Alive')}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-text-muted text-xl md:text-2xl max-w-3xl mx-auto mb-16 font-light leading-relaxed"
          >
            {t('ChillZone is a community-driven project. We never run ads. Your support helps us cover the heavy server costs and keep the vault growing.')}
          </motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
            {/* Cash App */}
            <motion.a 
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              href="https://cash.app/$7yari" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group relative bg-[#0a0a0a] border border-white/5 p-10 rounded-[40px] hover:border-[#00d632]/50 transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00d632]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <img src="https://cdn.simpleicons.org/cashapp/white" alt="Cash App" className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="text-3xl font-black text-white mb-2 tracking-tight"><TranslatedText text="CASH APP" /></div>
              <p className="text-[#00d632] text-xs font-black uppercase tracking-[0.2em]">{t('Instant')}</p>
              <div className="mt-8 flex items-center gap-2 text-white/40 group-hover:text-white transition-colors">
                <span className="text-sm font-bold tracking-widest">{t('DONATE NOW')}</span>
                <ExternalLink size={14} />
              </div>
            </motion.a>

            {/* Venmo */}
            <motion.a 
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              href="https://www.venmo.com/u/ohsols" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group relative bg-[#0a0a0a] border border-white/5 p-10 rounded-[40px] hover:border-[#3d95ce]/50 transition-all duration-500 flex flex-col items-center text-center overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#3d95ce]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <img src="https://cdn.simpleicons.org/venmo/white" alt="Venmo" className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="text-3xl font-black text-white mb-2 tracking-tight"><TranslatedText text="VENMO" /></div>
              <p className="text-[#3d95ce] text-xs font-black uppercase tracking-[0.2em]">{t('Mobile')}</p>
              <div className="mt-8 flex items-center gap-2 text-white/40 group-hover:text-white transition-colors">
                <span className="text-sm font-bold tracking-widest">{t('DONATE NOW')}</span>
                <ExternalLink size={14} />
              </div>
            </motion.a>

            {/* PayPal */}
            <motion.a 
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              href="https://paypal.me/ohsols" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group relative bg-[#0a0a0a] border border-white/5 p-10 rounded-[40px] hover:border-[#0070ba]/50 transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#0070ba]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <img src="https://cdn.simpleicons.org/paypal/white" alt="PayPal" className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="text-3xl font-black text-white mb-2 tracking-tight"><TranslatedText text="PAYPAL" /></div>
              <p className="text-[#0070ba] text-xs font-black uppercase tracking-[0.2em]">{t('Direct')}</p>
              <div className="mt-8 flex items-center gap-2 text-white/40 group-hover:text-white transition-colors">
                <span className="text-sm font-bold tracking-widest">{t('DONATE NOW')}</span>
                <ExternalLink size={14} />
              </div>
            </motion.a>
          </div>

          {/* Benefits Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left border-t border-white/5 pt-20"
          >
            {benefits.map((benefit, i) => (
              <div key={i} className="group">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2 uppercase italic tracking-wide">
                  <TranslatedText text={benefit.title} />
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  <TranslatedText text={benefit.desc} />
                </p>
              </div>
            ))}
          </motion.div>

          {/* Discord CTA */}
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="mt-24 p-8 rounded-[32px] bg-accent/5 border border-accent/10 flex flex-col md:flex-row items-center justify-between gap-8 text-left"
          >
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#5865F2] rounded-2full flex items-center justify-center shrink-0">
                    <MessageSquare size={32} className="text-white fill-white" />
                </div>
                <div>
                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tight leading-none mb-2">{t('Join the Supporter Role')}</h4>
                    <p className="text-text-muted text-sm">{t('Donated? Message us on Discord to get your special Supporter badge and role.')}</p>
                </div>
            </div>
            <a 
                href="https://discord.gg/chillzone" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-10 py-4 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black italic uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(88,101,242,0.3)] shrink-0"
            >
                {t('GO TO DISCORD')}
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default DonatePage;
