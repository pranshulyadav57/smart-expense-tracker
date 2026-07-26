import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  "http://localhost:5000";

// Create socket instance
const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,

  // 🔐 AUTH SUPPORT (Dynamic fetch to ensure fresh tokens on reconnect)
  auth: (cb) => {
    cb({ token: localStorage.getItem("accessToken") });
  }
});

// =========================
// CONNECTION EVENTS
// =========================
socket.on("connect", () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("🟢 Socket connected:", socket.id);
  }
});

socket.on("disconnect", () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("🔴 Socket disconnected");
  }
});

socket.on("connect_error", (err) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("⚠️ Socket error:", err.message);
  }
});

export default socket;