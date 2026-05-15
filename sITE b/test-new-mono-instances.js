import axios from 'axios';

async function testInstances() {
  const instances = [
    'https://monochrome-api.samidy.com',
    'https://api.monochrome.tf',
    'https://hifi.geeked.wtf',
    'https://wolf.qqdl.site',
    'https://maus.qqdl.site',
    'https://vogel.qqdl.site'
  ];
  const query = 'Rick Astley';
  for (const url of instances) {
    try {
      const res = await axios.get(`${url}/search/`, { 
        params: { s: query, limit: 1 },
        timeout: 4000
      });
      console.log(url, 'SEARCH SUCCESS', res.data?.data?.items?.length || 0);
    } catch (e) {
      console.log(url, 'SEARCH FAILED', e.response?.status || e.message);
    }
  }
}
testInstances();
