const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const roomApi = {
  createRoom(username) {
    return request("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ username })
    });
  },
  joinRoom(roomId, username) {
    return request(`/api/rooms/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({ username })
    });
  },
  getRoom(roomId) {
    return request(`/api/rooms/${roomId}`);
  }
};

export function getStreamUrl(roomId) {
  return `${API_BASE_URL}/stream/${roomId}`;
}

export { API_BASE_URL };
