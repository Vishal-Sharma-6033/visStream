# visStream

A real-time watch-party platform built with the MERN stack that lets users watch HLS video streams together in synced playback, chat live, and talk over voice channels.

## 1. Project Title and Overview

### Project Title
**visStream - Real-Time Synchronized Watch Party Platform**

### Overview
visStream is a full-stack web application where multiple users can join a room and watch videos in sync. The host controls playback (play, pause, seek, and video switch), while all guests stay aligned through Socket.IO-based synchronization.

It solves a common remote-collaboration and entertainment problem: people in different locations cannot easily watch the same content together with synchronized timing and interaction.

### Real-World Use Cases
- Remote movie nights with friends and family
- Online classrooms playing educational video content together
- Team review sessions for product demos, recorded meetings, or training videos
- Community events where hosts stream a shared HLS source and participants discuss in real time

---

## 2. Features

### User Features
- User registration and login (JWT-based)
- Auto session restore using stored token
- Join existing room via room code
- Create new room with optional default video URL
- Real-time synchronized playback across participants
- Live room member list with host and buffering indicators
- In-room chat with typing indicator and emoji reactions
- Voice channel (WebRTC audio) with mute/unmute and participant presence
- Host invite link copy
- Adaptive HLS playback with quality selection
- LAN-friendly runtime URL resolution for mobile/phone testing

### Host Features
- Create room and become host automatically
- Change room video by entering HLS URL
- Upload local video and convert to HLS (480p/720p/1080p)
- Add external HLS source (Cloudinary-compatible or any valid HLS URL)
- Reuse previously uploaded videos from personal library
- Delete previously uploaded videos
- Apply selected uploaded/external stream to room instantly
- Close room

### Platform/Operational Features
- Auto host reassignment if current host leaves
- In-memory runtime room state for fast sync, with MongoDB persistence for core data
- Background transcoding progress over Socket.IO events
- CORS support for localhost + private LAN ranges
- Default development test account bootstrap

### Admin Features
- No dedicated admin panel or admin role in the current version

---

## 3. Tech Stack

### Frontend
- React 18
- React Router DOM
- Axios
- HLS.js
- Socket.IO Client
- Vite

### Backend
- Node.js
- Express.js
- Socket.IO Server

### Database
- MongoDB
- Mongoose ODM

### Authentication and Security
- JWT (Authorization: Bearer token)
- bcryptjs for password hashing
- Protected routes and socket authentication middleware
- CORS origin validation including LAN-safe origin checks

### Media and Real-Time Tools
- FFmpeg via fluent-ffmpeg for HLS transcoding
- Multer for video uploads
- WebRTC (peer-to-peer audio signaling via Socket.IO)

### Dev/Tooling
- Nodemon
- npm workspaces
- concurrently

---

## 4. Project Architecture

### High-Level Structure

```text
visStream/
  client/                  # React frontend
    src/
      components/          # UI units (chat, room, player, voice)
      context/             # Auth, Socket, Room state providers
      pages/               # Landing, Login, Room pages
      services/            # API, HLS, WebRTC service wrappers
  server/                  # Node/Express backend
    config/                # env validation, DB connection
    controllers/           # Route business logic
    middleware/            # auth + upload middleware
    models/                # Mongoose schemas
    routes/                # REST endpoints
    services/              # ffmpeg transcoding, default user bootstrap
    socket/                # sync/chat/webrtc socket handlers
    utils/                 # JWT helper, room runtime state utilities
```

### Frontend-Backend Communication
- **REST APIs** via Axios for auth, room CRUD, video CRUD/upload.
- **Socket.IO** for real-time room events (sync, chat, reactions, voice signaling, processing progress).
- **HLS static files** served from backend under `/hls` and consumed by HLS.js/native player.

### API Flow Model
1. User action in React component.
2. Frontend sends HTTP request or socket event.
3. Express route/socket handler validates user and payload.
4. Controller/service updates MongoDB and/or in-memory room state.
5. Result emitted back to caller and room participants.

---

## 5. Working / Flow of Project

