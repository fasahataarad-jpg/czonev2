import axios from 'axios';

async function brute() {
  const routes = ['/stream', '/download', '/play', '/audio', '/yt', '/youtube'];
  for (const r of routes) {
    try {
      const res = await axios.get(`https://api.monochrome.tf${r}?id=dQw4w9WgXcQ`, { validateStatus: () => true });
      console.log(`api.monochrome.tf${r}`, res.status);
    } catch (e) {
      console.log(`api.monochrome.tf${r}`, 'FAILED');
    }
  }
}
brute();
