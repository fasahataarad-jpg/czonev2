import axios from 'axios';
async function run() {
  const r = await axios.get('https://raw.githubusercontent.com/uimaxbai/hifi-api/main/main.py');
  const code = r.data;
  console.log('Endpoints found:');
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('@app.get')) {
      console.log(l.trim(), '->', lines[i+1].trim());
    }
  });
}
run();
