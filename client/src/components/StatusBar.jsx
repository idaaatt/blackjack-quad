// components/StatusBar.jsx
// Top bar showing room code, game status, round number, share link, and timer.

import React, { useState, useEffect, useRef } from 'react';

const STATUS_LABELS = {
  WAITING: 'Menunggu pemain',
  DEALING: 'Membagi kartu...',
  PLAYER_TURN: 'Giliran pemain',
  DEALER_TURN: 'Giliran dealer',
  ROUND_OVER: 'Ronde selesai',
};

function StatusBar({ roomCode, gameStatus, roundNumber, currentTurnSeat, seats, timerSeconds }) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const intervalRef = useRef(null);

  const shareUrl = `${window.location.origin}/?room=${roomCode}`;

  // Reset and count down timer during PLAYER_TURN
  useEffect(() => {
    if (gameStatus === 'PLAYER_TURN') {
      setTimeLeft(timerSeconds);
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => Math.max(0, t - 1));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [gameStatus, currentTurnSeat, timerSeconds]);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const currentSeat = seats?.find(s => s.seat_id === currentTurnSeat);
  const turnName = currentSeat?.player_name;

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-wood-800 border-b border-wood-600 shrink-0" role="banner">
      {/* Left: branding + room code */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-lg font-bold text-gold-400 tracking-tight">
          Blackjack Quad
        </h1>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-felt-400 text-xs font-mono">Ruangan:</span>
          <span className="font-mono text-ivory-200 text-sm font-semibold">{roomCode}</span>
        </div>
      </div>

      {/* Center: game status */}
      <div className="flex items-center gap-3">
        {roundNumber > 0 && (
          <span className="text-xs text-felt-400 font-mono hidden sm:inline">Ronde {roundNumber}</span>
        )}
        <span className="text-sm font-ui text-ivory-200">
          {STATUS_LABELS[gameStatus] || gameStatus}
        </span>
        {gameStatus === 'PLAYER_TURN' && turnName && (
          <span className="text-sm font-ui text-gold-300 hidden md:inline">
            — {turnName}
          </span>
        )}
        {/* Turn timer — marks real live state */}
        {gameStatus === 'PLAYER_TURN' && (
          <span
            className={`font-mono text-sm font-bold w-7 text-center ${timeLeft <= 5 ? 'text-red-400' : 'text-gold-400'}`}
            aria-live="polite"
            aria-label={`Waktu tersisa: ${timeLeft} detik`}
          >
            {timeLeft}
          </span>
        )}
      </div>

      {/* Right: share link */}
      <button
        className="btn-action text-xs px-3 py-1.5 shrink-0"
        onClick={copyLink}
        aria-label="Salin link undangan"
      >
        {copied ? 'Tersalin!' : 'Bagikan'}
      </button>
    </header>
  );
}

export default StatusBar;

