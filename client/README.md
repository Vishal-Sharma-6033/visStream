# visStream Frontend (React + Vite)

Modern real-time watch party UI for visStream.

## Stack

- React + Vite
- Functional components + Hooks
- Context API state management
- Socket.IO client
- hls.js for HLS playback

## Structure

- src/components
  - VideoPlayer.jsx
  - ChatBox.jsx
  - UserList.jsx
- src/pages
  - Home.jsx
  - Room.jsx
- src/context
  - AppContext.jsx
- src/services
  - api.js
  - socket.js

## Setup

1. Install dependencies:

```bash
cd client
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Environment

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Implemented Features

- Home page with Create Room and Join Room flows
- Room page with video player, chat sidebar, and live users list
- Host-highlight and room ID display
- Socket-powered real-time chat and room state updates
- Host-authoritative playback sync (play/pause/seek)
- HLS playback via hls.js from backend /stream/:roomId endpoint
- Buffering indicator and responsive Netflix-style dark UI
- Reconnect behavior that re-joins room automatically
