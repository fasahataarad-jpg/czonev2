import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Save, AlertCircle, CheckCircle2, ShieldCheck, Users, Megaphone, Activity, Send, Check, Ban, UserCheck, Upload, Loader2, Database, Globe, Settings as SettingsIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, auth, isQuotaExceeded, handleFirestoreError, OperationType } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'co-owner' | 'owner' | 'user' | 'donator' | 'tester';
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Timestamp;
  active: boolean;
}

interface DashboardStats {
  totalUploads: number;
  pendingSuggestions: number;
  activeAnnouncements: number;
  totalAdmins: number;
}

interface Suggestion {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: Timestamp;
  status: 'pending' | 'reviewed';
}

interface AllowedAdmin {
  id: string;
  email: string;
  addedBy: string;
  createdAt: Timestamp;
}

interface AdminDashboardProps {
  onClose: () => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, isSuperAdmin, isAdmin }) => {
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [uploadType, setUploadType] = useState('movie');
  const [uploadTitle, setUploadTitle] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [imageLink, setImageLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleUpload = async () => {
    if (!uploadTitle || !driveLink || !imageLink) {
      setError(t('Please provide a title, a content link, and a thumbnail image link.'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setUploadSuccess('');
    
    try {
      if (isQuotaExceeded) {
        throw new Error(t('Database quota exceeded. Please try again later.'));
      }
      
      await addDoc(collection(db, 'uploads'), {
        title: uploadTitle,
        type: uploadType,
        imageLink: imageLink,
        driveLink: driveLink,
        uploadedBy: auth.currentUser?.email || 'Unknown Admin',
        createdAt: serverTimestamp()
      });

      setUploadSuccess(t('Content added successfully!'));
      setUploadTitle('');
      setImageLink('');
      setDriveLink('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (err) {
      setError(t('Failed to log content to Firestore.'));
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'uploads');
    } finally {
      setIsSubmitting(false);
    }
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [allowedAdmins, setAllowedAdmins] = useState<AllowedAdmin[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'announcements' | 'suggestions' | 'admins' | 'analytics' | 'upload' | 'manage_uploads'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUploads: 0,
    pendingSuggestions: 0,
    activeAnnouncements: 0,
    totalAdmins: 0
  });

  useEffect(() => {
    setStats({
      totalUploads: uploads.length,
      pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
      activeAnnouncements: announcements.filter(a => a.active).length,
      totalAdmins: allowedAdmins.length
    });
  }, [uploads, suggestions, announcements, allowedAdmins]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  const unsubsRef = useRef<{ [key: string]: (() => void) | undefined }>({});
  const hasFetchedLocal = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Announcements (Firebase)
    const announcementsQuery = query(collection(db, 'site_announcements'), orderBy('createdAt', 'desc'));
    const unsubAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });
    unsubsRef.current.announcements = unsubAnnouncements;

    // Suggestions (Firebase)
    const suggestionsQuery = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'));
    const unsubSuggestions = onSnapshot(suggestionsQuery, (snapshot) => {
      setSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion)));
    });
    unsubsRef.current.suggestions = unsubSuggestions;

    // Firestore - Uploads
    const uploadsQuery = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
    const unsubUploads = onSnapshot(uploadsQuery, (snapshot) => {
      setUploads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'uploads');
    });
    unsubsRef.current.uploads = unsubUploads;

    // Admins (Firebase)
    const adminsQuery = query(collection(db, 'allowed_admins'), orderBy('createdAt', 'desc'));
    const unsubAdmins = onSnapshot(adminsQuery, (snapshot) => {
      setAllowedAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AllowedAdmin)));
    });
    unsubsRef.current.admins = unsubAdmins;

    // Cleanup
    return () => {
      unsubsRef.current.announcements?.();
      unsubsRef.current.suggestions?.();
      unsubsRef.current.admins?.();
      unsubsRef.current.uploads?.();
    };
  }, [activeTab]);

  // Global cleanup for persistent listeners when Dashboard closes
  useEffect(() => {
    return () => {
      Object.values(unsubsRef.current).forEach(unsub => unsub?.());
    };
  }, []);

  // Simplified tab effect - only sets loading initially if data is empty
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'upload') {
      setIsLoading(false);
      return;
    }

    const hasData = () => {
      switch(activeTab) {
        case 'manage_uploads': return uploads.length > 0;
        case 'announcements': return announcements.length > 0;
        case 'suggestions': return suggestions.length > 0;
        case 'admins': return allowedAdmins.length > 0;
        default: return false;
      }
    };

    if (!hasData()) {
      setIsLoading(true);
      // Data will be filled by persistent listeners
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [activeTab]);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setError(t('Please provide both an announcement title and content.'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await addDoc(collection(db, 'site_announcements'), {
        title: newTitle,
        content: newContent,
        authorId: auth.currentUser?.uid || 'admin',
        active: true,
        createdAt: serverTimestamp()
      });
      setNewTitle('');
      setNewContent('');
      setSuccess(t('Announcement posted successfully!'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to post announcement.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'site_announcements', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await setDoc(doc(db, 'allowed_admins', newAdminEmail.toLowerCase()), {
        email: newAdminEmail.toLowerCase(),
        addedBy: auth.currentUser?.uid || 'admin',
        createdAt: serverTimestamp()
      });
      setNewAdminEmail('');
      setSuccess(t('Admin added successfully!'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to add admin.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'allowed_admins', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveAllAdmins = async () => {
    if (!window.confirm(t('Are you sure you want to remove ALL admins? This cannot be undone.'))) return;
    try {
      for (const admin of allowedAdmins) {
          await deleteDoc(doc(db, 'allowed_admins', admin.id));
      }
      setSuccess(t('All admins removed successfully!'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to remove all admins.'));
    }
  };

  const handleDeleteUpload = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this content?'))) return;
    try {
      if (isQuotaExceeded) {
        setError(t('Database quota exceeded.'));
        return;
      }
      await deleteDoc(doc(db, 'uploads', id));
      setSuccess(t('Content deleted successfully!'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to delete content.'));
      handleFirestoreError(err, OperationType.DELETE, `uploads/${id}`);
    }
  };

  const toggleAnnouncementStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'site_announcements', id), { active: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSuggestionReviewed = async (id: string) => {
    try {
      await updateDoc(doc(db, 'suggestions', id), { status: 'reviewed' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suggestions', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full bg-[#050505] text-white overflow-hidden font-sans selection:bg-accent/30">
      {/* Sidebar Navigation */}
      <div className="w-20 md:w-64 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col z-20 shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div className="hidden md:block overflow-hidden">
            <h2 className="text-sm font-black uppercase italic tracking-tighter truncate leading-tight">{t('Command Center')}</h2>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-600 truncate">V2.4.0 • Admin</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {[
            { id: 'overview', icon: Activity, label: t('Overview') },
            { id: 'announcements', icon: Megaphone, label: t('Announcements') },
            { id: 'suggestions', icon: Send, label: t('Suggestions') },
            { id: 'manage_uploads', icon: Database, label: t('Library') },
            { id: 'analytics', icon: Globe, label: t('Live Feed') },
            ...(isSuperAdmin || isAdmin ? [{ id: 'admins', icon: ShieldCheck, label: t('Privileges') }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full group flex items-center gap-3 p-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab.id 
                  ? 'bg-accent/10 text-accent border border-accent/20' 
                  : 'text-neutral-500 hover:text-white border border-transparent hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-accent' : 'text-neutral-500 group-hover:text-white'} />
              <span className="hidden md:block truncate">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="sidebarActive" className="absolute left-[-12px] w-1 h-6 bg-accent rounded-r-full" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 mt-auto">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl text-neutral-600 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
            <span className="hidden md:block text-xs font-black uppercase tracking-widest">{t('Close')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative overflow-hidden">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
        
        {/* Top Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-sm z-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
            <span className="text-accent/50">/</span>
            {t(activeTab)}
          </h2>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end">
               <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">{t('Session Status')}</span>
               <div className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-mono text-neutral-400">{auth.currentUser?.email}</span>
               </div>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-accent">
               <UserCheck size={16} />
             </div>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {!isLoading && activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: t('Library Capacity'), value: stats.totalUploads, icon: Database, color: 'text-blue-500' },
                    { label: t('Pending Requests'), value: stats.pendingSuggestions, icon: Send, color: 'text-yellow-500', alert: stats.pendingSuggestions > 0 },
                    { label: t('Broadcasts'), value: stats.activeAnnouncements, icon: Megaphone, color: 'text-purple-500' },
                    { label: t('Core Admins'), value: stats.totalAdmins, icon: ShieldCheck, color: 'text-accent' }
                  ].map((s, i) => (
                    <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:bg-white/[0.05] transition-all hover:border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-xl bg-white/5 ${s.color}`}>
                          <s.icon size={20} />
                        </div>
                        {s.alert && (
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                          </span>
                        )}
                      </div>
                      <div className="text-4xl font-black italic tracking-tighter mb-1 text-white group-hover:text-accent transition-colors">{s.value}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <div className="lg:col-span-2 space-y-6">
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] h-[350px]">
                        <AnalyticsTab hideHeader />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="p-6 bg-accent border border-accent/20 rounded-[2rem] text-black">
                        <h3 className="text-lg font-black uppercase italic tracking-tighter mb-2">{t('Quick Upload')}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-6">{t('Add Content Instantly')}</p>
                        <button 
                          onClick={() => setActiveTab('upload')}
                          className="w-full py-4 bg-black text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                        >
                          <Plus size={18} />
                          {t('Initialize')}
                        </button>
                      </div>
                      
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-4">{t('System Status')}</h3>
                        <div className="space-y-4">
                           {[
                             { label: 'Database API', status: 'Optimal' },
                             { label: 'Media Proxies', status: 'Active' },
                             { label: 'Gateway latency', status: '12ms' }
                           ].map((item, i) => (
                             <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3">
                               <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">{item.label}</span>
                               <span className="text-[10px] font-mono text-accent">{item.status}</span>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {!isLoading && activeTab === 'upload' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto space-y-12">
                <div className="text-center">
                  <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-2">{t('Deploy Content')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">{t('Indexing Protocol')}</p>
                </div>
                
                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6 shadow-2xl">
                  {uploadSuccess && (
                     <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-500 text-xs font-bold uppercase tracking-widest">
                       <CheckCircle2 size={18} /> {t(uploadSuccess)}
                     </motion.div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Category')}</label>
                      <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase tracking-widest focus:border-accent outline-none appearance-none">
                        <option value="movie">{t('Movie')}</option>
                        <option value="anime">{t('Anime')}</option>
                        <option value="manga">{t('Manga')}</option>
                        <option value="tv">{t('TV Show')}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Entry Title')}</label>
                      <input type="text" placeholder="Title X" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase tracking-widest focus:border-accent outline-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Primary Data Path')}</label>
                       <input type="text" placeholder="https://..." value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono focus:border-accent outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Graphic Thumbnail URL')}</label>
                       <input type="text" placeholder="https://..." value={imageLink} onChange={(e) => setImageLink(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono focus:border-accent outline-none" />
                    </div>
                  </div>

                  <button 
                    onClick={handleUpload} 
                    disabled={isSubmitting} 
                    className="w-full mt-6 bg-accent text-black font-black uppercase py-5 rounded-3xl hover:bg-accent/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/10 active:scale-[0.98]"
                  >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                      {isSubmitting ? t('Committing...') : t('Finalize Deployment')}
                  </button>
                </div>
              </motion.div>
            )}

            {!isLoading && activeTab === 'manage_uploads' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <Database className="text-accent" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('Collection Management')}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{t('Total Index')}: {uploads.length} entries</p>
                      </div>
                   </div>
                   <button onClick={() => setActiveTab('upload')} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2">
                     <Plus size={14} /> {t('New Entry')}
                   </button>
                </div>
                
                {uploads.length === 0 ? (
                  <div className="py-32 text-center text-neutral-600 font-black uppercase tracking-[0.4em] italic opacity-20">NULL_SET</div>
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {/* Header Row */}
                    <div className="hidden lg:grid grid-cols-[80px_1fr_120px_200px_100px] gap-4 px-6 py-3 bg-white/5 rounded-t-xl text-[9px] font-black text-neutral-600 uppercase tracking-widest border-x border-t border-white/5">
                       <span>{t('Media')}</span>
                       <span>{t('Identification')}</span>
                       <span>{t('Protocol')}</span>
                       <span>{t('Authority')}</span>
                       <span className="text-right">{t('Action')}</span>
                    </div>
                    {uploads.map((upload) => (
                      <div key={upload.id} className="grid grid-cols-1 lg:grid-cols-[80px_1fr_120px_200px_100px] items-center gap-4 px-6 py-4 bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] transition-all group lg:first:rounded-none">
                         <div className="relative w-12 h-16 bg-black rounded-lg overflow-hidden border border-white/10">
                            <img src={upload.imageLink} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" referrerPolicy="no-referrer" />
                         </div>
                         <div>
                            <h4 className="font-black italic uppercase text-sm group-hover:text-accent transition-colors truncate">{upload.title}</h4>
                            <span className="text-[9px] font-mono text-neutral-700 uppercase">{upload.id}</span>
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-3 py-1 rounded-full bg-white/5 border border-white/5 w-fit">{upload.type}</span>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{upload.uploadedBy || 'System_Root'}</span>
                            <span className="text-[8px] font-mono text-neutral-700">{upload.createdAt?.toDate().toLocaleDateString()}</span>
                         </div>
                         <div className="flex justify-end gap-2">
                            <button onClick={() => {
                                navigator.clipboard.writeText(upload.driveLink);
                                alert('Link Copied');
                            }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-600 hover:text-white"><Database size={14} /></button>
                            <button onClick={() => handleDeleteUpload(upload.id)} className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-500/40 hover:text-red-500"><Trash2 size={14} /></button>
                         </div>
                      </div>
                    ))}
                    <div className="hidden lg:block h-3 bg-white/5 rounded-b-xl border border-white/5" />
                  </div>
                )}
              </motion.div>
            )}

            {!isLoading && activeTab === 'announcements' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                 <div className="flex flex-col md:flex-row gap-8">
                    <form onSubmit={handleAddAnnouncement} className="flex-1 bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-6">
                       <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4">{t('Global Broadcast')}</h3>
                       <div className="space-y-4">
                          <input
                            type="text"
                            placeholder={t('Signal Title')}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-black uppercase tracking-widest focus:border-accent outline-none"
                          />
                          <textarea
                            placeholder={t('Broadcast message payload...')}
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-bold tracking-widest focus:border-accent outline-none resize-none"
                          />
                       </div>
                       <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-accent text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-accent/90 transition-all flex items-center justify-center gap-2">
                          <Megaphone size={16} /> {isSubmitting ? t('Broadcasting...') : t('Transmit Signal')}
                       </button>
                    </form>

                    <div className="w-full md:w-80 space-y-4">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-600 mb-6">{t('Active Logs')}</h3>
                       <div className="space-y-3">
                          {announcements.map(ann => (
                             <div key={ann.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`w-2 h-2 rounded-full ${ann.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-neutral-800'}`} />
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => toggleAnnouncementStatus(ann.id, ann.active)} className="p-1.5 rounded-md bg-white/5 hover:bg-accent hover:text-black transition-colors"><Edit2 size={10} /></button>
                                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={10} /></button>
                                  </div>
                                </div>
                                <h4 className="text-xs font-black uppercase italic truncate pr-8">{ann.title}</h4>
                                <p className="text-[10px] text-neutral-500 line-clamp-1 mt-1">{ann.content}</p>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {!isLoading && activeTab === 'suggestions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                   <div>
                     <h3 className="text-3xl font-black uppercase italic tracking-tighter">{t('Intelligence Feed')}</h3>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">{t('Citizen Requests Incoming')}</p>
                   </div>
                   <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                      {(['all', 'pending', 'reviewed'] as const).map(filter => (
                        <button key={filter} onClick={() => setSuggestionFilter(filter)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${suggestionFilter === filter ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-neutral-500 hover:text-white'}`}>
                           {t(filter)}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                  {suggestions.filter(s => suggestionFilter === 'all' || s.status === suggestionFilter).map(suggestion => (
                    <div key={suggestion.id} className="p-6 bg-white/[0.01] border border-white/5 rounded-[2rem] flex items-center gap-6 group hover:border-white/20 transition-all">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${suggestion.status === 'pending' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500' : 'bg-green-500/5 border-green-500/20 text-green-500'}`}>
                          {suggestion.status === 'pending' ? <Activity size={20} /> : <Check size={20} />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-[9px] font-mono text-neutral-600">{suggestion.id}</span>
                             <span className="text-[10px] font-black uppercase text-accent tracking-widest">{suggestion.userEmail}</span>
                          </div>
                          <p className="text-sm font-medium text-neutral-300 leading-relaxed">{suggestion.text}</p>
                       </div>
                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {suggestion.status === 'pending' && <button onClick={() => handleMarkSuggestionReviewed(suggestion.id)} className="p-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"><Check size={18} /></button>}
                          <button onClick={() => handleDeleteSuggestion(suggestion.id)} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                       </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {!isLoading && activeTab === 'admins' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     <form onSubmit={handleAddAdmin} className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-accent">{t('Escalate Privilege')}</h3>
                        <div className="space-y-4">
                           <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="Personnel_Email@root" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase tracking-widest focus:border-accent outline-none" required />
                           <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-accent text-black font-black uppercase text-xs rounded-xl hover:bg-accent/90 transition-all flex items-center justify-center gap-2">
                             <ShieldCheck size={16} /> {t('Grant Access')}
                           </button>
                        </div>
                     </form>

                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-600">{t('Authorized Units')}</h3>
                           <button onClick={handleRemoveAllAdmins} className="text-[8px] font-black uppercase border border-red-500/20 px-2 py-1 rounded-md text-red-500 hover:bg-red-500/10 transition-all">{t('Purge List')}</button>
                        </div>
                        <div className="space-y-3">
                           {allowedAdmins.map(admin => (
                             <div key={admin.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group">
                                <div>
                                   <p className="text-xs font-black uppercase text-white truncate">{admin.email}</p>
                                   <p className="text-[9px] font-mono text-neutral-700 mt-1">{t('Auth Since')}: {admin.createdAt?.toDate().toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 rounded-lg text-red-500/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {!isLoading && activeTab === 'analytics' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AnalyticsTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab = ({ hideHeader = false }: { hideHeader?: boolean }) => {
    const { t } = useLanguage();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const url = `/api/analytics/data`;
        console.log(`[Debug] Admin fetching analytics from: ${window.location.origin}${url}`);
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch analytics');
                return res.json();
            })
            .then(data => {
                // Map GA4/Local data to a format Recharts can use
                const formattedData = (data.rows || []).map((row: any) => ({
                    date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
                    activeUsers: parseInt(row.metricValues[0].value, 10)
                })).sort((a: any, b: any) => a.date.localeCompare(b.date));
                
                setData(formattedData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Analytics Fetch Error:', err);
                setError('Failed to load analytics data.');
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-6 text-center text-neutral-500">{t('Loading analytics...')}</div>;
    if (error) return <div className="p-6 text-center text-red-500">{t(error)}</div>;

    return (
        <div className={`p-6 ${hideHeader ? '' : 'bg-white/5 rounded-2xl border border-white/5'}`}>
            {!hideHeader && <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-6">{t('Active Users (Last 30 Days)')}</h3>}
            <div className={`w-full ${hideHeader ? 'h-[250px]' : 'h-[300px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="activeUsers" stroke="#F27D26" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default AdminDashboard;
