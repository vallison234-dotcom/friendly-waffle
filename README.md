# ReplyFlow

A polished, responsive front-end for a free YouTube comment automation workspace. ReplyFlow helps creators review comments, create auto-reply rules, and moderate spam from one calm dashboard.

## Included

- Overview dashboard with activity chart and channel metrics
- Comment inbox for flagged comments and quick actions
- Active reply rules with working enable/disable toggles
- Free-forever messaging with no paid tier in the UI
- Responsive layout for desktop, tablet, and mobile
- Small interaction layer for syncing comments, opening a rule builder, and reply actions

## Run locally

No build step is required. Open `index.html` directly in a browser, or serve the directory with any static server:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080.

## Production integration

The current project is a front-end prototype. A production deployment should connect the controls to a backend using OAuth 2.0 and the YouTube Data API. Keep OAuth tokens server-side, validate webhook or polling responses, add moderation audit logs, and respect YouTube API quotas and platform policies. “Free forever” refers to the app experience; YouTube API usage may still have provider limits.
