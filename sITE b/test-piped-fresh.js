import axios from 'axios';

async function testPiped() {
  const instances = [
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.lunar.icu',
    'https://pipedapi.rivo.cc',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.smnz.de'
  ];
  for (const url of instances) {
    try {
      const res = await axios.get(`${url}/streams/dQw4w9WgXcQ`, { timeout: 3000 });
      console.log(url, res.status);
    } catch (e) {
      console.log(url, 'FAILED', e.message);
    }
  }
}
testPiped();
