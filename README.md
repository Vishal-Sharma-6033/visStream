# 🎬 visStream

> Watch videos in perfect sync with anyone in the world — with live chat, voice, and adaptive HLS streaming.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + HLS.js |
| Backend | Node.js + Express |
| Real-time | Socket.IO |
| Database | MongoDB + Mongoose |
| Streaming | FFmpeg → HLS (480p/720p/1080p) |
| Voice | WebRTC (peer-to-peer) |
| Auth | JWT |

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** running locally (`mongodb://localhost:27017`)
- **FFmpeg** (optional — for video upload feature)
  ```bash
  # macOS
  brew install ffmpeg
  # Ubuntu
  sudo apt install ffmpeg
  ```

---

## Setup

### 1. Clone & install

```bash
# Server
cd server
cp .env.example .env   # Edit MONGO_URI and JWT_SECRET
npm install

# Client
cd ../client
cp .env.example .env
npm install
```

### 2. Start MongoDB

```bash
mongod  # or use MongoDB Atlas — update MONGO_URI in server/.env
```

### 3. Run

```bash
# Terminal 1 — Server (port 5000)
cd server && npm run dev

# Terminal 2 — Client (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173**

### Default Test Login (development)

The server auto-creates a default test user on startup in non-production environments:

- Email: `test@gmail.com`
- Password: `123123`

You can customize or disable this in `server/.env`:

- `ENABLE_DEFAULT_TEST_USER=true|false`
- `DEFAULT_TEST_EMAIL`
- `DEFAULT_TEST_PASSWORD`
- `DEFAULT_TEST_USERNAME`

---

## Environment Variables

### `server/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `MONGO_URI` | `mongodb://localhost:27017/visstream` | MongoDB connection |
| `JWT_SECRET` | — | Secret for JWT signing (**change this!**) |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin |
| `HLS_DIR` | `uploads/hls` | Where HLS segments are stored |
| `VIDEOS_DIR` | `uploads/videos` | Where uploaded videos are stored |

### `client/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend API URL |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Socket.IO server URL |

---

## Usage Guide

### Create a Room
1. Sign up / log in
2. Click **Create Room** on the landing page
3. Optionally paste an HLS stream URL (default: Mux test stream)
4. Share the room code or invite link with friends

### Join a Room
1. Enter the 8-character room code
2. You'll auto-sync to the host's playback position

### Host Controls
- **Play / Pause / Seek** — all events broadcast to guests instantly
- **Change Video** — paste a new HLS URL from the header bar
- Host takes over on reconnect or if original host leaves

### Voice Chat
1. Click **Join Voice** in the sidebar
2. WebRTC peer-to-peer audio connects automatically
3. Use the 🎙️ button to mute/unmute

### Upload a Video (requires FFmpeg)
```bash
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer <token>" \
  -F "video=@/path/to/movie.mp4" \
  -F "title=My Movie"
```
Transcoding to 480p/720p/1080p HLS happens in the background.
Progress is emitted via `video:processing` Socket.IO event.

---

## API Reference

### Auth
```
POST   /api/auth/register      { username, email, password }
POST   /api/auth/login         { email, password }
GET    /api/auth/me            (protected)
```

### Rooms
```
POST   /api/rooms              { name, videoUrl }
GET    /api/rooms/:id
DELETE /api/rooms/:id
PATCH  /api/rooms/:id/video    { videoUrl }
```

### Videos
```
POST   /api/videos/upload      multipart/form-data { video, title }
POST   /api/videos/external    { title, url }
GET    /api/videos/my
GET    /api/videos/:id
GET    /hls/:videoId/master.m3u8
```

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ roomId }` | Join a room |
| `room:leave` | — | Leave current room |
| `video:play` | `{ currentTime }` | Host plays |
| `video:pause` | `{ currentTime }` | Host pauses |
| `video:seek` | `{ currentTime }` | Host seeks |
| `video:change` | `{ videoUrl }` | Host changes video |
| `video:buffer` | `{ isBuffering }` | Buffer state change |
| `sync:pong` | `{ currentTime, playing, targetSocketId }` | Host time response |
| `chat:message` | `{ content, type }` | Send message |
| `chat:typing` | `{ isTyping }` | Typing indicator |
| `chat:reaction` | `{ emoji }` | Emoji reaction |
| `webrtc:offer` | `{ targetSocketId, offer }` | WebRTC offer relay |
| `webrtc:answer` | `{ targetSocketId, answer }` | WebRTC answer relay |
| `webrtc:ice-candidate` | `{ targetSocketId, candidate }` | ICE relay |
| `voice:mute` | `{ isMuted }` | Mute state broadcast |

### Server → Client
| Event | Description |
|---|---|
| `room:joined` | Room state on join success |
| `room:user-joined` | New member joined |
| `room:user-left` | Member left |
| `room:host-changed` | Host reassigned |
| `sync:ping` | Request host's current time |
| `sync:correct` | Drift correction payload for guests |
| `video:play/pause/seek` | Sync events from host |
| `chat:message/typing/reaction` | Chat events |
| `webrtc:offer/answer/ice-candidate` | Signaling relay |
| `voice:mute` | Mute state from peers |

---

## Sample Test Data

Use Apple's official HLS test stream (no signup needed):
```
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
```

Or Mux's 4K test:
```
https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4S/high.mp4
```
