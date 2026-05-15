import axios from 'axios';

async function testMonoRoot() {
  const urls = [
    'https://monochrome.tf/search/?s=test',
    'https://monochrome.tf/api/search/?s=test',
    'https://monochrome.tf/api/v1/search/?s=test',
    'https://api.monochrome.tf/search/?s=test'
  ];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { validateStatus: () => true });
      console.log(url, res.status, res.headers['content-type']);
      if (res.headers['content-type']?.includes('json')) {
        console.log('JSON sample:', JSON.stringify(res.data).substring(0, 100));
      }
    } catch (e) {
      console.log(url, 'FAILED');
    }
  }
}
testMonoRoot();
