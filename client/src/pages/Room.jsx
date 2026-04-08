import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ChatBox from "../components/ChatBox";
import UserList from "../components/UserList";
import VoiceChat from "../components/VoiceChat";
import { useAppContext } from "../context/AppContext";

const VideoPlayer = lazy(() => import("../components/VideoPlayer"));

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    user,
    socket,
    roomState,
    messages,
    isSocketConnected,
    hydrateRoom,
    connectToRoomSocket,
    sendChat,
    error,
    clearError
  } = useAppContext();

  const [isJoining, setIsJoining] = useState(true);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    let active = true;

    async function bootstrapRoom() {
      clearError();
      setJoinError("");

      if (!socket) {
        return;
      }

      if (!user.username) {
        navigate("/");
        return;
      }

      try {
        await hydrateRoom(roomId);
        await connectToRoomSocket(roomId, user.username);
      } catch (err) {
        if (active) {
          setJoinError(err?.message || "Unable to join room");
        }
      } finally {
        if (active) {
          setIsJoining(false);
        }
      }
    }

    bootstrapRoom();

    return () => {
      active = false;
    };
  }, [roomId, user.username, socket, hydrateRoom, connectToRoomSocket, navigate, clearError]);

  useEffect(() => {
    if (!socket || !roomState?.roomId || !user.username) {
      return;
    }

    const handleReconnect = () => {
      connectToRoomSocket(roomState.roomId, user.username).catch(() => null);
    };

    socket.on("connect", handleReconnect);

    return () => {
      socket.off("connect", handleReconnect);
    };
  }, [socket, roomState?.roomId, user.username, connectToRoomSocket]);

  const isHost = useMemo(() => roomState?.host === user.username, [roomState?.host, user.username]);

  if (isJoining || !roomState) {
    if (joinError) {
      return (
        <main className="app-shell room-shell loading-shell">
          <div className="panel loader">
            <p>{joinError}</p>
            <button className="btn" onClick={() => navigate("/")}>Back to Home</button>
          </div>
        </main>
      );
    }

    return (
      <main className="app-shell room-shell loading-shell">
        <div className="panel loader">Joining room...</div>
      </main>
    );
  }

  return (
    <main className="app-shell room-shell reveal">
      <header className="panel topbar">
        <div>
          <h1>visStream Room</h1>
          <p className="muted">Room ID: {roomState.roomId}</p>
        </div>

        <div className="status-row">
          <span className={`chip ${isSocketConnected ? "ok" : "warn"}`}>
            {isSocketConnected ? "Connected" : "Reconnecting"}
          </span>
          <button className="btn" onClick={() => navigate("/")}>Leave Room</button>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="room-grid">
        <div className="video-column">
          <Suspense fallback={<div className="panel loader">Loading player...</div>}>
            <VideoPlayer socket={socket} roomId={roomState.roomId} roomState={roomState} isHost={isHost} />
          </Suspense>
        </div>

        <div className="side-column">
          <UserList users={roomState.users || []} host={roomState.host} currentUser={user.username} />
          <VoiceChat socket={socket} roomId={roomState.roomId} roomUsers={roomState.users || []} />
          <ChatBox messages={messages} onSend={sendChat} disabled={!isSocketConnected} />
        </div>
      </section>
    </main>
  );
}

export default Room;
