import axios from 'axios';

async function testMono() {
  const query = 'Rick Astley Never Gonna Give You Up';
  console.log(`Searching for: ${query}`);
  try {
    const searchRes = await axios.get('https://api.monochrome.tf/search/', {
      params: { s: query, limit: 1 }
    });
    
    if (!searchRes.data.data.items.length) {
      console.log('No results found');
      return;
    }
    
    const track = searchRes.data.data.items[0];
    const id = track.id;
    console.log(`Found track: ${track.title} (${track.artist.name}) ID: ${id}`);
    
    const qualities = ['LOW', 'HIGH', 'LOSSLESS', 'HI_RES', 'HI_RES_LOSSLESS'];
    for (const q of qualities) {
      try {
        const trackRes = await axios.get(`https://api.monochrome.tf/track/?id=${id}&quality=${q}`);
        console.log(`Quality ${q} SUCCESS:`, JSON.stringify(trackRes.data).substring(0, 200));
        break; // Found a working one
      } catch (e) {
        console.log(`Quality ${q} FAILED: ${e.response?.status || e.message}`);
      }
    }
    
    // Try manifests
    try {
      const manifestRes = await axios.get(`https://api.monochrome.tf/trackManifests/?id=${id}`);
      console.log('Manifest SUCCESS:', JSON.stringify(manifestRes.data).substring(0, 500));
    } catch (e) {
      console.log('Manifest FAILED:', e.response?.status || e.message);
    }

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

testMono();
