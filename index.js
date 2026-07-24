const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

const INNERTUBE = 'https://music.youtube.com/youtubei/v1';

async function ytSearch(query) {
  const res = await fetch(`${INNERTUBE}/search?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20241125.01.00',
          hl: 'es',
          gl: 'ES',
        },
      },
      query,
      params: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D',
    }),
  });

  const data = await res.json();
  const sections = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

  if (!sections) {
    const shelf = data.contents?.sectionListRenderer?.contents;
    if (!shelf) return [];

    const videos = [];
    for (const section of shelf) {
      const items = section.musicShelfRenderer?.contents || [];
      for (const item of items) {
        const vid = item.musicResponsiveListItemRenderer;
        if (vid) {
          const videoId = vid.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
          const title = vid.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
          if (videoId && title) {
            videos.push({ id: videoId, title });
          }
        }
      }
    }
    return videos;
  }

  const videos = [];
  for (const section of sections) {
    const items = section.musicShelfRenderer?.contents || [];
    for (const item of items) {
      const vid = item.musicResponsiveListItemRenderer;
      if (vid) {
        const videoId = vid.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
        const title = vid.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        if (videoId && title) {
          videos.push({ id: videoId, title });
        }
      }
    }
  }
  return videos;
}

function ytdlpGetUrl(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    execFile('yt-dlp', [
      url,
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
    console.log('Searching:', q);
    const videos = await ytSearch(q);

    if (videos.length === 0) {
      return res.status(404).json({ error: 'No videos found' });
    }

    console.log('Found:', videos[0].title, videos[0].id);

    const url = await ytdlpGetUrl(videos[0].id);

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
