import axios from 'axios';

async function testMonoVideoSearch() {
  try {
    const res = await axios.get('https://api.monochrome.tf/search/', {
      params: { v: 'Rick Astley', limit: 1 }
    });
    console.log('Video Search Status:', res.status);
    console.log('Results:', JSON.stringify(res.data).substring(0, 500));
  } catch (err) {
    console.error('Video Search failed:', err.response?.status, err.message);
  }
}
testMonoVideoSearch();
