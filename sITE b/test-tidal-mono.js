import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://api.monochrome.tf/track/?id=288812739');
    console.log('Status code track:', res.status);
    console.log('Data sample:', JSON.stringify(res.data).substring(0, 150));
  } catch (err) {
    console.error('Error fetching track:', err.response?.status, err.message);
  }
}
test();
