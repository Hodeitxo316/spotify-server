const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const YT_CLIENT = {
  clientName: 'WEB',
  clientVersion: '2.20240101.00.00',
  apiKey: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
};

const INNERTUBE = 'https://www.youtube.com/youtubei/v1';

async function ytSearch(query) {
  const res = await fetch(`${INNERTUBE}/search?key=${YT_CLIENT.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: YT_CLIENT.clientName,
          clientVersion: YT_CLIENT.clientVersion,
        },
      },
      query,
    }),
  });

  const data = await res.json();
  const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

  if (!contents) return [];

  const videos = [];
  for (const item of contents) {
    const vid = item.videoRenderer;
    if (vid) {
      videos.push({
        id: vid.videoId,
        title: vid.title?.runs?.[0]?.text || '',
        channel: vid.ownerText?.runs?.[0]?.text || '',
      });
    }
  }
  return videos;
}

async function ytGetStreamUrl(videoId) {
  const res = await fetch(`${INNERTUBE}/player?key=${YT_CLIENT.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14)',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.60.19',
          androidSdkVersion: 34,
        },
      },
      videoId,
    }),
  });

  const data = await res.json();
  const formats = data.streamingData?.adaptiveFormats || [];

  const audioStreams = formats
    .filter(f => f.mimeType?.startsWith('audio/'))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (audioStreams.length === 0) return null;
  return audioStreams[0].url;
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
    const videos = await ytSearch(q);

    if (videos.length === 0) {
      return res.status(404).json({ error: 'No videos found' });
    }

    console.log('Found video:', videos[0].title, videos[0].id);
    const url = await ytGetStreamUrl(videos[0].id);

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
