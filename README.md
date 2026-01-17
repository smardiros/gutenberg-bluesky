# Boswell's Life of Johnson Bot

A Bluesky bot that posts Boswell's Life of Johnson paragraph by paragraph. Long paragraphs are split into threaded posts on sentence boundaries.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```
   BLUESKY_HANDLE=yourhandle.bsky.social
   BLUESKY_PASSWORD=xxxx-xxxx-xxxx-xxxx
   GUTENBERG_URL=https://www.gutenberg.org/cache/epub/1564/pg1564.txt
   ```

   - Create an App Password at: https://bsky.app/settings/app-passwords
   - `GUTENBERG_URL` is optional (defaults to Boswell's Life of Johnson). Change it to post a different Gutenberg text.

## Commands

**Post next paragraph:**
```bash
npx tsx src/index.ts
```

**Preview without posting (dry run):**
```bash
npx tsx src/index.ts --dry-run
```

**Jump to specific paragraph:**
```bash
npx tsx src/index.ts --paragraph 50
```

**Preview specific paragraph:**
```bash
npx tsx src/index.ts --dry-run --paragraph 50
```

## State Management

State is stored in `data/state.json`:
```json
{
  "currentParagraph": 53,
  "lastPostUri": "at://did:plc:.../app.bsky.feed.post/...",
  "lastPostAt": "2026-01-17T21:03:21.829Z"
}
```

**Reset to beginning:**
```bash
echo '{"currentParagraph": 0}' > data/state.json
```

**Jump to paragraph 100:**
```bash
echo '{"currentParagraph": 99}' > data/state.json
```

## Cron Setup

Post every hour:
```bash
crontab -e
```

Add this line (adjust paths as needed):
```
0 * * * * cd /Users/smardiros/Projects/johnson && /opt/homebrew/bin/npx tsx src/index.ts >> /var/log/johnson-bot.log 2>&1
```

Or create a log file in the project directory:
```
0 * * * * cd /Users/smardiros/Projects/johnson && /opt/homebrew/bin/npx tsx src/index.ts >> ./data/bot.log 2>&1
```

## Features

- **Sentence-aware splitting**: Long paragraphs split on sentence boundaries (respects abbreviations like Mr., Dr., etc.)
- **Colon continuations**: When a paragraph ends with `:`, the next paragraph is included in the same thread
- **Threading**: Multi-part posts are threaded as replies
- **Local caching**: Gutenberg text is cached locally after first fetch
- **300 grapheme limit**: Uses `Intl.Segmenter` for accurate character counting