### End-to-End Flow
1. User signs up or logs in.
2. Backend validates credentials, hashes passwords (on create), returns JWT.
3. Frontend stores token and attaches it to future API calls.
4. User creates or joins a room.
5. Room state is fetched from API, then user joins socket room (`room:join`).
6. Host playback actions are emitted to server and broadcast to other clients.
7. Guests auto-correct drift using periodic host `sync:ping`/`sync:pong` cycle.
8. Chat, typing, reactions, and voice signaling are sent through sockets.
9. If host uploads a video, backend stores file, starts FFmpeg transcoding, and emits progress.
10. Once HLS is ready, host applies stream to room and all users switch source.

### Request -> Backend -> DB -> Response Example
- **Action**: User sends chat message
- **Frontend**: Emits `chat:message`
- **Backend**: `chat.handler.js` validates room and message, emits to room
- **DB**: Message appended (last 100 retained) in `Room.messages`
- **Response**: All room clients receive and render new message

---

## 6. API Documentation

Base URL (default): `http://localhost:5000`

### Health
- `GET /api/health`  
  Returns API status, timestamp, and uptime.

### Auth Routes
- `POST /api/auth/register`  
  Creates a new user.  
  Body: `{ username, email, password }`

- `POST /api/auth/login`  
  Authenticates user and returns JWT + user profile.  
  Body: `{ email, password }`

- `GET /api/auth/me` (Protected)  
  Returns currently authenticated user.

### Room Routes
- `POST /api/rooms` (Protected)  
  Creates a room and assigns current user as host.  
  Body: `{ name, videoUrl?, isPrivate? }`

- `GET /api/rooms/:id` (Protected)  
  Fetches room details by room code.

- `PATCH /api/rooms/:id/video` (Protected, Host only)  
  Updates active room video URL/ID and resets playback state.  
  Body: `{ videoUrl?, videoId? }`

- `DELETE /api/rooms/:id` (Protected, Host only)  
  Marks room as inactive (closed).

### Video Routes
- `POST /api/videos/upload` (Protected)  
  Uploads local video and starts async HLS transcoding.  
  Form-data: `video`, optional `title`, `description`

- `POST /api/videos/external` (Protected)  
  Stores external HLS stream metadata as ready-to-use video.  
  Body: `{ title, url }`

- `GET /api/videos/my` (Protected)  
  Lists current user videos (recent first).

- `GET /api/videos/:id` (Protected)  
  Returns single video details/status.

- `DELETE /api/videos/:id` (Protected, Owner only)  
  Deletes DB record and associated local files.

### Static Streaming Route
- `GET /hls/:videoId/master.m3u8`  
  Serves generated HLS master playlist and variant chunks.

---

## 7. Database Schema

### User Model
- `username` (unique, required)
- `email` (unique, required, lowercase)
- `passwordHash` (bcrypt hash)
- `avatar`
- `isOnline`
- timestamps

### Room Model
- `roomId` (unique room code)
- `name`
- `hostId` -> ref `User`
- `videoId` -> ref `Video` (optional)
- `videoUrl` (active source)
- `playbackState` (`playing`, `currentTime`, `updatedAt`)
- `members[]` (`userId`, `username`, `avatar`, `isMuted`, `isBuffering`, `joinedAt`)
- `messages[]` (`userId`, `username`, `avatar`, `content`, `type`, `timestamp`)
- `isActive`, `maxMembers`, `isPrivate`
- timestamps

### Video Model
- `title`, `description`
- `originalFile`
- `hlsPath`
- `masterPlaylist`
- `thumbnail`
- `status` (`uploading`, `processing`, `ready`, `error`)
- `duration`
- `qualities[]` (`resolution`, `bandwidth`, `playlistUrl`)
- `fileSize`, `mimeType`
- `isExternal`, `externalUrl`
- `uploadedBy` -> ref `User`
- timestamps

### Relationships
- One `User` can upload many `Video` documents.
- One `User` can host many `Room` documents.
- One `Room` can reference one active `Video` via `videoId` or use direct `videoUrl`.
- One `Room` stores embedded member snapshots and chat messages.

---

## 8. Installation and Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- FFmpeg installed on machine (for local upload transcoding)

### Setup Steps
1. Clone repository and enter root.
2. Install workspace dependencies:
   ```bash
   npm install
   ```
3. Create env files:
   - `server/.env` from `server/.env.example`
   - `client/.env` from `client/.env.example`
