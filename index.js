const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
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

app.get('/api/stream', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  console.log('Stream request for:', q);

  const args = [
    'ytsearch1:' + q,
    '--get-url',
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '15',
  ];

  execFile('yt-dlp', args, { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp error:', stderr || error.message);
      return res.status(500).json({ error: 'Failed to get stream', details: stderr || error.message });
    }

    console.log('yt-dlp output length:', stdout.length);

    const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));
    console.log('Found URLs:', urls.length);

    if (urls.length === 0) {
      return res.status(500).json({ error: 'No URL found', stdout: stdout.substring(0, 200) });
    }

    res.json({ url: urls[0] });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
