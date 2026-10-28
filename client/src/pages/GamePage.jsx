// pages/GamePage.jsx
// Main game table view.
// Layout: StatusBar (top) | Table seats (center) | Right panel: Scorecard + Notes

import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import StatusBar from '../components/StatusBar';
import SeatCard from '../components/SeatCard';
import Scorecard from '../components/Scorecard';
import MatchNotes from '../components/MatchNotes';

function GamePage({ joinData }) {
  const { seat_id: mySeatId, room_code: roomCode } = joinData;

  const [roomState, setRoomState] = useState(null);
  const [aiTakeover, setAiTakeover] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    function onStateUpdate(state) {
      setRoomState(state);
    }
    function onAiTakeover(data) {
      setAiTakeover(data.message);
      setTimeout(() => setAiTakeover(null), 4000);
    }
    function onDisconnect() {
      setConnectionError(true);
    }
    function onReconnect() {
      setConnectionError(false);
    }
    function onError(data) {
      console.warn('Server error:', data.message);
    }

    socket.on('STATE_UPDATE', onStateUpdate);
    socket.on('AI_TAKEOVER', onAiTakeover);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onReconnect);
    socket.on('ERROR', onError);

    return () => {
      socket.off('STATE_UPDATE', onStateUpdate);
      socket.off('AI_TAKEOVER', onAiTakeover);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onReconnect);
      socket.off('ERROR', onError);
    };
  }, []);

  const handleAction = useCallback((action) => {
    socket.emit('PLAYER_ACTION', { action });
  }, []);

  const handleClaimDealer = useCallback(() => {
    socket.emit('CLAIM_DEALER');
  }, []);

  const handleStartRound = useCallback(() => {
    socket.emit('START_ROUND');
  }, []);

  const handleNextRound = useCallback(() => {
    socket.emit('NEXT_ROUND');
  }, []);

  const handleAddNote = useCallback((text) => {
    socket.emit('ADD_NOTE', { text });
  }, []);

  if (connectionError) {
    return (
      <div className="min-h-dvh felt-table flex items-center justify-center">
        <div className="panel p-8 text-center max-w-sm">
          <p className="font-display text-lg text-red-400 mb-2">Koneksi terputus</p>
          <p className="text-felt-300 text-sm font-ui">Mencoba menyambung ulang...</p>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="min-h-dvh felt-table flex items-center justify-center">
        <div className="text-gold-400 font-mono text-sm animate-pulse">Memuat meja...</div>
      </div>
    );
  }

  const {
    status: gameStatus,
    dealer_seat: dealerSeat,
    current_turn_seat: currentTurnSeat,
    round_number: roundNumber,
    seats,
    match_notes: matchNotes,
    timer_seconds: timerSeconds,
  } = roomState;

  const myTurn = currentTurnSeat === mySeatId;
  const mySeat = seats.find(s => s.seat_id === mySeatId);
  const dealerNotClaimed = dealerSeat === null;

  const canStart = (gameStatus === 'WAITING' || gameStatus === 'ROUND_OVER') &&
    seats.filter(s => s.is_occupied).length >= 2;
  const isRoundOver = gameStatus === 'ROUND_OVER';

  return (
    <div className="h-dvh flex flex-col overflow-hidden felt-table">
      {/* Top bar */}
      <StatusBar
        roomCode={roomCode}
        gameStatus={gameStatus}
        roundNumber={roundNumber}
        currentTurnSeat={currentTurnSeat}
        seats={seats}
        timerSeconds={timerSeconds || 15}
      />

      {/* AI Takeover toast */}
      {aiTakeover && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-wood-700 border border-gold-600 text-gold-300 text-sm font-ui px-4 py-2 rounded shadow-panel animate-slide-up"
        >
          {aiTakeover}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Table area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4" role="main">
          {/* Dealer claim strip — shown if no dealer has been claimed before round */}
          {dealerNotClaimed && gameStatus === 'WAITING' && (
            <div className="mb-3 text-center">
              <p className="text-felt-300 text-xs font-ui">
                Tidak ada dealer. Pilih "Jadi Dealer" di kursimu, atau AntiGravity akan menjadi dealer otomatis.
              </p>
            </div>
          )}

          {/* 4 seats grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
            {seats.map(seat => (
              <SeatCard
                key={seat.seat_id}
                seat={seat}
                isDealer={seat.seat_id === dealerSeat}
                isMyTurn={currentTurnSeat === seat.seat_id}
                isMe={seat.seat_id === mySeatId}
                gameStatus={gameStatus}
                onAction={handleAction}
                onClaimDealer={handleClaimDealer}
                dealerNotClaimed={dealerNotClaimed}
              />
            ))}
          </div>

          {/* Control row */}
          <div className="flex justify-center gap-3 flex-wrap">
            {canStart && !isRoundOver && (
              <button className="btn-primary px-8" onClick={handleStartRound}>
                Mulai Ronde
              </button>
            )}
            {isRoundOver && (
              <button className="btn-primary px-8" onClick={handleNextRound}>
                Ronde Berikutnya
              </button>
            )}
          </div>

          {/* Mobile: notes toggle */}
          <div className="mt-4 md:hidden">
            <button
              className="btn-action w-full text-sm"
              onClick={() => setNotesOpen(v => !v)}
              aria-expanded={notesOpen}
              aria-controls="match-notes-panel"
            >
              {notesOpen ? 'Tutup Match Notes' : 'Buka Match Notes'}
            </button>
            {notesOpen && (
              <div id="match-notes-panel" className="mt-3 h-64">
                <MatchNotes
                  notes={matchNotes}
                  onAddNote={handleAddNote}
                  disabled={!mySeat?.is_occupied}
                />
              </div>
            )}
          </div>
        </main>

        {/* Right panel: Scorecard + Match Notes (desktop) */}
        <aside className="hidden md:flex flex-col w-72 lg:w-80 border-l border-wood-700 shrink-0 overflow-hidden">
          <div className="p-3 border-b border-wood-700 shrink-0">
            <Scorecard seats={seats} dealerSeat={dealerSeat} />
          </div>
          <div className="flex-1 min-h-0">
            <MatchNotes
              notes={matchNotes}
              onAddNote={handleAddNote}
              disabled={!mySeat?.is_occupied}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default GamePage;

