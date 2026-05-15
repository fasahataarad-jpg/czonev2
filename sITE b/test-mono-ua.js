import axios from 'axios';

async function testMonoUA() {
  const id = 491206012;
  try {
    const res = await axios.get(`https://api.monochrome.tf/track/?id=${id}&quality=HIGH`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Referer': 'https://monochrome.tf/',
        'Origin': 'https://monochrome.tf'
      }
    });
    console.log('Track Status:', res.status);
    console.log('Data:', JSON.stringify(res.data).substring(0, 500));
  } catch (err) {
    console.error('Track failed:', err.response?.status, err.message);
  }
}
testMonoUA();
