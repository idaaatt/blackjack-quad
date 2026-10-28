// socket.js — singleton Socket.io client
import { io } from 'socket.io-client';

export function getServerUrl() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('BJ_SERVER_URL') : null;
  const rawUrl = custom || import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  return rawUrl.trim().replace(/\/+$/, '');
}

export const SERVER_URL = getServerUrl();

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['polling', 'websocket'],
  transportOptions: {
    polling: {
      extraHeaders: {
        'bypass-tunnel-reminder': 'true',
        'ngrok-skip-browser-warning': 'true',
      },
    },
  },
  extraHeaders: {
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
});

export function setCustomServerUrl(url) {
  const clean = (url || '').trim().replace(/\/+$/, '');
  if (!clean) {
    localStorage.removeItem('BJ_SERVER_URL');
  } else {
    localStorage.setItem('BJ_SERVER_URL', clean);
  }
  window.location.reload();
}
