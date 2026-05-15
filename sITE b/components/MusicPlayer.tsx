import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipForward, SkipBack, Search, Music, 
  Volume2, VolumeX, Repeat, Shuffle, List, Heart, 
  Loader2, Disc, PlayCircle, MoreHorizontal, ChevronRight,
  Activity
} from 'lucide-react';
import { monochromeService, MonochromeTrack, StreamInfo } from '../services/monochrome';
import { useLanguage } from '../context/LanguageContext';

const MusicPlayer: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MonochromeTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MonochromeTrack | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trending, setTrending] = useState<MonochromeTrack[]>([]);
  
  const [activeTab, setActiveTab] = useState<'search' | 'discover'>('search');
  const [activeFilter, setActiveFilter] = useState('all');
  const [queue, setQueue] = useState<MonochromeTrack[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    const results = await monochromeService.getTrending();
    setTrending(results);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = await monochromeService.search(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const playTrack = async (track: MonochromeTrack) => {
    setIsLoading(true);
    setCurrentTrack(track);
    lastTrackIdRef.current = track.id;
    const currentId = track.id;

    try {
      const streamUrl = `/api/music/stream?id=${track.id}&t=${Date.now()}`;
      console.log('Fetching stream status:', streamUrl);
      
      // Pre-check stream to handle backend errors (502/503) instead of audio element format errors
      const response = await fetch(streamUrl, { method: 'HEAD' });
      
      // If a new track was selected during the HEAD request, stop here
      if (lastTrackIdRef.current !== currentId) return;

      if (!response.ok) {
        let errorMsg = t('Server failed to provide a valid stream');
        try {
          // Note: HEAD requests don't have bodies, so if response is not ok, we can't read JSON from it normally
          // but our backend fix is such that if resolution fails, GET will return 503 JSON.
          // Since we use fetch(url, {method: 'HEAD'}), we might need to do a quick GET to see the error if it's not ok?
          // Actually, if !response.ok and it was a HEAD, we could try a small range GET to read the error.
          const errorResponse = await fetch(streamUrl, { headers: { 'Range': 'bytes=0-0' } });
          const errorData = await errorResponse.json().catch(() => ({}));
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.warn('Failed to parse error body:', e);
        }
        alert(`${t('Streaming Error')}: ${errorMsg}`);
        setIsLoading(false);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Check again if we're still on the same track
            if (lastTrackIdRef.current === currentId) {
              setIsPlaying(true);
              setIsLoading(false);
            }
          }).catch(error => {
            console.error('Playback failed:', error);
            if (lastTrackIdRef.current === currentId) {
              setIsLoading(false);
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to get stream:', error);
      if (lastTrackIdRef.current === currentId) {
        setIsLoading(false);
      }
    }
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const errorCode = audioRef.current?.error?.code;
    const errorMessage = audioRef.current?.error?.message;
    console.error(`Audio Error - Code: ${errorCode}, Message: ${errorMessage}`);
    
    setIsLoading(false);
    setIsPlaying(false);
    
    let msg = t('Failed to load audio source.');
    if (errorCode === 1) msg = t('Loading aborted.');
    if (errorCode === 2) msg = t('Network error.');
    if (errorCode === 3) msg = t('Audio decoding failed.');
    if (errorCode === 4) msg = t('The audio format is not supported or the source is unreachable.');
    
    // Non-blocking error notification
    console.warn(`Streaming Error: ${msg}`);
    setIsLoading(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.warn('Paused before playback started:', err.message);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val > 0) setIsMuted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto h-[600px] bg-black/40 backdrop-blur-3xl rounded-[32px] border border-white/5 flex gap-8 p-8 overflow-hidden shadow-2xl relative">
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={handleAudioError}
      />

      {/* Left Panel: Discovery & Search */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-2">
          {['search', 'discover'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white/10 text-white shadow-lg' 
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          {[
            { id: 'all', icon: Music, label: 'All' },
            { id: 'monochrome', icon: Activity, label: 'Monochrome' },
            { id: 'soundcloud', icon: Disc, label: 'SoundCloud' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                activeFilter === filter.id
                  ? 'bg-accent/10 border-accent/40 text-white'
                  : 'bg-white/5 border-white/10 text-text-muted hover:text-white hover:border-white/20'
              }`}
            >
              <filter.icon size={14} className={activeFilter === filter.id ? 'text-accent' : ''} />
              {t(filter.label)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <input 
            type="text"
            placeholder={t('Search for songs...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-[20px] py-4 px-6 outline-none focus:border-accent/30 focus:bg-white/10 transition-all text-xs font-bold text-white placeholder:text-text-muted/40"
          />
        </form>

        {/* Results / List Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <AnimatePresence mode="wait">
            {activeTab === 'discover' ? (
              <motion.div 
                key="discover" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                   <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">{t('Weekly Highlights')}</h3>
                </div>
                {trending.map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group border border-transparent hover:border-white/5"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
                      <img src={track.album.cover} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black italic uppercase tracking-tight text-white group-hover:text-accent transition-colors truncate">{track.title}</h4>
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">{track.artist.name}</p>
                    </div>
                    <div className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(track.duration)}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : searchResults.length > 0 ? (
              <motion.div 
                key="results" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {searchResults.map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group border border-transparent hover:border-white/5"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
                      <img src={track.album.cover} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black italic uppercase tracking-tight text-white group-hover:text-accent transition-colors truncate">{track.title}</h4>
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">{track.artist.name}</p>
                    </div>
                    <div className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(track.duration)}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted/30 text-center px-10">
                <Music size={64} className="mb-6 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] font-italic">
                  {t('Search for music to get started')}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
              {t('Queue')}: {queue.length} {t('tracks')}
           </div>
           <button className="px-4 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 hover:border-white/10">
              {t('Clear Queue')}
           </button>
        </div>
      </div>

      {/* Right Panel: Player Card */}
      <div className="w-[420px] shrink-0">
        <div className="h-full bg-white/[0.03] border border-white/10 rounded-[40px] p-10 flex flex-col items-center justify-center shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-[40px]" />
          
          <div className="w-full aspect-square mb-10 relative">
            <motion.div 
              key={currentTrack?.id || 'none'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full h-full rounded-[48px] overflow-hidden shadow-2xl border border-white/10 relative group"
            >
              {currentTrack ? (
                <img 
                  src={currentTrack.album.cover} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt="" 
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Music size={80} className="text-text-muted/20" />
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm rounded-[48px]">
                   <Loader2 className="text-accent animate-spin" size={40} />
                </div>
              )}
            </motion.div>
          </div>

          <div className="text-center mb-10 w-full">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white truncate mb-2">
              {currentTrack ? currentTrack.title : t('No track playing')}
            </h3>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-text-muted truncate italic">
              {currentTrack ? currentTrack.artist.name : t('Search for music')}
            </p>
          </div>

          {/* Progress Section */}
          <div className="w-full space-y-4 mb-10">
             <div className="relative h-1.5 bg-white/5 rounded-full group cursor-pointer">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  style={{ width: `${(progress / duration) * 100 || 0}%` }}
                />
                <input 
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={progress}
                  onChange={handleProgressChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                />
             </div>
             <div className="flex justify-between text-[10px] font-bold text-text-muted tracking-widest opacity-50">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
             </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-10 mb-10">
            <button className="p-3 text-white hover:text-accent transition-all transform active:scale-90 bg-white/5 rounded-full border border-white/5">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl transition-all"
            >
              {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="translate-x-1" />}
            </motion.button>
            <button className="p-3 text-white hover:text-accent transition-all transform active:scale-90 bg-white/5 rounded-full border border-white/5">
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-4 w-full max-w-[240px]">
            <button onClick={() => setIsMuted(!isMuted)} className="text-text-muted hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="flex-1 h-1 bg-white/5 rounded-full relative group">
              <div 
                className="absolute inset-y-0 left-0 bg-white/80 group-hover:bg-white rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
              <input 
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
              />
            </div>
            <Volume2 size={16} className="text-text-muted" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
