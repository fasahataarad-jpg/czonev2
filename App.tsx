import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import LibrarySection from './components/LibrarySection';
import Settings, { defaultThemes } from './components/Settings';
import Partners from './components/Partners';
import UpdateLog from './components/UpdateLog';
import DateTimeWidget from './components/DateTimeWidget';
import { Category, LibraryItem, StaffMember, Game, FavoriteItem } from './types';
import { MOVIES_DATA, ANIME_DATA, MANGA_DATA, TV_DATA, STAFF_DATA, PARTNERS_DATA, PROXIES_DATA } from './constants';
import { useLanguage } from './context/LanguageContext';
import { auth, db, logout as firebaseLogout, handleFirestoreError, OperationType, isQuotaExceeded } from './firebase'; 
import { onAuthStateChanged, User } from 'firebase/auth'; 
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import SuggestionModal from './components/SuggestionModal';
import AIChat from './components/AIChat';
import DonatePage from './components/DonatePage';
import ProxiesPage from './components/ProxiesPage';
import StaffPage from './components/StaffPage';
import GamesEmbed from './components/GamesEmbed';
import MusicPlayer from './components/MusicPlayer';
import { SiteAnnouncements } from './components/SiteAnnouncements';
import { ChillZoneLogo } from './components/ChillZoneLogo';
import { TranslatedText } from './components/TranslatedText';
import { Search, X, Film, Sparkles, BookOpen, Tv, SearchX, PlayCircle, Star, Globe, Users, ExternalLink, ShieldAlert, Zap, Activity, Loader2, Book, AlertTriangle, Settings as SettingsIcon, GitCommit, ChevronDown, LayoutGrid, Gamepad2, ShieldCheck, LogOut, LogIn, Send, Music, MessageSquare, Menu, Columns } from 'lucide-react';

const DEFAULT_LOGO = "/logo.svg";

const DiscordIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1971.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
);

const ScrambleEffect: React.FC = () => {
  useEffect(() => {
    let interval: any;
    const originalTexts = new Map<HTMLElement, string>();

    const scrambleText = (text: string) => {
      if (!text) return '';
      return text.split(' ').map(word => {
        if (word.length <= 3) return word;
        const chars = word.split('');
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
      }).join(' ');
    };

    const runScramble = () => {
      if (document.documentElement.dataset.theme !== 'aprilfools') return;

      // Only target elements that likely contain plain text and are not too complex
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, p, span, button')) as HTMLElement[];
      const targetElements = elements
        .filter(el => {
          // Avoid elements with many children to prevent React crashes
          return el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && Math.random() > 0.9;
        })
        .slice(0, 5);

      targetElements.forEach(el => {
        if (!originalTexts.has(el)) {
          originalTexts.set(el, el.innerText);
        }
        el.innerText = scrambleText(el.innerText);
      });

      setTimeout(() => {
        targetElements.forEach(el => {
          const original = originalTexts.get(el);
          if (original && document.contains(el)) {
            el.innerText = original;
            originalTexts.delete(el);
          }
        });
      }, 1000);
    };

    interval = setInterval(runScramble, 10000);
    return () => {
      clearInterval(interval);
      originalTexts.forEach((text, el) => {
        if (document.contains(el)) {
          el.innerText = text;
        }
      });
    };
  }, []);

  return null;
};

