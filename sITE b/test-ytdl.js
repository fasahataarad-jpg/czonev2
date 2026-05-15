import axios from 'axios';
async function test() {
  const urls = [
    'https://api.monochrome.tf/api/youtube/stream?id=dQw4w9WgXcQ',
    'https://api.monochrome.tf/api/v1/youtube/stream?id=dQw4w9WgXcQ',
    'https://api.monochrome.tf/youtube/stream?id=dQw4w9WgXcQ',
    'https://api.monochrome.tf/yt/stream?id=dQw4w9WgXcQ'
  ];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { maxRedirects: 0, validateStatus: () => true });
      console.log(url, res.status);
    } catch (e) {
      console.log(url, 'FAILED');
    }
  }
}
test();
