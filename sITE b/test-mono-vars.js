import axios from 'axios';

async function testMonoVars() {
  const id = 491206012;
  const bases = [
    'https://api.monochrome.tf',
    'https://api.monochrome.tf/api',
    'https://api.monochrome.tf/v1',
    'https://api.monochrome.tf/v2'
  ];
  for (const base of bases) {
    try {
      const res = await axios.get(`${base}/track/?id=${id}`, { validateStatus: () => true });
      console.log(`${base}/track/`, res.status);
    } catch (e) {
      console.log(`${base}/track/`, 'FAILED');
    }
  }
}
testMonoVars();
