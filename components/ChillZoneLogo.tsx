import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChillZoneLogo: React.FC<{ size?: number; className?: string }> = ({ size = 200, className = "" }) => {
  const [phase, setPhase] = useState<'moon' | 'text'>('moon');

  useEffect(() => {
    const sequence = setInterval(() => {
      setPhase(current => current === 'moon' ? 'text' : 'moon');
    }, 4000); // Toggle every 4 seconds

    return () => clearInterval(sequence);
  }, []);

  return (
    <div 
      className={`relative flex items-center justify-center select-none cursor-pointer ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-accent rounded-full blur-[45px] opacity-40"
      />

      {/* Rotating Scaffolding / Loader Ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="absolute inset-0"
      >
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.5"
          strokeDasharray="15 25"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          style={{ opacity: 0.2 }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="2 12"
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ opacity: 0.4 }}
        />
      </svg>

      <AnimatePresence mode="wait">
        {phase === 'moon' ? (
          <motion.div
            key="moon-phase"
            initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.2, rotate: 20 }}
            transition={{ duration: 0.8, ease: "anticipate" }}
            className="relative"
          >
            {/* The Moon Icon from logo.svg */}
            <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 100 100">
              <motion.path 
                d="M58 28 C44 28 34 38 34 52 C34 66 44 76 58 76 C48 72 42 63 42 52 C42 41 48 32 58 28Z" 
                fill="currentColor"
                className="text-accent"
                animate={{
                  filter: [
                    "drop-shadow(0 0 5px var(--accent))",
                    "drop-shadow(0 0 15px var(--accent))",
                    "drop-shadow(0 0 5px var(--accent))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Stars / Atmosphere */}
              <motion.circle cx="65" cy="35" r="1.5" fill="white" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <motion.circle cx="70" cy="48" r="1" fill="white" animate={{ opacity: [0.1, 0.6, 0.1] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.circle cx="63" cy="62" r="1.2" fill="white" animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }} />
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="text-phase"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.9 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 1.1 }}
            transition={{ duration: 0.8, ease: "anticipate" }}
            className="relative flex flex-col items-center"
          >
            <div className="relative">
              <motion.h1
                className="font-black italic uppercase tracking-tighter text-white"
                style={{ 
                  textShadow: "0 0 20px var(--accent)",
                  fontSize: size * 0.22,
                  lineHeight: 1
                }}
              >
                ChillZone
              </motion.h1>
              
              {/* Glitch Overlay */}
              <motion.h1
                animate={{
                  x: [-2, 2, -1, 0],
                  opacity: [0, 0.6, 0.3, 0],
                }}
                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 1.2 }}
                className="absolute inset-0 font-black italic uppercase tracking-tighter text-cyan-500 mix-blend-screen overflow-hidden whitespace-nowrap"
                style={{ fontSize: size * 0.22, lineHeight: 1 }}
              >
                ChillZone
              </motion.h1>
              <motion.h1
                animate={{
                  x: [2, -2, 1, 0],
                  opacity: [0, 0.6, 0.3, 0],
                }}
                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 1.4 }}
                className="absolute inset-0 font-black italic uppercase tracking-tighter text-red-500 mix-blend-screen overflow-hidden whitespace-nowrap"
                style={{ fontSize: size * 0.22, lineHeight: 1 }}
              >
                ChillZone
              </motion.h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atmospheric scanline line */}
      <motion.div 
        animate={{ top: ['0%', '100%'], opacity: [0, 0.4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-4 h-[1px] bg-accent/30 blur-[1px] pointer-events-none"
      />
    </div>
  );
};

export default ChillZoneLogo;