4. Start application (root):
   ```bash
   npm run dev
   ```

### LAN / Phone Testing
```bash
npm run dev:lan
```
Open frontend from another device on same Wi-Fi:
`http://<YOUR_LOCAL_IP>:5173`

### Key Environment Variables

#### server/.env
- `PORT` (default `5000`)
- `HOST` (optional, defaults to `0.0.0.0` in server code)
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL` (single or comma-separated origins)
- `VIDEOS_DIR`
- `HLS_DIR`
- `NODE_ENV`
- `ENABLE_DEFAULT_TEST_USER`
- `DEFAULT_TEST_EMAIL`
- `DEFAULT_TEST_PASSWORD`
- `DEFAULT_TEST_USERNAME`

#### client/.env
- `VITE_API_URL`
- `VITE_SOCKET_URL`

### Development Test Credentials
- Email: `test@gmail.com`
- Password: `123123`

---

## 9. Screenshots / UI Description

### Landing Page
- Hero section with app branding and quick actions
- Two tabs: Join Room and Create Room
- Create flow supports optional custom HLS URL

### Authentication Page
- Toggle between Sign In and Register
- Field-level validation and server error display
- One-click test account autofill for development

### Room Page
- Top header with room info, invite, and host actions
- Main center: HLS video player with custom OTT-style controls
- Right sidebar: live members, voice channel, and chat panel

### Video Upload Panel (Host)
- Local upload tab with progress and transcoding status
- External HLS tab for Cloudinary-compatible stream URLs
- Video library for reusing and deleting uploaded assets

### Chat UI
- Real-time messages, typing state, emoji reactions, floating overlays

### Voice Channel UI
- Join/leave voice button
- Mute toggle
- Peer presence and mute indicators

---

## 10. Challenges and Solutions

### 1. Multi-user playback drift
- **Challenge**: Clients naturally drift over time.
- **Solution**: Periodic host ping/pong drift correction via Socket.IO (`sync:ping`, `sync:pong`, `sync:correct`).

### 2. Scalable room runtime state
- **Challenge**: DB-only synchronization is too slow for frequent events.
- **Solution**: In-memory room map (`roomUtils`) for live state + MongoDB persistence for durable data.

### 3. Voice signaling reliability
- **Challenge**: Late voice joiners and stale peer connections.
- **Solution**: Explicit voice participant events (`voice:join`, `voice:participants`, `voice:user-joined`, `voice:user-left`) and peer lifecycle cleanup.

### 4. Mobile buffering behavior
- **Challenge**: Phone clients can buffer frequently and impact room UX.
- **Solution**: Mobile-oriented HLS startup/ABR tuning and host-only global stall logic.

### 5. LAN accessibility issues
- **Challenge**: Localhost URLs fail on phone.
- **Solution**: Runtime host substitution for API/socket URLs and backend bind on all interfaces.

---

## 11. Future Improvements

- Add role-based access control (admin/moderator roles)
- Introduce TURN server for stronger NAT traversal in WebRTC voice
- Add playback history and room analytics dashboard
- Add subtitles/captions and multi-audio track controls
- Add room scheduling, invitations, and notifications
- Add E2E tests (Playwright/Cypress) and backend integration tests
- Move background transcoding to job queue (BullMQ/Redis)
- Add cloud storage pipeline (S3/Cloudinary signed uploads)
- Add rate limiting and stronger security hardening for production

---

## 12. Resume Description

Built a full-stack MERN watch-party platform enabling synchronized HLS video streaming, real-time chat/reactions, and WebRTC voice communication for multi-user rooms. Implemented JWT-secured auth, Socket.IO event architecture, FFmpeg-based multi-quality transcoding (480p/720p/1080p), and adaptive playback optimizations for desktop and mobile. Designed scalable runtime room state management with MongoDB persistence and production-ready LAN/dev workflows.

---

## Additional Notes for Interviewers

- Uses **REST + WebSockets hybrid architecture** for clear separation between CRUD operations and low-latency events.
- Demonstrates **media pipeline engineering** (upload -> transcode -> HLS serve -> room broadcast).
- Includes practical debugging/dev features like test-user bootstrap and LAN-compatible local testing.
