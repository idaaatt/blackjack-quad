// socket.js — singleton Socket.io client
import { io } from 'socket.io-client';

// Membaca VITE_BACKEND_URL (atau VITE_SERVER_URL)
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  autoConnect: false,
  extraHeaders: {
    "ngrok-skip-browser-warning": "true"
  }
});