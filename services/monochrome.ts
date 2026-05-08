import axios from 'axios';

const BASE_URL = '/api/music';

export interface MonochromeTrack {
  id: string;
  title: string;
  artist: {
    name: string;
    id?: string;
  };
  album: {
    title?: string;
    id?: string;
    cover: string;
  };
  duration: number;
}

export interface StreamInfo {
  url: string;
  quality?: string;
  format?: string;
}

export const monochromeService = {
  search: async (query: string, limit: number = 20): Promise<MonochromeTrack[]> => {
    try {
      const response = await axios.get(`${BASE_URL}/search`, {
        params: { s: query, limit }
      });
      
      const items = Array.isArray(response.data) ? response.data : [];
      
      return items.map((item: any) => ({
        id: item.id,
        title: item.title,
        artist: {
          name: item.artist,
          id: item.id
        },
        album: {
          cover: item.thumb || item.imageUrl || ''
        },
        duration: item.duration || 0
      }));
    } catch (error) {
      console.error('Monochrome search error:', error);
      return [];
    }
  },

  getTrackStream: async (id: string, quality: string = 'HIGH'): Promise<StreamInfo | null> => {
    try {
      // The stream endpoint redirects to the direct file URL
      // We can just return the endpoint URL as the stream URL
      return {
        url: `${BASE_URL}/stream?id=${id}&quality=${quality}`,
        quality
      };
    } catch (error) {
      console.error('Monochrome stream error:', error);
      return null;
    }
  },

  getTrending: async (): Promise<MonochromeTrack[]> => {
    try {
      const response = await axios.get(`${BASE_URL}/search`, {
        params: { s: 'new hits', limit: 10 }
      });
      
      const items = Array.isArray(response.data) ? response.data : [];
      
      return items.map((item: any) => ({
        id: item.id,
        title: item.title,
        artist: {
          name: item.artist,
          id: item.id
        },
        album: {
          cover: item.thumb || item.imageUrl || ''
        },
        duration: item.duration || 0
      }));
    } catch (error) {
       return [];
    }
  }
};
