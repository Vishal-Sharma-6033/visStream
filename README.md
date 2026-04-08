# visStream Backend

Production-grade backend for a real-time watch party app with:
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (sync + chat + WebRTC signaling)
- HLS streaming endpoint

## Features

- Room lifecycle: create, join, query state
- In-memory + MongoDB room state persistence
- Host-authoritative sync engine (`sync:play`, `sync:pause`, `sync:seek`, `sync:request`)
- Real-time room chat with MongoDB persistence
- WebRTC signaling relay (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`)
- HLS playlist serving via `GET /stream/:roomId`
- Validation middleware + centralized error handling

## Project Structure

```
/server
  /controllers
  /middleware
  /models
  /routes
  /services
  /socket
  /utils
/public/hls
server.js
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `.env` values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/visstream
CLIENT_ORIGIN=http://localhost:3000
DEFAULT_STREAM_KEY=video
NODE_ENV=development
```

4. Start development server:

```bash
npm run dev
```

5. Start production server:

```bash
npm start
```

## REST API

### Health
- `GET /health`

### Rooms
- `POST /api/rooms`
  - body: `{ "username": "alice" }`
- `POST /api/rooms/:roomId/join`
  - body: `{ "username": "bob" }`
- `GET /api/rooms/:roomId`

### HLS
- `GET /stream/:roomId`
  - Serves `/public/hls/{ROOM_ID}.m3u8`

## Socket.IO Events

### Room
- `room:join` (client -> server)
  - payload: `{ roomId, username }`
- `room:state` (server -> room)
- `room:user-joined` (server -> room)
- `room:user-left` (server -> room)
- `room:host-changed` (server -> room)

### Playback Sync (host only for control)
- `sync:play` (client -> server)
  - payload: `{ roomId, currentTime }`
- `sync:pause` (client -> server)
- `sync:seek` (client -> server)
- `sync:request` (client -> server)

### Chat
- `chat:message` (bi-directional)
  - payload: `{ roomId, username, message }`

### WebRTC Signaling
- `webrtc:offer`
- `webrtc:answer`
- `webrtc:ice-candidate`
  - payload includes `targetSocketId` and session data

## HLS Notes

- Do not stream MP4 directly from backend.
- Generate `.m3u8` + `.ts` artifacts via encoder (e.g. ffmpeg) and place in `public/hls`.
- Rooms now auto-pick a stream key from `DEFAULT_STREAM_KEY` (or first `.m3u8` in `public/hls`).
- Example: if `DEFAULT_STREAM_KEY=video`, backend serves `public/hls/video.m3u8` for new rooms.

### Fix: "Only beep sound" or test pattern video

If you hear a beep and see color bars, you are likely playing a synthetic FFmpeg test stream (not your real video file).

Generate HLS from a real video file:

```bash
npm run hls:from-file -- /absolute/path/to/your-video.mp4 video
```

This writes:
- `public/hls/video.m3u8`
- `public/hls/video000.ts`, `video001.ts`, ...

Then keep `DEFAULT_STREAM_KEY=video` in `.env`, restart backend, and create a new room.

Optional silent demo stream (no beep):

```bash
npm run hls:demo:silent
```

## Production Notes

- Use a managed MongoDB cluster in production.
- Place this service behind HTTPS + reverse proxy.
- Consider Redis adapter for Socket.IO when scaling horizontally.
- Add auth/JWT before exposing publicly.
