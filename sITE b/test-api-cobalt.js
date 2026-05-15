import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('https://api.monochrome.tf/', {
      url: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('API Status Cobalt?:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data, err.message);
  }
}
test();
