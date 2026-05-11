import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Save, AlertCircle, CheckCircle2, ShieldCheck, Users, Megaphone, Activity, Send, Check, Ban, UserCheck, Upload, Loader2, Database, Globe, Settings as SettingsIcon, Sparkles, Search, Wand2, Eye, GitCommit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, auth, isQuotaExceeded, handleFirestoreError, OperationType } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { GoogleGenAI } from "@google/genai";
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

interface Changelog {
  id: string;
  version: string;
  date: string;
  changes: string[];
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
  const [uploadYear, setUploadYear] = useState('');
  const [uploadGenre, setUploadGenre] = useState('');
  const [uploadRating, setUploadRating] = useState('');
  const [uploadQuality, setUploadQuality] = useState('HD');
  const [uploadDesc, setUploadDesc] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleMagicPoster = async () => {
    if (!uploadTitle) {
      setError(t('Provide a title first.'));
      return;
    }
    setIsSubmitting(true);
    try {
      const { fetchPoster } = await import('../services/posters');
      const url = await fetchPoster(uploadTitle, uploadType);
      if (url) {
        setImageLink(url);
        setUploadSuccess(t('Magic Poster Found!'));
        setTimeout(() => setUploadSuccess(''), 2000);
      } else {
        setError(t('Could not find a magic poster.'));
      }
    } catch (err) {
      setError(t('Spell failed. Try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiSummary = async () => {
    if (!uploadTitle) {
      setError(t('Provide a title first for the AI to summarize.'));
      return;
    }
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize this ${uploadType}: ${uploadTitle}`,
        config: {
          systemInstruction: "You are a movie and anime expert. Provide a very brief, catchy 1-2 sentence summary for the given title. Do not use spoilers. Output ONLY the summary text.",
        }
      });
      const summary = response.text;
      if (summary) {
        setUploadDesc(summary.trim());
        setUploadSuccess(t('AI Summary Generated!'));
        setTimeout(() => setUploadSuccess(''), 2000);
      }
    } catch (err) {
      console.error(err);
      setError(t('AI summarized failed.'));
    } finally {
      setIsSummarizing(false);
    }
  };

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
      
      const payload = {
        title: uploadTitle,
        type: uploadType,
        imageLink: imageLink,
        driveLink: driveLink,
        year: uploadYear ? parseInt(uploadYear) : null,
        genre: uploadGenre ? uploadGenre.split(',').map(g => g.trim()) : [],
        rating: uploadRating ? parseFloat(uploadRating) : null,
        quality: uploadQuality,
        description: uploadDesc,
        updatedBy: auth.currentUser?.email || 'Unknown Admin',
        updatedAt: serverTimestamp()
      };

      if (editingItemId) {
        await updateDoc(doc(db, 'uploads', editingItemId), payload);
        setUploadSuccess(t('Content updated successfully!'));
      } else {
        await addDoc(collection(db, 'uploads'), {
          ...payload,
          uploadedBy: auth.currentUser?.email || 'Unknown Admin',
          createdAt: serverTimestamp()
        });
        setUploadSuccess(t('Content added successfully!'));
      }

      setUploadTitle('');
      setImageLink('');
      setDriveLink('');
      setUploadYear('');
      setUploadGenre('');
      setUploadRating('');
      setUploadQuality('HD');
      setUploadDesc('');
      setEditingItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadSuccess(''), 3000);
      
      if (editingItemId) {
        setActiveTab('manage_uploads');
      }
    } catch (err) {
      setError(t('Failed to log content to Firestore.'));
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'uploads');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (upload: any) => {
    setEditingItemId(upload.id);
    setUploadTitle(upload.title);
    setUploadType(upload.type);
    setDriveLink(upload.driveLink);
    setImageLink(upload.imageLink);
    setUploadYear(upload.year?.toString() || '');
    setUploadGenre(upload.genre?.join(', ') || '');
    setUploadRating(upload.rating?.toString() || '');
    setUploadQuality(upload.quality || 'HD');
    setUploadDesc(upload.description || '');
    setActiveTab('upload');
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [allowedAdmins, setAllowedAdmins] = useState<AllowedAdmin[]>([]);
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newChanges, setNewChanges] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'announcements' | 'suggestions' | 'admins' | 'analytics' | 'upload' | 'manage_uploads' | 'changelog'>('overview');
  const [uploadSearchQuery, setUploadSearchQuery] = useState('');
  const [uploadFilterTab, setUploadFilterTab] = useState<'all' | 'movie' | 'anime' | 'manga' | 'tv'>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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

    // Changelogs (Firebase)
    const changelogsQuery = query(collection(db, 'changelogs'), orderBy('createdAt', 'desc'));
    const unsubChangelogs = onSnapshot(changelogsQuery, (snapshot) => {
      setChangelogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Changelog)));
    });
    unsubsRef.current.changelogs = unsubChangelogs;

    // Cleanup
    return () => {
      unsubsRef.current.announcements?.();
      unsubsRef.current.suggestions?.();
      unsubsRef.current.admins?.();
      unsubsRef.current.uploads?.();
      unsubsRef.current.changelogs?.();
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
      const payload = {
        title: newTitle,
        content: newContent,
        authorId: auth.currentUser?.uid || 'admin',
        active: true,
        createdAt: editingAnnouncementId ? undefined : serverTimestamp()
      };

      if (editingAnnouncementId) {
        await updateDoc(doc(db, 'site_announcements', editingAnnouncementId), {
          title: newTitle,
          content: newContent
        });
        setSuccess(t('Announcement updated successfully!'));
      } else {
        await addDoc(collection(db, 'site_announcements'), payload);
        setSuccess(t('Announcement posted successfully!'));
      }
      
      setNewTitle('');
      setNewContent('');
      setEditingAnnouncementId(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to save announcement.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    setNewTitle(ann.title);
    setNewContent(ann.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm(t('Permanently remove this broadcast?'))) return;
    try {
      await deleteDoc(doc(db, 'site_announcements', id));
      if (editingAnnouncementId === id) {
        setEditingAnnouncementId(null);
        setNewTitle('');
        setNewContent('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChangelog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !newDate.trim() || !newChanges.trim()) {
      setError(t('Complete version, date, and changes.'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const changesArray = newChanges.split('\n').map(c => c.trim()).filter(c => c.length > 0);
      const payload = {
        version: newVersion,
        date: newDate,
        changes: changesArray,
        createdAt: editingLogId ? undefined : serverTimestamp()
      };

      if (editingLogId) {
        await updateDoc(doc(db, 'changelogs', editingLogId), {
          version: newVersion,
          date: newDate,
          changes: changesArray
        });
        setSuccess(t('Changelog updated successfully!'));
      } else {
        await addDoc(collection(db, 'changelogs'), payload);
        setSuccess(t('Changelog added successfully!'));
      }
      
      setNewVersion('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewChanges('');
      setEditingLogId(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to save changelog.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditChangelog = (log: Changelog) => {
    setEditingLogId(log.id);
    setNewVersion(log.version);
    setNewDate(log.date);
    setNewChanges(log.changes.join('\n'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteChangelog = async (id: string) => {
    if (!window.confirm(t('Permanently remove this update log?'))) return;
    try {
      await deleteDoc(doc(db, 'changelogs', id));
      if (editingLogId === id) {
        setEditingLogId(null);
        setNewVersion('');
        setNewDate('');
        setNewChanges('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChangelogs = async () => {
    if (!window.confirm(t('Are you ABSOLUTELY sure you want to WIPE the entire changelog history?'))) return;
    setIsSubmitting(true);
    try {
      const promises = changelogs.map(log => deleteDoc(doc(db, 'changelogs', log.id)));
      await Promise.all(promises);
      setSuccess(t('Changelog cleared successfully!'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to clear changelogs.'));
    } finally {
      setIsSubmitting(false);
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
      <div className="w-20 md:w-80 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col z-20 shrink-0">
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
            { id: 'changelog', icon: GitCommit, label: t('Update Logs') },
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
                      <div className="text-5xl font-black italic tracking-tighter mb-1 text-white group-hover:text-accent transition-colors">{s.value}</div>
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-12">
                <div className="text-center">
                  <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-2">{editingItemId ? t('Update Entry') : t('Deploy Content')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">{editingItemId ? t('Patching Index') : t('Indexing Protocol')}</p>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Form Side */}
                  <div className="flex-1 bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6 shadow-2xl relative">
                    {editingItemId && (
                      <button 
                        onClick={() => {
                          setEditingItemId(null);
                          setUploadTitle('');
                          setDriveLink('');
                          setImageLink('');
                          setUploadDesc('');
                        }} 
                        className="absolute top-6 right-6 text-neutral-500 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                    )}
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
                         <div className="flex gap-2">
                            <input type="text" placeholder="https://..." value={imageLink} onChange={(e) => setImageLink(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono focus:border-accent outline-none" />
                            <button 
                              type="button"
                              onClick={handleMagicPoster}
                              disabled={isSubmitting || !uploadTitle}
                              className="px-4 rounded-2xl bg-white/5 border border-white/10 hover:border-accent/40 text-neutral-400 hover:text-accent transition-all flex items-center justify-center gap-2 group/magic"
                              title={t('Auto-fetch Poster')}
                            >
                               <Sparkles size={18} className="group-hover/magic:animate-pulse" />
                            </button>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center justify-between ml-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">{t('Summary / Description')}</label>
                         <button 
                           onClick={handleAiSummary}
                           disabled={isSummarizing || !uploadTitle}
                           className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1 hover:opacity-80 disabled:opacity-30 transition-all"
                         >
                           {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                           {t('AI Generate')}
                         </button>
                       </div>
                       <textarea 
                         placeholder={t('Write a brief entry summary...')} 
                         value={uploadDesc} 
                         onChange={(e) => setUploadDesc(e.target.value)} 
                         rows={4}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold leading-relaxed focus:border-accent outline-none resize-none" 
                       />
                    </div>

                    <button 
                      onClick={handleUpload} 
                      disabled={isSubmitting} 
                      className="w-full mt-6 bg-accent text-black font-black uppercase py-5 rounded-3xl hover:bg-accent/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/10 active:scale-[0.98]"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : editingItemId ? <Edit2 size={20} /> : <Save size={20} />}
                        {isSubmitting ? t('Committing...') : editingItemId ? t('Patch Database') : t('Finalize Deployment')}
                    </button>
                  </div>

                  {/* Preview Side */}
                  <div className="w-full lg:w-72 space-y-6">
                     <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-600 mb-4 flex items-center justify-center gap-2">
                          <Eye size={12} /> {t('Live Preview')}
                        </p>
                     </div>
                     
                     <div className="relative aspect-[2/3] rounded-[24px] overflow-hidden bg-black border border-white/5 shadow-2xl">
                        <img 
                          src={imageLink || 'https://picsum.photos/seed/poster/400/600'} 
                          className="w-full h-full object-cover opacity-60" 
                          alt="Preview"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-[3]" />
                        <div className="absolute inset-0 p-5 flex flex-col justify-end z-[5]">
                           <div className="flex gap-2 mb-3">
                              <div className="px-2 py-0.5 rounded-md bg-accent/20 border border-accent/30 backdrop-blur-md">
                                 <span className="text-[8px] font-black text-accent uppercase tracking-widest leading-none italic">{uploadQuality || 'HD'}</span>
                              </div>
                              <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 backdrop-blur-md">
                                 <span className="text-[8px] font-black text-white/60 uppercase tracking-widest leading-none italic">MODERN</span>
                              </div>
                           </div>
                           <h3 className="text-sm font-black text-white uppercase italic tracking-tighter leading-[1.1] line-clamp-3">
                             {uploadTitle || t('Title Placeholder')}
                           </h3>
                           <div className="w-full h-0.5 bg-accent mt-4 rounded-full shadow-[0_0_10px_var(--accent)]" />
                        </div>
                     </div>

                     <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">{t('Field Diagnostics')}</h4>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-neutral-600">ID:</span>
                              <span className="text-accent">{editingItemId || 'NEW_ENTRY'}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-neutral-600">TYPE:</span>
                              <span className="text-white">{uploadType.toUpperCase()}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-neutral-600">TITLE:</span>
                              <span className={`truncate max-w-[150px] ${uploadTitle ? 'text-white' : 'text-red-500/50 italic'}`}>{uploadTitle || 'MISSING'}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-neutral-600">LINK:</span>
                              <span className={driveLink ? 'text-green-500' : 'text-red-500/50'}>{driveLink ? 'VALID' : 'MISSING'}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!isLoading && activeTab === 'manage_uploads' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <Database className="text-accent" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('Collection Management')}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{t('Total Index')}: {uploads.length} entries</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      <div className="relative group">
                        <input
                          type="text"
                          placeholder={t('Search Library...')}
                          value={uploadSearchQuery}
                          onChange={(e) => setUploadSearchQuery(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-10 pr-10 text-[10px] font-black uppercase tracking-widest focus:border-accent outline-none w-96 transition-all"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-accent" size={14} />
                        {uploadSearchQuery && (
                          <button 
                            onClick={() => setUploadSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-accent transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <button onClick={() => setActiveTab('upload')} className="px-6 py-3 bg-accent text-black hover:bg-accent/90 border border-accent/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2">
                        <Plus size={14} /> {t('New Entry')}
                      </button>
                   </div>
                </div>

                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
                    {(['all', 'movie', 'anime', 'manga', 'tv'] as const).map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setUploadFilterTab(tab)} 
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${uploadFilterTab === tab ? 'bg-accent/20 text-accent border border-accent/20' : 'text-neutral-500 hover:text-white'}`}
                      >
                        {t(tab === 'tv' ? 'TV' : tab)}
                      </button>
                    ))}
                </div>
                
