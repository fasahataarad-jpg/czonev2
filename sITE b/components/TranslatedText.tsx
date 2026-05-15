
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface TranslatedTextProps {
  text: string;
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({ text }) => {
  const { translateDynamic, language } = useLanguage();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;
    const translate = async () => {
      // If language is English, just use the original text
      if (language === 'en-US') {
        if (isMounted) setTranslated(text);
        return;
      }
      
      // Fast check for cache in localStorage before calling translateDynamic
      const cacheKey = `${language}:${text}`;
      const savedCache = JSON.parse(localStorage.getItem('chillzone_translation_cache') || '{}');
      if (savedCache[cacheKey]) {
        if (isMounted) setTranslated(savedCache[cacheKey]);
        return;
      }

      // If not in cache, call the dynamic translation service
      const result = await translateDynamic(text);
      if (isMounted) setTranslated(result);
    };
    
    translate();
    
    return () => {
      isMounted = false;
    };
  }, [text, language, translateDynamic]);

  return <>{translated}</>;
};
