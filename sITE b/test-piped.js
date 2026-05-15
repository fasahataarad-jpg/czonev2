import axios from 'axios';
async function run() {
  try {
    const res = await axios.get('http://localhost:3000/api/music/stream?id=dQw4w9WgXcQ', {
      responseType: 'text'
    });
    console.log('Success:', res.status, res.data);
  } catch(e) {
    console.error('Error:', e.response?.data, e.message);
  }
}
run();
