import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 800
    });
  }

  return socket;
}
