import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function debugPiped() {
  const url = 'https://pipedapi.tokhmi.xyz/streams/dQw4w9WgXcQ';
  try {
    const res = await axios.get(url, { 
      httpsAgent,
      headers: {
          'Accept': 'application/json'
      }
    });
    console.log('Type of data:', typeof res.data);
    console.log('Content-Type:', res.headers['content-type']);
    let data = res.data;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
            console.log('Parsed successfully');
        } catch (e) {
            console.log('Parse failed, start of string:', data.substring(0, 100));
        }
    }
    
    if (data.audioStreams) {
        console.log('AudioStreams length:', data.audioStreams.length);
    } else {
        console.log('No audioStreams found. Keys:', Object.keys(data).slice(0, 10));
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

debugPiped();
