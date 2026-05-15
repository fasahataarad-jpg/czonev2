import axios from 'axios';

async function verifyBridge() {
  const query = 'Rick Astley';
  console.log(`Testing search for: ${query}`);
  try {
    const searchRes = await axios.get(`http://localhost:3000/api/music/search?s=${encodeURIComponent(query)}`);
    const results = searchRes.data;
    console.log(`Found ${results.length} results.`);
    if (results.length > 0) {
      const first = results[0];
      console.log(`Attempting to stream first result: ${first.title} (ID: ${first.id})`);
      const streamRes = await axios.get(`http://localhost:3000/api/music/stream?id=${first.id}`, {
        maxRedirects: 0,
        validateStatus: () => true
      });
      console.log('Stream Status:', streamRes.status);
      if (streamRes.status === 302) {
        console.log('Redirect Location:', streamRes.headers.location.substring(0, 100) + '...');
      } else {
        console.log('Body:', JSON.stringify(streamRes.data));
      }
    }
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verifyBridge();
