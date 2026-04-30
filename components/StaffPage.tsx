import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Code, Stars, Github, Globe, MessageSquare, Heart, Sparkles, ExternalLink } from 'lucide-react';
import { STAFF_DATA } from '../constants';
import { useLanguage } from '../context/LanguageContext';

const TranslatedText: React.FC<{ text: string }> = ({ text }) => {
  const { translateDynamic, language } = useLanguage();
  const [translated, setTranslated] = React.useState(text);

  React.useEffect(() => {
    let isMounted = true;
    const translate = async () => {
      if (language === 'en-US') {
        if (isMounted) setTranslated(text);
        return;
      }
      const result = await translateDynamic(text);
      if (isMounted) setTranslated(result);
    };
    translate();
    return () => { isMounted = false; };
  }, [text, language, translateDynamic]);

  return <>{translated}</>;
};

const StaffPage: React.FC = () => {
  const { t } = useLanguage();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="py-12 animate-fade-in relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10"></div>

      <div className="text-center mb-20 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-hover border border-white/5 text-accent text-xs font-black uppercase tracking-[0.3em] mb-6 shadow-[0_0_30px_rgba(255,0,0,0.1)]"
        >
          <Stars size={14} className="fill-accent" />
          <span>{t('Legendary team')}</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter text-white leading-none mb-6 relative inline-block"
        >
          {t('Our Staff')}
          <div className="absolute -right-12 -top-4 text-accent animate-bounce">
            <Sparkles size={48} />
          </div>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-text-muted text-xl md:text-2xl max-w-2xl mx-auto font-light"
        >
          {t('The visionaries and builders behind the ChillZone universe.')}
        </motion.p>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
      >
        {STAFF_DATA.map((member, idx) => (
          <motion.div 
            key={member.name}
            variants={item}
            whileHover={{ y: -10 }}
            className="group relative bg-surface-hover/30 backdrop-blur-xl border border-white/5 rounded-[48px] overflow-hidden hover:border-accent/40 transition-all duration-500 shadow-2xl"
          >
            {/* Visual Header */}
            <div className="h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/10 group-hover:bg-accent/20 transition-colors duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
            </div>

            {/* Profile Info */}
            <div className="px-10 pb-12 -mt-24 relative z-10 text-center flex flex-col items-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-accent rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <img 
                      src={member.img} 
                      alt={member.name} 
                      className="w-32 h-32 rounded-[40px] object-cover border-4 border-[#0a0a0a] shadow-2xl relative z-10 grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-accent p-2.5 rounded-2xl border-4 border-[#0a0a0a] z-20 shadow-xl group-hover:rotate-12 transition-transform">
                        {member.role.toLowerCase().includes('owner') ? <ShieldCheck size={18} className="text-white" /> : <Code size={18} className="text-white" />}
                    </div>
                </div>

                <h3 className="text-4xl font-black text-white italic uppercase tracking-tight mb-2 leading-none group-hover:text-accent transition-colors">
                    {member.name}
                </h3>
                <div className="flex items-center gap-2 mb-6">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-[#00d632] border border-[#00d632]/20">Active</span>
                    <span className="text-text-muted font-bold text-xs uppercase tracking-widest italic">{t(member.role)}</span>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  {member.link && (
                    <a 
                        href={member.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-white hover:bg-white/90 text-black font-black italic uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                    >
                        {t('View Profile')}
                        <ExternalLink size={14} />
                    </a>
                  )}

                  {member.github && (
                    <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-[#24292e] hover:bg-black text-white text-[10px] font-black italic uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-white/5"
                    >
                        <Github size={14} />
                        {t('GitHub')}
                    </a>
                  )}
                </div>
            </div>

            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden opacity-10 blur-sm group-hover:opacity-100 group-hover:blur-0 transition-all">
                <div className="absolute top-4 right-4 text-white rotate-45">
                    <Sparkles size={20} />
                </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

    </div>
  );
};

export default StaffPage;