                {uploads.length === 0 ? (
                  <div className="py-32 text-center text-neutral-600 font-black uppercase tracking-[0.4em] italic opacity-20">NULL_SET</div>
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {/* Header Row */}
                    <div className="hidden lg:grid grid-cols-[80px_1fr_120px_200px_140px] gap-4 px-6 py-3 bg-white/5 rounded-t-xl text-[9px] font-black text-neutral-600 uppercase tracking-widest border-x border-t border-white/5">
                       <span>{t('Media')}</span>
                       <span>{t('Identification')}</span>
                       <span>{t('Protocol')}</span>
                       <span>{t('Authority')}</span>
                       <span className="text-right">{t('Action')}</span>
                    </div>
                    {uploads
                      .filter(u => uploadFilterTab === 'all' || u.type === uploadFilterTab)
                      .filter(u => !uploadSearchQuery || u.title.toLowerCase().includes(uploadSearchQuery.toLowerCase()))
                      .map((upload) => (
                      <div key={upload.id} className="grid grid-cols-1 lg:grid-cols-[80px_1fr_120px_200px_140px] items-center gap-4 px-6 py-4 bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] transition-all group lg:first:rounded-none">
                         <div className="relative w-12 h-16 bg-black rounded-lg overflow-hidden border border-white/10">
                            <img src={upload.imageLink} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" referrerPolicy="no-referrer" />
                         </div>
                         <div className="min-w-0">
                            <h4 className="font-black italic uppercase text-lg group-hover:text-accent transition-colors truncate">{upload.title}</h4>
                            <span className="text-[10px] font-mono text-neutral-700 uppercase">{upload.id}</span>
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-3 py-1 rounded-full bg-white/5 border border-white/5 w-fit">{upload.type}</span>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 truncate">{upload.uploadedBy || 'System_Root'}</span>
                            <span className="text-[8px] font-mono text-neutral-700">{upload.createdAt?.toDate().toLocaleDateString()}</span>
                         </div>
                         <div className="flex justify-end gap-2">
                            <button onClick={() => {
                                navigator.clipboard.writeText(upload.driveLink);
                                setSuccess(t('Link Copied Successfully'));
                                setTimeout(() => setSuccess(null), 2000);
                            }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-600 hover:text-white transition-all" title={t('Copy Link')}><Database size={14} /></button>
                            <button onClick={() => handleEditClick(upload)} className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-neutral-600 hover:text-blue-500 transition-all" title={t('Edit')}><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteUpload(upload.id)} className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all" title={t('Delete')}><Trash2 size={14} /></button>
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
                                    <button onClick={() => handleEditAnnouncement(ann)} className="p-1.5 rounded-md bg-white/5 hover:bg-accent hover:text-black transition-colors"><Edit2 size={10} /></button>
                                    <button onClick={() => toggleAnnouncementStatus(ann.id, ann.active)} className="p-1.5 rounded-md bg-white/5 hover:bg-accent hover:text-black transition-colors"><ShieldCheck size={10} /></button>
                                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={10} /></button>
                                  </div>
                                </div>
                                <h4 className="text-sm font-black uppercase italic truncate pr-8">{ann.title}</h4>
                                <p className="text-[10px] text-neutral-500 line-clamp-1 mt-1">{ann.content}</p>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {!isLoading && activeTab === 'changelog' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <div className="flex flex-col md:flex-row gap-8">
                     <form onSubmit={handleAddChangelog} className="flex-1 bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xl font-black italic uppercase tracking-tighter">{editingLogId ? t('Edit Log Entry') : t('New Version Log')}</h3>
                          {editingLogId && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setEditingLogId(null);
                                setNewVersion('');
                                setNewChanges('');
                              }}
                              className="text-neutral-500 hover:text-white"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Version ID')}</label>
                              <input
                                type="text"
                                placeholder="v2.5.0"
                                value={newVersion}
                                onChange={(e) => setNewVersion(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-black uppercase tracking-widest focus:border-accent outline-none"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Release Date')}</label>
                              <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-black uppercase tracking-widest focus:border-accent outline-none"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-2">{t('Changes (One Per Line)')}</label>
                           <textarea
                             placeholder={t('Added new feature X\nFixed bug Y...')}
                             value={newChanges}
                             onChange={(e) => setNewChanges(e.target.value)}
                             rows={6}
                             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs font-bold leading-relaxed focus:border-accent outline-none resize-none"
                           />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-accent text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-accent/90 transition-all flex items-center justify-center gap-2">
                           {editingLogId ? <Edit2 size={16} /> : <Plus size={16} />}
                           {isSubmitting ? t('Saving...') : editingLogId ? t('Commit Changes') : t('Publish Version')}
                        </button>
                     </form>
 
                     <div className="w-full md:w-96 space-y-4">
                        <div className="flex items-center justify-between mb-6">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-600">{t('Historical Manifest')}</h3>
                           {changelogs.length > 0 && (
                             <button 
                               onClick={handleClearChangelogs}
                               disabled={isSubmitting}
                               className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                             >
                               {t('Clear All')}
                             </button>
                           )}
                        </div>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                           {changelogs.map(log => (
                              <div key={log.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl group relative">
                                 <div className="flex items-center justify-between mb-3">
                                   <span className="text-accent font-black italic text-xs">v{log.version}</span>
                                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                     <button onClick={() => handleEditChangelog(log)} className="p-1.5 rounded-md bg-white/5 hover:bg-accent hover:text-black transition-colors"><Edit2 size={10} /></button>
                                     <button onClick={() => handleDeleteChangelog(log.id)} className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={10} /></button>
                                   </div>
                                 </div>
                                 <p className="text-[9px] font-mono text-neutral-600 mb-2">{log.date}</p>
                                 <ul className="space-y-1">
                                    {log.changes.slice(0, 3).map((change, i) => (
                                      <li key={i} className="text-[10px] text-neutral-400 truncate tracking-tight">• {change}</li>
                                    ))}
                                    {log.changes.length > 3 && <li className="text-[9px] text-neutral-700 italic">+{log.changes.length - 3} more</li>}
                                 </ul>
                              </div>
                           ))}
                           {changelogs.length === 0 && (
                             <div className="py-20 text-center text-neutral-700 text-[10px] font-black uppercase tracking-[0.5em]">{t('No Entries')}</div>
                           )}
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
        const fullUrl = `${window.location.origin}${url}`;
        console.log(`[Debug] Admin fetching analytics from: ${fullUrl}`);
        
        setError(null);
        fetch(url)
            .then(async res => {
                if (!res.ok) {
                    const text = await res.text();
                    console.error(`[Analytics] API Error ${res.status}: ${text}`);
                    throw new Error(`Failed to fetch analytics: ${res.status} ${res.statusText}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('[Analytics] Data received:', data);
                // Map GA4/Local data to a format Recharts can use
                const rows = data.rows || [];
                if (rows.length === 0) {
                     console.warn('[Analytics] No data rows returned');
                }
                const formattedData = rows.map((row: any) => ({
                    date: row.dimensionValues?.[0]?.value?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || 'Unknown',
                    activeUsers: parseInt(row.metricValues?.[0]?.value || '0', 10)
                })).sort((a: any, b: any) => a.date.localeCompare(b.date));
                
                setData(formattedData);
                setLoading(false);
            })
            .catch(err => {
                console.error('[Analytics] Fetch Error:', err);
                setError(`Analytics Error: ${err.message || 'Unknown error'}`);
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
