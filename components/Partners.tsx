import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PARTNERS_DATA } from '../constants';
import { PartnerItem } from '../types';
import { Globe, ArrowUpRight } from 'lucide-react';
import PartnerModal from './PartnerModal';
import { useLanguage } from '../context/LanguageContext';
import { TranslatedText } from './TranslatedText';

const Partners: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(null);
  const [hoveredPartner, setHoveredPartner] = useState<PartnerItem | null>(null);

  const activeBg = hoveredPartner?.banner || hoveredPartner?.avatar || PARTNERS_DATA[0]?.banner || PARTNERS_DATA[0]?.avatar || 'https://picsum.photos/seed/partners/1000/1000';

  return (
    <div className="relative flex flex-col h-full bg-black text-white overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={activeBg}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.25, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            src={activeBg}
            className="absolute inset-0 w-full h-full object-cover blur-[80px] md:blur-[120px]"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-bg" />
      </div>

      <div className="relative z-10 w-full h-full overflow-y-auto custom-scrollbar p-8 md:p-12">
        <div className="max-w-7xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest mb-6 backdrop-blur-md">
              <Globe size={14} className="text-accent" /> <TranslatedText text="Network" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-2xl">
              <TranslatedText text="Chillzone Partners" />
            </h1>

          </motion.div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {PARTNERS_DATA.map((partner, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                onMouseEnter={() => setHoveredPartner(partner)}
                onMouseLeave={() => setHoveredPartner(null)}
                className="relative rounded-[40px] bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-10 flex flex-col items-center text-center group hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_0_60px_rgba(255,255,255,0.05)] transition-all duration-700 ease-out"
              >
                {/* Floating Avatar */}
                <div className="relative w-32 h-32 mb-8 group-hover:-translate-y-4 group-hover:scale-105 transition-all duration-700 ease-out">
                  <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <img
                    src={partner.avatar || 'https://picsum.photos/seed/avatar/200/200'}
                    alt={partner.name}
                    className="relative w-full h-full rounded-[28px] object-cover shadow-2xl border-2 border-white/10 group-hover:border-white/30 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Typography */}
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-3 text-white/90 group-hover:text-white transition-colors duration-500">
                  <TranslatedText text={partner.name} />
                </h2>
                <div className="flex items-center gap-3 text-text-secondary text-xs font-bold uppercase tracking-widest mb-10">
                  <span><TranslatedText text="Partner" /></span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span><TranslatedText text="By" /> <span className="text-white">{partner.owner}</span></span>
                </div>

                {/* Actions */}
                <div className="w-full flex items-center justify-center gap-4 mt-auto">
                  <button
                    onClick={() => setSelectedPartner(partner)}
                    className="flex-1 bg-white hover:bg-gray-200 text-black px-6 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <TranslatedText text="Explore" /> <ArrowUpRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {selectedPartner && (
        <PartnerModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
        />
      )}
    </div>
  );
};

export default Partners;
