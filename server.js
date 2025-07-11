const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');


const app = express();
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
const py = spawn(pythonCmd, ['inference_server.py']);
const logFile = path.join(__dirname, 'logs', 'log.jsonl');

let isReady = false;
let busy = false;
let queue = [];
let currentRes = null;
let currentLog = '';
let currentPrompt = '';

// fire and forget logging
function logInteraction(prompt, response) {
  const entry = {
    timestamp: new Date().toISOString(),
    prompt,
    response
  };
  const line = JSON.stringify(entry) + '\n';

  fs.mkdir(path.dirname(logFile), { recursive: true }, (err) => {
    if (err) return console.error('Failed to create log directory:', err);
    fs.appendFile(logFile, line, 'utf8', (err) => {
      if (err) console.error('Error writing to log:', err);
    });
  });
}

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
});

process.on('SIGINT', () => {
  console.log('shutting down Python');
  py.kill('SIGINT');
  process.exit();
});

// Express Middlewares
app.use('/generate', limiter);
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// POST endpoint - validates the request object and adds request to the queue
app.post('/generate', (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  if (typeof prompt !== 'string' || prompt.length > 5000) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  queue.push({ prompt, res });
  processQueue();
});

// A light-weight queue to manage multiple requests when model is busy or not ready
function processQueue() {
  if (!isReady || busy || queue.length === 0) return;

  const { prompt, res } = queue.shift();
  busy = true;
  currentRes = res;
  currentPrompt = prompt;
  currentLog = '';

  // sets ndjson header to stream output token in form of json chunks
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  // writes prompt to standard input stream of Python process for inference
  py.stdin.write(prompt + '\n');
}

// reads standard output stream of python process for:
//  - reading model tokens  
//  - reading if Model is ready
py.stdout.on('data', (chunk) => {
  const data = chunk.toString();

  if (!isReady && data.includes('__READY__')) {
    console.log('✅ Python model loaded.');
    isReady = true;
    processQueue();
    return;
  }

  if (currentRes) {
    if (data.includes('__END__')) {
      // Extract the part before __END__ and send it
      const parts = data.split('__END__');
      currentRes.write(JSON.stringify({ response: parts[0] }) + '\n');
      
      currentLog += parts[0];
      const cleanedResponse = currentLog.trim();
      logInteraction(currentPrompt, cleanedResponse);
      
      currentRes.end();

      currentRes = null;
      busy = false;
      currentPrompt = '';
      currentLog = '';

      // Process next request in queue
      processQueue();

    } else {
      // Send each chunk as JSON object on its own line (NDJSON)
      currentRes.write(JSON.stringify({ response: data }) + '\n');
      currentLog += data;
    }
  }
});

// reads standard error stream of python process for errors
py.stderr.on('data', (data) => {
  console.error('Python error:', data.toString());
  if (currentRes && !currentRes.writableEnded) {
    currentRes.write('\n[ERROR]');
    currentRes.end();
    currentRes = null;
    busy = false;
    processQueue();
  }
});

app.listen(3000, () => {
  console.log('\x1b[34mServer running at http://localhost:3000 \x1b[0m');
  console.log('\x1b[2mLoading AI model. This may take some time if this is the first time you are running the project.\x1b[0m');
});
