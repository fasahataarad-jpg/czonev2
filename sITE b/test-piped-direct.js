import axios from 'axios';
async function test() {
  const instances = [
    'https://pipedapi.drgns.space',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.smnz.de',
    'https://pipedapi.rivo.cc',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.kavin.rocks'
  ];
  for (const url of instances) {
    try {
      const res = await axios.get(`${url}/streams/dQw4w9WgXcQ`, { timeout: 4000 });
      console.log(url, res.status);
    } catch (e) {
      console.log(url, 'FAILED', e.message);
    }
  }
}
test();
