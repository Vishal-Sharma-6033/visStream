import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppContext } from "../context/AppContext";

function Home() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, loading, error, clearError, user } = useAppContext();

  const [username, setUsername] = useState(user.username || "");
  const [joinRoomId, setJoinRoomId] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    clearError();

    if (!username.trim()) {
      return;
    }

    try {
      const room = await createRoom(username.trim());
      navigate(`/room/${room.roomId}`);
    } catch (_error) {
      // Error state is already managed in context.
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    clearError();

    if (!username.trim() || !joinRoomId.trim()) {
      return;
    }

    try {
      const room = await joinRoom(joinRoomId.trim(), username.trim());
      navigate(`/room/${room.roomId}`);
    } catch (_error) {
      // Error state is already managed in context.
    }
  }

  return (
    <main className="home app-shell">
      <section className="hero reveal">
        <div className="badge">visStream</div>
        <h1>Watch together in perfect sync.</h1>
        <p className="muted">
          Create a private room, stream HLS content, and chat live with your friends.
        </p>
      </section>

      <section className="home-grid reveal">
        <form className="panel card" onSubmit={handleCreate}>
          <h2>Create Room</h2>
          <p className="muted">Start a room and become the host controller.</p>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            maxLength={32}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Room"}
          </button>
        </form>

        <form className="panel card" onSubmit={handleJoin}>
          <h2>Join Room</h2>
          <p className="muted">Enter room ID and join an ongoing watch party.</p>
          <input
            className="input"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            placeholder="Room ID (e.g. ABC123)"
            maxLength={16}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
    </main>
  );
}

export default Home;
