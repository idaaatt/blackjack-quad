// socket.js — singleton Socket.io client
import { io } from 'socket.io-client';

const rawUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const SERVER_URL = rawUrl.replace(/\/+$/, '');

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['polling', 'websocket'],
  extraHeaders: {
    "ngrok-skip-browser-warning": "true"
  }
});