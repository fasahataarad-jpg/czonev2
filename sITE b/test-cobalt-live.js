import axios from 'axios';
async function run() {
  try {
    const response = await axios.post('https://api.cobalt.tools/', {
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('Success:', response.status);
    console.log('Data:', response.data);
  } catch (e) {
    console.error('Error:', e.response?.data, e.message);
  }
}
run();
