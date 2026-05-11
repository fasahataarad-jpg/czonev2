import { GoogleGenAI } from "@google/genai";

/**
 * Uses Gemini with Google Search to fetch "Wiki" information about a movie/item.
 */
export const getWikiIntelligence = async (title: string) => {
  if (!title || title.length < 2) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for real-world information about "${title}". 
      Provide a concise 3-sentence summary including release year, main cast, and reception.
      Use a concise, informative tone.`,
      config: {
        systemInstruction: "You are the Library Assistant. You provide verified facts about movies and media.",
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      }
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text: text?.trim() || "Information unavailable at this time.",
      sources: sources.map((chunk: any) => chunk.web?.uri).filter(Boolean) as string[]
    };
  } catch (error) {
    console.error("Gemini Wiki Error:", error);
    return null;
  }
};

/**
 * Uses Gemini to generate a cinematic description for a search query.
 */
export const getQueryAestheticDescription = async (query: string) => {
  if (!query || query.length < 3) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, 1-sentence cinematic theme for this search: "${query}". 
      Example: "Discovering great stories from across the globe."
      Make it engaging and informative.`,
      config: {
        systemInstruction: "You are a helpful assistant. Your voice is helpful and clear.",
        temperature: 0.7,
        maxOutputTokens: 50,
      }
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

/**
 * Uses Gemini to translate text into a target language.
 */
export const translateText = async (text: string, targetLanguage: string) => {
  if (!text || !targetLanguage || targetLanguage === 'en-US') return text;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text into ${targetLanguage}. Only return the translated text, nothing else.
      Text: "${text}"`,
      config: {
        systemInstruction: "You are a professional translator. You translate text accurately while maintaining the original tone and context.",
        temperature: 0.1,
      }
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return text;
  }
};

/**
 * Streams a chat conversation with Gemini.
 */
export async function* streamChat(messages: { role: string; content: string }[], systemInstruction: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
    
    // Map roles: user -> user, assistant -> model
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.8,
        tools: [{ googleSearch: {} }],
        // required when combining tools or for grounding
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    yield "I'm sorry, I encountered an error. Please try again later.";
  }
}
