const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

async function ytSearchVideoId(query) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20241126.01.00',
          hl: 'es',
          gl: 'ES',
        },
      },
      query,
    }),
  });

  const data = await res.json();
  const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

  if (!contents) return null;

  for (const item of contents) {
    if (item.videoRenderer?.videoId) {
      return item.videoRenderer.videoId;
    }
  }
  return null;
}

function ytdlpGetUrl(videoId) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', [
      `https://www.youtube.com/watch?v=${videoId}`,
      '--get-url',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '15',
      '--extractor-args', 'youtube:player_client=tv_embedded',
    ], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp error:', stderr || error.message);
        return reject(new Error(stderr || error.message));
      }
      const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));
      resolve(urls.length > 0 ? urls[0] : null);
    });
  });
}

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

app.get('/api/stream', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    console.log('Searching YouTube for:', q);
    const videoId = await ytSearchVideoId(q);

    if (!videoId) {
      return res.status(404).json({ error: 'No video found' });
    }

    console.log('Found video:', videoId);

    const url = await ytdlpGetUrl(videoId);

    if (!url) {
      return res.status(404).json({ error: 'No audio stream found' });
    }

    console.log('Got stream URL');
    res.json({ url });
  } catch (e) {
    console.error('Stream error:', e.message);
    res.status(500).json({ error: 'Failed to get stream', details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
