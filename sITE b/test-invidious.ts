import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testInvidious() {
  const videoId = 'dQw4w9WgXcQ';
  const mirrror = 'https://yewtu.be/api/v1/videos/';
  try {
    const res = await axios.get(`${mirrror}${videoId}`, { httpsAgent });
    console.log('Invidious keys:', Object.keys(res.data));
    if (res.data.adaptiveFormats) {
        console.log('Adaptive formats:', res.data.adaptiveFormats.length);
        const audio = res.data.adaptiveFormats.find((f: any) => f.type.startsWith('audio/'));
        if (audio) {
            console.log('Audio URL:', audio.url.substring(0, 50));
        }
    }
  } catch (e: any) {
    console.log('Invidious Error:', e.message);
  }
}

testInvidious();
