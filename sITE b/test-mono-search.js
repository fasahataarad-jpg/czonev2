import axios from 'axios';

async function testSearch() {
  try {
    const res = await axios.get('https://api.monochrome.tf/search/', {
      params: { s: 'Rick Astley Never Gonna Give You Up', limit: 5 }
    });
    console.log('Search Status:', res.status);
    console.log('Results:', JSON.stringify(res.data).substring(0, 500));
  } catch (err) {
    console.error('Search failed:', err.response?.status, err.message);
  }
}
testSearch();
