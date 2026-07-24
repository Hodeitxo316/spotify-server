const express = require('express');
const cors = require('cors');
const { execFile, spawn } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/search', async (req, res) => {
  const { q, limit = 25 } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();

    const results = data.results.map(song => ({
      id: song.trackId?.toString() || '',
      title: song.trackName || 'Sin titulo',
      artist: song.artistName || 'Desconocido',
      image: (song.artworkUrl100 || '').replace('100x100bb', '500x500bb'),
    }));

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Search failed', details: e.message });
  }
});

app.get('/api/stream-url', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  console.log('Stream URL request:', q);

  const args = [
    `ytsearch1:${q}`,
    '--get-url',
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '15',
    '--extractor-args', 'youtube:player_client=tv_embedded',
  ];

  execFile('yt-dlp', args, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp error:', stderr || error.message);
      return res.status(500).json({ error: 'Failed', details: stderr || error.message });
    }

    const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));
    if (urls.length === 0) {
      return res.status(404).json({ error: 'No URL found' });
    }

    console.log('Got URL');
    res.json({ url: urls[0] });
  });
});

app.get('/api/proxy-audio', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  console.log('Proxy audio request:', q);

  const ytDlp = spawn('yt-dlp', [
    `ytsearch1:${q}`,
    '-f', 'bestaudio/best',
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '15',
    '--extractor-args', 'youtube:player_client=tv_embedded',
    '-o', '-',
  ]);

  let started = false;

  ytDlp.stdout.on('data', (chunk) => {
    if (!started) {
      started = true;
      res.set({
        'Content-Type': 'audio/webm',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      });
    }
    res.write(chunk);
  });

  ytDlp.stderr.on('data', (data) => {
    console.log('yt-dlp stderr:', data.toString().trim());
  });

  ytDlp.on('close', (code) => {
    console.log('yt-dlp closed with code:', code);
    if (!started) {
      if (code !== 0) {
        return res.status(500).json({ error: 'yt-dlp failed' });
      }
    }
    res.end();
  });

  ytDlp.on('error', (err) => {
    console.error('yt-dlp spawn error:', err.message);
    if (!started) {
      res.status(500).json({ error: 'Failed to start yt-dlp' });
    } else {
      res.end();
    }
  });

  req.on('close', () => {
    if (!ytDlp.killed) {
      ytDlp.kill();
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
