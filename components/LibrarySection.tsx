import React from 'react';
import { LibraryItem } from '../types';
import ItemCard from './ItemCard';
import { SearchX } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

interface LibrarySectionProps {
  title: string;
  items: LibraryItem[];
  category: string;
  searchQuery: string;
  onOpenDetails: (item: LibraryItem, category: string) => void;
  showSearch?: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
};

const LibrarySection: React.FC<LibrarySectionProps> = ({ title, items, category, searchQuery, onOpenDetails, showSearch = false }) => {
  const [localSearch, setLocalSearch] = React.useState('');
  const { t } = useLanguage();
  
  const filteredItems = React.useMemo(() => {
    const term = (localSearch || searchQuery).toLowerCase();
    if (!term) return items;
    return items.filter(item => item.t.toLowerCase().includes(term));
  }, [items, localSearch, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-16"
    >
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-10 gap-8 group">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700" />
          <div className="flex items-baseline gap-4 mb-3">
            <h2 className="text-5xl font-black uppercase tracking-tighter text-white italic drop-shadow-2xl">
              {title}
            </h2>
            <div className="h-0.5 flex-1 w-20 bg-accent/20 hidden md:block" />
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-accent rounded-md">
                <span className="text-[9px] font-black text-black uppercase tracking-widest">{filteredItems.length}</span>
            </div>
            <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em]">
              {
                category === 'movie' ? t('Movies') :
                category === 'tv' ? t('TV Shows') :
                category === 'anime' ? t('Anime') :
                category === 'manga' ? t('Manga') :
                t('Database Records')
              }
            </p>
          </div>
        </div>
        
        {showSearch && (
          <div className="relative w-full md:max-w-xs group">
            <input 
              type="text"
              placeholder={t('FILTER_DATABASE')}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all duration-500 text-xs font-black tracking-widest uppercase placeholder:text-text-muted/40"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors duration-500">
               <div className="p-1 rounded-lg bg-white/5 border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
            </div>
            {localSearch && (
              <button 
                onClick={() => setLocalSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {filteredItems.length > 0 ? (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {filteredItems.map((item, idx) => (
            <motion.div 
              key={`${item.t}-${idx}`} 
              variants={itemVariants}
            >
              <ItemCard 
                item={item} 
                category={category} 
                onOpenDetails={onOpenDetails} 
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center opacity-40"
        >
          <SearchX size={64} className="mb-4 text-white" />
          <h3 className="text-xl font-black uppercase tracking-widest italic text-white">{t('No matches')}</h3>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LibrarySection;
