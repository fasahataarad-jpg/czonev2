import axios from 'axios';

async function testStream() {
  try {
    // Using a known Tidal ID from the search result earlier: 491206012 (Rick Astley)
    const res = await axios.get('https://api.monochrome.tf/track/', {
      params: { id: 491206012 }
    });
    console.log('Stream Info:', JSON.stringify(res.data).substring(0, 1000));
  } catch (err) {
    console.error('Stream failed:', err.response?.status, err.message);
  }
}
testStream();
