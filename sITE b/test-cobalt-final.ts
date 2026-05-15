import axios from 'axios';

async function testCobalt() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  try {
    const res = await axios.post('https://api.cobalt.tools/api/json', {
      url: url,
      downloadMode: 'audio',
      audioFormat: 'mp3',
      audioBitrate: '128'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('Cobalt SUCCESS:', res.data);
  } catch (e: any) {
    console.log('Cobalt FAILED:', e.response?.status || e.message);
  }
}

testCobalt();
