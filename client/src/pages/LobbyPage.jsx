// pages/LobbyPage.jsx
// Entry page: create room or join via link.
// R-27: loading, error, and empty states all handled.
// R-23: no assets assumed; uses text placeholder for logo.

import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function LobbyPage({ onJoined }) {
  const [mode, setMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If ?room= in URL, pre-fill join mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      setMode('join');
    }
  }, []);

  useEffect(() => {
    function onError(data) {
      setError(data.message || 'Terjadi kesalahan.');
      setLoading(false);
    }
    function onJoinedEvent(data) {
      setLoading(false);
      onJoined(data);
    }
    socket.on('ERROR', onError);
    socket.on('JOINED', onJoinedEvent);
    return () => {
      socket.off('ERROR', onError);
      socket.off('JOINED', onJoinedEvent);
    };
  }, [onJoined]);

  async function handleCreate(e) {
    e.preventDefault();
    const nick = nickname.trim();
    if (!nick) { setError('Masukkan nickname.'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal membuat ruangan.'); setLoading(false); return; }

      socket.connect();
      socket.emit('JOIN_ROOM', { room_code: data.room_code, nickname: nick });
    } catch {
      setError('Tidak bisa terhubung ke server. Pastikan server berjalan.');
      setLoading(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    const nick = nickname.trim();
    const code = roomCode.trim().toUpperCase();
    if (!nick) { setError('Masukkan nickname.'); return; }
    if (!code) { setError('Masukkan kode ruangan.'); return; }
    setError('');
    setLoading(true);

    socket.connect();
    socket.emit('JOIN_ROOM', { room_code: code, nickname: nick });
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center felt-table p-4">
      {/* Table surface backdrop */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block border-2 border-gold-500 px-6 py-1 mb-4" aria-hidden="true">
            <span className="font-mono text-xs text-gold-500 tracking-widest uppercase">AntiGravity</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-gold-400 mb-2 tracking-tight">
            Blackjack Quad
          </h1>
          <p className="text-felt-300 font-ui text-sm">
            4 pemain, real-time. Tanpa registrasi.
          </p>
        </div>

        {/* Card panel */}
        <div className="panel p-6">
          {mode === 'choose' && (
            <ChooseMode onSelect={setMode} />
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} noValidate>
              <FormTitle>Buat Ruangan Baru</FormTitle>
              <NicknameInput value={nickname} onChange={setNickname} />
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => { setMode('choose'); setError(''); }} className="btn-action flex-1">
                  Kembali
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? 'Membuat...' : 'Buat Ruangan'}
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} noValidate>
              <FormTitle>Masuk ke Ruangan</FormTitle>
              <NicknameInput value={nickname} onChange={setNickname} />
              <div className="mt-3">
                <label className="text-xs text-felt-300 font-mono mb-1 block" htmlFor="room-code">
                  Kode Ruangan
                </label>
                <input
                  id="room-code"
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ROOM-XXXX"
                  maxLength={9}
                  className="w-full bg-felt-900 border border-felt-600 rounded px-3 py-2.5 text-sm text-ivory-100 placeholder-felt-500 focus:border-gold-500 focus:outline-none font-mono uppercase transition-colors"
                  aria-label="Kode ruangan"
                />
              </div>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => { setMode('choose'); setError(''); }} className="btn-action flex-1">
                  Kembali
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? 'Masuk...' : 'Bergabung'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer rules note */}
        <p className="text-center text-felt-500 text-xs mt-6 font-ui">
          Aturan: HIT / STAND / SPLIT / SURRENDER. Tanpa Double Down.
        </p>
      </div>
    </div>
  );
}

function ChooseMode({ onSelect }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ivory-200 text-center mb-2">Pilih aksi</h2>
      <button className="btn-primary w-full text-base py-3" onClick={() => onSelect('create')}>
        Buat Ruangan
      </button>
      <button className="btn-action w-full text-base py-3" onClick={() => onSelect('join')}>
        Masuk dengan Kode
      </button>
    </div>
  );
}

function FormTitle({ children }) {
  return <h2 className="font-display text-lg text-ivory-200 mb-4">{children}</h2>;
}

function NicknameInput({ value, onChange }) {
  return (
    <div>
      <label className="text-xs text-felt-300 font-mono mb-1 block" htmlFor="nickname">
        Nickname
      </label>
      <input
        id="nickname"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Nama tampil kamu"
        maxLength={20}
        className="w-full bg-felt-900 border border-felt-600 rounded px-3 py-2.5 text-sm text-ivory-100 placeholder-felt-500 focus:border-gold-500 focus:outline-none transition-colors"
        aria-label="Nickname"
        autoComplete="off"
      />
    </div>
  );
}

function ErrorMsg({ children }) {
  return (
    <p role="alert" className="mt-2 text-red-400 text-xs font-ui">
      {children}
    </p>
  );
}

export default LobbyPage;