const getInitialCategory = (): Category => {
  const path = window.location.pathname.substring(1).toLowerCase();
  if (!path) return 'donate';
  const normalizedPath = path.replace('-', ' ') as Category;
  const validCategories: Category[] = ['home', 'movies', 'tv shows', 'anime', 'manga', 'proxies', 'partners', 'dev', 'support', 'donate', 'apps', 'browser', 'settings', 'games', 'socials', 'ai'];
  
  if (validCategories.includes(normalizedPath)) {
    return normalizedPath;
  }
  return 'donate';
};

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>(getInitialCategory);
  const featuredStaff = useMemo(() => STAFF_DATA.filter(s => 
    s.role.toLowerCase().includes('owner') || 
    s.role.toLowerCase().includes('developer') ||
    s.role.toLowerCase().includes('dev')
  ), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [proxySearch, setProxySearch] = useState('');
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);
  const [isIntroDone, setIsIntroDone] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
    }, 800);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const navigate = (cat: Category) => {
    setActiveCategory(cat);
    let path = '';
    if (cat === 'donate') {
      path = '/';
    } else {
      path = '/' + cat.replace(' ', '-');
    }
    window.history.pushState({}, '', path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveCategory(getInitialCategory());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Debugging customLogo
  useEffect(() => {
    if (customLogo !== undefined && typeof customLogo !== 'string' && customLogo !== null) {
      console.warn('App: customLogo is not a string:', customLogo);
    }
  }, [customLogo]);

  const [selectedItem, setSelectedItem] = useState<{item: LibraryItem, category: string, showPlayer: boolean} | null>(null);

  // Debugging selectedItem.item.img
  useEffect(() => {
    if (selectedItem?.item?.img !== undefined && typeof selectedItem?.item?.img !== 'string' && selectedItem?.item?.img !== null) {
      console.warn('App: selectedItem.item.img is not a string:', selectedItem.item.img, 'for item:', selectedItem.item.t);
    }
  }, [selectedItem]);

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    const saved = localStorage.getItem('chillzone_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [hasOpenedUpdateLog, setHasOpenedUpdateLog] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isQuotaExceededUI, setIsQuotaExceededUI] = useState(false);
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [hasShownQuotaPopup, setHasShownQuotaPopup] = useState(false);
  const { t } = useLanguage();
  const [uploads, setUploads] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthReady) return;

    const path = window.location.pathname.substring(1).toLowerCase().replace('-', ' ');
    
    // Redirect to root if on root path to ensure home is selected, 
    // or handle specific defaults if necessary.
    if (path === '') {
      // No forced redirect here, let initial state or user selection stay
    }
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;

    // Firestore - Uploads
    const uploadsQuery = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(uploadsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as any));
      setUploads(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'uploads');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  useEffect(() => {
    // Legacy quota handling removed as we moved to local server storage
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady || hasOpenedUpdateLog) return;

    setIsUpdateLogOpen(true);
    setHasOpenedUpdateLog(true);
  }, [user, isAuthReady, hasOpenedUpdateLog]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setIsAuthReady(true);
        setUser(currentUser);
        
        const adminEmails = ['darkfn1234567890@gmail.com', 'calabcoleman2187@gmail.com', 'raypolebobby15@gmail.com'];
        
        if (currentUser && currentUser.email) {
            setIsAdmin(adminEmails.includes(currentUser.email.toLowerCase()));
        } else {
            setIsAdmin(false);
        }
        setIsSuperAdmin(currentUser?.uid === 'HfjrcUIslZPCvNI3fxiQJVK1ebB3');
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady || isQuotaExceededUI) return;
  }, [user, isAuthReady]);

  useEffect(() => {
    const savedLogo = localStorage.getItem('chillzone_custom_logo');
    if (savedLogo) setCustomLogo(savedLogo);
    
    // Load custom theme
    const currentThemeId = localStorage.getItem('custom_theme_id') || 'chillzone';
    const savedThemes = localStorage.getItem('custom_themes');
    const customThemes = savedThemes ? JSON.parse(savedThemes) : { ...defaultThemes };
    
    // Merge new default themes if they don't exist in saved themes
    Object.keys(defaultThemes).forEach(key => {
      if (!customThemes[key]) {
        customThemes[key] = defaultThemes[key];
      }
    });

    const activeTheme = customThemes[currentThemeId] || defaultThemes.chillzone;
    
    const root = document.documentElement;
    root.style.setProperty('--bg', activeTheme.colors.bg);
    root.style.setProperty('--text-primary', activeTheme.colors.textPrimary);
    root.style.setProperty('--surface', activeTheme.colors.surface);
    root.style.setProperty('--border', activeTheme.colors.border);
    root.style.setProperty('--accent', activeTheme.colors.accent);
    root.style.setProperty('--surface-hover', activeTheme.colors.surfaceHover);
    
    // Convert hex to rgba for glows
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 0, 0';
    };
    
    const rgb = hexToRgb(activeTheme.colors.accent);
    root.style.setProperty('--accent-glow', `rgba(${rgb}, 0.3)`);
    root.style.setProperty('--accent-glow-dim', `rgba(${rgb}, 0.1)`);
    root.dataset.theme = currentThemeId;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedItem?.showPlayer) {
          setSelectedItem({...selectedItem, showPlayer: false});
        } else if (selectedItem) {
          setSelectedItem(null);
        } else if (false) {
        } else if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (isAdminOpen) {
          setIsAdminOpen(false);
        } else if (isSuggestionModalOpen) {
          setIsSuggestionModalOpen(false);
        } else if (isAIChatOpen) {
          setIsAIChatOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'EXIT_GAME') {
        // Games are now handled via external iframe hub
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1).toLowerCase();
      if (!path) {
        setActiveCategory('donate');
        return;
      }
      const normalizedPath = path.replace('-', ' ') as Category;
      const validCategories: Category[] = ['home', 'movies', 'tv shows', 'anime', 'manga', 'music', 'proxies', 'partners', 'dev', 'support', 'donate', 'apps', 'browser', 'settings', 'games', 'socials', 'ai'];
      
      if (validCategories.includes(normalizedPath)) {
        setActiveCategory(normalizedPath);
      } else {
        setActiveCategory('donate');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleFirestoreError = (event: any) => {
      const { detail } = event;
      if (detail.error.includes('Quota limit exceeded') || detail.error.includes('Quota exceeded')) {
        setIsQuotaExceededUI(true);
        if (!hasShownQuotaPopup && (isAdmin || isSuperAdmin)) {
          setShowQuotaPopup(true);
        }
      }
    };
    window.addEventListener('firestore-error', handleFirestoreError);
    return () => window.removeEventListener('firestore-error', handleFirestoreError);
  }, [hasShownQuotaPopup]);

  const handleUpdateLogo = (newLogoUrl: string) => {
    setCustomLogo(newLogoUrl);
    localStorage.setItem('chillzone_custom_logo', newLogoUrl);
  };

  const logout = async () => {
    try {
        await firebaseLogout();
    } catch (e) {
        console.error("Sign out failed", e);
    }
    setUser(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    localStorage.removeItem('chillzone_favorites');
  };

  const handleOpenDetails = (item: LibraryItem, category: string) => {
    setSelectedItem({ item, category, showPlayer: false });
  };

  const handleStaffClick = (staff: StaffMember) => {
    if (staff.link) {
      window.open(staff.link, '_blank', 'noopener,noreferrer');
    }
  };

  const onToggleFavorite = async (item: FavoriteItem) => {
    let newFavorites: FavoriteItem[];
    setFavorites(prev => {
      const exists = prev.find(f => f.id === item.id);
      if (exists) {
        newFavorites = prev.filter(f => f.id !== item.id);
      } else {
        newFavorites = [...prev, item];
      }
      
      localStorage.setItem('chillzone_favorites', JSON.stringify(newFavorites));
      // Sync to Firestore disabled for local storage approach
      
      return newFavorites;
    });
  };

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const [searchCategory, setSearchCategory] = useState<'all' | 'movies' | 'tv' | 'anime' | 'manga'>('all');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    
    // First filter by text
    const textFilter = (item: LibraryItem) => item.t.toLowerCase().includes(q);
    
    const uploadFilter = (u: any) => u.title.toLowerCase().includes(q);
    const mappedUploads = uploads.filter(uploadFilter).map(u => {
      const imgSrc = u.imageLink || 'https://picsum.photos/seed/placeholder/200/300';
      // legacy instances might still have `u.path` instead of `u.driveLink`
      const contentLink = u.driveLink || u.path || u.imageLink;
      return { 
        t: u.title, 
        l: contentLink, 
        img: imgSrc, 
        type: u.type,
        year: u.year,
        genre: u.genre,
        rating: u.rating,
        q: u.quality,
        desc: u.description
      };
    });

    // Then apply text filter
    const results = {
      movies: [...mappedUploads.filter(u => u.type === 'movie'), ...MOVIES_DATA.filter(textFilter)],
      anime: [...mappedUploads.filter(u => u.type === 'anime'), ...ANIME_DATA.filter(textFilter)],
      manga: [...mappedUploads.filter(u => u.type === 'manga'), ...MANGA_DATA.filter(textFilter)],
      tv: [...mappedUploads.filter(u => u.type === 'tv'), ...TV_DATA.filter(textFilter)],
    };

    if (searchCategory !== 'all') {
      return {
        movies: searchCategory === 'movies' ? results.movies : [],
        anime: searchCategory === 'anime' ? results.anime : [],
        manga: searchCategory === 'manga' ? results.manga : [],
        tv: searchCategory === 'tv' ? results.tv : [],
      };
    }

    return results;
  }, [searchQuery, searchCategory]);

  const totalMatches = searchResults ? 
    searchResults.movies.length + searchResults.anime.length + searchResults.manga.length + searchResults.tv.length : 0;

  // Check if the current link is a fallback search link
  const isSearchLink = selectedItem?.item.l?.includes('drive.google.com/drive/search');

  // Removed force login block

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <ScrambleEffect />
      <SiteAnnouncements />
      <div id="app" className="fixed inset-0 flex flex-row overflow-hidden bg-bg text-text-primary">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
          <div className="absolute -top-[10%] -right-[5%] w-[80%] h-[80%] rounded-full opacity-30 mix-blend-screen" style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translateZ(0)' }}></div>
          <div className="absolute bottom-[10%] -left-[5%] w-[60%] h-[60%] rounded-full opacity-15 mix-blend-overlay" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', filter: 'blur(120px)', transform: 'translateZ(0)' }}></div>
        </div>

        {!isAuthModalOpen && !isAdminOpen && (
            <Sidebar 
            activeCategory={activeCategory} 
            logoUrl={customLogo} 
            onLogoChange={handleUpdateLogo}
            isAdmin={isAdmin}
            isSidebarVisible={isSidebarVisible}
            onSelect={navigate}
            />
        )}
        
        <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">
          {/* Donation Banner */}
          <div className="bg-black/40 backdrop-blur-sm text-white py-2 px-6 text-[10px] font-black uppercase tracking-widest z-[60] relative flex items-center border-b border-white/5 overflow-hidden">
            <div className="flex-1 overflow-hidden relative h-5 flex items-center">
              <div className="animate-marquee absolute w-full text-left">
                <TranslatedText text="Don't Forget You Can Pay For Custom Movies, Animes, Tv Shows, OR WTV U Want!" />
              </div>
            </div>
            <button 
              onClick={() => navigate('donate')} 
              className="bg-accent/20 hover:bg-accent/30 border border-accent/30 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all shrink-0 ml-4 z-10 relative hover:scale-105"
            >
              {t('Donate')}
            </button>
          </div>

          <header className="sticky top-0 z-40 border-b border-white/5 p-4 md:px-8 md:py-6 flex justify-between items-center shrink-0 bg-bg/20 backdrop-blur-xl">
            <div className="flex items-center gap-6">
              <button 
                  onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white hover:bg-white/10 transition-all"
              >
                  {isSidebarVisible ? <Menu size={20} /> : <Columns size={20} />}
              </button>
              <DateTimeWidget />
            </div>
            <div className="flex items-center gap-3 relative">
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsAdminOpen(true);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all duration-300 relative"
                  title="Admin Dashboard"
                >
                  <ShieldCheck size={18} />
                  {isQuotaExceededUI && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-bg text-[10px] font-black text-white shadow-lg"
                    >
                      !
                    </motion.div>
                  )}
                </motion.button>
              )}

              <div className="relative">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                  className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 relative ${
                    isSettingsOpen 
                      ? 'bg-accent border-accent text-white' 
                      : 'bg-surface-hover border-white/5 text-text-secondary hover:text-white hover:border-white/20'
                  }`}
                  title={t('Settings')}
                >
                  <motion.div
                    animate={{ rotate: isSettingsOpen ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: "backOut" }}
                  >
                    <SettingsIcon size={18} />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {isSettingsOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsSettingsOpen(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10, x: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, x: -20 }}
                        className="absolute top-14 right-0 z-50 bg-surface border border-surface-hover rounded-2xl shadow-2xl overflow-hidden w-[600px] max-h-[90vh] flex flex-col"
                      >
                        <Settings onClose={() => setIsSettingsOpen(false)} />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {user && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSuggestionModalOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-hover border border-white/5 text-text-secondary hover:text-white hover:border-white/20 transition-all duration-300"
                  title={t('Suggestion Bin')}
                >
                  <Send size={18} />
                </motion.button>
              )}

              <div className="relative">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUpdateLogOpen(!isUpdateLogOpen)} 
                  className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-300 relative ${
                    isUpdateLogOpen 
                      ? 'bg-accent border-accent text-white' 
                      : 'bg-surface-hover border-white/5 text-text-secondary hover:text-white hover:border-white/20'
                  }`}
                  title={t('Update Log')}
                >
                  <GitCommit size={18} />
                </motion.button>
                <AnimatePresence>
                  {isUpdateLogOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsUpdateLogOpen(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10, x: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, x: -20 }}
                        className="absolute top-14 right-0 z-50 bg-surface border border-surface-hover rounded-2xl shadow-2xl overflow-hidden"
                      >
                        <UpdateLog onClose={() => setIsUpdateLogOpen(false)} />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={user ? logout : () => setIsAuthModalOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-hover border border-white/5 text-text-secondary hover:text-white hover:border-white/20 transition-all duration-300"
                title={user ? t("Logout") : t("Login / Sign Up")}
              >
                {user ? <LogOut size={18} /> : <LogIn size={18} />}
              </motion.button>

              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://discord.gg/czone" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-hover border border-white/5 text-text-secondary hover:text-[#5865F2] hover:border-[#5865F2]/50 transition-all duration-300 relative"
                title={t('Discord')}
              >
                <DiscordIcon size={18} />
              </motion.a>
            </div>
          </header>

          <div id="content-area" className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-10 custom-scrollbar overscroll-contain">
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              {/* Hero Section */}
                  <motion.section 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className=""
                    >
                    </motion.section>
                  {searchQuery ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12 pb-24"
                >
                   <div className="flex flex-wrap gap-2 mb-8">
                     {(['all', 'movies', 'tv', 'anime', 'manga'] as const).map(cat => (
                       <motion.button
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         key={cat}
                         onClick={() => setSearchCategory(cat)}
                         className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300 ${
                           searchCategory === cat 
                             ? 'bg-accent text-white border-accent' 
                             : 'bg-bg text-text-secondary border-surface-hover hover:border-accent/50 hover:text-white'
                         }`}
                       >
                         {cat === 'all' ? t('All Categories') : t(cat.charAt(0).toUpperCase() + cat.slice(1))}
                       </motion.button>
                     ))}
                   </div>
                   {searchResults?.movies.length ? <LibrarySection title={t('Movies')} items={searchResults.movies} category="movie" searchQuery={searchQuery} onOpenDetails={handleOpenDetails} /> : null}
                   {searchResults?.tv.length ? <LibrarySection title={t('TV Shows')} items={searchResults.tv} category="tv" searchQuery={searchQuery} onOpenDetails={handleOpenDetails} /> : null}
                   {searchResults?.anime.length ? <LibrarySection title={t('Anime')} items={searchResults.anime} category="anime" searchQuery={searchQuery} onOpenDetails={handleOpenDetails} /> : null}
                   {searchResults?.manga.length ? <LibrarySection title={t('Manga')} items={searchResults.manga} category="manga" searchQuery={searchQuery} onOpenDetails={handleOpenDetails} /> : null}
                   {totalMatches === 0 && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-40 text-center opacity-40"
                      >
                        <SearchX size={80} className="mb-6 text-accent" />
                        <h2 className="text-2xl font-black uppercase tracking-widest italic mb-2 text-white">{t('No matches')}</h2>
                      </motion.div>
                   )}
                </motion.div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeCategory}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full pb-24"
                      >
                    {activeCategory === 'home' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-12 space-y-24"
                      >
                        {/* Hero Header */}
                        <div className="relative rounded-[40px] overflow-hidden bg-bg border border-white/5 p-12 md:p-24 text-center group">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--accent)_0%,transparent_60%)] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-1000"></div>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,140,255,0.1)_0%,transparent_50%)] pointer-events-none"></div>
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "circOut" }}
                            className="relative z-10"
                          >
                            <h1 className="text-7xl md:text-[10rem] font-black uppercase italic tracking-tighter text-white mb-16 drop-shadow-2xl">
                              {t('ChillZone')}
                            </h1>
                            <div className="flex flex-wrap justify-center gap-6">
                              <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 50px var(--accent-glow)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('movies')}
                                className="bg-accent text-white px-12 py-6 rounded-[22px] font-black uppercase tracking-widest text-base italic transition-all flex items-center gap-4 relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                                {t('Explore Movies')} <Film size={20} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('support')}
                                className="bg-white/5 text-white px-12 py-6 rounded-[22px] border border-white/10 font-black uppercase tracking-widest text-base italic transition-all flex items-center gap-4 backdrop-blur-md"
                              >
                                {t('Meet Team')} <Users size={20} />
                              </motion.button>
                              <motion.a
                                href="https://discord.gg/czone"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(88,101,242,0.5)" }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-[#5865F2] text-white px-12 py-6 rounded-[22px] font-black uppercase tracking-widest text-base italic transition-all flex items-center gap-4"
                              >
                                {t('Discord')} <DiscordIcon size={22} />
                              </motion.a>
                            </div>
                          </motion.div>
                        </div>

                        {/* Discord Ad Banner */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className="relative w-full rounded-[40px] overflow-hidden bg-gradient-to-br from-[#5865F2]/20 to-bg border border-[#5865F2]/30 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 group"
                        >
                          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#5865F2]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-[#5865F2]/30 transition-colors duration-700" />
                          <div className="relative z-10 flex-1">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5865F2]/20 text-[#5865F2] font-black text-xs uppercase tracking-widest mb-6 border border-[#5865F2]/30">
                              <DiscordIcon size={14} /> <TranslatedText text="Official Community" />
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-4">
                              <TranslatedText text="Join the" /> <span className="text-[#5865F2]">Discord</span>
                            </h2>
                            <p className="text-text-secondary text-lg font-medium max-w-xl">
                              <TranslatedText text="Request new movies, get notified of fresh drops, report broken links, and chill with the community." />
                            </p>
                          </div>
                          <motion.a
                            href="https://discord.gg/czone"
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative z-10 shrink-0 bg-[#5865F2] hover:bg-[#4752C4] text-white px-12 py-6 rounded-[24px] font-black uppercase tracking-widest text-lg italic transition-colors shadow-[0_0_40px_rgba(88,101,242,0.3)] flex items-center gap-4"
                          >
                            <span><TranslatedText text="Join?" /></span>
                            <MessageSquare size={24} />
                          </motion.a>
                        </motion.div>

                        {/* Recent Discoveries */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                          {[
                            { title: 'Movies', count: MOVIES_DATA.length, cat: 'movies', icon: Film, glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]' },
                            { title: 'TV Shows', count: TV_DATA.length, cat: 'tv shows', icon: Tv, glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]' },
                            { title: 'Anime', count: ANIME_DATA.length, cat: 'anime', icon: Sparkles, glow: 'group-hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]' },
                            { title: 'Manga', count: MANGA_DATA.length, cat: 'manga', icon: BookOpen, glow: 'group-hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]' },
                            { title: 'Games', count: '500', cat: 'games', icon: Gamepad2, glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]' },
                          ].map((stat, i) => (
                            <motion.div
                              key={i}
                              whileHover={{ y: -8, scale: 1.02 }}
                              onClick={() => navigate(stat.cat as Category)}
                              className={`bg-white/[0.03] backdrop-blur-xl p-8 rounded-[32px] border border-white/5 transition-all cursor-pointer group flex flex-col items-center text-center ${stat.glow}`}
                            >
                              <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-accent group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-500`}>
                                <stat.icon size={28} />
                              </div>
                              <h3 className="text-3xl font-black text-white mb-2 italic tracking-tighter">
                                {stat.count}+
                              </h3>
                              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">
                                {t(stat.title)}
                              </p>
                            </motion.div>
                          ))}
                        </div>

                        {/* Recently Added Content */}
                        <div className="space-y-16">
                          {uploads.length > 0 && (
                            <LibrarySection 
                                title={t('Fresh Drops')} 
                                items={uploads.slice(0, 10).map((u: any) => ({ 
                                    t: u.title, 
                                    l: u.driveLink || u.path || u.imageLink, 
                                    img: u.imageLink || 'https://picsum.photos/seed/placeholder/200/300',
                                    type: u.type
                                }))} 
                                category="all" 
                                searchQuery="" 
                                onOpenDetails={handleOpenDetails} 
                                showSearch={false} 
                            />
                          )}

                        </div>

                        {/* Featured Staff Section */}
                        <div className="bg-bg rounded-[50px] p-12 border border-surface-hover">
                           <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
                              <div className="text-left">
                                <h2 className="text-5xl font-black uppercase italic text-white tracking-tighter mb-4">{t('Lead Team')}</h2>

                              </div>
                              <motion.button 
                                whileHover={{ x: 10 }}
                                onClick={() => navigate('support')}
                                className="flex items-center gap-3 text-accent font-black uppercase tracking-widest text-sm"
                              >
                                {t('View All Staff')} <Zap size={18} />
                              </motion.button>
                           </div>
                           <div className="flex flex-wrap justify-center gap-12">
                             {featuredStaff.map((staff, i) => (
                               <motion.div 
                                 key={i}
                                 whileHover={{ scale: 1.05 }}
                                 className="flex flex-col items-center group cursor-pointer"
                                 onClick={() => handleStaffClick(staff)}
                               >
                                 <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-surface-hover group-hover:border-accent transition-all duration-300 mb-6 shadow-2xl">
                                   <img src={staff.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                 </div>
                                 <h4 className="text-white font-black uppercase italic tracking-tighter text-lg">{staff.name}</h4>
                                 <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em]">{staff.role}</p>
                               </motion.div>
                             ))}
                           </div>
                        </div>

                        <div className="text-center py-12">
                          <div className="flex flex-wrap justify-center gap-12 text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                            <span><TranslatedText text="Streaming" /></span>
                            <span><TranslatedText text="Gaming" /></span>
                            <span><TranslatedText text="Socials" /></span>
                            <span><TranslatedText text="Anime" /></span>
                          </div>
                          <a 
                            href="https://acceptancesuicidegel.com/dhmpuxem?key=076e82e715f14b0cdae05e67b91cb136" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-white/30 hover:text-accent text-[8px] font-bold uppercase tracking-widest transition-colors"
                          >
                            chillz0ne.dev
                          </a>
                        </div>
                      </motion.div>
                    )}

                    {activeCategory === 'dev' && (
                      <StaffPage />
                    )}

                    {activeCategory === 'donate' && (
                      <DonatePage />
                    )}

                    {activeCategory === 'games' && (
                      <GamesEmbed />
                    )}
                    {activeCategory === 'movies' && (
                      <>
                        {uploads.filter(u => u.type === 'movie').length > 0 && (
                          <LibrarySection 
                            title={t('New Movies')} 
                            items={uploads.filter(u => u.type === 'movie').map(u => ({
                                t: u.title,
                                l: u.driveLink || u.path || u.imageLink,
                                img: u.imageLink || 'https://picsum.photos/seed/placeholder/200/300',
                                year: u.year,
                                genre: u.genre,
                                rating: u.rating,
                                q: u.quality,
                                desc: u.description
                            }))} 
                            category="movie" 
                            searchQuery="" 
                            onOpenDetails={handleOpenDetails} 
                            showSearch={true} 
                          />
                        )}
                        <LibrarySection title={t('Movies')} items={MOVIES_DATA} category="movie" searchQuery="" onOpenDetails={handleOpenDetails} showSearch={true} />
                      </>
                    )}
                    {activeCategory === 'tv shows' && (
                      <>
                        {uploads.filter(u => u.type === 'tv').length > 0 && (
                          <LibrarySection 
                            title={t('New TV Shows')} 
                            items={uploads.filter(u => u.type === 'tv').map(u => ({
                                t: u.title,
                                l: u.driveLink || u.path || u.imageLink,
                                img: u.imageLink || 'https://picsum.photos/seed/placeholder/200/300',
                                year: u.year,
                                genre: u.genre,
                                rating: u.rating,
                                q: u.quality,
                                desc: u.description
                            }))} 
                            category="tv" 
                            searchQuery="" 
                            onOpenDetails={handleOpenDetails} 
                            showSearch={true} 
                          />
                        )}
                        <LibrarySection title={t('TV Shows')} items={TV_DATA} category="tv" searchQuery="" onOpenDetails={handleOpenDetails} showSearch={true} />
                      </>
                    )}
                    {activeCategory === 'anime' && (
                      <>
                        {uploads.filter(u => u.type === 'anime').length > 0 && (
                          <LibrarySection 
                            title={t('New Anime')} 
                            items={uploads.filter(u => u.type === 'anime').map(u => ({
                                t: u.title,
                                l: u.driveLink || u.path || u.imageLink,
                                img: u.imageLink || 'https://picsum.photos/seed/placeholder/200/300',
                                year: u.year,
                                genre: u.genre,
                                rating: u.rating,
                                q: u.quality,
                                desc: u.description
                            }))} 
                            category="anime" 
                            searchQuery="" 
                            onOpenDetails={handleOpenDetails} 
                            showSearch={true} 
                          />
                        )}
                        <LibrarySection title={t('Animes')} items={ANIME_DATA} category="anime" searchQuery="" onOpenDetails={handleOpenDetails} showSearch={true} />
                      </>
                    )}
                    {activeCategory === 'manga' && (
                      <>
                        {uploads.filter(u => u.type === 'manga').length > 0 && (
                          <LibrarySection 
                            title={t('New Manga')} 
                            items={uploads.filter(u => u.type === 'manga').map(u => ({
                                t: u.title,
                                l: u.driveLink || u.path || u.imageLink,
                                img: u.imageLink || 'https://picsum.photos/seed/placeholder/200/300',
                                year: u.year,
                                genre: u.genre,
                                rating: u.rating,
                                q: u.quality,
                                desc: u.description
                            }))} 
                            category="manga" 
                            searchQuery="" 
                            onOpenDetails={handleOpenDetails} 
                            showSearch={true} 
                          />
                        )}
                        <LibrarySection title={t('Mangas')} items={MANGA_DATA} category="manga" searchQuery="" onOpenDetails={handleOpenDetails} showSearch={true} />
                      </>
                    )}
                    
                    {activeCategory === 'music' && (
                      <div className="py-12 px-6">
                        <MusicPlayer />
                      </div>
                    )}
                    
                    {activeCategory === 'proxies' && (
                      <ProxiesPage />
                    )}

                    {activeCategory === 'ai' && (
                      <div className="flex-1 flex flex-col h-full bg-[#050505]">
                        <AIChat isOpen={true} onClose={() => {}} isEmbedded={true} />
                      </div>
                    )}

                    {activeCategory === 'partners' && <Partners />}

                    {activeCategory === 'socials' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-20 flex flex-col items-center justify-center min-h-[60vh]"
                      >
                        <div className="flex flex-wrap justify-center gap-12 md:gap-24 mb-16">
                          {/* TikTok */}
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center gap-6 group cursor-pointer"
                          >
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-surface-hover rounded-[40px] border border-white/5 flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:border-accent/40 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 md:w-20 md:h-20 text-white transition-transform duration-500 group-hover:scale-110">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47V18.77a6.738 6.738 0 0 1-1.9 4.63 6.712 6.712 0 0 1-4.78 1.9c-1.71.02-3.41-.6-4.69-1.74a6.723 6.723 0 0 1-2.13-4.81c-.03-1.71.6-3.41 1.74-4.69a6.712 6.712 0 0 1 4.81-2.12c.8 0 1.59.13 2.34.39V12.52a2.67 2.67 0 0 0-2.34-.38 2.674 2.674 0 0 0-1.9 1.9 2.674 2.674 0 0 0 .38 2.34c.54.76 1.41 1.19 2.34 1.18.8 0 1.59-.39 2.06-1.04.13-.19.22-.4.28-.61.01-1.31.01-2.61.01-3.92V0z"/>
                              </svg>
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.3em] text-text-secondary group-hover:text-white transition-colors">TikTok</span>
                          </motion.div>

                          {/* Instagram */}
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center gap-6 group cursor-pointer"
                          >
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-surface-hover rounded-[40px] border border-white/5 flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:border-accent/40 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 md:w-20 md:h-20 text-white transition-transform duration-500 group-hover:scale-110">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                              </svg>
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.3em] text-text-secondary group-hover:text-white transition-colors">Instagram</span>
                          </motion.div>
                        </div>

                        <div className="text-center">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: 60 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="h-1 bg-accent mx-auto mb-6 rounded-full"
                          ></motion.div>
                          <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-4">
                            <TranslatedText text="WIP (Soon)" />
                          </h2>
                          <p className="text-text-secondary text-xs uppercase tracking-[0.5em] font-bold opacity-50">
                            <TranslatedText text="Our social channels are currently under construction" />
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </main>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-10"
          >
            <div className="absolute inset-0 bg-bg/95 backdrop-blur-3xl" onClick={() => setSelectedItem(null)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`relative w-full ${selectedItem.showPlayer ? 'max-w-none h-full' : 'max-w-5xl max-h-[90vh]'} bg-bg border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row`}
            >
              {selectedItem.showPlayer ? null : (
                <button onClick={() => setSelectedItem(null)} className="absolute top-8 right-8 z-50 bg-bg/40 hover:bg-accent p-4 rounded-2xl transition-all duration-300 border border-white/5"><X size={24} /></button>
              )}
              {selectedItem.showPlayer ? null : (
                <div className="w-full md:w-2/5 aspect-[2/3] md:h-auto relative overflow-hidden group/modal-img bg-bg shrink-0">
                  <img 
                    src={typeof selectedItem.item.img === 'string' && selectedItem.item.img ? selectedItem.item.img : 'https://picsum.photos/seed/poster/400/600'} 
                    className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover/modal-img:scale-110" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                </div>
              )}
              <div className={`flex-1 ${selectedItem.showPlayer ? 'p-0' : 'p-10 md:p-16'} flex flex-col overflow-y-auto custom-scrollbar`}>
                {selectedItem.showPlayer ? (() => {
                  let iframeUrl = selectedItem.item.l || '';
                  if (iframeUrl.includes('drive.google.com')) {
                    if (iframeUrl.includes('/view')) {
                      iframeUrl = iframeUrl.replace(/\/view.*$/, '/preview');
                    } else if (!iframeUrl.includes('/preview')) {
                      iframeUrl += (iframeUrl.endsWith('/') ? '' : '/') + 'preview';
                    }
                  }
                  return (
                  <div className="w-full h-full bg-black flex flex-col rounded-2xl overflow-hidden relative">
                    <button 
                      onClick={() => setSelectedItem({...selectedItem, showPlayer: false})}
                      className="absolute top-4 left-4 z-50 bg-bg/40 hover:bg-accent p-4 rounded-2xl transition-all duration-300 border border-white/5 text-white"
                    >
                      <X size={24} />
                    </button>
                    <a 
                      href={selectedItem.item.l}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-4 right-4 z-50 bg-bg/80 hover:bg-accent p-4 rounded-2xl transition-all duration-300 border border-white/5 text-white flex items-center gap-2"
                    >
                      <ExternalLink size={20} /> <span className="text-xs font-bold uppercase tracking-wider hidden md:block"><TranslatedText text="Open Externally" /></span>
                    </a>
                    <iframe 
                      src={iframeUrl}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                  );
                })() : (
                  <>
                    <div className="mb-auto">
                  <div className="flex items-center gap-4 mb-6"></div>                  <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-[0.85] mb-10"><TranslatedText text={selectedItem.item.t} /></h2>
                </div>
                
                <div className="flex flex-col gap-4 mt-8"> 
                  {selectedItem.category === 'movie' && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedItem({...selectedItem, showPlayer: true})}
                      className="w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase italic transition-all duration-500 shadow-xl bg-accent text-white hover:bg-accent/90"
                    >
                      <PlayCircle size={20} /> 
                      {t('PLAY HERE')}
                    </motion.button>
                  )}

                  {selectedItem.item.links && selectedItem.item.links.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {selectedItem.item.links.map((link, idx) => (
                        <motion.a 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={idx}
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase italic transition-all duration-500 shadow-xl bg-accent text-white hover:bg-accent/90"
                        >
                          {selectedItem.category === 'manga' ? <Book size={20} /> : <PlayCircle size={20} />} 
                          {link.part}
                        </motion.a>
                      ))}
                    </div>
                  ) : (
                    <motion.a 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={selectedItem.item.l} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-full py-7 rounded-[2.5rem] font-black flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase italic transition-all duration-500 shadow-2xl ${isSearchLink ? 'bg-surface-active text-text-muted hover:bg-surface-hover hover:text-white border border-white/10' : 'bg-accent text-white hover:bg-accent/90'}`}
                    >
                      {isSearchLink ? <Search size={24} /> : (selectedItem.category === 'manga' ? <Book size={24} /> : <PlayCircle size={24} />)} 
                      {isSearchLink ? t('SEARCH ARCHIVE') : <><TranslatedText text={selectedItem.category === 'manga' ? "Read:" : "Watch:"} /> <TranslatedText text={selectedItem.item.t} /></>}
                    </motion.a>
                  )}
                  {isSearchLink && (
                    <p className="text-center text-[10px] text-text-secondary mt-2 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      <AlertTriangle size={12} /> {t('Library Offline • Searching Local Database')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Popup (only when NOT on AI page) */}
      {activeCategory !== 'ai' && (
        <AIChat isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
      )}

      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAuthModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <AuthModal onClose={() => setIsAuthModalOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSuggestionModalOpen && (
          <SuggestionModal onClose={() => setIsSuggestionModalOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAdminOpen(false)}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[95vw] h-[95vh] bg-[#0f0f0f] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <AdminDashboard onClose={() => setIsAdminOpen(false)} isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showQuotaPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#121212] border border-red-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-center p-8"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-widest text-white mb-4"><TranslatedText text="Quota Exceeded" /></h2>
              <p className="text-neutral-400 mb-8 font-medium">
                <TranslatedText text="The free daily read/write limit for this database has been reached. The quota will reset tomorrow." />
              </p>
              <p className="text-sm text-neutral-500 mb-8">
                <TranslatedText text="Detailed quota information can be found under the Spark plan column in the Enterprise edition section of" /> <a href="https://firebase.google.com/pricing#cloud-firestore" target="_blank" rel="noreferrer" className="text-accent hover:underline">Firebase Pricing</a>.
              </p>
              <button 
                onClick={() => {
                  setHasShownQuotaPopup(true);
                  setShowQuotaPopup(false);
                }}
                className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
              >
                <TranslatedText text="Dismiss" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
