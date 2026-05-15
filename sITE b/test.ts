import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://api.monochrome.tf/', {
      maxRedirects: 0,
      validateStatus: () => true
    });
    console.log('Status:', res.status);
    console.log('Headers:', res.headers);
    console.log('Data (first 100 bytes):', res.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
