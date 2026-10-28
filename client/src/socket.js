// socket.js — singleton Socket.io client
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  autoConnect: true, // Otomatis connect begitu web dibuka
  transports: ['polling', 'websocket'], // Wajib ada agar tidak diblokir jaringan HP
  extraHeaders: {
    "ngrok-skip-browser-warning": "true"
  }
});