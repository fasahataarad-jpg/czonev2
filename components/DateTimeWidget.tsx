import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const DateTimeWidget = () => {
  const [dateTime, setDateTime] = useState(new Date());
  const { language, militaryTime, timeZone } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !militaryTime,
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  if (timeZone !== 'auto') {
    timeOptions.timeZone = timeZone;
    dateOptions.timeZone = timeZone;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: "circOut" }}
      className="flex flex-row items-center gap-6 px-5 py-2.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl group cursor-default"
    >
      <div className="flex flex-col items-end border-r border-white/10 pr-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
          {dateTime.toLocaleDateString(language, dateOptions).toUpperCase()}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="text-sm font-mono font-black tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          {dateTime.toLocaleTimeString(language, timeOptions).toUpperCase()}
        </div>
      </div>
      
      {/* Animated scanline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
         <div className="w-full h-px bg-white/5 absolute top-0 animate-scanline" />
      </div>
    </motion.div>
  );
};

export default DateTimeWidget;
