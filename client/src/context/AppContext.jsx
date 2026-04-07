import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { roomApi } from "../services/api";
import { getSocket } from "../services/socket";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [user, setUser] = useState({ username: localStorage.getItem("visstream.username") || "" });
  const [roomState, setRoomState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const clientSocket = getSocket();
    setSocket(clientSocket);

    function onConnect() {
      setIsSocketConnected(true);
    }

    function onDisconnect() {
      setIsSocketConnected(false);
    }

    function onRoomState(nextState) {
      setRoomState(nextState);
    }

    function onHostChanged(payload) {
      setRoomState((prev) => {
        if (!prev || !payload?.host) {
          return prev;
        }

        return { ...prev, host: payload.host };
      });
    }

    function onChatMessage(message) {
      setMessages((prev) => [...prev, message]);
    }

    clientSocket.on("connect", onConnect);
    clientSocket.on("disconnect", onDisconnect);
    clientSocket.on("room:state", onRoomState);
    clientSocket.on("room:host-changed", onHostChanged);
    clientSocket.on("chat:message", onChatMessage);

    return () => {
      clientSocket.off("connect", onConnect);
      clientSocket.off("disconnect", onDisconnect);
      clientSocket.off("room:state", onRoomState);
      clientSocket.off("room:host-changed", onHostChanged);
      clientSocket.off("chat:message", onChatMessage);
    };
  }, []);

  const setUsername = useCallback((username) => {
    const trimmed = username.trim();
    localStorage.setItem("visstream.username", trimmed);
    setUser({ username: trimmed });
  }, []);

  const createRoom = useCallback(async (username) => {
    setLoading(true);
    setError("");

    try {
      const created = await roomApi.createRoom(username.trim());
      setUsername(username);
      setRoomState(created);
      setMessages([]);
      return created;
    } catch (err) {
      const msg = err?.message || "Failed to create room";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUsername]);

  const joinRoom = useCallback(async (roomId, username) => {
    setLoading(true);
    setError("");

    try {
      const joined = await roomApi.joinRoom(roomId.trim().toUpperCase(), username.trim());
      setUsername(username);
      setRoomState(joined);
      setMessages([]);
      return joined;
    } catch (err) {
      const msg = err?.message || "Failed to join room";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUsername]);

  const hydrateRoom = useCallback(async (roomId) => {
    setLoading(true);
    setError("");

    try {
      const room = await roomApi.getRoom(roomId.trim().toUpperCase());
      setRoomState(room);
      return room;
    } catch (err) {
      const msg = err?.message || "Unable to load room";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const connectToRoomSocket = useCallback(async (roomId, username) => {
    if (!socket) {
      throw new Error("Socket is unavailable");
    }

    const normalizedRoomId = roomId.trim().toUpperCase();

    return new Promise((resolve, reject) => {
      socket.emit("room:join", { roomId: normalizedRoomId, username }, (ack) => {
        if (!ack?.ok) {
          reject(new Error(ack?.error || "Failed to join room socket"));
          return;
        }

        if (ack.state) {
          setRoomState(ack.state);
        }

        resolve(ack);
      });
    });
  }, [socket]);

  const sendChat = useCallback(async (message) => {
    if (!socket || !roomState || !user.username) {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    return new Promise((resolve, reject) => {
      socket.emit(
        "chat:message",
        {
          roomId: roomState.roomId,
          username: user.username,
          message: trimmed
        },
        (ack) => {
          if (!ack?.ok) {
            reject(new Error(ack?.error || "Message failed"));
            return;
          }

          resolve(ack.message);
        }
      );
    });
  }, [socket, roomState, user.username]);

  const clearError = useCallback(() => setError(""), []);

  const value = useMemo(
    () => ({
      socket,
      isSocketConnected,
      user,
      roomState,
      messages,
      loading,
      error,
      setUsername,
      createRoom,
      joinRoom,
      hydrateRoom,
      connectToRoomSocket,
      sendChat,
      clearError
    }),
    [
      socket,
      isSocketConnected,
      user,
      roomState,
      messages,
      loading,
      error,
      setUsername,
      createRoom,
      joinRoom,
      hydrateRoom,
      connectToRoomSocket,
      sendChat,
      clearError
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }

  return context;
}
