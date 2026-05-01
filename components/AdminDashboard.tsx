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
  const [activeTab, setActiveTab] = useState<'announcements' | 'suggestions' | 'admins' | 'analytics' | 'upload' | 'manage_uploads' | 'system'>('announcements');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
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

    // Firestore - System Status
    const unsubSystem = onSnapshot(doc(db, 'system', 'status'), (snapshot) => {
      if (snapshot.exists()) {
        setIsUpdating(snapshot.data().updating === true);
      }
    });
    unsubsRef.current.system = unsubSystem;

    // Cleanup
    return () => {
      unsubsRef.current.announcements?.();
      unsubsRef.current.suggestions?.();
      unsubsRef.current.admins?.();
      unsubsRef.current.system?.();
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
        case 'system': return true; // System status is usually very fast
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

      // Role management and admin management functions disabled as they rely on Firestore.

  const toggleMaintenanceMode = async () => {
    const nextStatus = !isUpdating;
    try {
      await setDoc(doc(db, 'system', 'status'), {
        updating: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      }, { merge: true });
      
      setIsUpdating(nextStatus);
      setSuccess(t('Maintenance mode {status}!').replace('{status}', nextStatus ? t('activated') : t('deactivated')));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(t('Failed to toggle maintenance mode.'));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/20 border border-accent/30">
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">{t('Admin Dashboard')}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{t('Authorized Personnel Only')}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all border border-white/5"
        >
          <X size={20} />
        </button>
      </div>
      
      {false && (
         <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 m-6 rounded-xl flex items-center gap-3">
           <AlertCircle size={20} />
           <span>{t('Firestore quota exceeded. Real-time data updates and some administrative actions are currently unavailable.')}</span>
         </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5 px-6 overflow-x-auto custom-scrollbar">
        {[
          { id: 'announcements', icon: Megaphone, label: t('Announcements') },
          { id: 'suggestions', icon: Send, label: t('Suggestions') },
          { id: 'analytics', icon: Activity, label: t('Analytics') },
          { id: 'upload', icon: Upload, label: t('Upload') },
          { id: 'manage_uploads', icon: Database, label: t('Manage Uploads') },
          { id: 'system', icon: SettingsIcon, label: t('System') },
          ...(isSuperAdmin || isAdmin ? [
            { id: 'admins', icon: ShieldCheck, label: t('Manage Admins') }
          ] : [])
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-accent' : 'text-neutral-500 hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading && activeTab !== 'analytics' && activeTab !== 'upload' && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        )}

        {!isLoading && activeTab === 'upload' && (
          <div className="p-6 space-y-6">
            <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('Add New Content')}</h3>
            {uploadSuccess && <p className="text-green-500">{t(uploadSuccess)}</p>}
            <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white">
              <option value="movie">{t('Movie')}</option>
              <option value="anime">{t('Anime')}</option>
              <option value="manga">{t('Manga')}</option>
              <option value="tv">{t('TV Show')}</option>
            </select>
            <input type="text" placeholder={t('Title')} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white" />
            <input type="text" placeholder={t('Content Link (Google Drive, MP4, etc)')} value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white" />
            <input type="text" placeholder={t('Thumbnail Image Link')} value={imageLink} onChange={(e) => setImageLink(e.target.value)} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white" />
            <button onClick={handleUpload} disabled={isSubmitting} className="w-full bg-accent text-black font-black uppercase py-3 rounded-xl hover:bg-accent/90 transition-all">
                {isSubmitting ? t('Submitting...') : t('Add Content')}
            </button>
          </div>
        )}
        {!isLoading && activeTab === 'manage_uploads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('Manage Added Content')}</h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">{t('Total Items')}: {uploads.length}</p>
              </div>
            </div>
            
            {uploads.length === 0 ? (
              <div className="bg-white/5 border border-white/5 border-dashed rounded-[32px] py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-neutral-600">
                  <Database size={32} />
                </div>
                <p className="text-neutral-500 font-bold">{t('No content has been added yet.')}</p>
                <button onClick={() => setActiveTab('upload')} className="text-accent text-xs font-black uppercase tracking-widest mt-4 hover:underline">{t('Add something now')}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {uploads.map((upload) => {
                  return (
                    <motion.div 
                      layout
                      key={upload.id} 
                      className="group relative bg-[#0c0c0c] border border-white/5 rounded-[2rem] p-4 flex items-start gap-5 hover:border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5 overflow-hidden"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-28 bg-neutral-900 rounded-2xl overflow-hidden shrink-0 relative shadow-lg shadow-black/40">
                        <img 
                          src={upload.imageLink} 
                          alt={upload.title} 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/200/300'; }} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                            {upload.type}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                            ID: {upload.id.substring(0, 8)}...
                          </span>
                        </div>
                        
                        <h4 className="text-lg font-black uppercase italic tracking-tighter text-white truncate group-hover:text-accent transition-colors">
                          {upload.title}
                        </h4>

                        <div className="mt-3 space-y-2">
                          {/* Links - Truncated and styled */}
                          <div className="flex items-center gap-2 text-[11px]">
                            <div className="bg-white/5 rounded-lg px-2 py-1 flex items-center gap-2 max-w-[200px] truncate border border-white/5">
                              <Globe size={10} className="text-neutral-500" />
                              <span className="text-neutral-400 truncate font-mono">{upload.driveLink || upload.imageLink}</span>
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(upload.driveLink || upload.imageLink);
                                alert('Link copied to clipboard!');
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-white transition-all"
                              title="Copy Link"
                            >
                              <Database size={12} />
                            </button>
                          </div>

                          {/* Uploader Info */}
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                            <Users size={12} className="text-neutral-700" />
                            <span>{t('Added By')}: <span className="text-neutral-400">{upload.uploadedBy || t('System')}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Action */}
                      <button 
                        onClick={() => handleDeleteUpload(upload.id)}
                        className="self-center p-3 rounded-2xl bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20"
                        title="Delete Content"
                      >
                        <Trash2 size={20} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {!isLoading && activeTab === 'announcements' && (
          <div className="space-y-8">
            {/* New Announcement Form */}
            <form onSubmit={handleAddAnnouncement} className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Plus size={16} className="text-accent" />
                {t('New Announcement')}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t('Announcement Title')}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-all"
                />
                <textarea
                  placeholder={t('Announcement Content...')}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? t('Posting...') : t('Post Announcement')}
              </button>
              
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    <AlertCircle size={14} />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-500 text-xs font-bold bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                    <CheckCircle2 size={14} />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* List */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500">{t('Recent Announcements')}</h3>
              {announcements.length === 0 ? (
                <div className="text-center py-12 text-neutral-600 italic text-sm">{t('No announcements found.')}</div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-start justify-between group hover:border-white/10 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white">{ann.title}</h4>
                        {!ann.active && <span className="text-[8px] font-black uppercase tracking-widest bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">{t('Inactive')}</span>}
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{ann.content}</p>
                      <p className="text-[9px] font-mono text-neutral-600">
                        {ann.createdAt?.toDate().toLocaleString() || t('Just now')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => toggleAnnouncementStatus(ann.id, ann.active)}
                        className={`p-2 rounded-lg transition-all ${ann.active ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                        title={ann.active ? 'Deactivate' : 'Activate'}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500">{t('User Suggestions')}</h3>
              <div className="flex gap-2">
                {(['all', 'pending', 'reviewed'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSuggestionFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      suggestionFilter === filter ? 'bg-accent text-white' : 'bg-white/5 text-neutral-500 hover:text-white'
                    }`}
                  >
                    {t(filter)}
                  </button>
                ))}
              </div>
            </div>
            {suggestions.filter(s => suggestionFilter === 'all' || s.status === suggestionFilter).length === 0 ? (
              <div className="text-center py-12 text-neutral-600 italic text-sm">{t('No suggestions found.')}</div>
            ) : (
              suggestions.filter(s => suggestionFilter === 'all' || s.status === suggestionFilter).map((suggestion) => (
                <div key={suggestion.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-start justify-between group hover:border-white/10 transition-all">
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{suggestion.userEmail}</h4>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        suggestion.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'
                      }`}>
                        {t(suggestion.status)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed break-words">{suggestion.text}</p>
                    <p className="text-[9px] font-mono text-neutral-600">
                      {suggestion.createdAt?.toDate().toLocaleString() || t('Just now')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    {suggestion.status === 'pending' && (
                      <button 
                        onClick={() => handleMarkSuggestionReviewed(suggestion.id)}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                        title="Mark as Reviewed"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteSuggestion(suggestion.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                      title="Delete Suggestion"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {(isSuperAdmin || isAdmin) && activeTab === 'admins' && (
          <div className="space-y-6">
            <form onSubmit={handleAddAdmin} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-accent">{t('Add New Admin')}</h3>
              
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle size={16} />
                  {t(error)}
                </div>
              )}
              
              {success && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-500 text-sm">
                  <CheckCircle2 size={16} />
                  {t(success)}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('Email Address')}</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newAdminEmail.trim()}
                className="w-full py-3 rounded-xl bg-accent text-black font-black uppercase tracking-widest text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={18} />
                    {t('Add Admin')}
                  </>
                )}
              </button>
            </form>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500">{t('Allowed Admins')}</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('Search admins...')}
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 w-64"
                  />
                  <button onClick={handleRemoveAllAdmins} className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                    {t('Remove All Admins')}
                  </button>
                </div>
              </div>
              {allowedAdmins.filter(admin => {
                const search = adminSearchQuery.toLowerCase();
                return !adminSearchQuery || admin.email.toLowerCase().includes(search);
              }).length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm italic">
                  {adminSearchQuery ? `${t('No admins found matching')} "${adminSearchQuery}"` : t('No additional admins added yet.')}
                </div>
              ) : (
                allowedAdmins.filter(admin => {
                  const search = adminSearchQuery.toLowerCase();
                  return !adminSearchQuery || admin.email.toLowerCase().includes(search);
                }).map((admin) => (
                  <div key={admin.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <div>
                      <h4 className="font-bold text-white">{admin.email}</h4>
                      <p className="text-xs text-neutral-500 mt-1">
                        {t('Added')}: {admin.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove Admin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {!isLoading && activeTab === 'system' && (
          <div className="p-6 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">{t('Maintenance Mode')}</h3>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">{t('Toggle \"UPDATING!!!\" Overlay')}</p>
                </div>
                <button
                  onClick={toggleMaintenanceMode}
                  className={`relative w-16 h-8 rounded-full transition-all duration-500 ${
                    isUpdating ? 'bg-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]' : 'bg-neutral-800'
                  }`}
                >
                  <motion.div
                    animate={{ x: isUpdating ? 36 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>
              
              <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl">
                <p className="text-xs text-accent/80 leading-relaxed font-medium italic">
                  {t('Activating this will show a full-screen \"UPDATING!!!\" message to all users in real-time. Use this before pushing updates to GitHub to ensure users know the site is being maintained.')}
                </p>
              </div>

              {isUpdating && (
                <div className="flex items-center gap-3 text-accent animate-pulse">
                  <Activity size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('Maintenance Mode Active')}</span>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-500 text-xs font-bold bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                  <CheckCircle2 size={14} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
};

const AnalyticsTab = () => {
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
        <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
            <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-6">{t('Active Users (Last 30 Days)')}</h3>
            <div className="h-[300px] w-full">
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
