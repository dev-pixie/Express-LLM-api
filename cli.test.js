const http = require('http');

const prompt = process.argv.slice(2).join(' ');
if (!prompt) {
  console.error('❌ Please pass a prompt: node cli.test.js "your prompt here"');
  process.exit(1);
}

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  res.setEncoding('utf8');
  res.on('data', chunk => {
    chunk.split('\n').forEach(line => {
      if (!line.trim()) return;
      try {
        const parsed = JSON.parse(line);
        process.stdout.write(parsed.response);
      } catch {}
    });
  });
});

req.write(JSON.stringify({ prompt }));
req.end();
