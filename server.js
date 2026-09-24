const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/auth/google/callback`;

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Add it to .env before deploying.');
}
if (isProduction) app.set('trust proxy', 1);

app.use(express.json({ limit: '32kb' }));
app.use(session({
  name: 'replyflow.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(express.static(path.join(__dirname)));

function oauthClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const error = new Error('Google OAuth is not configured. Copy .env.example to .env and add credentials.');
    error.status = 503;
    throw error;
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function youtubeFor(req) {
  if (!req.session.tokens) return null;
  const auth = oauthClient();
  auth.setCredentials(req.session.tokens);
  auth.on('tokens', (tokens) => {
    req.session.tokens = { ...req.session.tokens, ...tokens };
  });
  return google.youtube({ version: 'v3', auth });
}

function requireAuth(req, res, next) {
  if (!req.session.tokens) return res.status(401).json({ error: 'Sign in with Google to continue.' });
  try {
    req.youtube = youtubeFor(req);
    next();
  } catch (error) {
    next(error);
  }
}

app.get('/auth/google', (req, res, next) => {
  try {
    const state = crypto.randomBytes(24).toString('hex');
    req.session.oauthState = state;
    const authUrl = oauthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ],
      state
    });
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
});

app.get('/auth/google/callback', async (req, res, next) => {
  try {
    if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) {
      return res.status(400).send('Invalid OAuth callback state. Please try signing in again.');
    }
    delete req.session.oauthState;
    const client = oauthClient();
    const { tokens } = await client.getToken(req.query.code);
    req.session.tokens = tokens;
    res.redirect('/');
  } catch (error) {
    next(error);
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', async (req, res, next) => {
  if (!req.session.tokens) return res.json({ authenticated: false });
  try {
    const youtube = youtubeFor(req);
    const { data } = await youtube.channels.list({ part: 'snippet,statistics', mine: true });
    const channel = data.items?.[0];
    if (!channel) return res.status(404).json({ error: 'No YouTube channel was found for this Google account.' });
    req.session.channelId = channel.id;
    res.json({ authenticated: true, channel: {
      id: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url,
      subscribers: channel.statistics?.subscriberCount || '0',
      views: channel.statistics?.viewCount || '0'
    }});
  } catch (error) {
    if (error.code === 401) req.session.destroy(() => res.status(401).json({ error: 'Your Google session expired. Please sign in again.' }));
    else next(error);
  }
});

app.get('/api/comments', requireAuth, async (req, res, next) => {
  try {
    const channelId = req.session.channelId || (await req.youtube.channels.list({ part: 'id', mine: true })).data.items?.[0]?.id;
    if (!channelId) return res.status(404).json({ error: 'No YouTube channel was found.' });
    req.session.channelId = channelId;
    const { data } = await req.youtube.commentThreads.list({
      part: 'snippet,replies',
      allThreadsRelatedToChannelId: channelId,
      maxResults: Math.min(Number(req.query.limit) || 25, 100),
      order: 'time',
      textFormat: 'plainText'
    });
    res.json({ comments: (data.items || []).map((item) => {
      const comment = item.snippet.topLevelComment;
      const snippet = comment.snippet;
      return { id: comment.id, threadId: item.id, author: snippet.authorDisplayName, avatar: snippet.authorProfileImageUrl, text: snippet.textDisplay, publishedAt: snippet.publishedAt, videoId: snippet.videoId, replyCount: item.snippet.totalReplyCount || 0 };
    }), nextPageToken: data.nextPageToken || null });
  } catch (error) { next(error); }
});

app.post('/api/comments/:commentId/reply', requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 10000) return res.status(400).json({ error: 'Reply text must be between 1 and 10,000 characters.' });
    const { data } = await req.youtube.comments.insert({
      part: 'snippet',
      requestBody: { snippet: { parentId: req.params.commentId, textOriginal: text } }
    });
    res.status(201).json({ id: data.id, text: data.snippet?.textDisplay || text });
  } catch (error) { next(error); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || error.code || 500;
  res.status(Number.isInteger(status) ? status : 500).json({ error: error.message || 'Unexpected server error.' });
});

app.listen(port, () => console.log(`ReplyFlow is running at http://localhost:${port}`));
