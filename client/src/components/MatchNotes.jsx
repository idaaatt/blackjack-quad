// components/MatchNotes.jsx
// Match Notes panel: manual player notes + AI auto-summary log.
// R-27: empty state shown when no notes yet.

import React, { useState, useRef, useEffect } from 'react';

function MatchNotes({ notes, onAddNote, disabled }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes.length]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onAddNote(trimmed);
    setText('');
  }

  return (
    <div className="panel flex flex-col h-full min-h-0" aria-label="Match Notes">
      {/* Header */}
      <div className="px-4 py-3 border-b border-felt-600 flex items-center gap-2 shrink-0">
        <span className="font-display text-base text-gold-400 font-semibold">Match Notes</span>
        <span className="text-xs text-felt-400 font-mono">({notes.length})</span>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-felt-400 text-sm font-ui">Belum ada catatan.</p>
            <p className="text-felt-500 text-xs mt-1">AI akan mencatat ringkasan setiap ronde. Kamu bisa menambah catatan manual di bawah.</p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-felt-600 p-3 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Tulis catatan strategi..."
            maxLength={300}
            disabled={disabled}
            className="flex-1 bg-felt-900 border border-felt-600 rounded px-3 py-2 text-sm text-ivory-100 placeholder-felt-500 focus:border-gold-500 focus:outline-none transition-colors disabled:opacity-50"
            aria-label="Tulis catatan manual"
          />
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="btn-primary text-sm px-3"
            aria-label="Kirim catatan"
          >
            Kirim
          </button>
        </div>
      </form>
    </div>
  );
}

function NoteItem({ note }) {
  const isAI = note.type === 'AI';
  const time = new Date(note.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className={`text-xs rounded px-2 py-2 animate-slide-up ${isAI ? 'bg-felt-900 border border-gold-700/30' : 'bg-felt-700 border border-felt-600'}`}>
      <div className="flex items-center gap-2 mb-1">
        {isAI ? (
          <span className="text-gold-500 font-mono font-semibold">AG</span>
        ) : (
          <span className="text-ivory-300 font-mono font-semibold">{note.author}</span>
        )}
        <span className="text-felt-400 font-mono">{time}</span>
      </div>
      <p className="text-ivory-200 leading-relaxed">{note.text}</p>
    </div>
  );
}

export default MatchNotes;

