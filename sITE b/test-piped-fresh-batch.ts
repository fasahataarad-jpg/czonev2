import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testPipedBatch() {
  const videoId = 'dQw4w9WgXcQ'; // RickRoll
  const instances = [
    'https://pipedapi.tokhmi.xyz',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.colby.cloud',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.rivo.cc',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.smnz.de',
    'https://pipedapi.darkness.services',
    'https://pipedapi.moomoo.me',
    'https://pipedapi.pablo.casa',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.us.to',
    'https://pipedapi.recloud.icu'
  ];

  console.log('--- Testing Piped Instances ---');
  for (const url of instances) {
    try {
      const start = Date.now();
      const res = await axios.get(`${url}/streams/${videoId}`, { 
        timeout: 5000,
        httpsAgent: httpsAgent
      });
      const end = Date.now();
      if (res.data && res.data.audioStreams && res.data.audioStreams.length > 0) {
        console.log(`[OK] ${url} - ${end - start}ms - Streams: ${res.data.audioStreams.length}`);
      } else {
        console.log(`[EMPTY] ${url} - ${end - start}ms - No audio streams`);
      }
    } catch (e: any) {
      console.log(`[FAIL] ${url} - ${e.response?.status || e.code || e.message}`);
    }
  }
}

testPipedBatch();
