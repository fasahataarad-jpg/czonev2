import axios from 'axios';

async function testMonoCobalt() {
  try {
    const res = await axios.post('https://api.monochrome.tf/', {
      url: 'http://www.tidal.com/track/491206012'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('Cobalt Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.error('Cobalt failed:', err.response?.status, err.response?.data, err.message);
  }
}
testMonoCobalt();
