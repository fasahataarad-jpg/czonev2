
import React, { useState, useEffect } from 'react';
import { LibraryItem } from '../types';
import { Loader2 } from 'lucide-react';
import { fetchPoster } from '../services/posters';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

interface ItemCardProps {
  item: LibraryItem;
  category: string;
  onOpenDetails: (item: LibraryItem, category: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = React.memo(({ item, category, onOpenDetails }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(item.img || '');
  const [isSearching, setIsSearching] = useState(false);

  const [translatedTitle, setTranslatedTitle] = useState(item.t);
  const { translateDynamic, language } = useLanguage();
  
  const isPlaceholder = !currentImageUrl || currentImageUrl.includes('placehold.co');

  useEffect(() => {
    let isMounted = true;
    const translate = async () => {
      if (language === 'en-US') {
        if (isMounted) setTranslatedTitle(item.t);
        return;
      }
      
      // Fast check for cache before calling translateDynamic
      const cacheKey = `${language}:${item.t}`;
      const savedCache = JSON.parse(localStorage.getItem('chillzone_translation_cache') || '{}');
      if (savedCache[cacheKey]) {
        if (isMounted) setTranslatedTitle(savedCache[cacheKey]);
        return;
      }

      const translated = await translateDynamic(item.t);
      if (isMounted) setTranslatedTitle(translated);
    };
    translate();
    return () => { isMounted = false; };
  }, [item.t, language, translateDynamic]);

  useEffect(() => {
    const getRealPoster = async () => {
      if (!isPlaceholder || isSearching) return;

      const cacheKey = `poster_${item.t}`;
      const failedKey = `failed_poster_${item.t}`;
      
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setCurrentImageUrl(cached);
        return;
      }
      
      if (localStorage.getItem(failedKey)) return;

      setIsSearching(true);
      try {
        const realUrl = await fetchPoster(item.t, category);
        if (realUrl) {
          setCurrentImageUrl(realUrl);
          localStorage.setItem(cacheKey, realUrl);
        } else {
          localStorage.setItem(failedKey, 'true');
        }
      } catch (err) {
        console.error("Failed to fetch real poster for", item.t, err);
        localStorage.setItem(failedKey, 'true');
      } finally {
        setIsSearching(false);
      }
    };

    getRealPoster();
  }, [item.t, isPlaceholder, category]);

  return (
    <motion.div 
      whileHover={{ scale: 1.05, y: -12 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => onOpenDetails(item, category)}
      className="group relative aspect-[2/3] rounded-[24px] overflow-hidden bg-black transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.8),0_0_20px_var(--accent-glow-dim)] cursor-pointer border border-white/5 hover:border-accent/50"
    >
      {/* Glossy gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-[2]" />
      
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse z-10">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      )}
      
      <img 
        src={typeof currentImageUrl === 'string' && currentImageUrl ? currentImageUrl : 'https://picsum.photos/seed/poster/400/600'} 
        alt={item.t} 
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isLoaded ? 'opacity-80 group-hover:opacity-60' : 'opacity-0'}`}
      />
      
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-[3] group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-[1500ms] ease-in-out z-[4]" />

      <div className="absolute inset-0 p-5 flex flex-col justify-end z-[5] transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out">
        <div className="flex gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100 translate-y-4 group-hover:translate-y-0">
           <div className="px-2 py-0.5 rounded-md bg-accent/20 border border-accent/30 backdrop-blur-md">
              <span className="text-[8px] font-black text-accent uppercase tracking-widest leading-none italic">{item.q || 'HD'}</span>
           </div>
           <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[8px] font-black text-white/60 uppercase tracking-widest leading-none italic">MODERN</span>
           </div>
        </div>
        
        <h3 className="text-sm font-black text-white uppercase italic tracking-tighter leading-[1.1] line-clamp-3 group-hover:text-accent transition-colors duration-500">
          {translatedTitle}
        </h3>
        
        <div className="w-0 group-hover:w-full h-0.5 bg-accent mt-4 transition-all duration-700 ease-in-out rounded-full shadow-[0_0_10px_var(--accent)]" />
      </div>
    </motion.div>
  );
});

export default ItemCard;
