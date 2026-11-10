# DeadlineOS — Chrome Extension (Phase C)

## What it does

Captures opportunity pages directly from your browser — even **JavaScript-rendered** pages (React, Next.js, SPAs) that a server-side URL fetch can't read.

## How it works

| Capture method | How |
|---|---|
| **Current Page** | Content script reads `document.body` *after JS has run* → sends rendered text to `/api/capture` |
| **Paste URL** | Sends URL to server → server fetches static HTML and applies heuristics |

The key advantage of the extension over URL-only capture is that the **content script runs inside your browser tab**, so it sees the fully rendered DOM — the same text you see on screen — regardless of how the page is built.

## Setup

### 1. Generate icons (one-time)
```bash
node generate-icons.js
```

### 2. Load in Chrome
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder

### 3. Make sure the frontend is running
```bash
cd ../frontend
npm run dev
```
The extension calls `http://localhost:3000`. For production, change `BASE_URL` in `popup.js`.

### 4. Sign in via the popup
Click the DeadlineOS icon in your toolbar → sign in with your DeadlineOS account credentials.  
The JWT token is stored in `chrome.storage.local` (sandboxed to the extension).

## File structure

```
extension/
  manifest.json        — MV3 manifest (permissions, content scripts, popup)
  popup.html           — Extension popup UI
  popup.css            — Popup styles (matches DeadlineOS theme)
  popup.js             — Popup logic: auth, tab info, capture calls
  content.js           — Content script: reads rendered DOM text
  background.js        — Service worker: badge management
  generate-icons.js    — Pure Node.js icon generator (no deps)
  icons/
    icon16.png
    icon48.png
    icon128.png
```

## API endpoints used

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/extension-token` | POST | None | Login → returns Bearer JWT |
| `/api/capture` | POST | Bearer header | Submit URL or rendered text |

## Permissions required

- `activeTab` — read current tab URL + title
- `scripting` — inject content script to read rendered DOM
- `storage` — persist JWT token locally
- `host_permissions: localhost:3000/*` — call the local dev server
