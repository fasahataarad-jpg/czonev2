
import React, { useRef, useState, useEffect } from 'react';
import { Home, Film, Tv, Sparkles, BookOpen, Heart, Camera, Globe, Users, DollarSign, Gamepad2, LayoutGrid, Settings as SettingsIcon, Shield, Code, Music, Database, ShieldCheck } from 'lucide-react';
import { Category } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { ChillZoneLogo } from './ChillZoneLogo';

interface SidebarProps {
  activeCategory: Category;
  logoUrl: string;
  onLogoChange: (newLogo: string) => void;
  isAdmin?: boolean;
  isSidebarVisible?: boolean;
  onSelect: (id: Category) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeCategory, logoUrl, onLogoChange, isAdmin, isSidebarVisible, onSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onLogoChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { id: 'home' as Category, label: 'Home', icon: Home },
    { id: 'donate' as Category, label: 'Donate', icon: DollarSign },
    { id: 'partners' as Category, label: 'Partners', icon: Users },
    { id: 'ai' as Category, label: 'AI', icon: Sparkles },
    { id: 'dev' as Category, label: 'Creators', icon: Code },
    { id: 'socials' as Category, label: 'Socials', icon: Globe },
    { id: 'games' as Category, label: 'Games', icon: Gamepad2 },
    { id: 'movies' as Category, label: 'Movies', icon: Film },
    { id: 'tv shows' as Category, label: 'TV', icon: Tv },
    { id: 'anime' as Category, label: 'Animes', icon: Sparkles },
    { id: 'manga' as Category, label: 'Mangas', icon: BookOpen },
    { id: 'music' as Category, label: 'Music', icon: Music },
    { id: 'proxies' as Category, label: 'Proxies', icon: Shield },
  ];

  const handleSelect = (id: Category) => {
    onSelect(id);
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isSidebarVisible ? 280 : 0,
        opacity: isSidebarVisible ? 1 : 0
      }}
      className="h-full bg-surface/30 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 transition-all duration-700 z-[100] relative overflow-hidden"
    >
      {/* Glossy gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      <div className="p-8 flex flex-col h-full relative z-10">
        <div className="mb-12 flex items-center justify-center">
            <div 
                onClick={handleLogoClick}
                className="cursor-pointer group relative"
            >
                <div className="absolute inset-0 bg-accent rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700" />
                <div className="relative transform group-hover:scale-110 transition-transform duration-700">
                    <ChillZoneLogo className="w-16 h-16" />
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*" 
                />
            </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
                  isActive 
                    ? 'text-white' 
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-accent/10 border border-accent/20 shadow-[inset_0_0_20px_rgba(255,0,0,0.05)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className={`relative z-10 p-2 rounded-xl transition-all duration-500 ${
                  isActive ? 'text-accent' : 'group-hover:text-white'
                }`}>
                  <Icon size={22} className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-6'}`} />
                </div>

                <span className={`relative z-10 text-[11px] font-black uppercase tracking-[0.2em] italic transition-all duration-500 ${
                    isActive ? 'translate-x-1' : 'group-hover:translate-x-1'
                }`}>
                  {t(item.label)}
                </span>

                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-l-full shadow-[0_0_15px_var(--accent)]" />
                )}
              </button>
            );
          })}
        </nav>


      </div>
    </motion.aside>
  );
};

export default Sidebar;
