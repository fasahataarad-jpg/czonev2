import https from 'https';

https.get('https://api.monochrome.tf/api/music/stream?id=dQw4w9WgXcQ', (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
});
