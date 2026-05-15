import https from 'https';

https.get('https://api.monochrome.tf', (res) => {
  console.log('Root:', res.statusCode);
});

https.get('https://api.monochrome.tf/stream?id=dQw4w9WgXcQ', (res) => {
  console.log('/stream?id=', res.statusCode);
});

https.get('https://api.monochrome.tf/api/music/stream?id=dQw4w9WgXcQ', (res) => {
  console.log('/api/music/stream', res.statusCode);
});
