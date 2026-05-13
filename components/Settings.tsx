import React, { useState, useEffect, useRef } from 'react';
import { Palette, ChevronDown, Edit2, X, Globe, User, Trash2, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { auth, db, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';
import { doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser, updateProfile } from 'firebase/auth';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export type ThemeColors = {
  bg: string;
  textPrimary: string;
  surface: string;
  border: string;
  accent: string;
  surfaceHover: string;
};

export type Theme = {
  id: string;
  name: string;
  colors: ThemeColors;
};

export const defaultThemes: Record<string, Theme> = {
  chillzone: {
    id: 'chillzone',
    name: 'ChillZone (Default)',
    colors: {
      bg: '#050505',
      textPrimary: '#ffffff',
      surface: '#0f0f0f',
      border: '#1a1a1a',
      accent: '#ff0000',
      surfaceHover: '#1a1a1a',
    }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg: '#0a0a0a',
      textPrimary: '#ffffff',
      surface: '#141414',
      border: '#262626',
      accent: '#ffffff',
      surfaceHover: '#1c1c1f',
    }
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud',
    colors: {
      bg: '#e4e4e7',
      textPrimary: '#09090b',
      surface: '#ffffff',
      border: '#d4d4d8',
      accent: '#0ea5e9',
      surfaceHover: '#f4f4f5',
    }
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    colors: {
      bg: '#050505',
      textPrimary: '#22c55e',
      surface: '#0a0a0a',
      border: '#14532d',
      accent: '#22c55e',
      surfaceHover: '#0f0f0f',
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      bg: '#020617',
      textPrimary: '#f8fafc',
      surface: '#0f172a',
      border: '#1e293b',
      accent: '#0ea5e9',
      surfaceHover: '#1e293b',
    }
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    colors: {
      bg: '#1c1917',
      textPrimary: '#fafaf9',
      surface: '#292524',
      border: '#44403c',
      accent: '#f97316',
      surfaceHover: '#44403c',
    }
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    colors: {
      bg: '#0f0728',
      textPrimary: '#f3e8ff',
      surface: '#1a0b3c',
      border: '#2e1065',
      accent: '#8b5cf6',
      surfaceHover: '#2e1065',
    }
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    colors: {
      bg: '#0a0a0a',
      textPrimary: '#ffffff',
      surface: '#1a0f00',
      border: '#2a1a00',
      accent: '#ff7518',
      surfaceHover: '#2a1a00',
    }
  },
  aprilfools: {
    id: 'aprilfools',
    name: 'April Fools',
    colors: {
      bg: '#ff69b4',
      textPrimary: '#39ff14',
      surface: '#00ffff',
      border: '#ffff00',
      accent: '#ff0000',
      surfaceHover: '#ffffff',
    }
  }
};

const CustomSelect = ({ value, options, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-bg border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-accent transition-colors"
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar z-50">
          {options.map((opt: any) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors ${
                value === opt.value ? 'bg-surface-hover text-accent' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ColorPickerItem = ({ label, colorKey, value, isCustom, onChange }: any) => {
  return (
    <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs opacity-60 mt-0.5">{isCustom ? 'Custom' : 'Default'}</div>
      </div>
      <div className="relative w-14 h-8 rounded-md overflow-hidden border border-border shadow-sm">
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: value }}
        />
        <input 
          type="color" 
          value={value}
          onChange={(e) => onChange(colorKey, e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

const menuItems = [
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'account', label: 'Account', icon: User },
];

const LANGUAGES = [
  { value: 'en-US', label: 'English (Default)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'vi-VN', label: 'Vietnamese' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese' },
];

const TIME_ZONES = [
  { value: 'auto', label: 'System Default' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const ParticleBackground = ({ color }: { color: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.5 + 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    for (let i = 0; i < 60; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.globalAlpha = (1 - distance / 120) * 0.5;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-40" />;
};

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('theme');
  const [currentThemeId, setCurrentThemeId] = useState(() => localStorage.getItem('custom_theme_id') || 'chillzone');
  const [customThemes, setCustomThemes] = useState(() => {
    const saved = localStorage.getItem('custom_themes');
    const themes = saved ? JSON.parse(saved) : { ...defaultThemes };
    
    // Merge new default themes if they don't exist in saved themes
    Object.keys(defaultThemes).forEach(key => {
      if (!themes[key]) {
        themes[key] = defaultThemes[key];
      }
    });
    return themes;
  });

  const { language, setLanguage, militaryTime, setMilitaryTime, timeZone, setTimeZone, t } = useLanguage();

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [newDisplayName, setNewDisplayName] = useState(auth.currentUser?.displayName || '');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [lastUsernameChange, setLastUsernameChange] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser || isQuotaExceeded) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setLastUsernameChange(userDoc.data().lastUsernameChange);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
      }
    };
    fetchUserData();
  }, []);

  const handleUpdateUsername = async () => {
    if (!auth.currentUser || !newDisplayName.trim()) return;
    if (newDisplayName === auth.currentUser.displayName) return;

    // Check cooldown
    if (lastUsernameChange) {
      const lastChange = lastUsernameChange.toDate();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastChange.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        const remainingDays = 7 - Math.floor(diffTime / (1000 * 60 * 60 * 24));
        setUsernameError(`You can only change your username once every 7 days. Please wait ${remainingDays} more day(s).`);
        return;
      }
    }

    setIsUpdatingUsername(true);
    setUsernameError(null);
    setUsernameSuccess(false);

    if (isQuotaExceeded) {
      setUsernameError("Database quota exceeded. Please try again later.");
      setIsUpdatingUsername(false);
      return;
    }

    try {
      // 1. Update Auth Profile
      await updateProfile(auth.currentUser, { displayName: newDisplayName });

      // 2. Update Firestore
      const now = new Date();
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: newDisplayName,
        lastUsernameChange: serverTimestamp()
      });

      setLastUsernameChange({ toDate: () => now });
      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (err: any) {
      if (!String(err).includes('Quota limit exceeded') && !String(err).includes('Quota exceeded')) {
        console.error("Error updating username:", err);
      }
      setUsernameError("Failed to update username. Please try again.");
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    if (!auth.currentUser) return;

    setIsDeleting(true);
    setDeleteError(null);

    if (isQuotaExceeded) {
      setDeleteError("Database quota exceeded. Please try again later.");
      setIsDeleting(false);
      return;
    }

    try {
      const user = auth.currentUser;
      const userId = user.uid;

      // 1. Delete Firestore document
      await deleteDoc(doc(db, 'users', userId));

      // 2. Delete Auth account
      await deleteUser(user);

      // 3. Close settings and refresh or redirect
      onClose();
      window.location.href = '/';
    } catch (err: any) {
      if (!String(err).includes('Quota limit exceeded') && !String(err).includes('Quota exceeded')) {
        console.error("Error deleting account:", err);
      }
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError("This action requires a recent login. Please log out and log back in, then try again.");
      } else {
        setDeleteError("Failed to delete account. Please try again later.");
        handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser?.uid}`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const activeTheme = customThemes[currentThemeId] || defaultThemes.chillzone;

  useEffect(() => {
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

    localStorage.setItem('custom_theme_id', currentThemeId);
    localStorage.setItem('custom_themes', JSON.stringify(customThemes));
    
    // Sync to Firebase if logged in - Debounced to prevent quota issues
    let timeoutId: NodeJS.Timeout;
    if (auth.currentUser && !isQuotaExceeded) {
      timeoutId = setTimeout(() => {
        updateDoc(doc(db, 'users', auth.currentUser!.uid), {
          theme: currentThemeId,
          customThemes: JSON.stringify(customThemes)
        }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
        });
      }, 2000); // 2 second debounce
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeTheme, currentThemeId, customThemes]);

  const handleColorChange = (key: keyof ThemeColors, color: string) => {
    setCustomThemes((prev: any) => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        colors: {
          ...prev[currentThemeId].colors,
          [key]: color
        }
      }
    }));
  };

  const handleNameChange = (newName: string) => {
    setCustomThemes((prev: any) => ({
      ...prev,
      [currentThemeId]: {
        ...prev[currentThemeId],
        name: newName
      }
    }));
  };

  const handleReset = () => {
    setCurrentThemeId('chillzone');
    setCustomThemes(defaultThemes);
  };

  return (
    <div className="relative bg-bg/95 text-text-primary font-sans flex flex-col h-full overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <ParticleBackground color={activeTheme.colors.accent} />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
      </div>
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 z-10 bg-white/[0.02] backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
           <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
              <SettingsIcon size={20} />
           </div>
           <div>
              <h2 className="text-lg font-black uppercase italic tracking-widest">{t('Settings')}</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none">v2.4.0 • {activeSection}</p>
           </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-white/5 rounded-xl transition-all text-text-secondary hover:text-white border border-transparent hover:border-white/10"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden z-10">
        {/* Navigation Sidebar */}
        <div className="w-[160px] border-r border-white/5 flex flex-col p-6 gap-3 shrink-0 bg-white/[0.01]">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-500 group relative ${
                  isActive 
                    ? 'text-accent' 
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-setting-tab"
                    className="absolute inset-0 bg-accent/5 rounded-2xl border border-accent/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={20} className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest">{t(item.label)}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20">
          <AnimatePresence mode="wait">
            {activeSection === 'theme' && (
              <motion.div
                key="theme"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="space-y-8"
              >
                <div className="flex items-end justify-between border-b border-white/5 pb-6">
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-1">{t('Theme Settings')}</h3>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.3em]">{t('Personalize your experience')}</p>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase italic tracking-widest hover:bg-white/10 transition-all text-white/60 hover:text-white"
                  >
                    {t('Wipe Customization')}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Preset Selector */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-6 h-0.5 bg-accent rounded-full" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{t('Select Preset')}</h4>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                      <CustomSelect 
                        value={currentThemeId}
                        onChange={setCurrentThemeId}
                        options={Object.values(customThemes).map((t: any) => ({ value: t.id, label: t.name }))}
                      />
                    </div>
                  </div>

                  {/* Theme Naming */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-6 h-0.5 bg-accent rounded-full" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{t('Display Name')}</h4>
                     </div>
                     <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                        <input 
                          type="text" 
                          value={activeTheme.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold tracking-tight focus:outline-none focus:border-accent transition-all text-white placeholder:text-text-muted/30"
                          placeholder={t('Enter unique theme name...')}
                        />
                     </div>
                  </div>

                  {/* Colors Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-0.5 bg-accent rounded-full" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{t('Chrome Styling')}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ColorPickerItem 
                        label={t('Chassis')} 
                        colorKey="bg" 
                        value={activeTheme.colors.bg} 
                        isCustom={activeTheme.colors.bg !== defaultThemes[currentThemeId].colors.bg}
                        onChange={handleColorChange} 
                      />
                      <ColorPickerItem 
                        label={t('Primary Text')} 
                        colorKey="textPrimary" 
                        value={activeTheme.colors.textPrimary} 
                        isCustom={activeTheme.colors.textPrimary !== defaultThemes[currentThemeId].colors.textPrimary}
                        onChange={handleColorChange} 
                      />
                      <ColorPickerItem 
                        label={t('Component')} 
                        colorKey="surface" 
                        value={activeTheme.colors.surface} 
                        isCustom={activeTheme.colors.surface !== defaultThemes[currentThemeId].colors.surface}
                        onChange={handleColorChange} 
                      />
                      <ColorPickerItem 
                        label={t('Divider')} 
                        colorKey="border" 
                        value={activeTheme.colors.border} 
                        isCustom={activeTheme.colors.border !== defaultThemes[currentThemeId].colors.border}
                        onChange={handleColorChange} 
                      />
                      <ColorPickerItem 
                        label={t('Accent Focus')} 
                        colorKey="accent" 
                        value={activeTheme.colors.accent} 
                        isCustom={activeTheme.colors.accent !== defaultThemes[currentThemeId].colors.accent}
                        onChange={handleColorChange} 
                      />
                      <ColorPickerItem 
                        label={t('Hover State')} 
                        colorKey="surfaceHover" 
                        value={activeTheme.colors.surfaceHover} 
                        isCustom={activeTheme.colors.surfaceHover !== defaultThemes[currentThemeId].colors.surfaceHover}
                        onChange={handleColorChange} 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Cloak feature removed */}

            {activeSection === 'language' && (
              <motion.div
                key="language"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="space-y-8"
              >
                <div className="flex items-end justify-between border-b border-white/5 pb-6">
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-1">{t('Regional Settings')}</h3>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.3em]">{t('Configure your preferences')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-0.5 bg-accent rounded-full" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{t('System Language')}</h4>
                    </div>
                    <CustomSelect 
                      value={language}
                      onChange={setLanguage}
                      options={LANGUAGES}
                    />
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md flex items-center justify-between">
                    <div>
                      <h4 className="text-[11px] font-black uppercase italic tracking-widest text-white mb-1">{t('24-Hour Time')}</h4>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest leading-none">{t('Use the 24-hour clock format')}</p>
                    </div>
                    <button 
                      onClick={() => setMilitaryTime(!militaryTime)}
                      className={`w-12 h-6 rounded-full transition-all duration-500 relative ${militaryTime ? 'bg-accent shadow-[0_0_15px_var(--accent-glow)]' : 'bg-white/10 border border-white/10'}`}
                    >
                      <motion.div 
                        animate={{ x: militaryTime ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg" 
                      />
                    </button>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-0.5 bg-accent rounded-full" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{t('Time Zone Settings')}</h4>
                    </div>
                    <CustomSelect 
                      value={timeZone}
                      onChange={setTimeZone}
                      options={TIME_ZONES.map((tz: any) => ({ value: tz.value, label: tz.value === 'auto' ? t('System Neutral') : tz.label }))}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="space-y-8"
              >
                <div className="flex items-end justify-between border-b border-white/5 pb-6">
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-1">{t('Profile Settings')}</h3>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.3em]">{t('Your account information')}</p>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8 backdrop-blur-md">
                  <div className="flex items-center gap-6 mb-10">
                    <div className="w-24 h-24 rounded-[32px] bg-accent/10 border border-accent/20 p-1 flex items-center justify-center relative group">
                      <div className="absolute inset-0 bg-accent/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      {auth.currentUser?.photoURL ? (
                        <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full rounded-[28px] object-cover relative z-10" />
                      ) : (
                        <User size={40} className="text-accent relative z-10" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-1 drop-shadow-md">
                        {auth.currentUser?.displayName || t('Unauthorized User')}
                      </h3>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.3em]">{auth.currentUser?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-8 mb-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                          <div className="w-6 h-0.5 bg-accent rounded-full" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{t('Display Name')}</h4>
                      </div>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={newDisplayName}
                          onChange={(e) => setNewDisplayName(e.target.value)}
                          placeholder={t('Enter Name...')}
                          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold tracking-tight focus:outline-none focus:border-accent transition-all text-white placeholder:text-text-muted/30"
                        />
                        <button
                          disabled={isUpdatingUsername || !newDisplayName.trim() || newDisplayName === auth.currentUser?.displayName}
                          onClick={handleUpdateUsername}
                          className="px-8 bg-accent text-white rounded-2xl text-[10px] font-black uppercase italic tracking-widest hover:shadow-[0_0_20px_var(--accent-glow)] transition-all disabled:opacity-30 disabled:grayscale flex items-center gap-3"
                        >
                          {isUpdatingUsername ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : usernameSuccess ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Edit2 size={14} />
                          )}
                          {usernameSuccess ? t('Synced') : t('Sync')}
                        </button>
                      </div>
                      {usernameError && (
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-2 px-2">{usernameError}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <div className="p-6 rounded-3xl bg-red-500/[0.03] border border-red-500/10">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 mb-4 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          {t('Danger Zone')}
                        </h4>
                        
                        {!isDeletingAccount ? (
                          <button 
                            onClick={() => setIsDeletingAccount(true)}
                            className="flex items-center gap-3 px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-red-500 border-transparent hover:text-white transition-all"
                          >
                            <Trash2 size={14} />
                            {t('Delete Account')}
                          </button>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-6"
                          >
                            <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest leading-relaxed">
                              {t('Warning: This action is permanent and cannot be undone.')}
                            </p>
                            
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-red-500/60 uppercase tracking-widest">
                                {t('Type "DELETE" to confirm')}
                              </label>
                              <input 
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder="DELETE"
                                className="w-full bg-black/40 border border-red-500/20 rounded-xl px-6 py-4 text-sm font-bold tracking-tight focus:outline-none focus:border-red-500 transition-all text-white"
                              />
                            </div>

                            {deleteError && (
                              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">{deleteError}</p>
                            )}

                            <div className="flex gap-4">
                              <button 
                                disabled={isDeleting || deleteConfirmation !== 'DELETE'}
                                onClick={handleDeleteAccount}
                                className="flex-1 bg-red-500 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-[0.2em] hover:bg-red-600 transition-all disabled:opacity-30 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
                              >
                                {isDeleting ? t('Deleting...') : t('Confirm Deletion')}
                              </button>
                              <button 
                                disabled={isDeleting}
                                onClick={() => {
                                  setIsDeletingAccount(false);
                                  setDeleteConfirmation('');
                                  setDeleteError(null);
                                }}
                                className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-[0.2em] hover:bg-white/10 transition-all"
                              >
                                {t('Cancel')}
                              </button>
                            </div>
                          </motion.div>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Settings;
